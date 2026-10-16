import type { Scenario } from "../src/types.ts";

export interface ScriptedConversation {
  name: string;
  scenarioId: Scenario["id"];
  messages: string[];
  /** Rango de calificación esperado. */
  expect: { min: number; max: number; passes: boolean };
}

/** Conversaciones guionizadas con resultado esperado: sirven como pruebas de regresión del motor de calificación. */
export const CONVERSATIONS: ScriptedConversation[] = [
  {
    name: "Excelente: valida, propone con fecha y cierra",
    scenarioId: "clientes-dificiles",
    messages: [
      "Lamento mucho lo sucedido, Juan. Entiendo tu frustración: viniste desde Tlalnepantla y perdiste tiempo de trabajo.",
      "Te ofrezco reagendar hoy mismo a las 17:00 o mañana a las 9:00, con prioridad y sin costo.",
      "Te confirmo por correo ahora mismo y te llamo mañana para dar seguimiento. ¿Te parece bien?",
      "Con gusto, gracias por tu paciencia, Juan. Queda agendada tu cita.",
    ],
    expect: { min: 75, max: 100, passes: true },
  },
  {
    name: "Pésima: defensivo, culpa al cliente y grita",
    scenarioId: "clientes-dificiles",
    messages: [
      "No es mi culpa, yo no cancelé la cita. Así son las reglas.",
      "CÁLMATE, NO ES MI PROBLEMA!!!",
      "Ya veremos qué se puede hacer.",
      "Pues es tu culpa por no contestar el teléfono.",
    ],
    expect: { min: 0, max: 35, passes: false },
  },
  {
    name: "Mediocre: amable pero sin concretar",
    scenarioId: "clientes-dificiles",
    messages: [
      "Hola, buenas tardes, dígame en qué le ayudo.",
      "Entiendo, veremos qué podemos hacer.",
      "Podemos reagendar para la próxima semana.",
    ],
    expect: { min: 20, max: 69, passes: false },
  },
  {
    name: "Una sola frase perfecta no basta (tope por pocas intervenciones)",
    scenarioId: "clientes-dificiles",
    messages: [
      "Lamento mucho lo sucedido, entiendo tu frustración. Te ofrezco reagendar mañana a las 10:00 sin costo y te confirmo por correo, ¿te parece bien?",
    ],
    expect: { min: 0, max: 60, passes: false },
  },
  {
    name: "Ventas: pregunta, conecta valor y cierra con fecha",
    scenarioId: "objeciones-de-venta",
    messages: [
      "Te entiendo, Laura, y gracias por ser tan franca. ¿Caro comparado con qué lo estás midiendo?",
      "Para un consultorio de tres personas, el recordatorio automático reduce inasistencias y te ahorra tiempo de recepción. Te propongo una prueba gratis de 14 días.",
      "Te dejo la prueba activa hoy mismo y te llamo el jueves a las 11:00 para ver resultados. ¿Te parece bien?",
      "Con gusto. Te confirmo por correo los detalles, gracias por darme la oportunidad.",
    ],
    expect: { min: 70, max: 100, passes: true },
  },
];
