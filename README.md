# DAC4GIL

API de importação de matrículas com PostgreSQL e processamento assíncrono via RabbitMQ.
Requer .NET 10 e os serviços locais (ou Docker).

## Execução local

1. Execute `docker compose up -d` na raiz.
2. Inicie o consumidor: `dotnet run --project src/DAC4GIL.Messaging --environment Development`.
3. Inicie a API: `dotnet run --project src/DAC4GIL.Presentation`.

Em Development o consumidor cria o banco/esquema caso ainda não exista, usando
`EnsureCreatedAsync`. Essa inicialização é destinada ao banco local novo; para
um banco existente, gerencie alterações de esquema antes de executar a aplicação.

As conexões estão nos appsettings.json da API e do consumidor:
- PostgreSQL: localhost:5432, banco dac4gil, usuário/senha postgres.
- RabbitMQ: localhost:5672, usuário/senha guest; painel http://localhost:15672.

Ambos os processos precisam estar ativos para o fluxo completo. Inicie o consumidor
antes da primeira importação para criar a assinatura durável da fila.
Configurações podem ser sobrescritas por `ConnectionStrings__Postgres` e `ConnectionStrings__RabbitMQ`.

## Endpoints

- `POST /api/matriculas/import-json`: array JSON no corpo (`application/json`) ou arquivo multipart no campo `file`.
- `POST /api/matriculas/import-csv`: arquivo multipart no campo `file`.
- `GET /api/matriculas/get-metrics`: lista as matrículas já persistidas.

Importações válidas retornam 202 com a quantidade enviada à fila; dados inválidos retornam 400.
O retorno 202 confirma envio para processamento, não a gravação no PostgreSQL.

Exemplo JSON:

```json
[{"anoReferencia":2024,"nomeMunicipio":"Campo Grande","nomeUnidadeEscolar":"Escola Exemplo","matriculasTotal":10,"matriculaInicial":10,"matriculaAposCenso":0,"transferidos":0,"cancelados":0,"falecido":0,"abandono":0,"aprovados":10,"reprovados":0,"cursando":0,"outrasSituacoes":0}]
```

CSV usa os nomes das propriedades como cabeçalho (sem distinção entre maiúsculas
e minúsculas), aceita vírgula ou ponto e vírgula e campos entre aspas:

```csv
AnoReferencia;NomeMunicipio;NomeUnidadeEscolar;MatriculasTotal;MatriculaInicial;MatriculaAposCenso;Transferidos;Cancelados;Falecido;Abandono;Aprovados;Reprovados;Cursando;OutrasSituacoes
2024;Campo Grande;Escola Exemplo;10;10;0;0;0;0;0;10;0;0;0
```

A entrega da fila pode ocorrer novamente em caso de falha; importações repetidas
atualmente adicionam novos registros.

## Swagger

Com a API em Development, acesse http://localhost:5247/swagger.
O documento OpenAPI est� em http://localhost:5247/openapi/v1.json.
A interface permite enviar CSV/JSON pelo campo `file` e testar JSON diretamente no corpo.
