import { agregar } from "./matricula";
import type { RepositorioMatriculas } from "./repositorio";

export const COBERTURA_MINIMA = 0.5; // abaixo disso o ano letivo ainda estava aberto na extração
export const REGISTRO_ABANDONO_MINIMO = 0.1; // fração mínima de escolas com abandono > 0 para o ano ter o dado

/** A fonte parou de preencher a coluna Abandono: 2018 tem 222 escolas com registro, 2019 tem 25 e 2020+ nenhuma.
 *  O critério é estadual por ano, porque é uma falha de registro da base e não do recorte filtrado. */
export function abandonoRegistrado(repo: RepositorioMatriculas, ano: number): boolean {
  const lista = repo.porAno.get(ano) ?? [];
  return lista.length > 0 && lista.filter((m) => m.Abandono > 0).length / lista.length >= REGISTRO_ABANDONO_MINIMO;
}

export function anosSemAbandono(repo: RepositorioMatriculas): number[] {
  return repo.anos().filter((a) => !abandonoRegistrado(repo, a));
}

export function anosCompletos(repo: RepositorioMatriculas): number[] {
  return repo.anos().filter((a) => (agregar(repo.porAno.get(a) ?? []).cobertura ?? 0) >= COBERTURA_MINIMA);
}
