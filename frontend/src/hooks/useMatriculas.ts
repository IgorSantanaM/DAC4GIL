import { useCallback, useEffect, useRef, useState } from "react";
import { RepositorioMatriculas } from "../dominio/repositorio";
import type { DadosBrutos } from "../dominio/matricula";
import { ApiDAC } from "../servicos/apiDac";
import { carregarDadosLocais } from "../servicos/dadosLocais";
import { fmtInt } from "../dominio/formatar";

export interface Fonte {
  tipo: "carregando" | "api" | "local";
  texto: string;
  dica: string;
}

/** Carrega da API e, se ela não responder, usa a cópia local dos CSVs oficiais. */
export function useMatriculas() {
  const [repo, setRepo] = useState(() => new RepositorioMatriculas());
  const [fonte, setFonte] = useState<Fonte>({ tipo: "carregando", texto: "Carregando…", dica: "Origem dos dados exibidos" });
  const repoRef = useRef(repo);
  repoRef.current = repo;

  const carregar = useCallback(async (): Promise<Fonte["tipo"]> => {
    const novo = new RepositorioMatriculas();
    let resultado: Fonte;
    try {
      novo.adicionar(await ApiDAC.obterMatriculas());
      resultado = {
        tipo: "api", texto: `API · ${fmtInt(novo.todas.length)} registros`,
        dica: `Conectado a ${ApiDAC.descricao}`,
      };
    } catch (erro) {
      novo.adicionar(await carregarDadosLocais());
      resultado = {
        tipo: "local", texto: `Dados locais · ${fmtInt(novo.todas.length)} registros`,
        dica: `API indisponível em ${ApiDAC.descricao} (${(erro as Error).message}). Exibindo a cópia local dos CSVs oficiais.`,
      };
    }
    setRepo(novo);
    setFonte(resultado);
    return resultado.tipo;
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  /** Inclui registros no painel na hora; retorna quantos eram novos. */
  const adicionar = useCallback((lista: DadosBrutos[]): number => {
    const copia = repoRef.current.clonar();
    const novas = copia.adicionar(lista);
    setRepo(copia);
    return novas;
  }, []);

  return { repo, fonte, carregar, adicionar };
}
