import { clamp } from "../text.ts";
import type { Scenario, SignalName, SimState } from "../types.ts";

export interface Highlight {
  kind: "good" | "warn" | "bad";
  title: string;
  verdict: string;
  quote: string;
}

export interface CriterionScore {
  id: SignalName;
  label: string;
  score: number;
}

export interface Report {
  score: number;
  criteria: CriterionScore[];
  superpower: string;
  improvement: string;
  deescalation: number;
  turns: number;
  highlights: Highlight[];
  nextSteps: string[];
  xp: number;
  passed: boolean;
}

export const PASS_SCORE = 70;
const MIN_TURNS_FOR_FULL_SCORE = 3;

const quoteOf = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 100 ? `${clean.slice(0, 97)}…` : clean;
};

/**
 * Calificación 0–100:
 *  - 75 % criterios ponderados (la mejor evidencia pesa más que el promedio, porque un buen momento cuenta,
 *    pero la constancia también; el tono se mide como promedio y las banderas hostiles lo penalizan).
 *  - 25 % cuánto logró calmar la situación (bajar 60 % de la molestia inicial = puntaje completo).
 *  - Con menos de 3 intervenciones no se puede pasar de 60: una sola frase perfecta no demuestra manejo de la conversación.
 */
export function buildReport(scenario: Scenario, state: SimState): Report {
  const turns = state.turns;
  const n = turns.length;

  const criteria: CriterionScore[] = scenario.criteria.map(({ id, label }) => {
    if (n === 0) return { id, label, score: 0 };
    const values = turns.map((t) => t.analysis[id]);
    const mean = values.reduce((s, v) => s + v, 0) / n;
    let value: number;
    if (id === "tone") {
      const hostile = turns.filter((t) => t.analysis.flags.includes("hostile")).length;
      value = clamp(mean - 0.15 * hostile);
    } else {
      value = 0.7 * Math.max(...values) + 0.3 * mean;
    }
    return { id, label, score: Math.round(value * 100) };
  });

  const weighted = scenario.criteria.reduce((sum, c, i) => sum + c.weight * (criteria[i]?.score ?? 0), 0);
  // Bajar el 60 % de la molestia inicial ya cuenta como éxito total: llevarla a cero en pocos mensajes no es realista.
  const deescalation = n === 0 ? 0 : clamp((scenario.startAnger - state.anger) / (scenario.startAnger * 0.6));
  let score = Math.round(0.75 * weighted + 0.25 * 100 * deescalation);
  if (n < MIN_TURNS_FOR_FULL_SCORE) score = Math.min(score, 60);
  if (state.done === "lost") score = Math.min(score, 40);

  const sorted = [...criteria].sort((a, b) => b.score - a.score);
  const superpower = sorted[0]?.label ?? "";
  const improvement = sorted.at(-1)?.label ?? "";

  const highlights = buildHighlights(scenario, state);
  const nextSteps = criteria
    .filter((c) => c.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((c) => `Practica «${c.label.toLowerCase()}»: repite el escenario enfocándote solo en ese criterio.`);
  if (nextSteps.length === 0) nextSteps.push("Sube la dificultad: prueba un escenario más complejo para seguir creciendo.");

  const xp = Math.round(Math.min(150, score * 1.5));
  return {
    score,
    criteria,
    superpower,
    improvement,
    deescalation: Math.round(deescalation * 100),
    turns: n,
    highlights,
    nextSteps,
    xp,
    passed: score >= PASS_SCORE && state.done !== "lost",
  };
}

function buildHighlights(scenario: Scenario, state: SimState): Highlight[] {
  const turns = state.turns;
  const out: Highlight[] = [];
  const label = (id: SignalName) => scenario.criteria.find((c) => c.id === id)?.label ?? id;

  const best = (key: SignalName) =>
    turns.reduce<(typeof turns)[number] | null>((b, t) => (t.analysis[key] > (b?.analysis[key] ?? 0) ? t : b), null);

  const empathic = best("empathy");
  if (empathic && empathic.analysis.empathy >= 0.5) {
    out.push({
      kind: "good",
      title: "Validaste la emoción",
      verdict: empathic.analysis.empathy >= 0.8 ? "Perfecto" : "Muy bien",
      quote: quoteOf(empathic.user),
    });
  }
  const clear = best("solution");
  if (clear && clear.analysis.solution >= 0.7) {
    out.push({ kind: "good", title: "Propuesta clara y concreta", verdict: "Muy bien", quote: quoteOf(clear.user) });
  }
  const vague = turns.find((t) => t.analysis.flags.includes("vague"));
  if (vague) {
    out.push({ kind: "warn", title: "Dudaste al proponer solución", verdict: "Puede mejorar", quote: quoteOf(vague.user) });
  }
  const bad = turns.find((t) => t.analysis.flags.some((f) => f === "hostile" || f === "blame" || f === "defensive"));
  if (bad) {
    out.push({ kind: "bad", title: "El tono generó tensión", verdict: "Área de mejora", quote: quoteOf(bad.user) });
  }
  if (turns.length > 0 && Math.max(...turns.map((t) => t.analysis.closure)) < 0.4) {
    out.push({
      kind: "bad",
      title: `Faltó: ${label("closure").toLowerCase()}`,
      verdict: "Área de mejora",
      quote: "No se confirmó el acuerdo ni el siguiente paso al cerrar.",
    });
  }
  return out.slice(0, 5);
}
