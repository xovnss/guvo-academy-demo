/** Minúsculas y sin acentos, para comparar texto en español sin que importe cómo lo escribió la persona. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const STOP = new Set(
  (
    "a al algo ante con como cual cuando de del desde donde el ella ellos en es esta este esto la las le les lo los me mi " +
    "muy no nos o para pero por porque que se si sin su sus te tu un una uno unos unas y ya es son fue ser hay"
  ).split(" "),
);

/** Palabras "significativas": sin acentos, sin palabras vacías y con plural recortado. */
export function tokenize(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
}

export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
