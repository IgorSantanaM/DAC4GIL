/** Converte os CSVs do portal dados.ms.gov.br em src/dados/matriculas.json (fallback offline do painel).
 *  Uso: node scripts/gerar-dados.mjs ../dados/csv */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const COLUNAS = [
  "AnoReferencia", "NomeMunicipio", "NomeUnidadeEscolar", "MatriculasTotal",
  "MatriculaInicial", "MatriculaAposCenso", "Transferidos", "Cancelados", "Falecido",
  "Abandono", "Aprovados", "Reprovados", "Cursando", "OutrasSituacoes",
];
const TEXTO = new Set(["NomeMunicipio", "NomeUnidadeEscolar"]);
const aqui = dirname(fileURLToPath(import.meta.url));
const pasta = process.argv[2] ?? join(aqui, "..", "..", "dados", "csv");

function lerCsv(texto) {
  texto = texto.replace(/^\uFEFF/, "");
  const prim = texto.slice(0, texto.indexOf("\n"));
  const sep = (prim.match(/;/g) || []).length > (prim.match(/,/g) || []).length ? ";" : ",";
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((v) => v !== "")) linhas.push(linha);
      linha = [];
    } else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

const saida = [];
for (const arq of readdirSync(pasta).filter((f) => f.endsWith(".csv")).sort()) {
  const [cab, ...corpo] = lerCsv(readFileSync(join(pasta, arq), "utf8"));
  const idx = COLUNAS.map((c) => cab.map((x) => x.trim()).indexOf(c));
  for (const l of corpo) {
    saida.push(COLUNAS.map((c, k) => (TEXTO.has(c) ? (l[idx[k]] ?? "").trim() : Number(l[idx[k]]) || 0)));
  }
}
const destino = join(aqui, "..", "src", "dados", "matriculas.json");
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify({ colunas: COLUNAS, linhas: saida }));
console.log(`${saida.length} registros -> ${destino}`);
