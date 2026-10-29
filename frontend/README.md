# Painel ODS 4 — Frontend (DAC 4º semestre)

Dashboard que mostra a evolução da aprovação e do abandono escolar na rede estadual de MS (2018–2026).
É o frontend do backend [DAC4GIL](https://github.com/IgorSantanaM/DAC4GIL).

## Como rodar

Não precisa de build: é HTML, CSS e JavaScript puro, com Chart.js via CDN.

```bash
cd frontend && python3 servidor.py 8080 http://localhost:5247
```

Depois abra http://localhost:8080.

O `servidor.py` serve o painel e repassa as chamadas `/api/*` para o backend. Assim o navegador fala com uma origem só, e o backend não precisa de CORS.

Quando a API não responde, o painel usa a cópia local dos CSVs oficiais (`data/matriculas.js`).
O indicador no topo mostra qual fonte está em uso: **API** (verde) ou **Dados locais** (amarelo).

Para subir o backend, é preciso Docker e .NET 10. Rode os comandos na raiz do repositório:

```bash
docker compose up -d
dotnet run --project src/DAC4GIL.Messaging
dotnet run --project src/DAC4GIL.Presentation --launch-profile http
```

O primeiro comando sobe o PostgreSQL e o RabbitMQ; os outros dois rodam o worker e a API.

Para carregar os dados no banco, importe os CSVs da pasta `dados/csv/`, na raiz do repositório, em "Backend & importação" ou pelo Swagger.

- A importação é processada em segundo plano, pelo RabbitMQ. Os dados aparecem no painel depois de recarregar a página.
- Importar o mesmo arquivo duas vezes duplica os registros no banco. O painel ignora as duplicatas, mas o banco não.

## Funcionalidades

- **Filtros dinâmicos:** município, ano de referência e busca por unidade escolar.
- **Indicadores (KPIs):** matrículas, taxas de aprovação, reprovação e abandono, cancelados e escolas, com variação em relação ao ano anterior.
- **Gráficos:**
  - evolução da aprovação (com a média estadual como referência quando há município selecionado);
  - reprovação e abandono;
  - matrículas por ano;
  - composição da situação final (100% empilhado);
  - ranking de municípios, ou das escolas quando há município selecionado.
- **Tabela de escolas:** ordenável, paginada e com exportação para CSV.
- **Importação de CSV:** em “Backend & importação”. O arquivo é enviado para a API e também entra no painel na hora.
- **Temas:** claro e escuro.

## Estrutura

| Arquivo | Papel |
|---|---|
| `assets/api.js` | Classe `Matricula` (espelha `DAC4GIL.Domain.Matriculas.Matricula`), `RepositorioMatriculas` (índices `Map` por ano e por município), cliente da API e leitor de CSV |
| `assets/app.js` | Estado dos filtros, KPIs, gráficos e tabela |
| `data/matriculas.js` | Cópia local dos CSVs, gerada por `scripts/gerar_dados.py` |
| `../dados/csv/` | CSVs originais baixados de dados.ms.gov.br (2018–2024 e 2026; o portal não publicou 2025) |

Para atualizar os dados locais depois de baixar novos CSVs:

```bash
python3 scripts/gerar_dados.py ../dados/csv
```

## Metodologia

As taxas seguem o padrão de rendimento do INEP:

- aprovação = aprovados ÷ (aprovados + reprovados + abandono);
- reprovação e abandono usam a mesma base.

Anos em que menos de 50% das matrículas tinham situação final ficam fora das linhas de taxa, porque o ano letivo ainda estava aberto na extração.
Hoje isso vale para 2024 e 2026, em que a maioria dos alunos aparece como “cursando”.

### Abandono não registrado a partir de 2019

Na fonte, a coluna `Abandono` deixa de ser preenchida:

| Ano | Escolas com abandono > 0 | Total de abandonos |
|---|---|---|
| 2018 | 222 de 485 | 10.490 |
| 2019 | 25 de 475 | 158 |
| 2020 em diante | 0 | 0 |

Os cancelamentos continuam em torno de 3% das matrículas. Logo, é falha de registro, não queda real da evasão.

Como o painel trata isso:

- Um ano só tem taxa de abandono se pelo menos 10% das escolas do estado registram abandono. Nos outros anos o painel mostra “não registrado”.
- Sem o abandono no denominador, a taxa de aprovação do INEP fica inflada a partir de 2019. Quando a comparação atravessa essa quebra, o painel usa a base comparável: aprovados ÷ (aprovados + reprovados).
- No estado, de 2018 a 2023, a melhora real é de **+3,9 p.p.** (84,8% → 88,7%), e não os +7,3 p.p. que a fórmula do INEP sugere.

### Anos em andamento (2024 e 2026)

| Ano | Arquivo criado no portal | “Cursando” | Aprovados |
|---|---|---|---|
| 2024 | 31/07/2024, no meio do ano letivo | 84% das matrículas | 3.484 |
| 2026 | 13/03/2026 | 94% | 0 |

Esses anos aparecem em matrículas e na situação final, mas ficam fora das taxas.

## Contrato esperado da API

O frontend usa as rotas já declaradas em `MatriculaEndpoints.cs`:

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/api/matriculas/get-metrics` | Lista de matrículas. Aceita um array ou um `PagedResult` (`items`), com chaves em camelCase ou PascalCase e os mesmos campos de `MatriculaDto` |
| `POST` | `/api/matriculas/import-csv` | `multipart/form-data` com o campo `file` |

O backend roda em `http://localhost:5247` (perfil `http` do `launchSettings.json`). O painel chama a API pela própria origem, e o `servidor.py` repassa para esse endereço. Dá para trocar a URL em “Backend & importação”.

### CORS

O backend ainda não habilita CORS. Por isso o painel passa pelo `servidor.py`.
Se for preciso chamar a API direto do navegador, sem o `servidor.py`, basta habilitar CORS em `Program.cs` com `AddCors` e `UseCors`.
