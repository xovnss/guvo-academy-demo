import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Certificados verificables sin base de datos: el contenido va firmado con HMAC-SHA256.
 * Cambiar una sola letra (nombre, calificación...) invalida la firma.
 * Formato del token: base64url(JSON).base64url(firma)
 */
export interface CertificatePayload {
  v: 1;
  id: string;
  name: string;
  course: string;
  score: number;
  superpower: string;
  improvement: string;
  /** Fecha de emisión AAAA-MM-DD. */
  issued: string;
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

export class CertificateAuthority {
  #secret: Buffer;

  constructor(secret?: string) {
    this.#secret = secret ? Buffer.from(secret) : randomBytes(32);
  }

  #sign(body: string): Buffer {
    return createHmac("sha256", this.#secret).update(body).digest();
  }

  issue(input: Omit<CertificatePayload, "v" | "id" | "issued" | "name"> & { name: string }, now: Date = new Date()): string {
    const payload: CertificatePayload = {
      v: 1,
      id: `CERT-${now.getUTCFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`,
      name: cleanName(input.name),
      course: input.course,
      score: Math.round(input.score),
      superpower: input.superpower,
      improvement: input.improvement,
      issued: now.toISOString().slice(0, 10),
    };
    const body = b64(JSON.stringify(payload));
    return `${body}.${b64(this.#sign(body))}`;
  }

  verify(token: string): { valid: true; payload: CertificatePayload } | { valid: false } {
    if (typeof token !== "string" || token.length > 2000) return { valid: false };
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra !== undefined) return { valid: false };

    const expected = this.#sign(body);
    const given = Buffer.from(signature, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { valid: false };

    try {
      const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CertificatePayload;
      if (payload.v !== 1 || typeof payload.id !== "string") return { valid: false };
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }
}

/** Nombre apto para imprimirse: sin caracteres de control ni espacios repetidos, máximo 60 caracteres. */
export function cleanName(name: string): string {
  const cleaned = name.replace(/[\p{C}]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return cleaned || "Participante";
}

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[(m ?? 1) - 1]} de ${y}`;
};

/** Certificado como SVG autocontenido (sin fuentes ni imágenes externas). Todo texto dinámico va escapado. */
export function renderCertificateSvg(p: CertificatePayload, verifyUrl: string): string {
  const e = escapeXml;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 850" role="img" aria-label="Certificado de ${e(p.name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eceaff"/></linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b2fd9"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
  </defs>
  <rect width="1200" height="850" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="14" fill="url(#bar)"/>
  <rect x="0" y="836" width="1200" height="14" fill="url(#bar)"/>
  <rect x="40" y="40" width="1120" height="770" rx="18" fill="none" stroke="#c9c4f5" stroke-width="2"/>
  <g font-family="Georgia, 'Times New Roman', serif" text-anchor="middle" fill="#1b1a3a">
    <text x="600" y="130" font-family="system-ui, sans-serif" font-size="26" font-weight="700" letter-spacing="6" fill="#3b2fd9">ACADEMIA DE SIMULACIONES</text>
    <text x="600" y="210" font-family="system-ui, sans-serif" font-size="22" letter-spacing="8" fill="#5b5880">CERTIFICADO DE FINALIZACIÓN</text>
    <text x="600" y="290" font-size="24" font-style="italic" fill="#5b5880">Se otorga el presente a</text>
    <text x="600" y="385" font-size="68" font-style="italic" fill="#1b1a3a">${e(p.name)}</text>
    <text x="600" y="450" font-size="24" fill="#5b5880">por completar con éxito el curso</text>
    <text x="600" y="505" font-family="system-ui, sans-serif" font-size="34" font-weight="700">${e(p.course)}</text>
    <text x="300" y="620" font-family="system-ui, sans-serif" font-size="54" font-weight="700" fill="#3b2fd9">${p.score}/100</text>
    <text x="300" y="652" font-family="system-ui, sans-serif" font-size="16" letter-spacing="3" fill="#5b5880">SCORE FINAL</text>
    <text x="600" y="606" font-family="system-ui, sans-serif" font-size="22" font-weight="600">${e(p.superpower)}</text>
    <text x="600" y="636" font-family="system-ui, sans-serif" font-size="14" letter-spacing="3" fill="#5b5880">SUPERPODER</text>
    <text x="900" y="606" font-family="system-ui, sans-serif" font-size="22" font-weight="600">${e(p.improvement)}</text>
    <text x="900" y="636" font-family="system-ui, sans-serif" font-size="14" letter-spacing="3" fill="#5b5880">ÁREA DE MEJORA</text>
    <text x="600" y="730" font-family="system-ui, sans-serif" font-size="18" fill="#5b5880">Emitido el ${e(longDate(p.issued))} · ${e(p.id)}</text>
    <text x="600" y="765" font-family="system-ui, sans-serif" font-size="15" fill="#3b2fd9">Verifica este certificado en ${e(verifyUrl)}</text>
  </g>
</svg>`;
}
