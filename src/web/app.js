const $ = (id) => document.getElementById(id);
const screens = ["start", "brief", "sim", "result"];
let current = null; // { sessionId, scenario }
let busy = false;

function show(name) {
  for (const s of screens) $(`screen-${s}`).hidden = s !== name;
}
function showError(message) {
  $("error").textContent = message || "";
  $("error").hidden = !message;
}

async function api(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json" },
    body: options && options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Algo salió mal.");
  return data;
}

// Todo el contenido dinámico se inserta con textContent, nunca con innerHTML.
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function bubble(who, text, mine) {
  const box = el("div", undefined, `msg${mine ? " me" : ""}`);
  box.append(el("span", who, "who"), el("span", text));
  $("log").append(box);
  $("log").scrollTop = $("log").scrollHeight;
}

const STATUS = { good: ["Bien", "st-good"], care: ["Cuidado", "st-care"], pending: ["Pendiente", "st-pending"] };

function renderCriteria(list) {
  const ul = $("criteria");
  ul.replaceChildren();
  for (const c of list) {
    const [label, cls] = STATUS[c.status];
    const li = el("li");
    li.append(el("span", c.label), el("span", label, cls));
    ul.append(li);
  }
}

function renderMeter(meter) {
  $("meter-emoji").textContent = meter.emoji;
  $("meter-label").textContent = meter.label.toUpperCase();
  $("meter-pct").textContent = `${meter.anger}%`;
  $("meter-fill").style.width = `${meter.anger}%`;
  $("meter-trend").textContent = meter.trend ? `↘ ${meter.trend}`.replace("↘ subiendo", "↗ subiendo").replace("↘ estable", "→ estable") : "";
}

function renderSuggestions(list) {
  const box = $("suggestions");
  box.replaceChildren();
  for (const text of list) {
    const b = el("button", text);
    b.type = "button";
    b.addEventListener("click", () => send(text));
    box.append(b);
  }
}

async function loadScenarios() {
  const list = await api("/api/scenarios");
  const grid = $("scenarios");
  grid.replaceChildren();
  for (const s of list) {
    const b = el("button", undefined, "scn");
    b.type = "button";
    b.append(el("strong", s.title), el("span", `${s.category} · ${s.level} · ${s.minutes}`));
    b.addEventListener("click", () => openBrief(s));
    grid.append(b);
  }
}

let picked = null;
function openBrief(s) {
  picked = s;
  $("brief-title").textContent = s.title;
  $("brief-context").textContent = s.context;
  $("brief-objective").textContent = s.objective;
  show("brief");
}

async function begin() {
  showError("");
  try {
    const data = await api("/api/sessions", { method: "POST", body: { scenarioId: picked.id, name: $("name").value } });
    current = data;
    $("log").replaceChildren();
    $("meter-name").textContent = data.scenario.meterName;
    $("hint").textContent = "Valida cómo se siente antes de proponer una solución.";
    $("hint").className = "hint muted";
    $("turns").textContent = `${data.scenario.maxTurns} intervenciones máximo`;
    bubble(data.scenario.persona.name, data.opening, false);
    renderMeter(data.meter);
    renderCriteria(data.criteria);
    renderSuggestions(data.scenario.suggestions);
    show("sim");
    $("input").focus();
  } catch (e) {
    showError(e.message);
  }
}

async function send(text) {
  if (busy || !text.trim()) return;
  busy = true;
  showError("");
  $("input").disabled = $("send").disabled = true;
  bubble("Tú", text, true);
  $("input").value = "";
  try {
    const r = await api(`/api/sessions/${current.sessionId}/messages`, { method: "POST", body: { text } });
    bubble(current.scenario.persona.name, r.reply, false);
    renderMeter(r.meter);
    renderCriteria(r.criteria);
    $("turns").textContent = `Intervenciones restantes: ${r.turnsLeft}`;
    if (r.hint) {
      $("hint").textContent = r.hint.text;
      $("hint").className = "hint";
    }
    if (r.done) return finish();
  } catch (e) {
    showError(e.message);
  } finally {
    busy = false;
    $("input").disabled = $("send").disabled = false;
    $("input").focus();
  }
}

async function finish() {
  showError("");
  try {
    const { report, certificate } = await api(`/api/sessions/${current.sessionId}/finish`, { method: "POST", body: {} });
    $("score").textContent = report.score;
    const badge = $("passed");
    badge.textContent = report.passed ? "Aprobado" : "Aún no alcanza para certificado (70+)";
    badge.className = `badge ${report.passed ? "ok" : "no"}`;
    $("xp").textContent = `+${report.xp} XP · Calmaste la situación en un ${report.deescalation}% · ${report.turns} intervenciones`;
    const ul = $("result-criteria");
    ul.replaceChildren();
    for (const c of report.criteria) {
      const li = el("li");
      const bar = el("div", undefined, "rbar");
      const fill = el("div");
      fill.style.width = `${c.score}%`;
      bar.append(fill);
      li.append(el("span", c.label), bar, el("span", String(c.score)));
      ul.append(li);
    }
    $("superpower").textContent = report.superpower;
    $("improvement").textContent = report.improvement;
    const hl = $("highlights");
    hl.replaceChildren();
    for (const h of report.highlights) {
      const li = el("li", undefined, `k-${h.kind}`);
      li.append(el("strong", `${h.title} · ${h.verdict}`), el("em", `“${h.quote}”`));
      hl.append(li);
    }
    const ns = $("next-steps");
    ns.replaceChildren();
    for (const t of report.nextSteps) ns.append(el("li", t));

    $("cert").hidden = !certificate;
    if (certificate) {
      const url = `/certificate.svg?token=${encodeURIComponent(certificate.token)}`;
      $("cert-img").src = url;
      $("cert-link").href = url;
      const verify = $("verify-link");
      verify.onclick = async (event) => {
        event.preventDefault();
        const v = await api(`/api/verify?token=${encodeURIComponent(certificate.token)}`);
        $("verify-result").textContent = v.valid ? `✓ Auténtico (${v.payload.id})` : "✗ No válido";
      };
    }
    show("result");
  } catch (e) {
    showError(e.message);
  }
}

$("form").addEventListener("submit", (event) => {
  event.preventDefault();
  send($("input").value);
});
$("btn-begin").addEventListener("click", begin);
$("btn-finish").addEventListener("click", finish);
$("btn-again").addEventListener("click", () => show("start"));

loadScenarios().catch((e) => showError(e.message));
