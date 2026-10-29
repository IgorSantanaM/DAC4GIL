import { describe, expect, it } from "vitest";
import pacote from "../dados/matriculas.json";
import { calcularRanking, calcularResumo } from "./analise";
import { lerCsv } from "./csv";
import { agregar, Matricula } from "./matricula";
import { abandonoRegistrado, anosCompletos } from "./metodologia";
import { normalizar, RepositorioMatriculas } from "./repositorio";

function repoReal(): RepositorioMatriculas {
  const repo = new RepositorioMatriculas();
  const { colunas, linhas } = pacote as { colunas: string[]; linhas: (string | number)[][] };
  repo.adicionar(linhas.map((l) => Object.fromEntries(colunas.map((c, i) => [c, l[i]]))));
  return repo;
}

describe("Matricula / agregar", () => {
  it("calcula as taxas do INEP sobre aprovados + reprovados + abandono", () => {
    const m = new Matricula({ AnoReferencia: 2018, NomeMunicipio: "A", NomeUnidadeEscolar: "E", Aprovados: 80, Reprovados: 10, Abandono: 10 });
    expect(m.taxaAprovacao).toBeCloseTo(0.8);
    expect(m.taxaReprovacao).toBeCloseTo(0.1);
    expect(m.taxaAbandono).toBeCloseTo(0.1);
  });

  it("devolve null quando não há situação final", () => {
    expect(new Matricula({ Cursando: 50 }).taxaAprovacao).toBeNull();
  });

  it("agrega e conta escolas distintas", () => {
    const a = new Matricula({ AnoReferencia: 2018, NomeMunicipio: "A", NomeUnidadeEscolar: "E1", Aprovados: 90, Reprovados: 10 });
    const b = new Matricula({ AnoReferencia: 2019, NomeMunicipio: "A", NomeUnidadeEscolar: "E1", Aprovados: 10, Reprovados: 90 });
    const ag = agregar([a, b]);
    expect(ag.escolas).toBe(1);
    expect(ag.taxaAprovacao).toBeCloseTo(0.5);
  });
});

describe("RepositorioMatriculas", () => {
  it("não duplica ao reimportar o mesmo ano", () => {
    const repo = new RepositorioMatriculas();
    const linha = { AnoReferencia: 2020, NomeMunicipio: "Campo Grande", NomeUnidadeEscolar: "Escola X" };
    expect(repo.adicionar([linha, linha])).toBe(1);
    expect(repo.adicionar([linha])).toBe(0);
  });

  it("busca escola ignorando acentos e caixa", () => {
    const repo = new RepositorioMatriculas();
    repo.adicionar([{ AnoReferencia: 2020, NomeMunicipio: "Dourados", NomeUnidadeEscolar: "Escola João Paulo" }]);
    expect(repo.filtrar({ escola: "joao" })).toHaveLength(1);
    expect(normalizar("Ação")).toBe("acao");
  });
});

describe("lerCsv", () => {
  const cab = "AnoReferencia;NomeMunicipio;NomeUnidadeEscolar;MatriculasTotal;MatriculaInicial;MatriculaAposCenso;Transferidos;Cancelados;Falecido;Abandono;Aprovados;Reprovados;Cursando;OutrasSituacoes";

  it("aceita ';' e campos entre aspas", () => {
    const linhas = lerCsv(`${cab}\n2020;Dourados;"Escola ""A"", B";10;10;0;0;0;0;0;9;1;0;0\n`);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].NomeUnidadeEscolar).toBe('Escola "A", B');
  });

  it("falha quando faltam colunas", () => {
    expect(() => lerCsv("AnoReferencia,NomeMunicipio\n2020,X")).toThrow(/Colunas ausentes/);
  });
});

describe("Regras de metodologia com os dados oficiais", () => {
  const repo = repoReal();

  it("2024 e 2026 ficam fora dos anos completos", () => {
    const completos = anosCompletos(repo);
    expect(completos).not.toContain(2024);
    expect(completos).not.toContain(2026);
    expect(completos).toContain(2023);
  });

  it("abandono só é registrado em 2018", () => {
    expect(abandonoRegistrado(repo, 2018)).toBe(true);
    expect(abandonoRegistrado(repo, 2019)).toBe(false);
    expect(abandonoRegistrado(repo, 2023)).toBe(false);
  });

  it("estado 2018→2023: melhora real de +3,9 p.p. na base comparável (84,8% → 88,7%)", () => {
    const r = calcularResumo(repo, { municipio: "", ano: 2023, escola: "" });
    if (r.insuficiente) throw new Error("resumo insuficiente");
    expect(r.veredito).toBe("Sim, a aprovação melhorou");
    expect(r.itens[0].rotulo).toBe("Aprovação comparável · 2018→2023");
    expect(r.itens[0].valor).toBe("84,8% → 88,7%");
    expect(r.itens[0].variacao?.texto).toBe("+3,9 p.p.");
  });

  it("ranking de municípios respeita o limite e a ordem", () => {
    const piores = calcularRanking(repo, { municipio: "", ano: 2023, escola: "" }, "piores");
    const melhores = calcularRanking(repo, { municipio: "", ano: 2023, escola: "" }, "melhores");
    expect(piores.itens.length).toBeLessThanOrEqual(15);
    expect(piores.itens[0].taxaAprovacao!).toBeLessThanOrEqual(melhores.itens[0].taxaAprovacao!);
    expect(piores.ano).toBe(2023);
  });
});
