import { useState } from "react";
import type { Filtros } from "../dominio/analise";
import { useAtraso } from "../hooks/useFiltros";
import { useEffect } from "react";
import type { RepositorioMatriculas } from "../dominio/repositorio";
import { anosCompletos } from "../dominio/metodologia";

interface Props {
  repo: RepositorioMatriculas;
  filtros: Filtros;
  onAlterar: (parcial: Partial<Filtros>) => void;
  onLimpar: () => void;
}

export function PainelFiltros({ repo, filtros, onAlterar, onLimpar }: Props) {
  const [texto, setTexto] = useState(filtros.escola);
  const atrasado = useAtraso(texto, 200);
  useEffect(() => {
    if (atrasado !== filtros.escola) onAlterar({ escola: atrasado });
    // Só reage à digitação: depois de "Limpar" o texto local já foi zerado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atrasado]);

  const completos = new Set(anosCompletos(repo));

  return (
    <section className="filtros" aria-label="Filtros">
      <label className="campo">
        <span>Município</span>
        <select id="f-municipio" value={filtros.municipio} onChange={(e) => onAlterar({ municipio: e.target.value })}>
          <option value="">Todo o estado</option>
          {repo.municipios().map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="campo">
        <span>Ano de referência</span>
        <select id="f-ano" value={filtros.ano ?? ""} onChange={(e) => onAlterar({ ano: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Todos os anos</option>
          {repo.anos().map((a) => <option key={a} value={a}>{completos.has(a) ? a : `${a} (em andamento)`}</option>)}
        </select>
      </label>
      <label className="campo campo-largo">
        <span>Unidade escolar</span>
        <input id="f-escola" type="search" placeholder="Buscar escola pelo nome…" autoComplete="off"
          value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <button id="btn-limpar" className="btn btn-fantasma" type="button" onClick={() => { setTexto(""); onLimpar(); }}>
        Limpar filtros
      </button>
    </section>
  );
}
