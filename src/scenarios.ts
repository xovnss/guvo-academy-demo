import type { Criterion, Scenario } from "./types.ts";

// Todos los escenarios son ficticios: personas, negocios y diálogos inventados para esta demo.

const SERVICE_CRITERIA: Criterion[] = [
  { id: "empathy", label: "Empatía y validación emocional", weight: 0.3 },
  { id: "solution", label: "Claridad en la propuesta de solución", weight: 0.3 },
  { id: "tone", label: "Manejo del tono", weight: 0.2 },
  { id: "closure", label: "Cierre efectivo", weight: 0.2 },
];

const SALES_CRITERIA: Criterion[] = [
  { id: "empathy", label: "Escucha activa", weight: 0.25 },
  { id: "solution", label: "Propuesta de valor", weight: 0.35 },
  { id: "tone", label: "Tono y presencia", weight: 0.2 },
  { id: "closure", label: "Cierre de la venta", weight: 0.2 },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "clientes-dificiles",
    title: "Manejo de clientes difíciles",
    category: "Habilidades blandas",
    level: "Intermedio",
    minutes: "10-15 min",
    context:
      "Eres asesor en una clínica dental. Un paciente, Juan, llega molesto porque su cita fue cancelada sin aviso. Es la segunda vez que le pasa.",
    objective: "Mantener la calma, validar la emoción del cliente y ofrecer una solución concreta.",
    criteria: SERVICE_CRITERIA,
    tips: [
      "Escucha primero, responde después.",
      "Valida la emoción antes de proponer solución.",
      "Sé específico con fechas y compromisos.",
      "Cierra con confirmación del acuerdo.",
    ],
    persona: {
      name: "Juan Ramírez",
      initials: "JR",
      opening:
        "¡Esto es increíble! Llegué hasta acá desde Tlalnepantla y me dicen que mi cita está cancelada. ¿Por qué nadie me avisó? Literalmente pedí permiso en el trabajo para venir.",
    },
    moodLabels: ["Tranquilo", "Neutral", "Molesto", "Furioso"],
    meterName: "Termómetro emocional",
    startAnger: 78,
    maxTurns: 10,
    suggestions: ["Entiendo tu frustración, Juan", "Lamento mucho lo sucedido", "Te ofrezco reagendar hoy mismo"],
    replies: {
      furious: [
        "¿Y eso es todo? Perdí medio día de trabajo. ¡Quiero una explicación ahora!",
        "No me interesa cómo funcionan sus sistemas, ¡me hicieron perder el día!",
        "Es la segunda vez. ¿Qué clase de servicio es este?",
      ],
      upset: [
        "Entiendo lo que me dices, pero sigo molesto. ¿Cómo me garantizan que esto no vuelva a pasar?",
        "Bueno, ¿y qué van a hacer exactamente para compensarme?",
        "Ya me lo habían prometido antes. ¿Qué va a ser diferente ahora?",
      ],
      neutral: [
        "Bueno... si me dan una fecha concreta, podría considerarlo.",
        "Está bien, pero espero que esta vez sí cumplan. ¿Me pueden confirmar por escrito?",
        "De acuerdo. ¿Y a qué hora sería? Necesito avisar en mi trabajo.",
      ],
      calm: [
        "Gracias por atenderme con calidez, lo aprecio. Quedo atento a la confirmación.",
        "Perfecto, así sí. Muchas gracias por resolverlo.",
      ],
      hostile: ["¡No me hable así! Quiero hablar con su gerente.", "Con ese tono no vamos a ningún lado."],
      defensive: [
        "Lo que yo necesito no es saber de quién fue la culpa, sino una solución.",
        "Eso no me sirve de nada. Yo solo quiero que me atiendan bien.",
      ],
      short: ["¿Eso es todo lo que me va a decir?", "Necesito algo más que eso, por favor."],
      vague: [
        "«Veremos qué se puede hacer» no es una respuesta. ¿Cuándo exactamente?",
        "Eso suena muy vago. Quiero una fecha y una hora.",
      ],
    },
  },
  {
    id: "objeciones-de-venta",
    title: "Manejo de objeciones de venta",
    category: "Ventas",
    level: "Intermedio",
    minutes: "10-15 min",
    context:
      "Vendes un software de agenda y recordatorios para consultorios. Laura, dueña de un consultorio, dice que le interesa pero que «está muy caro» y que lo va a pensar.",
    objective: "Entender la objeción real, mostrar valor concreto y lograr un siguiente paso acordado.",
    criteria: SALES_CRITERIA,
    tips: [
      "Pregunta antes de rebatir: ¿caro comparado con qué?",
      "Conecta el precio con un beneficio medible.",
      "Ofrece una opción (plan, prueba) en lugar de un descuento a ciegas.",
      "Cierra con una fecha para el siguiente paso.",
    ],
    persona: {
      name: "Laura Medina",
      initials: "LM",
      opening:
        "Me interesa, pero la verdad lo veo muy caro para mi consultorio. Somos solo tres personas. Déjame pensarlo y te aviso, ¿va?",
    },
    moodLabels: ["Convencida", "Abierta", "Dudosa", "Cerrada"],
    meterName: "Resistencia",
    startAnger: 70,
    maxTurns: 10,
    suggestions: ["Te entiendo, ¿caro comparado con qué?", "Te propongo una prueba gratis de 14 días", "¿Te parece si te llamo el jueves?"],
    replies: {
      furious: [
        "Mira, no tengo presupuesto. Prefiero seguir con mi agenda de papel.",
        "Siempre dicen lo mismo. No quiero más gastos fijos.",
      ],
      upset: [
        "Entiendo, pero tres mil al mes es mucho. ¿Qué me da que no me dé una libreta?",
        "¿Y cómo sé que me va a ahorrar algo real?",
        "Lo comparé con otro y es más barato. ¿Por qué debería pagar más?",
      ],
      neutral: [
        "Mmm, si de verdad reduce las inasistencias, tendría sentido. ¿Tienes algún caso parecido?",
        "Una prueba sí me convence más. ¿Cuánto tardaría en configurarlo?",
        "Podría ser. ¿Qué pasaría con mis pacientes actuales?",
      ],
      calm: [
        "Va, me convenciste. Hagamos la prueba y lo vemos. Mándame los detalles.",
        "Perfecto, agendemos. Gracias por explicarlo tan claro.",
      ],
      hostile: ["No me hables así, por favor. Así no se vende.", "Con esa actitud mejor lo dejamos."],
      defensive: [
        "No me digas que es barato, para mí no lo es. Escúchame primero.",
        "No es cuestión de quién tiene razón; es mi dinero.",
      ],
      short: ["¿Nada más? Necesito algo más concreto.", "Dame un poco más de información, ¿no?"],
      vague: ["Eso es muy general. ¿Cuánto me ahorra y en cuánto tiempo?", "Dame números, no promesas."],
    },
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
