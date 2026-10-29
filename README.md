# DAC4GIL


## Docker Compose

Na raiz do repositorio:

```powershell
docker compose up -d --build
docker compose logs -f dac.api dac.worker
```

O Compose sobe frontend, API, worker, PostgreSQL e RabbitMQ.

| Servico | Endereco local |
| --- | --- |
| Frontend | http://localhost:8080 |
| API / Swagger | http://localhost:7081/swagger |
| PostgreSQL | localhost:5432 (banco dac4gil, usuario/senha postgres) |
| RabbitMQ | localhost:5672 (usuario/senha dac4gil) |
| Painel RabbitMQ | http://localhost:15672 |

A porta 7081 serve HTTP no Compose. A API usa Development para disponibilizar o
Swagger e aplica as migrations na inicializacao. O worker usa Production e
consome a fila; nao precisa de porta publicada. Aguarde a assinatura do worker
antes da primeira importacao (consulte os logs).

O frontend usa Nginx e repassa `/api/` para `dac.api:8080`, sem precisar configurar
uma URL no navegador. As conexoes dos containers usam `postgres` e `rabbitmq`
por variaveis de ambiente, preservando os appsettings para execucao local.

Os volumes existentes do PostgreSQL e RabbitMQ sao preservados. As credenciais
iniciais do RabbitMQ so sao criadas em um volume novo; se reutilizar um volume
antigo, configure nele o usuario dac4gil ou ajuste as conexoes no Compose para
um usuario ja existente. Bancos criados anteriormente por EnsureCreated exigem
compatibilizacao do historico antes de aplicar migrations.

Para encerrar sem apagar os dados: `docker compose down`.

### Dockerfiles

- API: `src/DAC4GIL.Presentation/Dockerfile` (contexto: raiz).
- Worker: `src/DAC4GIL.Messaging/Dockerfile` (contexto: raiz).
- Frontend: `frontend/Dockerfile` (contexto: frontend).

API e worker usam build em etapas com .NET 10 e executam com usuario sem privilegios.

Se as portas do banco e RabbitMQ ja estiverem ocupadas por outros containers,
mantenha-os ativos e troque apenas as portas publicadas deste Compose:

```powershell
$env:POSTGRES_PORT = "5433"
$env:RABBITMQ_PORT = "5673"
docker compose up -d --build
```

Tambem sao configuraveis API_PORT, FRONTEND_PORT e RABBITMQ_MANAGEMENT_PORT.
As portas internas e as conexoes entre containers permanecem iguais.
