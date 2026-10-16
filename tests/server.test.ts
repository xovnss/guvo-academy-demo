import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/server.ts";
import { CONVERSATIONS } from "../evals/conversations.ts";
import { makeAcademy } from "./helpers.ts";

let base = "";
const server = createApp({ academy: makeAcademy(), rateLimit: { max: 1000, windowMs: 60_000 } });
before(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((r) => server.close(() => r())));

const json = (path: string, body: unknown = {}, headers: Record<string, string> = { "Content-Type": "application/json" }) =>
  fetch(`${base}${path}`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });

async function startSession(name = "Ana Pérez") {
  const res = await json("/api/sessions", { scenarioId: "clientes-dificiles", name });
  assert.equal(res.status, 201);
  return (await res.json()) as any;
}

describe("API", () => {
  it("lista escenarios y sirve la página con cabeceras de seguridad", async () => {
    const list = (await (await fetch(`${base}/api/scenarios`)).json()) as any[];
    assert.equal(list.length, 2);
    const page = await fetch(`${base}/`);
    assert.match(page.headers.get("content-security-policy") ?? "", /script-src 'self'/);
    assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  });

  it("flujo completo: conversación excelente → reporte → certificado verificable", async () => {
    const s = await startSession();
    assert.ok(s.sessionId && s.opening && s.meter.anger > 0);
    let last: any;
    for (const text of CONVERSATIONS[0]!.messages) {
      const res = await json(`/api/sessions/${s.sessionId}/messages`, { text });
      assert.equal(res.status, 200);
      last = await res.json();
    }
    assert.ok(last.meter.anger < s.meter.anger, "el termómetro bajó");

    const done = (await (await json(`/api/sessions/${s.sessionId}/finish`)).json()) as any;
    assert.ok(done.report.passed && done.report.score >= 75);
    assert.ok(done.certificate.token);

    const verify = (await (await fetch(`${base}/api/verify?token=${encodeURIComponent(done.certificate.token)}`)).json()) as any;
    assert.ok(verify.valid);
    assert.equal(verify.payload.name, "Ana Pérez");

    const svg = await fetch(`${base}/certificate.svg?token=${encodeURIComponent(done.certificate.token)}`);
    assert.equal(svg.status, 200);
    assert.match(svg.headers.get("content-type") ?? "", /image\/svg\+xml/);
    assert.match(await svg.text(), /Ana Pérez/);

    // Terminar dos veces no emite otro certificado distinto.
    const again = (await (await json(`/api/sessions/${s.sessionId}/finish`)).json()) as any;
    assert.equal(again.certificate.id, done.certificate.id);
  });

  it("quien no alcanza el puntaje no recibe certificado", async () => {
    const s = await startSession();
    await json(`/api/sessions/${s.sessionId}/messages`, { text: "No es mi culpa, así son las reglas." });
    const done = (await (await json(`/api/sessions/${s.sessionId}/finish`)).json()) as any;
    assert.equal(done.report.passed, false);
    assert.equal(done.certificate, null);
  });

  it("un token alterado no genera certificado", async () => {
    const s = await startSession();
    for (const text of CONVERSATIONS[0]!.messages) await json(`/api/sessions/${s.sessionId}/messages`, { text });
    const { certificate } = (await (await json(`/api/sessions/${s.sessionId}/finish`)).json()) as any;
    const forged = `${certificate.token.slice(0, -2)}AA`;
    assert.equal((await fetch(`${base}/certificate.svg?token=${forged}`)).status, 404);
    assert.equal(((await (await fetch(`${base}/api/verify?token=${forged}`)).json()) as any).valid, false);
  });

  it("valida entradas y errores", async () => {
    assert.equal((await json("/api/sessions", { scenarioId: "no-existe" })).status, 404);
    assert.equal((await json("/api/sessions", "no es json")).status, 400);
    assert.equal((await json("/api/sessions", "a=b", { "Content-Type": "text/plain" })).status, 415);
    assert.equal((await json("/api/sessions", { scenarioId: "x".repeat(10_000) })).status, 413);
    const s = await startSession();
    assert.equal((await json(`/api/sessions/${s.sessionId}/messages`, { text: "" })).status, 400);
    assert.equal((await json(`/api/sessions/${s.sessionId}/messages`, { text: "x".repeat(501) })).status, 400);
    assert.equal((await json(`/api/sessions/${s.sessionId}/messages`, { text: 42 })).status, 400);
    assert.equal((await json(`/api/sessions/00000000-0000-0000-0000-000000000000/messages`, { text: "hola" })).status, 404);
  });

  it("no se puede seguir jugando una simulación terminada", async () => {
    const s = await startSession();
    await json(`/api/sessions/${s.sessionId}/finish`);
    assert.equal((await json(`/api/sessions/${s.sessionId}/messages`, { text: "hola otra vez" })).status, 409);
  });

  it("no sirve archivos fuera de la lista y rechaza métodos incorrectos", async () => {
    assert.equal((await fetch(`${base}/..%2Fpackage.json`)).status, 404);
    assert.equal((await fetch(`${base}/api/sessions`)).status, 405);
    assert.equal((await json("/app.js")).status, 405);
  });

  it("limita la frecuencia por IP", async () => {
    const limited = createApp({ academy: makeAcademy(), rateLimit: { max: 3, windowMs: 60_000 } });
    await new Promise<void>((r) => limited.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(limited.address() as AddressInfo).port}/api/scenarios`;
    try {
      const statuses = [];
      for (let i = 0; i < 5; i++) statuses.push((await fetch(url)).status);
      assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
    } finally {
      await new Promise<void>((r) => limited.close(() => r()));
    }
  });
});

describe("sesiones", () => {
  it("expiran por tiempo", () => {
    let now = new Date("2026-10-15T18:00:00Z").getTime();
    const academy = makeAcademy("s", { now: () => new Date(now), ttlMs: 1000 });
    const first = academy.start("clientes-dificiles", "A");
    now += 5000;
    academy.start("clientes-dificiles", "B"); // al crear otra se limpian las vencidas
    assert.throws(() => academy.finish(first.sessionId), /no existe|expir/);
  });

  it("se acotan en número (se descarta la más antigua)", () => {
    const academy = makeAcademy("s", { maxSessions: 2 });
    const a = academy.start("clientes-dificiles", "A");
    academy.start("clientes-dificiles", "B");
    academy.start("clientes-dificiles", "C");
    assert.throws(() => academy.finish(a.sessionId));
  });

  it("no permite dos mensajes simultáneos en la misma sesión", async () => {
    const academy = makeAcademy();
    const s = academy.start("clientes-dificiles", "A");
    const first = academy.message(s.sessionId, "Lamento mucho lo sucedido, entiendo tu frustración.");
    await assert.rejects(academy.message(s.sessionId, "otro mensaje al mismo tiempo"), /Espera/);
    await first;
  });
});

describe("IP del cliente detrás de un proxy", () => {
  it("usa la última IP de X-Forwarded-For solo si se confía en el proxy", async () => {
    const { clientIp } = await import("../src/server.ts");
    const req = { headers: { "x-forwarded-for": "6.6.6.6, 1.2.3.4" }, socket: { remoteAddress: "10.0.0.1" } } as any;
    assert.equal(clientIp(req, true), "1.2.3.4");
    assert.equal(clientIp(req, false), "10.0.0.1");
    assert.equal(clientIp({ headers: {}, socket: { remoteAddress: "10.0.0.1" } } as any, true), "10.0.0.1");
  });
});
