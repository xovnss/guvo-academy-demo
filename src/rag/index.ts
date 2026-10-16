import { tokenize } from "../text.ts";
import type { SignalName } from "../types.ts";
import { KB } from "./kb.ts";
import type { KbDoc } from "./kb.ts";

/**
 * Recuperación léxica TF-IDF con similitud coseno, sin dependencias.
 * Para una base chica y en español es rápida, explicable y no necesita embeddings;
 * la interfaz `Retriever` permite cambiarla después por una búsqueda vectorial.
 */
export interface Hit {
  doc: KbDoc;
  score: number;
}

export interface Retriever {
  search(query: string, options?: { criterion?: SignalName; k?: number }): Hit[];
}

type Vector = Map<string, number>;

export class TfIdfRetriever implements Retriever {
  #docs: KbDoc[];
  #idf = new Map<string, number>();
  #vectors: Vector[] = [];

  constructor(docs: KbDoc[] = KB) {
    this.#docs = docs;
    const tokenized = docs.map((d) => tokenize(`${d.title} ${d.title} ${d.text}`));
    const df = new Map<string, number>();
    for (const tokens of tokenized) for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
    for (const [term, n] of df) this.#idf.set(term, Math.log(1 + docs.length / n));
    this.#vectors = tokenized.map((tokens) => this.#vectorize(tokens));
  }

  #vectorize(tokens: string[]): Vector {
    const tf = new Map<string, number>();
    for (const t of tokens) if (this.#idf.has(t)) tf.set(t, (tf.get(t) ?? 0) + 1);
    const vector: Vector = new Map();
    let norm = 0;
    for (const [term, n] of tf) {
      const weight = (1 + Math.log(n)) * (this.#idf.get(term) ?? 0);
      vector.set(term, weight);
      norm += weight * weight;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, w] of vector) vector.set(term, w / norm);
    return vector;
  }

  search(query: string, { criterion, k = 3 }: { criterion?: SignalName; k?: number } = {}): Hit[] {
    const q = this.#vectorize(tokenize(query));
    const hits: Hit[] = [];
    this.#docs.forEach((doc, i) => {
      if (criterion && doc.criterion !== criterion) return;
      const v = this.#vectors[i];
      if (!v) return;
      let score = 0;
      for (const [term, w] of q) score += w * (v.get(term) ?? 0);
      hits.push({ doc, score });
    });
    // Desempate estable por id para que los resultados sean deterministas.
    return hits.sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id)).slice(0, k);
  }
}
