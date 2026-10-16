import { clamp, fold } from "../text.ts";
import type { Flag, TurnAnalysis } from "../types.ts";

/** Convierte el mensaje de la persona en señales medibles. Hay una versión por reglas y una con LLM. */
export interface Analyzer {
  readonly name: string;
  analyze(message: string, context: { scenarioContext: string; lastReply: string }): Promise<TurnAnalysis>;
}

const count = (text: string, patterns: RegExp[]) => patterns.filter((p) => p.test(text)).length;

const APOLOGY = [/\b(lamento|siento mucho|disculp|perdon|ofrezco una disculpa|mis disculpas)/];
const VALIDATION = [
  /\b(te |lo |la )?(entiendo|comprendo)\b/,
  /\b(tiene|tienes) (toda la )?razon/,
  /\bme imagino/,
  /\bdebe ser (muy )?(frustrante|molesto|dificil)/,
  /\b(es|fue) (muy )?(frustrante|molesto|comprensible)/,
  /\bcon todo derecho/,
];
const EMOTION_WORDS = [/\b(frustracion|molestia|enojo|coraje|preocupacion|inconveniente|incomodidad)/];
const THANKS = [/\bgracias por (avisar|decirme|decirnos|tu paciencia|su paciencia|esperar|compartir|tu comprension)/];
const ASKS = [/\b(cuentame|me puedes contar|que fue lo que paso|que paso|como te afecto|cual es tu (principal )?(preocupacion|duda))/, /\bcaro comparado con/];

const ACTION = [
  /\b(reagend|reprogram|cambiar la cita|te ofrezco|le ofrezco|te propongo|le propongo|podemos (agendar|ofrecer|hacer)|puedo (agendar|ofrecer|hacer|darte|darle)|te puedo|le puedo)/,
  /\b(compens|descuento|sin costo|gratis|prioridad|prueba gratuita|periodo de prueba|plan (basico|mensual|anual))/,
  /\b(opciones|alternativa)/,
];
const VALUE = [/\b(ahorr|reduc|retorno|roi|beneficio|incluye|garantia|inasistencia|recordatorio|automatiz|clientes recurrentes)/];
const WHEN = [
  /\b(hoy|manana|pasado manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo|esta semana|proxima semana)\b/,
  /\b\d{1,2}(:\d{2})?\s?(am|pm|hrs?|h|horas)\b/,
  /\b\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/,
  /\b\d{1,3} dias\b/,
];
const VAGUE = [/\bveremos|\ba ver (que|si|como)|haremos lo posible|trataremos|intentare|tal vez|quiza|no se si|ya veremos|vamos a ver/];

const CLOSURE = [
  /\b(te|le) (confirmo|enviare|mandare|escribo|llamo|marco|compartire)/,
  /\bqueda(ra)? (agendad|confirmad|registrad|asegurad)/,
  /\bpor (escrito|correo|whatsapp|mensaje)/,
  /\b(te|le) (parece|queda bien|late|funciona)/,
  /\b(de acuerdo|quedamos|quedamos en|acordamos|seguimiento|siguiente paso|confirmame|confirmeme)/,
  /\brecibiras|recibira (un|una|el|la)/,
];

const HOSTILE = [
  /\b(idiota|estupid|imbecil|callate|no me importa|no es mi problema|tu problema|que quieres que haga|que quiere que haga|no sea (exagerad|dramatic))/,
  /\b(calmate|tranquilizate|relajate)\b/,
  /\bsi no te gusta|si no le gusta/,
];
const DEFENSIVE = [
  /\bno (es|fue) (mi|nuestra) (culpa|error|responsabilidad)/,
  /\byo no (fui|hice|cancele|tengo)/,
  /\b(asi son las reglas|es la politica|son las politicas|no puedo hacer nada|no esta en mis manos)/,
];
const BLAME = [/\b(es|fue) (tu|su) culpa/, /\busted (no )?(debio|debia|tenia que|deberia)/, /\bdeberias haber|debio haber/, /\bno (nos )?(contesto|respondio|leyo)/];
const COURTESY = [/\bpor favor/, /\bcon gusto/, /\bgracias/, /\bclaro que si/, /\ble agradezco|te agradezco/];

/** Modelo por reglas en español: determinista, gratuito y auditable. Sirve de demo, de pruebas y de respaldo del LLM. */
export class RuleAnalyzer implements Analyzer {
  readonly name = "rules";

  async analyze(message: string): Promise<TurnAnalysis> {
    return analyzeByRules(message);
  }
}

export function analyzeByRules(message: string): TurnAnalysis {
  const t = fold(message);
  const words = t.split(/\s+/).filter(Boolean);
  const flags: Flag[] = [];

  // Empatía: disculpa + validación + nombrar la emoción (+ preguntar). Se necesitan varias para llegar a 1.
  const empathy = clamp(
    0.55 * Math.min(1, count(t, APOLOGY)) +
      0.5 * Math.min(1, count(t, VALIDATION)) +
      0.25 * Math.min(1, count(t, EMOTION_WORDS)) +
      0.2 * Math.min(1, count(t, THANKS)) +
      0.25 * Math.min(1, count(t, ASKS)),
  );

  // Solución: una acción concreta cuenta, y más si trae fecha/hora o beneficio medible. Las evasivas restan.
  // «No puedo hacer nada» contiene «puedo hacer» pero es lo contrario de ofrecer una solución.
  const action = /\bno (puedo|podemos|se puede)\b/.test(t) ? 0 : Math.min(1, count(t, ACTION));
  const when = Math.min(1, count(t, WHEN));
  const value = Math.min(1, count(t, VALUE));
  let solution = clamp(0.45 * action + 0.4 * when + 0.2 * value);
  if (count(t, VAGUE) > 0) {
    flags.push("vague");
    solution = Math.min(solution, 0.25);
  }

  // Tono: parte de neutral-profesional y baja con hostilidad, gritos o descalificaciones.
  const letters = message.replace(/[^\p{L}]/gu, "");
  const upper = letters.replace(/[^\p{Lu}]/gu, "");
  const shouting = letters.length > 8 && upper.length / letters.length > 0.6;
  let tone = 0.75 + 0.1 * Math.min(1, count(t, COURTESY));
  if (count(t, HOSTILE) > 0) {
    flags.push("hostile");
    tone -= 0.6;
  }
  if (shouting) tone -= 0.3;
  if (/!{3,}/.test(message)) tone -= 0.1;
  tone = clamp(tone);

  if (count(t, DEFENSIVE) > 0) flags.push("defensive");
  if (count(t, BLAME) > 0) {
    flags.push("blame");
    tone = clamp(tone - 0.15);
  }

  // Cierre: confirmar, dar seguimiento o preguntar si está de acuerdo.
  const closure = clamp(0.5 * Math.min(2, count(t, CLOSURE)));

  if (words.length < 3) flags.push("too_short");
  return { empathy, solution, tone, closure, flags };
}

/**
 * Última barrera antes de que una salida cuente para la calificación: acota valores y descarta banderas inválidas.
 * Un mensaje trivial no puede obtener una puntuación alta aunque el analizador (p. ej. un LLM manipulado) la dé.
 */
export function sanitizeAnalysis(raw: unknown, message: string): TurnAnalysis {
  const r = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? clamp(v) : 0);
  const validFlags: Flag[] = ["defensive", "blame", "vague", "hostile", "too_short"];
  const flags = Array.isArray(r.flags) ? (r.flags.filter((f) => validFlags.includes(f as Flag)) as Flag[]) : [];
  const analysis: TurnAnalysis = {
    empathy: num(r.empathy),
    solution: num(r.solution),
    tone: typeof r.tone === "number" ? num(r.tone) : 0.6,
    closure: num(r.closure),
    flags: [...new Set(flags)],
  };
  if (message.trim().length < 25) {
    const cap = 0.4;
    analysis.empathy = Math.min(analysis.empathy, cap);
    analysis.solution = Math.min(analysis.solution, cap);
    analysis.closure = Math.min(analysis.closure, cap);
  }
  return analysis;
}
