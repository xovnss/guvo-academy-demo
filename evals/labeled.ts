import type { SignalName } from "../src/types.ts";

/** Mensajes etiquetados a mano: la señal indicada debe quedar «alta» (>= 0.5) o «baja» (< 0.3). */
export interface Labeled {
  text: string;
  signal: SignalName;
  expect: "high" | "low";
}

export const LABELED: Labeled[] = [
  { text: "Lamento mucho lo sucedido, Juan.", signal: "empathy", expect: "high" },
  { text: "Entiendo tu frustración, debe ser muy molesto.", signal: "empathy", expect: "high" },
  { text: "Te ofrezco una disculpa por no avisarte.", signal: "empathy", expect: "high" },
  { text: "Tienes toda la razón en estar molesto.", signal: "empathy", expect: "high" },
  { text: "Hola, ¿en qué le ayudo?", signal: "empathy", expect: "low" },
  { text: "Eso no depende de mí.", signal: "empathy", expect: "low" },
  { text: "Tiene que sacar otra cita en recepción.", signal: "empathy", expect: "low" },

  { text: "Te propongo reagendar mañana a las 10:00 sin costo.", signal: "solution", expect: "high" },
  { text: "Puedo agendarte el viernes a las 9 am con prioridad.", signal: "solution", expect: "high" },
  { text: "Te ofrezco un descuento y una cita hoy mismo a las 17:00.", signal: "solution", expect: "high" },
  { text: "Veremos qué se puede hacer.", signal: "solution", expect: "low" },
  { text: "Tal vez más adelante podamos hacer algo.", signal: "solution", expect: "low" },
  { text: "No puedo hacer nada.", signal: "solution", expect: "low" },

  { text: "Gracias por avisarme, con gusto te ayudo.", signal: "tone", expect: "high" },
  { text: "Claro que sí, con gusto lo revisamos.", signal: "tone", expect: "high" },
  { text: "Cálmate, no es mi problema.", signal: "tone", expect: "low" },
  { text: "NO ME GRITE, ESTO ES SU CULPA!!!", signal: "tone", expect: "low" },
  { text: "Si no te gusta, ve a otra clínica.", signal: "tone", expect: "low" },

  { text: "Te confirmo por correo hoy mismo, ¿te parece bien?", signal: "closure", expect: "high" },
  { text: "Queda agendada tu cita y te llamo mañana para dar seguimiento.", signal: "closure", expect: "high" },
  { text: "Acordamos el siguiente paso: te escribo por WhatsApp.", signal: "closure", expect: "high" },
  { text: "Ok.", signal: "closure", expect: "low" },
  { text: "Bueno, ya veremos.", signal: "closure", expect: "low" },
];
