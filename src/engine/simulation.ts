import type { CriterionStatus, DoneReason, Scenario, SignalName, SimState, TurnAnalysis } from "../types.ts";
import { sanitizeAnalysis } from "./analyzer.ts";
import type { Analyzer } from "./analyzer.ts";
import { moodOf, nextAnger, trendOf } from "./emotion.ts";
import type { Mood, Trend } from "./emotion.ts";
import type { Persona } from "./persona.ts";

export const MAX_USER_CHARS = 500;

export function startSimulation(scenario: Scenario): SimState {
  return { scenarioId: scenario.id, anger: scenario.startAnger, turns: [], done: null };
}

export interface CriterionView {
  id: SignalName;
  label: string;
  status: CriterionStatus;
}

/** Estado de cada criterio «en vivo» (pendiente / cuidado / bien), según la evidencia hasta el momento. */
export function liveCriteria(scenario: Scenario, state: SimState): CriterionView[] {
  const turns = state.turns;
  return scenario.criteria.map(({ id, label }) => {
    if (turns.length === 0) return { id, label, status: "pending" as const };
    let value: number;
    if (id === "tone") {
      const recent = turns.slice(-2).map((t) => t.analysis.tone);
      value = recent.reduce((s, v) => s + v, 0) / recent.length;
    } else {
      value = Math.max(...turns.map((t) => t.analysis[id]));
    }
    let status: CriterionStatus;
    if (value >= 0.6) status = "good";
    else if (value >= 0.3 || id === "tone") status = "care";
    else status = turns.length >= 2 ? "care" : "pending";
    return { id, label, status };
  });
}

export interface TurnResult {
  reply: string;
  analysis: TurnAnalysis;
  anger: number;
  delta: number;
  mood: Mood;
  trend: Trend;
  criteria: CriterionView[];
  done: DoneReason | null;
}

export interface Engine {
  analyzer: Analyzer;
  persona: Persona;
}

/** Procesa un mensaje del participante: lo analiza, mueve el termómetro y deja que el interlocutor responda. */
export async function step(scenario: Scenario, state: SimState, message: string, engine: Engine): Promise<TurnResult> {
  if (state.done) throw new Error("La simulación ya terminó.");
  const text = message.trim();
  if (!text) throw new Error("El mensaje está vacío.");
  if (text.length > MAX_USER_CHARS) throw new Error(`El mensaje no puede pasar de ${MAX_USER_CHARS} caracteres.`);

  const lastReply = state.turns.at(-1)?.reply ?? scenario.persona.opening;
  const raw = await engine.analyzer.analyze(text, { scenarioContext: scenario.context, lastReply });
  const analysis = sanitizeAnalysis(raw, text);

  const { anger, delta } = nextAnger(state.anger, analysis);
  const history = state.turns.map((t) => ({ user: t.user, reply: t.reply }));
  const reply = await engine.persona.reply({
    scenario,
    anger,
    analysis,
    userMessage: text,
    turnIndex: state.turns.length,
    history,
  });

  state.turns.push({ user: text, reply, analysis, anger });
  state.anger = anger;

  state.done = outcome(scenario, state);
  return {
    reply,
    analysis,
    anger,
    delta,
    mood: moodOf(anger, scenario),
    trend: trendOf(delta),
    criteria: liveCriteria(scenario, state),
    done: state.done,
  };
}

function outcome(scenario: Scenario, state: SimState): DoneReason | null {
  const closureSeen = state.turns.some((t) => t.analysis.closure >= 0.5);
  if (state.anger <= 12 && closureSeen) return "resolved";
  const last = state.turns.slice(-2);
  if (last.length === 2 && last.every((t) => t.anger >= 100)) return "lost";
  if (state.turns.length >= scenario.maxTurns) return "max_turns";
  return null;
}

export function finish(state: SimState): void {
  if (!state.done) state.done = "finished";
}

