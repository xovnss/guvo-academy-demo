import { randomUUID } from "node:crypto";
import { CertificateAuthority, cleanName } from "./certificate.ts";
import { coach } from "./engine/coach.ts";
import type { Hint } from "./engine/coach.ts";
import { moodOf } from "./engine/emotion.ts";
import type { Persona } from "./engine/persona.ts";
import type { Analyzer } from "./engine/analyzer.ts";
import { buildReport } from "./engine/scoring.ts";
import type { Report } from "./engine/scoring.ts";
import { finish, liveCriteria, startSimulation, step } from "./engine/simulation.ts";
import type { CriterionView, TurnResult } from "./engine/simulation.ts";
import type { Retriever } from "./rag/index.ts";
import { getScenario, SCENARIOS } from "./scenarios.ts";
import type { Scenario, SimState } from "./types.ts";

export class AppError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Session {
  id: string;
  name: string;
  scenario: Scenario;
  state: SimState;
  createdAt: number;
  busy: boolean;
  certificate: string | null;
}

export interface Deps {
  analyzer: Analyzer;
  persona: Persona;
  retriever: Retriever;
  authority: CertificateAuthority;
  now?: () => Date;
  ttlMs?: number;
  maxSessions?: number;
}

export interface MeterView {
  anger: number;
  label: string;
  emoji: string;
  trend?: string;
}

export interface StartView {
  sessionId: string;
  scenario: Pick<Scenario, "id" | "title" | "context" | "objective" | "tips" | "suggestions" | "meterName" | "maxTurns"> & {
    persona: { name: string; initials: string };
  };
  opening: string;
  meter: MeterView;
  criteria: CriterionView[];
}

export interface MessageView {
  reply: string;
  meter: MeterView;
  criteria: CriterionView[];
  hint: Hint | null;
  done: TurnResult["done"];
  turnsLeft: number;
}

export interface FinishView {
  report: Report;
  certificate: { token: string; id: string } | null;
}

/** Lógica de la aplicación, separada de HTTP para poder probarla directamente. */
export class Academy {
  #deps: Deps;
  #sessions = new Map<string, Session>();

  constructor(deps: Deps) {
    this.#deps = deps;
  }

  listScenarios() {
    return SCENARIOS.map(({ id, title, category, level, minutes, context, objective }) => ({
      id,
      title,
      category,
      level,
      minutes,
      context,
      objective,
    }));
  }

  #sweep() {
    const now = (this.#deps.now ?? (() => new Date()))().getTime();
    const ttl = this.#deps.ttlMs ?? 60 * 60_000;
    for (const [id, s] of this.#sessions) if (now - s.createdAt > ttl) this.#sessions.delete(id);
    const max = this.#deps.maxSessions ?? 500;
    while (this.#sessions.size >= max) {
      const oldest = this.#sessions.keys().next().value;
      if (oldest === undefined) break;
      this.#sessions.delete(oldest);
    }
  }

  start(scenarioId: unknown, name: unknown): StartView {
    const scenario = typeof scenarioId === "string" ? getScenario(scenarioId) : undefined;
    if (!scenario) throw new AppError(404, "Escenario no encontrado.");
    this.#sweep();
    const state = startSimulation(scenario);
    const session: Session = {
      id: randomUUID(),
      name: cleanName(typeof name === "string" ? name : ""),
      scenario,
      state,
      createdAt: (this.#deps.now ?? (() => new Date()))().getTime(),
      busy: false,
      certificate: null,
    };
    this.#sessions.set(session.id, session);
    const mood = moodOf(state.anger, scenario);
    return {
      sessionId: session.id,
      scenario: {
        id: scenario.id,
        title: scenario.title,
        context: scenario.context,
        objective: scenario.objective,
        tips: scenario.tips,
        suggestions: scenario.suggestions,
        meterName: scenario.meterName,
        maxTurns: scenario.maxTurns,
        persona: { name: scenario.persona.name, initials: scenario.persona.initials },
      },
      opening: scenario.persona.opening,
      meter: { anger: state.anger, label: mood.label, emoji: mood.emoji },
      criteria: liveCriteria(scenario, state),
    };
  }

  #get(id: string): Session {
    const session = this.#sessions.get(id);
    if (!session) throw new AppError(404, "La sesión no existe o ya expiró.");
    return session;
  }

  async message(id: string, text: unknown): Promise<MessageView> {
    const session = this.#get(id);
    if (typeof text !== "string") throw new AppError(400, "Falta el texto del mensaje.");
    if (session.state.done) throw new AppError(409, "La simulación ya terminó. Pide el resultado.");
    if (session.busy) throw new AppError(409, "Espera la respuesta anterior antes de enviar otro mensaje.");
    session.busy = true;
    try {
      const result = await step(session.scenario, session.state, text, this.#deps);
      return {
        reply: result.reply,
        meter: { anger: result.anger, label: result.mood.label, emoji: result.mood.emoji, trend: result.trend },
        criteria: result.criteria,
        hint: coach(session.scenario, session.state, this.#deps.retriever),
        done: result.done,
        turnsLeft: Math.max(0, session.scenario.maxTurns - session.state.turns.length),
      };
    } catch (error) {
      if (error instanceof Error && /vacío|pasar de/.test(error.message)) throw new AppError(400, error.message);
      throw error;
    } finally {
      session.busy = false;
    }
  }

  finish(id: string): FinishView {
    const session = this.#get(id);
    finish(session.state);
    const report = buildReport(session.scenario, session.state);
    if (report.passed && !session.certificate) {
      session.certificate = this.#deps.authority.issue(
        {
          name: session.name,
          course: session.scenario.title,
          score: report.score,
          superpower: report.superpower,
          improvement: report.improvement,
        },
        (this.#deps.now ?? (() => new Date()))(),
      );
    }
    const verified = session.certificate ? this.#deps.authority.verify(session.certificate) : null;
    return {
      report,
      certificate: verified?.valid && session.certificate ? { token: session.certificate, id: verified.payload.id } : null,
    };
  }

  get authority() {
    return this.#deps.authority;
  }
}
