import type { SignalName } from "../types.ts";

/**
 * Base de conocimiento del coach. Son guías breves escritas para esta demo (material propio, no de ningún cliente).
 * Cada documento apunta a un criterio, para que el coach recupere consejos del criterio más débil.
 */
export interface KbDoc {
  id: string;
  title: string;
  criterion: SignalName;
  /** Consejo corto para mostrar en vivo. */
  tip: string;
  /** Texto completo, que es lo que se indexa. */
  text: string;
}

export const KB: KbDoc[] = [
  {
    id: "emp-01",
    title: "Valida antes de resolver",
    criterion: "empathy",
    tip: "Valida cómo se siente antes de proponer una solución.",
    text: "Una persona molesta no escucha soluciones hasta sentirse escuchada. Nombra la emoción (entiendo tu frustración, debe ser molesto), reconoce el inconveniente concreto que vivió y solo después propone una salida. Proponer la solución demasiado pronto suena a que quieres cerrar rápido el problema.",
  },
  {
    id: "emp-02",
    title: "Disculpa específica",
    criterion: "empathy",
    tip: "Pide una disculpa específica: di exactamente qué salió mal.",
    text: "Una disculpa genérica (perdón por las molestias) casi no calma. Una disculpa específica sí: lamento que te hayan cancelado la cita sin avisarte y que hayas venido hasta aquí. Menciona el hecho, asume la responsabilidad del equipo sin buscar culpables y no pongas excusas.",
  },
  {
    id: "emp-03",
    title: "Pregunta antes de rebatir",
    criterion: "empathy",
    tip: "Haz una pregunta para entender el motivo real antes de responder.",
    text: "Ante una objeción o queja, pregunta antes de responder: caro comparado con qué, qué fue lo que más te afectó, cuál es tu principal preocupación. La escucha activa descubre la objeción real y muestra respeto por la persona.",
  },
  {
    id: "sol-01",
    title: "Solución con fecha y hora",
    criterion: "solution",
    tip: "Ofrece una solución concreta con fecha y hora, no promesas generales.",
    text: "Veremos qué se puede hacer genera más enojo. Una propuesta concreta incluye acción, fecha y hora: puedo reagendarte mañana jueves a las 10:00. Si hay varias opciones, ofrece dos o tres para que la persona sienta control.",
  },
  {
    id: "sol-02",
    title: "Conecta el precio con un beneficio medible",
    criterion: "solution",
    tip: "Conecta el precio con un beneficio medible (ahorro, tiempo, ingresos).",
    text: "Ante la objeción de precio no defiendas el costo: traduce el valor. Cuántas inasistencias evita, cuánto tiempo ahorra al equipo, en cuántos meses se recupera la inversión. Ofrece un plan o una prueba gratuita en lugar de un descuento a ciegas.",
  },
  {
    id: "sol-03",
    title: "Compensa cuando hubo falla",
    criterion: "solution",
    tip: "Si la falla fue tuya, considera un gesto de compensación razonable.",
    text: "Cuando el error fue de la empresa, además de resolver ofrece un gesto proporcional: prioridad en la siguiente cita, un servicio sin costo o un descuento. La compensación demuestra que el problema se toma en serio.",
  },
  {
    id: "ton-01",
    title: "Tono calmado y sin culpas",
    criterion: "tone",
    tip: "Mantén un tono calmado: sin culpar, sin defenderte y sin decir cálmate.",
    text: "Evita frases defensivas (no es mi culpa, así son las reglas) y no pidas que se calme: eso se escucha como menosprecio. Habla despacio, con frases cortas, usa el nombre de la persona y palabras de cortesía como con gusto, por favor y gracias.",
  },
  {
    id: "ton-02",
    title: "No te lo tomes personal",
    criterion: "tone",
    tip: "No te lo tomes personal: la molestia es con la situación, no contigo.",
    text: "Cuando alguien alza la voz o usa mayúsculas, la molestia casi nunca es contigo. Responde con el mismo volumen de siempre. Si respondes con tensión, la tensión crece. Una respuesta serena baja la temperatura de la conversación.",
  },
  {
    id: "cie-01",
    title: "Confirma el acuerdo",
    criterion: "closure",
    tip: "Cierra confirmando el acuerdo por escrito y con un siguiente paso claro.",
    text: "Al terminar resume lo acordado, confirma por escrito (correo o mensaje) y pregunta si está de acuerdo. Un cierre efectivo deja claro quién hace qué y cuándo. Sin confirmación, la persona se queda con la duda y puede volver a molestarse.",
  },
  {
    id: "cie-02",
    title: "Cierre de ventas con fecha",
    criterion: "closure",
    tip: "Acuerda una fecha concreta para el siguiente paso, por ejemplo una llamada.",
    text: "En ventas, no termines con te aviso o lo pensamos. Propón un siguiente paso con fecha: te llamo el jueves a las 11 para resolver dudas, o te dejo activa la prueba hoy mismo. Pregunta si le parece bien.",
  },
];
