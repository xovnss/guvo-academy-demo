import { Academy } from "./app.ts";
import { CertificateAuthority } from "./certificate.ts";
import { RuleAnalyzer } from "./engine/analyzer.ts";
import { RulePersona } from "./engine/persona.ts";
import { LlmAnalyzer, LlmPersona, OpenAIChat } from "./llm.ts";
import { TfIdfRetriever } from "./rag/index.ts";
import { createApp } from "./server.ts";

const env = process.env;
const chat = env.OPENAI_API_KEY ? new OpenAIChat({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || undefined }) : null;

if (!env.CERT_SECRET) {
  console.warn("Aviso: sin CERT_SECRET, los certificados dejan de ser verificables al reiniciar el servidor.");
}

const academy = new Academy({
  analyzer: chat ? new LlmAnalyzer(chat) : new RuleAnalyzer(),
  persona: chat ? new LlmPersona(chat) : new RulePersona(),
  retriever: new TfIdfRetriever(),
  authority: new CertificateAuthority(env.CERT_SECRET),
});

const port = Number(env.PORT ?? 3000);
const host = env.HOST ?? "127.0.0.1";
createApp({ academy }).listen(port, host, () => {
  console.log(`Academia lista en http://${host}:${port}`);
  console.log(`  Evaluación: ${chat ? `LLM (${chat.model}) con respaldo por reglas` : "reglas en español (sin API key)"}`);
});
