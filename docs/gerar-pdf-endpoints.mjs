// Feito com IA: gera docs/endpoints-da-api.pdf a partir de backend/src/openapi.json (a mesma especificação do
// Swagger em /api/docs/), para o PDF nunca divergir dela. Monta um HTML e imprime com o Chrome/Edge headless.
// Uso (na raiz do repositório): node docs/gerar-pdf-endpoints.mjs   · CHROME=<caminho> para outro navegador.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const espec = JSON.parse(readFileSync(join(raiz, "backend/src/openapi.json"), "utf8"));
const saida = join(raiz, "docs/endpoints-da-api.pdf");

const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const md = (t) =>
  esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

function resolver(no) {
  if (no?.$ref) return resolver(no.$ref.slice(2).split("/").reduce((n, p) => n[p], espec));
  if (no?.allOf) {
    const partes = no.allOf.map(resolver);
    return { type: "object", properties: Object.assign({}, ...partes.map((p) => p.properties)), required: partes.flatMap((p) => p.required ?? []) };
  }
  return no ?? {};
}

function tipo(s) {
  const nome = s.$ref ? s.$ref.split("/").pop() : null;
  const r = resolver(s);
  if (r.enum) return r.enum.join(" | ");
  if (r.type === "array") return `lista de ${tipo(r.items ?? {})}`;
  if (nome && r.type === "object") return nome;
  const t = [r.type].flat().filter(Boolean);
  const base = t.filter((x) => x !== "null").join(" | ") || "objeto";
  const fmt = r.format ? ` (${r.format})` : "";
  return (base === "object" ? "objeto" : base) + fmt + (t.includes("null") ? " ou null" : "");
}

// Campos de um objeto em linhas de tabela, descendo um nível nos objetos e listas de objetos sem nome próprio.
function campos(schema, prefixo = "", nivel = 0) {
  const r = resolver(schema);
  const obrig = new Set(r.required ?? []);
  return Object.entries(r.properties ?? {}).flatMap(([nome, s]) => {
    const rs = resolver(s);
    const linha = `<tr><td><code>${prefixo}${esc(nome)}</code>${obrig.has(nome) ? " <span class='obr'>obrigatório</span>" : ""}</td><td>${esc(tipo(s))}</td><td>${md(rs.description ?? "")}</td></tr>`;
    const filho = rs.type === "array" ? rs.items ?? {} : s;
    const temFilhos = resolver(filho).properties && !(filho.$ref && nivel > 0);
    return [linha, ...(temFilhos && nivel < 1 ? campos(filho, `${prefixo}${nome}${rs.type === "array" ? "[]" : ""}.`, nivel + 1) : [])];
  });
}

const tabela = (linhas, cab = ["Campo", "Tipo", "Descrição"]) =>
  linhas.length
    ? `<table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${linhas.join("")}</tbody></table>`
    : "";

const acesso = (op) => {
  const s = op.security?.[0];
  if (!s) return "Aberto";
  return "sessaoEquipe" in s ? "Equipe" : "Cliente";
};

const operacoes = Object.entries(espec.paths).flatMap(([caminho, metodos]) =>
  Object.entries(metodos).map(([metodo, op]) => ({ caminho, metodo: metodo.toUpperCase(), op })),
);

function secaoDaOperacao({ caminho, metodo, op }) {
  const params = (op.parameters ?? []).map(resolver).map(
    (p) => `<tr><td><code>${esc(p.name)}</code>${p.required ? " <span class='obr'>obrigatório</span>" : ""}</td><td>${p.in === "path" ? "caminho" : "query"}</td><td>${esc(tipo(p.schema ?? {}))}</td><td>${md(p.description ?? "")}</td></tr>`,
  );
  const corpo = op.requestBody?.content?.["application/json"]?.schema;
  const respostas = Object.entries(op.responses).map(([codigo, resp]) => {
    const r = resolver(resp);
    const s = r.content?.["application/json"]?.schema;
    const nome = s?.$ref ? ` · <code>${s.$ref.split("/").pop()}</code>` : "";
    return `<li><span class="st st${codigo[0]}">${codigo}</span> ${esc(r.description)}${nome}</li>`;
  });
  const sucesso = Object.entries(op.responses).find(([c]) => c.startsWith("2"))?.[1];
  const esquemaSucesso = resolver(sucesso)?.content?.["application/json"]?.schema;
  const camposSucesso = esquemaSucesso && !esquemaSucesso.$ref ? campos(esquemaSucesso) : [];
  return `<section class="op">
    <h3><span class="m m${metodo}">${metodo}</span> <code>${esc(caminho)}</code> <span class="acesso">${acesso(op)}</span></h3>
    <p class="resumo">${esc(op.summary)}</p>
    ${op.description ? `<p>${md(op.description)}</p>` : ""}
    ${params.length ? `<h4>Parâmetros</h4>${tabela(params, ["Nome", "Onde", "Tipo", "Descrição"])}` : ""}
    ${corpo ? `<h4>Corpo (JSON)</h4>${tabela(campos(corpo))}` : ""}
    <h4>Respostas</h4><ul class="resp">${respostas.join("")}</ul>
    ${camposSucesso.length ? tabela(camposSucesso) : ""}
  </section>`;
}

const esquemas = Object.entries(espec.components.schemas)
  .filter(([, s]) => resolver(s).properties)
  .map(([nome, s]) => `<section class="op"><h3><code>${nome}</code></h3>${tabela(campos(s))}</section>`);

const enums = Object.entries(espec.components.schemas)
  .filter(([, s]) => s.enum)
  .map(([nome, s]) => `<tr><td><code>${nome}</code></td><td>${s.enum.map((v) => `<code>${v}</code>`).join(" ")}</td></tr>`);

const hoje = new Date().toLocaleDateString("pt-BR");
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(espec.info.title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font: 10pt/1.45 "Segoe UI", system-ui, sans-serif; color: #1c1c1c; }
  h1 { color: #8F0D0D; font-size: 22pt; margin: 0 0 4px; }
  h2 { color: #8F0D0D; border-bottom: 2px solid #8F0D0D; padding-bottom: 3px; margin-top: 26px; break-after: avoid; }
  h3 { font-size: 11pt; margin: 0 0 4px; break-after: avoid; }
  h4 { font-size: 9pt; text-transform: uppercase; letter-spacing: .04em; color: #666; margin: 10px 0 4px; }
  code { font: 9pt Consolas, monospace; background: #f3f3f3; padding: 0 3px; border-radius: 3px; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 4px 0; }
  th, td { border: 1px solid #ddd; padding: 3px 6px; text-align: left; vertical-align: top; }
  th { background: #f6eeee; }
  tr { break-inside: avoid; }
  .sub { color: #666; margin: 0 0 18px; }
  .intro p { margin: 4px 0; }
  .op { border: 1px solid #e3e3e3; border-left: 4px solid #B7B7B7; border-radius: 4px; padding: 8px 10px; margin: 10px 0; break-inside: avoid-page; }
  .resumo { font-weight: 600; margin: 0 0 4px; }
  .m { display: inline-block; min-width: 40px; text-align: center; color: #fff; border-radius: 3px; font-size: 8.5pt; padding: 1px 5px; }
  .mGET { background: #1d6fb8; } .mPOST { background: #1f8a4c; }
  .acesso { float: right; font-size: 8.5pt; font-weight: 400; color: #555; border: 1px solid #ccc; border-radius: 10px; padding: 0 8px; }
  .obr { color: #8F0D0D; font-size: 8pt; }
  .resp { margin: 0; padding-left: 18px; }
  .st { font-weight: 700; } .st2 { color: #1f8a4c; } .st4 { color: #b53a1d; }
  .indice td:first-child { white-space: nowrap; }
</style></head><body>
<h1>${esc(espec.info.title)}</h1>
<p class="sub">Versão ${esc(espec.info.version)} · OpenAPI ${esc(espec.openapi)} · gerado em ${hoje} a partir de <code>backend/src/openapi.json</code> · Swagger interativo em <code>/api/docs/</code></p>
<div class="intro">${espec.info.description.split("\n").filter(Boolean).map((l) => `<p>${md(l.replace(/^- /, "• "))}</p>`).join("")}</div>

<h2>Resumo dos endpoints</h2>
${tabela(
  operacoes.map(({ caminho, metodo, op }) => `<tr><td><span class="m m${metodo}">${metodo}</span> <code>${esc(caminho)}</code></td><td>${acesso(op)}</td><td>${esc(op.summary)}</td></tr>`),
  ["Endpoint", "Acesso", "O que faz"],
).replace("<table>", "<table class='indice'>")}

${espec.tags
  .map((tag) => {
    const ops = operacoes.filter(({ op }) => op.tags?.[0] === tag.name);
    return `<h2>${esc(tag.name)}</h2><p>${md(tag.description)}</p>${ops.map(secaoDaOperacao).join("")}`;
  })
  .join("")}

<h2>Valores fixos</h2>
${tabela(enums, ["Tipo", "Valores"])}

<h2>Esquemas</h2>
${esquemas.join("")}
</body></html>`;

const pasta = mkdtempSync(join(tmpdir(), "fatec-api-"));
const arquivoHtml = join(pasta, "endpoints.html");
writeFileSync(arquivoHtml, html);

const candidatos = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const navegador = candidatos.find((c) => existsSync(c));
if (!navegador) throw new Error("Chrome/Edge não encontrado; passe o caminho em CHROME=...");

execFileSync(navegador, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  `--user-data-dir=${join(pasta, "perfil")}`,
  `--print-to-pdf=${saida}`,
  pathToFileURL(arquivoHtml).href,
], { stdio: "ignore" });
console.log(`PDF gerado: ${saida}`);
