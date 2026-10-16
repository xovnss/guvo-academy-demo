export type SignalName = "empathy" | "solution" | "tone" | "closure";
export type Flag = "defensive" | "blame" | "vague" | "hostile" | "too_short";

/** Lo que el analizador "ve" en un mensaje del participante. Cada señal va de 0 a 1. */
export interface TurnAnalysis {
  empathy: number;
  solution: number;
  /** 1 = tono calmado y profesional, 0 = hostil. */
  tone: number;
  closure: number;
  flags: Flag[];
}

export interface Criterion {
  id: SignalName;
  label: string;
  weight: number;
}

export interface Scenario {
  id: string;
  title: string;
  category: string;
  level: string;
  minutes: string;
  context: string;
  objective: string;
  criteria: Criterion[];
  tips: string[];
  persona: { name: string; initials: string; opening: string };
  /** Nombres del estado emocional, de más calmado a más alterado. */
  moodLabels: [calm: string, neutral: string, upset: string, furious: string];
  meterName: string;
  startAnger: number;
  maxTurns: number;
  /** Respuestas del interlocutor por situación (modelo por reglas). */
  replies: Record<"furious" | "upset" | "neutral" | "calm" | "hostile" | "defensive" | "short" | "vague", string[]>;
  suggestions: string[];
}

export interface Turn {
  user: string;
  reply: string;
  analysis: TurnAnalysis;
  anger: number;
}

export type CriterionStatus = "pending" | "care" | "good";
export type DoneReason = "resolved" | "max_turns" | "lost" | "finished";

export interface SimState {
  scenarioId: string;
  anger: number;
  turns: Turn[];
  done: DoneReason | null;
}
