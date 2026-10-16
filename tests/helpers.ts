import { Academy } from "../src/app.ts";
import type { Deps } from "../src/app.ts";
import { CertificateAuthority } from "../src/certificate.ts";
import { RuleAnalyzer } from "../src/engine/analyzer.ts";
import { RulePersona } from "../src/engine/persona.ts";
import { buildReport } from "../src/engine/scoring.ts";
import { startSimulation, step } from "../src/engine/simulation.ts";
import type { Engine } from "../src/engine/simulation.ts";
import { TfIdfRetriever } from "../src/rag/index.ts";
import { getScenario } from "../src/scenarios.ts";

export const engine: Engine = { analyzer: new RuleAnalyzer(), persona: new RulePersona() };
export const retriever = new TfIdfRetriever();

export function scenario(id = "clientes-dificiles") {
  const s = getScenario(id);
  if (!s) throw new Error(`escenario ${id}`);
  return s;
}

/** Juega una conversación completa y devuelve estado y reporte. */
export async function play(messages: string[], id = "clientes-dificiles") {
  const sc = scenario(id);
  const state = startSimulation(sc);
  const results = [];
  for (const m of messages) {
    if (state.done) break;
    results.push(await step(sc, state, m, engine));
  }
  return { sc, state, results, report: buildReport(sc, state) };
}

export function makeAcademy(secret = "secreto-de-pruebas", extra: Partial<Deps> = {}) {
  return new Academy({
    analyzer: engine.analyzer,
    persona: engine.persona,
    retriever,
    authority: new CertificateAuthority(secret),
    now: () => new Date("2026-10-15T18:00:00Z"),
    ...extra,
  });
}
