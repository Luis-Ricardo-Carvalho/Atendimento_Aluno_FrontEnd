# Frontend · Atendimento ao Aluno (IFConect)

React 19 + Vite, no padrão do Chaves-ifsistem: login único IFSISTEM (PKCE), `/api` via proxy para o backend (porta 8081),
identidade do Guia Visual IF Conect. Coloque esta pasta como `frontend/` na raiz do repositório.

## Testar agora, sem o auth IFSISTEM (banco fictício)
```bash
# 1) backend (veja o README do módulo):  ./mvnw spring-boot:run -Dspring-boot.run.profiles=demo,atendimento-demo
# 2) front:
cd frontend && npm install && npm run dev:demo      # http://127.0.0.1:5173
```
A tela inicial lista os usuários fictícios (3 alunos, 6 professores, 2 servidores). Entre como **Ana Aluna Demo** para ver
professores, filtros, atendimentos e chat; entre como **Emerson Carvalho** para ver a área do profissional.
Para testar o chat nos dois lados, abra uma janela anônima e entre com outro usuário.

## Modo real (SSO)
```bash
npm run dev      # exige o auth IFSISTEM em http://localhost:9000 e o cliente "atendimento" cadastrado
```
Cadastro no auth (mesmo formato do Chaves, ver docs/sso-integration.md):
```properties
auth.clientes[N].client-id=atendimento
auth.clientes[N].redirect-uris=http://localhost:5173/callback.html,<URL-de-produção>/callback.html
auth.clientes[N].post-logout-redirect-uris=http://localhost:5173/,<URL-de-produção>/
```
Enquanto isso não for cadastrado, dá para testar o SSO trocando `clientId` para `'chaves'` em `public/sso.js` (usar `localhost`, não `127.0.0.1`).

## Testes
`npm test` (regras de formatação/disponibilidade). Além disso o fluxo foi exercitado em Chromium headless com a API simulada:
entrada demo, cards, filtros, modal, criação de atendimento, chat (Enter envia) e "Meus atendimentos".
