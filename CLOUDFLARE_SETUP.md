# Contato e painel administrativo no Cloudflare Pages

## Modelo de publicação

O repositório tem `origin` no GitHub, branch `main` sincronizada e não possuía configuração de Wrangler ou pipeline de Direct Upload. Isso indica que o projeto provavelmente usa a integração Git do Pages. Confirme em **Workers & Pages → sabor-que-rende → Settings → Builds & deployments**.

- **Git integration:** mantenha o diretório raiz como saída do site e sem comando de build. A pasta `functions/` será compilada automaticamente no próximo deploy disparado por Git.
- **Direct Upload:** o upload por arrastar e soltar no dashboard não suporta Pages Functions. Migre o projeto para integração Git ou publique por Wrangler. Essa migração não foi executada por este projeto.

## 1. Criar o banco D1

No painel Cloudflare, abra **Storage & Databases → D1 SQL Database → Create** e crie um banco, por exemplo `sabor-que-rende-contact`.

Em seguida, abra o console do banco, cole o conteúdo de `migrations/0001_contact_admin.sql` e execute uma vez.

Alternativamente, com Wrangler autenticado:

```sh
npx wrangler d1 execute sabor-que-rende-contact --remote --file=migrations/0001_contact_admin.sql
```

## 2. Vincular D1 ao Pages

No projeto Pages, abra **Settings → Bindings → Add → D1 database**:

- Variable name: `DB`
- D1 database: o banco criado acima

Configure o binding tanto em **Production** quanto em **Preview**, caso deseje testar preview deployments. Depois de criar ou alterar bindings, faça um novo deploy para aplicá-los.

## 3. Criar o hash da senha

Em um terminal local com Node.js 20 ou superior:

```sh
npm run password-hash
```

O comando solicita a senha sem exibi-la e gera um hash PBKDF2-SHA256. Copie somente o resultado que começa com `pbkdf2-sha256$`. A senha em texto puro não deve ser gravada em arquivo, GitHub ou variável do projeto.

No projeto Pages, abra **Settings → Variables and Secrets** e crie como valores secretos/encrypted:

- `ADMIN_PASSWORD_HASH`: hash gerado pelo comando.
- `RATE_LIMIT_SALT`: valor aleatório longo, independente da senha. Exemplo de geração local: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Configure valores separados em Preview se esse ambiente for usado.

## 4. Configurar Turnstile (recomendado)

Em **Turnstile → Add widget**, cadastre o hostname de produção e, se necessário, os hostnames de preview.

No Pages, configure:

- `TURNSTILE_SITE_KEY`: site key do widget. Pode ser variável comum.
- `TURNSTILE_SECRET_KEY`: secret key como segredo encrypted.

Configure as duas variáveis juntas. Se nenhuma estiver presente, o formulário continua protegido por validação, honeypot e rate limiting. Se o segredo existir, a API falha de forma segura e exige um token válido.

O backend sempre valida o token no endpoint Siteverify; a validação do navegador não é aceita isoladamente.

## 5. Implantar

Depois de revisar as alterações:

1. Faça commit local.
2. Envie para a branch usada pelo Pages.
3. Acompanhe o build em **Workers & Pages → Deployments**.
4. Confirme que o deployment mostra um bundle de Functions.

Nenhum commit, push ou deploy é executado automaticamente por estas instruções.

## 6. Verificação apó deploy

1. Acesse `/contato` e envie uma mensagem de teste.
2. Confirme que a mensagem de sucesso aparece somente depois de HTTP `201`.
3. Acesse `/admin/login`, entre e confirme que a mensagem aparece.
4. Marque-a como lida e teste a exclusão com confirmação.
5. Faça logout e confirme que `/admin/` redireciona novamente ao login.
6. Em janela anônima, confirme que `/api/admin/messages` devolve HTTP `401`.
7. Se Turnstile estiver ativo, confirme o hostname e a validação no painel Turnstile.

## Rotas criadas

- `POST /api/contact`
- `GET /api/contact/config`
- `POST /api/admin/login`
- `GET /api/admin/session`
- `GET /api/admin/messages`
- `PATCH /api/admin/messages/:id`
- `DELETE /api/admin/messages/:id`
- `POST /api/admin/logout`

`_routes.json` limita invocações de Functions a `/api/*` e `/admin/*`; as receitas, imagens e demais páginas continuam servidas estaticamente.

## Segurança implementada

- Senha somente como hash PBKDF2, em segredo do Cloudflare.
- Sessão aleatória; somente SHA-256 do token é salvo no D1.
- Cookie `HttpOnly`, `Secure` e `SameSite=Strict`, com validade de 8 horas.
- CSRF token e verificação de mesma origem nas operações de escrita.
- SQL parametrizado em todas as entradas.
- Renderização administrativa com `textContent`, sem injetar HTML das mensagens.
- Limite de 5 mensagens ou tentativas de login a cada 15 minutos por identificador HMAC temporário.
- Nenhum IP em claro e nenhuma mensagem enviada a logs pela aplicação.
- Respostas administrativas e de API com `no-store`.
