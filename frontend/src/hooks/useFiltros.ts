import { useCallback, useEffect, useState } from "react";
import type { Filtros } from "../dominio/analise";
import { anosCompletos } from "../dominio/metodologia";
import type { RepositorioMatriculas } from "../dominio/repositorio";

/** Município inexistente volta para "todo o estado"; ano ausente/inexistente vira o último ano fechado. */
export function normalizarFiltros(repo: RepositorioMatriculas, f: Filtros): Filtros {
  const municipio = repo.porMunicipio.has(f.municipio) ? f.municipio : "";
  const ano = f.ano == null || !repo.porAno.has(f.ano) ? anosCompletos(repo).pop() ?? null : f.ano;
  return { ...f, municipio, ano };
}

export function useFiltros(repo: RepositorioMatriculas) {
  const [filtros, setFiltros] = useState<Filtros>({ municipio: "", ano: null, escola: "" });
  const [pagina, setPagina] = useState(1);

  // Equivale a "montarFiltros" do painel antigo: reajusta os filtros quando os dados mudam.
  useEffect(() => {
    if (!repo.todas.length) return;
    setFiltros((f) => normalizarFiltros(repo, f));
  }, [repo]);

  const alterar = useCallback((parcial: Partial<Filtros>) => {
    setFiltros((f) => ({ ...f, ...parcial }));
    setPagina(1);
  }, []);

  const limpar = useCallback(() => {
    setFiltros(normalizarFiltros(repo, { municipio: "", ano: null, escola: "" }));
    setPagina(1);
  }, [repo]);

  return { filtros, alterar, limpar, pagina, setPagina };
}

/** Atrasa a propagação de um valor (a busca por escola espera 200 ms depois da última tecla). */
export function useAtraso<T>(valor: T, ms: number): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}
