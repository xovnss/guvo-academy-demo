import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CertificateAuthority, cleanName, escapeXml, renderCertificateSvg } from "../src/certificate.ts";

const base = { name: "Ana Pérez", course: "Manejo de clientes difíciles", score: 82, superpower: "Empatía", improvement: "Cierre" };
const NOW = new Date("2026-10-15T18:00:00Z");

describe("certificados", () => {
  const ca = new CertificateAuthority("secreto");

  it("emite y verifica", () => {
    const token = ca.issue(base, NOW);
    const result = ca.verify(token);
    assert.ok(result.valid);
    if (result.valid) {
      assert.match(result.payload.id, /^CERT-2026-[0-9A-F]{6}$/);
      assert.equal(result.payload.issued, "2026-10-15");
      assert.equal(result.payload.name, "Ana Pérez");
    }
  });

  it("detecta que se alteró el contenido (p. ej. subir la calificación)", () => {
    const [body = "", sig = ""] = ca.issue(base, NOW).split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    payload.score = 100;
    const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${sig}`;
    assert.equal(ca.verify(forged).valid, false);
  });

  it("rechaza firmas de otra autoridad, basura y tokens mal formados", () => {
    const token = ca.issue(base, NOW);
    assert.equal(new CertificateAuthority("otro").verify(token).valid, false);
    for (const bad of ["", "abc", "a.b.c", `${token}x`, "x".repeat(5000), "..", null as unknown as string]) {
      assert.equal(ca.verify(bad).valid, false);
    }
  });

  it("sin secreto configurado genera uno aleatorio (no hay clave por defecto adivinable)", () => {
    const a = new CertificateAuthority();
    const b = new CertificateAuthority();
    assert.equal(b.verify(a.issue(base, NOW)).valid, false);
  });

  it("limpia nombres: control, espacios y longitud", () => {
    assert.equal(cleanName("  Ana\u0000   Pérez\n"), "Ana Pérez");
    assert.equal(cleanName(""), "Participante");
    assert.equal(cleanName("x".repeat(200)).length, 60);
  });

  it("el SVG escapa el nombre (no se puede inyectar marcado)", () => {
    const evil = '<script>alert(1)</script>"&';
    const token = ca.issue({ ...base, name: evil }, NOW);
    const result = ca.verify(token);
    assert.ok(result.valid);
    if (result.valid) {
      const svg = renderCertificateSvg(result.payload, "http://x/?v=1");
      assert.ok(!svg.includes("<script>"));
      assert.ok(svg.includes("&lt;script&gt;"));
    }
    assert.equal(escapeXml(`<>&"'`), "&lt;&gt;&amp;&quot;&apos;");
  });
});
