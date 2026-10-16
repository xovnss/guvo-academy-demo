import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coach } from "../src/engine/coach.ts";
import { startSimulation } from "../src/engine/simulation.ts";
import { KB } from "../src/rag/kb.ts";
import { TfIdfRetriever } from "../src/rag/index.ts";
import { play, retriever, scenario } from "./helpers.ts";

describe("recuperación TF-IDF", () => {
  it("encuentra el documento correcto para cada intención", () => {
    assert.equal(retriever.search("cómo confirmar el acuerdo por escrito al cerrar")[0]?.doc.id, "cie-01");
    assert.equal(retriever.search("precio caro beneficio medible ahorro prueba gratuita")[0]?.doc.id, "sol-02");
    assert.equal(retriever.search("disculpa específica qué salió mal")[0]?.doc.id, "emp-02");
  });

  it("filtra por criterio y respeta k", () => {
    const hits = retriever.search("tono", { criterion: "tone", k: 2 });
    assert.equal(hits.length, 2);
    assert.ok(hits.every((h) => h.doc.criterion === "tone"));
  });

  it("es determinista y no rompe con consultas vacías o sin coincidencias", () => {
    assert.deepEqual(retriever.search("cierre").map((h) => h.doc.id), retriever.search("cierre").map((h) => h.doc.id));
    assert.equal(retriever.search("")[0]?.score ?? 0, 0);
    assert.equal(retriever.search("zzzz qqqq", { k: 1 })[0]?.score, 0);
  });

  it("la base cubre los cuatro criterios", () => {
    for (const c of ["empathy", "solution", "tone", "closure"]) assert.ok(KB.some((d) => d.criterion === c), c);
    assert.ok(new TfIdfRetriever([]).search("algo").length === 0);
  });
});

describe("coach en vivo", () => {
  it("no da pista antes de la primera respuesta", () => {
    assert.equal(coach(scenario(), startSimulation(scenario()), retriever), null);
  });

  it("tras un mensaje hostil recomienda cuidar el tono, citando su fuente", async () => {
    const { sc, state } = await play(["Cálmate, no es mi problema."]);
    const hint = coach(sc, state, retriever);
    assert.equal(hint?.criterion, "tone");
    assert.match(hint?.source ?? "", /^ton-/);
  });

  it("si el participante no ha validado, la pista es de empatía; luego de solución", async () => {
    const first = await play(["Buenas tardes, dígame en qué le ayudo."]);
    assert.equal(coach(first.sc, first.state, retriever)?.criterion, "empathy");
    const second = await play(["Lamento mucho lo sucedido, entiendo tu frustración, Juan."]);
    assert.equal(coach(second.sc, second.state, retriever)?.criterion, "solution");
  });

  it("deja de molestar cuando todo va bien", async () => {
    const { sc, state } = await play([
      "Lamento mucho lo sucedido, entiendo tu frustración, Juan.",
      "Te ofrezco reagendar mañana a las 10:00, con prioridad y sin costo.",
      "Te confirmo por correo hoy y te llamo mañana. ¿Te parece bien?",
    ]);
    assert.equal(coach(sc, state, retriever), null);
  });
});
