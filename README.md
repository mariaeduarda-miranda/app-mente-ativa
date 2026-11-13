# Mente Ativa

Aplicativo de estímulo cognitivo com app mobile em **Expo/React Native** e API própria em
**Express + PostgreSQL + JWT**.

```
mobile (Expo)  ──HTTP──>  backend (Express :3000)  ──>  PostgreSQL :5432 (Docker)
                                                        ^
                                    pgAdmin :5050 ──────┘
```

## Estrutura

```
app-mente-ativa/
├── backend/                  API Express
│   ├── docker-compose.yml    PostgreSQL 17 + pgAdmin (Docker)
│   ├── pgadmin/servers.json  servidor já cadastrado no pgAdmin
│   ├── sql/                  schemas (users, game_sessions)
│   ├── scripts/              db-setup e smoke test
│   └── src/                  app, rotas, controllers, middlewares
├── mobile/                   app Expo (React Native)
│   └── src/
│       ├── components/       estilos de auth + barra de navegação inferior
│       ├── data/             bancos de perguntas e pares dos jogos
│       ├── screens/          Home, Login, SignUp, Games, Perfil, jogos e progresso
│       └── services/         api (HTTP) e session (AsyncStorage)
└── package.json              atalhos para rodar tudo
```

## Pré-requisitos

- Node.js 20+ (testado com 22)
- Docker Desktop em execução
- Expo Go no celular **ou** emulador Android configurado

> Se `docker` não for reconhecido no terminal, feche e abra o terminal novamente
> (o instalador adiciona `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin` ao PATH).

## Como executar (passo a passo)

### 1. Instalar dependências

```powershell
cd backend
npm install

cd ..\mobile
npm install
```

### 2. Configurar o backend

```powershell
cd ..\backend
copy .env.example .env
```

Gere um segredo real para o JWT e cole em `JWT_SECRET` no `.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Subir o PostgreSQL, o pgAdmin e criar as tabelas

```powershell
npm run db:up      # sobe PostgreSQL + pgAdmin e espera os healthchecks
npm run db:setup   # aplica todos os sql/*.sql e cria o usuário de teste
```

O `db:setup` cria:

| E-mail | Senha |
|---|---|
| `teste@menteativa.com` | `Senha@123` |

#### Acessar o banco pelo pgAdmin

Com os containers no ar, abra <http://localhost:5050> e entre com:

| Campo | Valor |
|---|---|
| E-mail | `admin@menteativa.com` |
| Senha | `MenteAtiva@2026` |

O servidor **Mente Ativa (Docker)** já vem cadastrado. Ao clicar nele, o pgAdmin pede
a senha do PostgreSQL (`mente_ativa_dev`); marque **Save Password** para não digitar de novo.
Depois é só navegar em `Databases > mente_ativa > Schemas > public > Tables` e abrir
`users` ou `game_sessions`.

> Essas credenciais são apenas de desenvolvimento e ficam no `backend/.env`
> (`PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`, `PGADMIN_PORT`).

### 4. Rodar a API

```powershell
npm run dev
```

Saída esperada:

```
[db] PostgreSQL conectado.
[api] Mente Ativa API ouvindo em http://localhost:3000
[api] Celular fisico (mesma rede): http://192.168.x.x:3000
```

Teste rápido: abra `http://localhost:3000/health` ou rode `npm run smoke` em outro terminal.

### 5. Rodar o app

Em outro terminal:

```powershell
cd mobile
npx expo start -c
```

- **Emulador Android:** pressione `a`.
- **Celular físico:** instale o Expo Go, conecte na **mesma rede Wi-Fi** do PC e leia o QR Code.

O app descobre automaticamente o IP do computador usado pelo Metro. Se o celular não
conseguir conectar, force a URL da API:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.0.10:3000"
npx expo start -c
```

> Libere a porta 3000 no firewall do Windows para redes privadas na primeira execução.

## Jogos

Todos rodam em modo foco (sem a barra inferior), têm leitura em voz alta e salvam a
partida concluída para o usuário autenticado.

| Jogo (`gameKey`) | Rodada | Métrica de acerto |
|---|---|---|
| Sequência Lógica (`sequencia`) | 10 perguntas sorteadas de um banco de 20 | respostas certas ÷ perguntas |
| Jogo da Memória (`memoria`) | 4 pares (8 cartas) sorteados de um banco de 8 pares | pares encontrados ÷ tentativas |
| Dedução Lógica (`deducao`) | 5 enigmas sorteados de um banco de 12 | respostas certas ÷ enigmas |

A tela **Meu Progresso** usa esses registros para exibir partidas concluídas e a
média de acertos por jogo.

## API

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| GET | `/health` | — | Status da API + banco |
| POST | `/register` | — | `{ name, email, password }` → cria conta e devolve token |
| POST | `/login` | — | `{ email, password }` → devolve token |
| GET | `/me` | `Bearer <token>` | Dados atualizados do usuário |
| PUT | `/me` | `Bearer <token>` | Atualiza nome/e-mail e devolve sessão renovada |
| PUT | `/me/password` | `Bearer <token>` | Troca a senha (senha atual + nova) |
| POST | `/progress/sessions` | `Bearer <token>` | Registra uma partida concluída |
| GET | `/progress` | `Bearer <token>` | Resumo do progresso do usuário |
| POST | `/verifyToken` | token no header ou body | Valida a sessão salva no app |

Resposta de sucesso (login/cadastro):

```json
{
  "token": "<jwt>",
  "expiresIn": "7d",
  "user": { "id": "...", "uid": "...", "name": "...", "email": "...", "createdAt": "..." }
}
```

Códigos de erro: `400` dados inválidos, `401` credenciais inválidas/token inválido,
`403` conta desativada, `409` e-mail já cadastrado, `429` muitas tentativas.

## Scripts úteis

Na raiz do projeto:

| Comando | O que faz |
|---|---|
| `npm run db:up` | Sobe o PostgreSQL + pgAdmin |
| `npm run db:down` | Para os containers (mantém os dados) |
| `npm run db:ps` | Mostra o status dos containers |
| `npm run db:setup` | Aplica os schemas SQL e cria o usuário de teste |
| `npm run db:reset` | Apaga os volumes e recria o banco do zero |
| `npm run api` | Inicia a API em modo watch |
| `npm run smoke` | Executa o teste de fumaça (auth + progresso) |
| `npm run mobile` | Inicia o Expo |

## Banco de dados

Tabela `users` (`backend/sql/001_init.sql`):

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | `gen_random_uuid()` |
| `name` | TEXT | 2 a 120 caracteres |
| `email` | TEXT | único via índice em `lower(email)` |
| `password_hash` | TEXT | bcrypt (custo 12) |
| `is_active` | BOOLEAN | contas desativadas perdem acesso |
| `created_at` / `updated_at` | TIMESTAMPTZ | `updated_at` via trigger |

Tabela `game_sessions` (`backend/sql/002_game_sessions.sql`) — partidas concluídas,
usadas pela tela **Meu Progresso**:

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | `gen_random_uuid()` |
| `user_id` | UUID | FK `users(id)` com `ON DELETE CASCADE` |
| `game_key` | TEXT | `sequencia`, `memoria` ou `deducao` |
| `total_questions` | SMALLINT | 1 a 100 |
| `correct_answers` | SMALLINT | 0 até `total_questions` |
| `duration_seconds` | INTEGER | opcional, ≥ 0 |
| `started_at` | TIMESTAMPTZ | opcional |
| `finished_at` / `created_at` | TIMESTAMPTZ | `NOW()` por padrão |

O progresso é agregado no banco: `GET /progress` conta as partidas e calcula o
percentual de acertos por jogo (`sum(correct_answers) / sum(total_questions)`).
O `db:setup` aplica todos os arquivos de `backend/sql/` em ordem alfabética,
então novas migrações basta serem adicionadas nessa pasta.

Inspecionar o banco:

```powershell
# via terminal
docker exec -it mente-ativa-db psql -U mente_ativa -d mente_ativa

# via navegador
# http://localhost:5050  (admin@menteativa.com / MenteAtiva@2026)
```

Containers do `docker compose`:

| Container | Imagem | Porta | Função |
|---|---|---|---|
| `mente-ativa-db` | `postgres:17-alpine` | 5432 | banco de dados |
| `mente-ativa-pgadmin` | `dpage/pgadmin4:9` | 5050 | interface web do banco |

Os dados ficam nos volumes `backend_mente_ativa_pgdata` (banco) e
`backend_mente_ativa_pgadmin` (configurações do pgAdmin). `npm run db:down` não apaga
nada; apenas `npm run db:reset` (`down -v`) recria tudo do zero.

## Segurança aplicada

- Senhas com hash **bcrypt** (nunca em texto puro).
- Login **não cria conta**: cadastro só pelo `/register`.
- Senha sempre verificada com `bcrypt.compare` (a versão anterior emitia JWT apenas
  localizando o e-mail, o que permitia entrar com qualquer senha).
- JWT assinado com segredo obrigatório vindo do `.env` (sem valor padrão no código).
- `401` genérico para credenciais inválidas (não revela se o e-mail existe).
- Rate limit de 10 tentativas de login por 15 minutos por IP + e-mail.
- CORS configurável por `CORS_ORIGIN`.

## Solução de problemas

| Sintoma | Causa provável | Correção |
|---|---|---|
| `docker` não é reconhecido | terminal aberto antes da instalação | feche e reabra o terminal |
| `[db] Nao foi possivel conectar` | container parado | `npm run db:up` |
| `porta 3000 em uso` | outra API rodando | encerre o processo ou troque `PORT` |
| App não conecta no celular | IP errado/firewall | use `EXPO_PUBLIC_API_URL` e libere a porta 3000 |
| `E-mail ou senha incorretos` com o usuário de teste | banco recriado sem seed | `npm run db:setup` |
| `Muitas tentativas` | rate limit do login | aguarde 15 minutos |
| pgAdmin pede senha do banco | primeiro acesso ao servidor | use `mente_ativa_dev` e marque **Save Password** |
| `porta 5050 em uso` | outra instância do pgAdmin | pare a outra instância ou troque `PGADMIN_PORT` no `.env` |
| Esqueci a senha do pgAdmin | credenciais do `.env` mudaram depois do primeiro start | `docker volume rm backend_mente_ativa_pgadmin` e `npm run db:up` |

## Legado

- `backend/functions/` é a implementação antiga em Firebase Cloud Functions. Está
  **descontinuada** e contém a falha de segurança corrigida nesta versão; não é usada
  pela API atual. Pode ser removida quando o projeto for entregue.
- `_legacy/src/` guarda a cópia idêntica da pasta `mobile/src` que existia na raiz.
  Pode ser apagada com segurança.
