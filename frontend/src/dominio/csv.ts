import { TODOS_CAMPOS, type DadosBrutos } from "./matricula";

/** Leitor de CSV com suporte a campos entre aspas e separador "," ou ";". */
export function lerCsv(texto: string): DadosBrutos[] {
  texto = texto.replace(/^﻿/, "");
  const primeiraLinha = texto.slice(0, texto.indexOf("\n"));
  const sep = (primeiraLinha.match(/;/g) || []).length > (primeiraLinha.match(/,/g) || []).length ? ";" : ",";
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], aspas = false;
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
  const [cab, ...corpo] = linhas;
  if (!cab) return [];
  const cabecalho = cab.map((c) => c.trim());
  const faltando = TODOS_CAMPOS.filter((c) => !cabecalho.includes(c));
  if (faltando.length) throw new Error("Colunas ausentes: " + faltando.join(", "));
  return corpo.map((v) => Object.fromEntries(cabecalho.map((c, i) => [c, v[i]])) as DadosBrutos);
}
