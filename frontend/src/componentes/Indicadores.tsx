import { calcularKpis, calcularResumo, type Filtros } from "../dominio/analise";
import { anosCompletos, anosSemAbandono } from "../dominio/metodologia";
import type { RepositorioMatriculas } from "../dominio/repositorio";
import { useMemo } from "react";

interface Props { repo: RepositorioMatriculas; filtros: Filtros }

export function Aviso({ repo, filtros }: Props) {
  const completos = new Set(anosCompletos(repo));
  const abertos = repo.anos().filter((a) => !completos.has(a));
  const semAband = anosSemAbandono(repo);
  if (!repo.todas.length) return null;
  return (
    <div id="aviso-parcial" className="aviso">
      {filtros.ano != null && !completos.has(filtros.ano) ? (
        <><strong>{filtros.ano}</strong> ainda estava em andamento quando os dados foram extraídos (a maioria dos alunos aparece como “cursando”), então as taxas desse ano não são comparáveis.</>
      ) : abertos.length ? (
        <>Anos em andamento ({abertos.join(", ")}) ficam fora das linhas de taxa; aparecem só em matrículas e situação final.</>
      ) : null}
      {semAband.length > 0 && (
        <>{" "}<strong>Abandono não registrado a partir de {semAband[0]}:</strong> a coluna vem zerada em praticamente todas as escolas, enquanto os cancelamentos seguem em ~3% das matrículas. É falha de registro da fonte, não queda real. Por isso o abandono aparece como “não registrado” nesses anos, e a evolução da aprovação também é mostrada numa base comparável (aprovados ÷ aprovados + reprovados).</>
      )}
    </div>
  );
}

/** Responde ao enunciado: compara o primeiro e o último ano fechado do recorte atual. */
export function Resumo({ repo, filtros }: Props) {
  const r = useMemo(() => calcularResumo(repo, filtros), [repo, filtros]);

  if (r.insuficiente) {
    return (
      <section className="resumo" id="resumo" aria-label="A educação está evoluindo?">
        <div>
          <div className="resumo-pergunta">A educação está evoluindo? · {r.recorte}</div>
          <div className="resumo-veredito">Dados insuficientes</div>
          <div className="resumo-texto">É preciso ao menos dois anos letivos encerrados no recorte para comparar.</div>
        </div>
      </section>
    );
  }
  return (
    <section className="resumo" id="resumo" aria-label="A educação está evoluindo?">
      <div>
        <div className="resumo-pergunta">A educação está evoluindo? · {r.recorte}</div>
        <div className={`resumo-veredito ${r.cls}`}><span className="icone" aria-hidden="true">{r.icone}</span>{r.veredito}</div>
        <div className="resumo-texto">{r.explicacao} Melhor ano: {r.melhorAno.ano} ({r.melhorAno.valor}).</div>
      </div>
      {r.itens.map((i) => (
        <div key={i.rotulo}>
          <div className="resumo-pergunta">{i.rotulo}</div>
          <div className="resumo-valor">{i.valor}</div>
          <div className="resumo-texto">
            {i.variacao ? <span className={i.variacao.cls}>{i.variacao.texto}</span> : i.texto}
          </div>
        </div>
      ))}
    </section>
  );
}

export function Kpis({ repo, filtros }: Props) {
  const kpis = useMemo(() => calcularKpis(repo, filtros), [repo, filtros]);
  return (
    <section className="kpis" id="kpis" aria-label="Indicadores">
      {kpis.map((k) => (
        <div className="kpi" key={k.rotulo}>
          <div className="kpi-rotulo">{k.rotulo}</div>
          <div className="kpi-valor">{k.valor}</div>
          <div className="kpi-delta">
            {k.variacao ? <><span className={k.variacao.cls}>{k.variacao.texto}</span> {k.variacao.resto}</> : k.nota}
          </div>
        </div>
      ))}
    </section>
  );
}
