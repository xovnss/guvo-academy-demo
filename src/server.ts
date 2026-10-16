import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { renderCertificateSvg } from "./certificate.ts";
import { Academy, AppError } from "./app.ts";

const MAX_BODY_BYTES = 4 * 1024;

const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const STATIC_FILES: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
};

export class RateLimiter {
  #hits = new Map<string, number[]>();
  #max: number;
  #windowMs: number;

  constructor(max = 40, windowMs = 60_000) {
    this.#max = max;
    this.#windowMs = windowMs;
  }

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.#hits.get(key) ?? []).filter((t) => now - t < this.#windowMs);
    const ok = recent.length < this.#max;
    if (ok) recent.push(now);
    this.#hits.set(key, recent);
    if (this.#hits.size > 5000) {
      for (const [k, v] of this.#hits) if (v.every((t) => now - t >= this.#windowMs)) this.#hits.delete(k);
    }
    return ok;
  }
}

export interface ServerOptions {
  academy: Academy;
  rateLimit?: { max: number; windowMs: number };
  webDir?: URL;
  /** URL pública (p. ej. https://mi-demo.vercel.app); aparece en el certificado como enlace de verificación. */
  publicUrl?: string;
}

function send(res: ServerResponse, status: number, body: string | Buffer, type: string) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  res.end(body);
}
const sendJson = (res: ServerResponse, status: number, data: unknown) =>
  send(res, status, JSON.stringify(data), "application/json; charset=utf-8");

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
    throw new AppError(415, "El contenido debe ser application/json.");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new AppError(413, "La petición es demasiado grande.");
    chunks.push(chunk as Buffer);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new AppError(400, "JSON inválido.");
  }
}

export function createApp({ academy, rateLimit, publicUrl, webDir = new URL("./web/", import.meta.url) }: ServerOptions): Server {
  const limiter = new RateLimiter(rateLimit?.max ?? 40, rateLimit?.windowMs ?? 60_000);

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    const method = req.method ?? "GET";

    if (path.startsWith("/api/") && !limiter.allow(req.socket.remoteAddress ?? "unknown")) {
      throw new AppError(429, "Demasiadas peticiones. Intenta de nuevo en un minuto.");
    }

    if (path === "/api/scenarios" && method === "GET") return sendJson(res, 200, academy.listScenarios());

    if (path === "/api/sessions" && method === "POST") {
      const body = await readJson(req);
      return sendJson(res, 201, academy.start(body.scenarioId, body.name));
    }

    const route = /^\/api\/sessions\/([0-9a-f-]{36})\/(messages|finish)$/.exec(path);
    if (route && method === "POST") {
      const [, id = "", action] = route;
      if (action === "messages") {
        const body = await readJson(req);
        return sendJson(res, 200, await academy.message(id, body.text));
      }
      return sendJson(res, 200, academy.finish(id));
    }

    if (path === "/api/verify" && method === "GET") {
      const result = academy.authority.verify(url.searchParams.get("token") ?? "");
      return sendJson(res, 200, result);
    }

    if (path === "/certificate.svg" && method === "GET") {
      const token = url.searchParams.get("token") ?? "";
      const result = academy.authority.verify(token);
      if (!result.valid) throw new AppError(404, "Certificado no válido.");
      const host = req.headers.host ?? "";
      const origin = publicUrl ?? (/^[\w.-]+(:\d+)?$/.test(host) ? `http://${host}` : "");
      const verifyUrl = origin;
      return send(res, 200, renderCertificateSvg(result.payload, verifyUrl), "image/svg+xml; charset=utf-8");
    }

    const asset = STATIC_FILES[path];
    if (asset && method === "GET") {
      return send(res, 200, await readFile(new URL(asset.file, webDir)), asset.type);
    }
    if (path.startsWith("/api/") || asset) throw new AppError(405, "Método no permitido.");
    throw new AppError(404, "No encontrado.");
  }

  return createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      if (error instanceof AppError) return sendJson(res, error.status, { error: error.message });
      console.error("[server] error:", error instanceof Error ? error.message : "desconocido");
      sendJson(res, 500, { error: "Error interno." });
    });
  });
}
