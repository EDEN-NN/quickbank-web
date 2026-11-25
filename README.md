# QuickBank web

Aplicação Angular 22. O projeto está em fase inicial e serve só para estudo. Este repositório é o frontend. Ele depende do backend QuickBank: a API na porta 8088 e o Keycloak na porta 8080. O processo Java continua servindo a API e as páginas Thymeleaf. Este repositório só tem a interface no navegador.

O navegador chama a API e o Keycloak nos host ports. Não use nomes DNS do Compose (`app`, `keycloak`): o browser não resolve esses nomes.

## Telas e chamadas

Rotas em `src/app/app.routes.ts`. `/account` e `/statement` passam por `authGuard`. Sem sessão, o guard volta para `/`. Qualquer outro caminho também redireciona para `/`.

O interceptor em `src/app/core/auth.interceptor.ts` manda `Authorization: Bearer` em toda chamada cujo URL começa com `apiBaseUrl`.

| Rota | Tela | API |
| --- | --- | --- |
| `/` | Entrada. Botão de login no Keycloak, ou link para a conta se a sessão já existe. Lista `ana` e `bruno`. Não chama a API. | — |
| `/account` | Abre a conta se o usuário ainda não tem uma. Com conta, mostra caixa e crédito, depósito, transferência e os 5 movimentos mais recentes. | `GET /api/accounts/me`, `GET /api/accounts/me/statement`, `POST /api/accounts`, `POST /api/accounts/me/deposits`, `GET /api/deposits/{id}`, `POST /api/transfers` |
| `/statement` | Extrato completo, do mais antigo para o mais novo. Se não houver conta, só aponta de volta para `/account`. | `GET /api/accounts/me`, `GET /api/accounts/me/statement` |

`POST /api/accounts` não tem corpo. Depósito manda `{ "amount" }` e o header `Idempotency-Key`. Se o recibo não vier `POSTED`, a tela consulta `GET /api/deposits/{id}` até postar. Transferência manda `{ "toAccountNumber", "amount" }` e o mesmo header. A chave é um UUID gerado na hora.

Caixa é o que a transferência gasta. Crédito aparece separado e não é debitado nesta tela. Valores de dinheiro na API são strings decimais.

## Keycloak

Cliente público `quickbank-spa`, realm `quickbank`. Fluxo authorization code com PKCE (`pkceMethod` `S256`), `scope` `profile email`, `responseMode` `query`. O redirect depois do login é `{origem}/account`. O logout volta para `{origem}/`.

Os dois usuários de demonstração têm o papel de realm `CLIENT`. Nenhum tem conta até abrir uma pela tela.

| Usuário | Senha | E-mail |
| --- | --- | --- |
| `ana` | `ana` | `ana@quickbank.local` |
| `bruno` | `bruno` | `bruno@quickbank.local` |

Para transferir, use outro perfil de navegador na conta da outra pessoa. A transferência pede o número de 8 dígitos dessa conta.

O cliente confidencial `quickbank-web` fica no backend Thymeleaf. Este bundle não usa esse segredo.

## Portas

| O quê | URL |
| --- | --- |
| Este app, `docker compose` | http://localhost:4280 |
| Este app, `npm start` | http://localhost:4200 |
| API do backend | http://localhost:8088 |
| Keycloak | http://localhost:8080 |

A API e o Keycloak sobem no Compose do backend QuickBank. Este `docker-compose.yml` não sobe esses serviços.

## `environment.ts`

Arquivo de desenvolvimento: `src/environments/environment.ts`. O `ng build` (configuração `production`, que é a padrão) troca esse arquivo por `src/environments/environment.production.ts`. Os dois apontam para os mesmos host ports.

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8088',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'quickbank',
    clientId: 'quickbank-spa',
  },
};
```

No arquivo de produção, `production` é `true`. As chaves `apiBaseUrl`, `keycloak.url`, `keycloak.realm` e `keycloak.clientId` não mudam.

## Rodar com Docker Compose

Na pasta deste projeto:

```bash
docker compose up --build
```

O `Dockerfile` é multi-stage. O estágio `build` usa `node:22-bookworm-slim`, roda `npm ci` e `npm run build`. O estágio final é `nginx:1.27-alpine`, copia `nginx.conf` e o conteúdo de `dist/quickbank-web/browser` para `/usr/share/nginx/html`. O nginx escuta na porta 80. O Compose publica `4280:80`.

O serviço se chama `web`, no projeto Compose `quickbank-web`. Rotas do Angular caem em `index.html` (`try_files`).

Suba o backend QuickBank antes (API na porta 8088, Keycloak na porta 8080), senão o login e as chamadas de API falham. Na pasta do backend:

```bash
docker compose up --build
```

## Rodar com npm

Na pasta deste projeto, com a API em 8088 e o Keycloak em 8080 já no ar:

```bash
npm install
npm start
```

`npm start` executa `ng serve` e abre http://localhost:4200. `npm run build` gera o bundle de produção em `dist/quickbank-web`. `npm test` roda `ng test`.
