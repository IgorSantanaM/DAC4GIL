# Painel ODS 4 — Frontend (DAC 4º semestre)

Dashboard que mostra a evolução da aprovação e do abandono escolar na rede estadual de MS (2018–2026).
É o frontend do backend [DAC4GIL](https://github.com/IgorSantanaM/DAC4GIL), feito com **React + Vite + TypeScript**.

## Como rodar

Requer Node 20+.

```bash
npm install
npm run dev
```

Abra http://localhost:8080. O Vite repassa `/api/*` para o backend em `http://localhost:5247`, então o navegador fala com uma origem só e o backend não precisa de CORS.
Para apontar para outro backend: `BACKEND_URL=http://host:porta npm run dev` (no PowerShell: `$env:BACKEND_URL="http://host:porta"; npm run dev`).

Quando a API não responde, o painel usa a cópia local dos CSVs oficiais (`src/dados/matriculas.json`).
O indicador no topo mostra a fonte em uso: **API** (verde) ou **Dados locais** (amarelo).

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com proxy para a API |
| `npm run build` | Checa os tipos (`tsc`) e gera `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm test` | Testes da lógica em `src/dominio/` (Vitest) |
| `npm run dados` | Regenera `src/dados/matriculas.json` a partir de `../dados/csv` |

## Docker

Na raiz do repositório:

```bash
docker compose up -d --build
```

O Compose inicia Nginx, API, worker, PostgreSQL e RabbitMQ. Abra http://localhost:8080 para o painel e http://localhost:7081/swagger para o Swagger.
O `Dockerfile` do frontend faz o build com Node e serve o `dist/` no Nginx, que repassa `/api/` para a API.

Para carregar os dados no banco, importe os CSVs da pasta `dados/csv/` em "Backend & importação" ou pelo Swagger.

- A importação é processada em segundo plano, pelo RabbitMQ. Os dados aparecem no painel depois de recarregar a página.
- Cada ano só pode ser importado uma vez. Se o banco já tiver dados de algum ano do arquivo, a API responde 409 e não importa nada; o painel avisa quando isso acontece.

## Estrutura

```
src/
  dominio/      # regras sem UI: Matricula, repositório, metodologia, análises, CSV (testadas)
  servicos/     # cliente da API e carga dos dados locais
  hooks/        # useMatriculas, useFiltros, useTema
  componentes/  # Cabecalho, PainelFiltros, Indicadores, TabelaEscolas, DialogoConfig
    graficos/   # 5 gráficos (react-chartjs-2)
  dados/        # matriculas.json (gerado)
legado/         # versão anterior em JS puro, mantida só para comparação
```

## Funcionalidades

- **Filtros dinâmicos:** município, ano de referência e busca por unidade escolar.
- **Resumo e indicadores (KPIs):** matrículas, taxas de aprovação, reprovação e abandono, cancelados e escolas, com variação em relação ao ano anterior.
- **Gráficos:** evolução da aprovação (com a média estadual como referência quando há município), reprovação e abandono, matrículas por ano, composição da situação final e ranking de municípios (ou de escolas, quando há município).
- **Tabela de escolas:** ordenável, paginada e com exportação para CSV.
- **Importação de CSV:** em "Backend & importação". O arquivo é enviado para a API e também entra no painel na hora.
- **Temas:** claro e escuro.

## Metodologia

As taxas seguem o padrão de rendimento do INEP:

- aprovação = aprovados ÷ (aprovados + reprovados + abandono);
- reprovação e abandono usam a mesma base.

Anos em que menos de 50% das matrículas tinham situação final ficam fora das linhas de taxa, porque o ano letivo ainda estava aberto na extração. Hoje isso vale para 2024 e 2026.

### Abandono não registrado a partir de 2019

Na fonte, a coluna `Abandono` deixa de ser preenchida (2018: 222 de 485 escolas; 2019: 25 de 475; 2020 em diante: nenhuma). Os cancelamentos continuam em torno de 3%, logo é falha de registro, não queda real da evasão.

- Um ano só tem taxa de abandono se pelo menos 10% das escolas do estado registram abandono.
- Quando a comparação atravessa essa quebra, o painel usa a base comparável: aprovados ÷ (aprovados + reprovados).
- No estado, de 2018 a 2023, a melhora real é de **+3,9 p.p.** (84,8% → 88,7%), e não os +7,3 p.p. que a fórmula do INEP sugere.

## Contrato esperado da API

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/api/matriculas/get-metrics` | Lista de matrículas. Aceita um array ou um `PagedResult` (`items`), com chaves em camelCase ou PascalCase |
| `POST` | `/api/matriculas/import-csv` | `multipart/form-data` com o campo `file` |

O backend ainda não habilita CORS; por isso o painel passa pelo proxy do Vite (dev) ou do Nginx (produção).
