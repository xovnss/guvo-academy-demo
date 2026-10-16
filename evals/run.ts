import { RuleAnalyzer } from "../src/engine/analyzer.ts";
import type { Analyzer } from "../src/engine/analyzer.ts";
import { RulePersona } from "../src/engine/persona.ts";
import { buildReport } from "../src/engine/scoring.ts";
import { startSimulation, step } from "../src/engine/simulation.ts";
import { LlmAnalyzer, OpenAIChat } from "../src/llm.ts";
import { TfIdfRetriever } from "../src/rag/index.ts";
import { getScenario } from "../src/scenarios.ts";
import { CONVERSATIONS } from "./conversations.ts";
import { LABELED } from "./labeled.ts";

/**
 * Evals del motor. Corren siempre contra el analizador por reglas (determinista, gratis).
 * Con OPENAI_API_KEY evalúan además al analizador con LLM, para comparar ambos con los mismos casos.
 *   npm run eval
 */
const chat = process.env.OPENAI_API_KEY ? new OpenAIChat({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || undefined }) : null;
const analyzers: Analyzer[] = [new RuleAnalyzer(), ...(chat ? [new LlmAnalyzer(chat)] : [])];
const ctx = { scenarioContext: "Clínica dental: paciente molesto por una cita cancelada", lastReply: "¿Por qué nadie me avisó?" };

let failures = 0;

for (const analyzer of analyzers) {
  console.log(`\n══ Analizador: ${analyzer.name} ══`);

  // 1) Precisión del analizador sobre mensajes etiquetados.
  let ok = 0;
  const misses: string[] = [];
  for (const item of LABELED) {
    const value = (await analyzer.analyze(item.text, ctx))[item.signal];
    const pass = item.expect === "high" ? value >= 0.5 : value < 0.3;
    if (pass) ok++;
    else misses.push(`${item.signal}=${value.toFixed(2)} (esperaba ${item.expect}): “${item.text}”`);
  }
  const accuracy = ok / LABELED.length;
  console.log(`Señales: ${ok}/${LABELED.length} correctas (${(accuracy * 100).toFixed(0)}%)`);
  for (const m of misses) console.log(`  ✗ ${m}`);
  if (accuracy < 0.9) failures++;

  // 2) Conversaciones completas: la calificación cae en el rango esperado.
  for (const c of CONVERSATIONS) {
    const scenario = getScenario(c.scenarioId)!;
    const state = startSimulation(scenario);
    for (const m of c.messages) {
      if (state.done) break;
      await step(scenario, state, m, { analyzer, persona: new RulePersona() });
    }
    const report = buildReport(scenario, state);
    const pass = report.score >= c.expect.min && report.score <= c.expect.max && report.passed === c.expect.passes;
    if (!pass) failures++;
    console.log(`${pass ? "✓" : "✗"} ${c.name}: ${report.score}/100 (esperado ${c.expect.min}–${c.expect.max})`);
  }
}

// 3) Recuperación del coach: el consejo correcto debe salir primero.
const retriever = new TfIdfRetriever();
const RETRIEVAL: Array<[string, string]> = [
  ["cómo confirmar el acuerdo por escrito al cerrar", "cie-01"],
  ["el precio es caro, cómo conecto con un beneficio medible", "sol-02"],
  ["pedir una disculpa específica", "emp-02"],
  ["el cliente alza la voz, cómo no tomármelo personal", "ton-02"],
  ["ofrecer solución con fecha y hora concreta", "sol-01"],
  ["agendar siguiente paso con fecha en una venta", "cie-02"],
];
let hits = 0;
for (const [query, expected] of RETRIEVAL) {
  const got = retriever.search(query)[0]?.doc.id;
  if (got === expected) hits++;
  else console.log(`  ✗ “${query}” → ${got} (esperaba ${expected})`);
}
console.log(`\n══ RAG del coach ══\nRecuperación top-1: ${hits}/${RETRIEVAL.length}`);
if (hits / RETRIEVAL.length < 0.8) failures++;

console.log(failures === 0 ? "\n✓ Todos los evals pasaron" : `\n✗ ${failures} grupo(s) de evals fallaron`);
process.exit(failures === 0 ? 0 : 1);
