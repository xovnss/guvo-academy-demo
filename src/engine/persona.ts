import type { Flag, Scenario, TurnAnalysis } from "../types.ts";
import { moodOf } from "./emotion.ts";

/** Quien responde como el cliente/prospecto. Hay una versión por reglas y una con LLM. */
export interface Persona {
  readonly name: string;
  reply(input: {
    scenario: Scenario;
    anger: number;
    analysis: TurnAnalysis;
    userMessage: string;
    turnIndex: number;
    history: Array<{ user: string; reply: string }>;
  }): Promise<string>;
}

const FLAG_PRIORITY: Array<[Flag, keyof Scenario["replies"]]> = [
  ["hostile", "hostile"],
  ["defensive", "defensive"],
  ["blame", "defensive"],
  ["too_short", "short"],
  ["vague", "vague"],
];

export class RulePersona implements Persona {
  readonly name = "rules";

  async reply({ scenario, anger, analysis, turnIndex }: Parameters<Persona["reply"]>[0]): Promise<string> {
    let bank: keyof Scenario["replies"] = moodOf(anger, scenario).band;
    for (const [flag, target] of FLAG_PRIORITY) {
      if (analysis.flags.includes(flag)) {
        bank = target;
        break;
      }
    }
    const options = scenario.replies[bank];
    // Determinista: avanza por la lista según el turno, así la conversación no repite y las pruebas son estables.
    return options[turnIndex % options.length] ?? options[0] ?? "...";
  }
}
