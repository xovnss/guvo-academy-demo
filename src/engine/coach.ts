import type { Retriever } from "../rag/index.ts";
import type { Scenario, SimState, SignalName } from "../types.ts";
import { liveCriteria } from "./simulation.ts";

export interface Hint {
  criterion: SignalName;
  label: string;
  text: string;
  /** Id del documento de la base de conocimiento del que salió el consejo (trazabilidad). */
  source: string;
}

/**
 * «Pista IA» en vivo: toma el criterio más débil, recupera de la base de conocimiento el consejo
 * más relevante para esa situación y lo muestra con su fuente. Si todo va bien, no molesta.
 */
export function coach(scenario: Scenario, state: SimState, retriever: Retriever): Hint | null {
  if (state.turns.length === 0 || state.done) return null;
  const views = liveCriteria(scenario, state);
  const lastCustomerLine = state.turns.at(-1)?.reply ?? "";
  const lastUserTurn = state.turns.at(-1);

  // Prioridad: tono si hay tensión; luego empatía antes que solución (primero validar), y cierre al final.
  const order: SignalName[] = [];
  if (lastUserTurn && (lastUserTurn.analysis.tone < 0.5 || lastUserTurn.analysis.flags.length > 0)) order.push("tone");
  order.push("empathy", "solution", "closure");

  const target = order.find((id) => {
    const status = views.find((v) => v.id === id)?.status;
    if (id === "closure") return status !== "good" && state.turns.length >= 3;
    return status !== "good";
  });
  if (!target) return null;

  const label = scenario.criteria.find((c) => c.id === target)?.label ?? target;
  const query = `${scenario.context} ${label} ${lastCustomerLine}`;
  const best = retriever.search(query, { criterion: target, k: 1 })[0];
  if (!best) return null;
  return { criterion: target, label, text: best.doc.tip, source: best.doc.id };
}
