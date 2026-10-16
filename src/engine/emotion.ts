import { clamp } from "../text.ts";
import type { Scenario, TurnAnalysis } from "../types.ts";

/**
 * Cuánto cambia la molestia (0–100) después de un mensaje. Negativo = se calma.
 *  - La empatía es lo que más calma. Proponer solución sin validar primero funciona a medias
 *    (por eso el consejo «valida la emoción antes de proponer solución»).
 *  - Un tono pobre y las banderas rojas (hostil, culpar, defenderse, evasivas) la suben.
 */
export function angerDelta(a: TurnAnalysis): number {
  let delta = 0;
  delta -= 20 * a.empathy;
  delta -= 16 * a.solution * (a.empathy >= 0.3 ? 1 : 0.5);
  delta -= 8 * a.closure * (a.solution > 0.3 ? 1 : 0.4);
  if (a.tone < 0.6) delta += ((0.6 - a.tone) / 0.6) * 30;
  if (a.flags.includes("hostile")) delta += 12;
  if (a.flags.includes("blame")) delta += 10;
  if (a.flags.includes("defensive")) delta += 8;
  if (a.flags.includes("vague")) delta += 4;
  if (a.flags.includes("too_short")) delta += 3;
  // Un mensaje sin nada útil tampoco deja a la persona igual: se impacienta un poco.
  if (a.empathy < 0.15 && a.solution < 0.15 && a.closure < 0.15 && delta <= 0) delta += 3;
  return delta;
}

export function nextAnger(current: number, a: TurnAnalysis): { anger: number; delta: number } {
  const delta = angerDelta(a);
  const anger = Math.round(clamp(current + delta, 0, 100));
  return { anger, delta: anger - current };
}

export type Trend = "bajando" | "subiendo" | "estable";

export function trendOf(delta: number): Trend {
  if (delta <= -2) return "bajando";
  if (delta >= 2) return "subiendo";
  return "estable";
}

export interface Mood {
  label: string;
  emoji: string;
  band: "calm" | "neutral" | "upset" | "furious";
}

export function moodOf(anger: number, scenario: Scenario): Mood {
  const [calm, neutral, upset, furious] = scenario.moodLabels;
  if (anger >= 80) return { label: furious, emoji: "😡", band: "furious" };
  if (anger >= 55) return { label: upset, emoji: "😠", band: "upset" };
  if (anger >= 30) return { label: neutral, emoji: "😐", band: "neutral" };
  return { label: calm, emoji: "🙂", band: "calm" };
}
