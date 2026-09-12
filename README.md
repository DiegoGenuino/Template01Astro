# Template jurídico em Astro

Template estático, responsivo e orientado por configuração para criar sites de novos clientes sem alterar o layout original. Componentes, estilos, animações, SEO técnico e SEO para agentes de IA já estão prontos.

## Regra principal

Para adaptar o template a um cliente, altere somente:

- `src/config/site.ts`: textos, links, dados profissionais, seções, SEO e feature flags;
- `public/images`: imagens, logotipo, favicon e poster do vídeo;
- `public/fonts`: apenas se o projeto realmente precisar de outra família tipográfica.

Não altere `src/components`, `src/layouts`, `src/pages` ou `src/styles` durante uma personalização comum. Esses arquivos são a camada visual protegida do template.

## Estrutura

```text
src/
├── components/       Componentes visuais reutilizáveis
├── config/site.ts    Fonte única dos dados do cliente
├── data/faqs.ts      Reexportação de compatibilidade do FAQ
├── layouts/          Estrutura base, preload e metadados
├── pages/            Página, sitemap, robots e conteúdo para agentes
└── styles/           Layout, responsividade e identidade visual
public/
├── images/           Assets substituíveis do cliente
├── fonts/            Fontes locais
└── favicon.svg       Ícone padrão
```

## Criar um projeto novo para um cliente

A solução recomendada é manter este repositório como **GitHub Template Repository**. Assim, cada cliente recebe um repositório independente e o template original permanece intacto.

1. No GitHub, habilite `Settings > General > Template repository` neste repositório.
2. Clique em `Use this template` e crie um repositório privado para o cliente.
3. Clone o novo repositório.
4. Instale as dependências com `pnpm install`.
5. Substitua os assets em `public/images`.
6. Edite apenas `src/config/site.ts` com os dados do cliente.
7. Execute `pnpm build`.
8. Faça a revisão final descrita abaixo e publique.

Também é possível criar o projeto pelo GitHub CLI:

```powershell
gh repo create nome-do-cliente --private --template USUARIO/REPOSITORIO-TEMPLATE --clone
Set-Location nome-do-cliente
pnpm install
```

Esse fluxo normalmente cabe em 15 minutos quando textos e assets já estão preparados.

## Ordem rápida de personalização

Edite `src/config/site.ts` nesta ordem:

1. `identity`: nome do escritório, profissional, registro e logotipo;
2. `contact`: URL do WhatsApp e CTA principal;
3. `header` e `hero`: navegação, imagem principal, headline e CTAs;
4. `stats`, `about`, `practiceSection` e `differentialsSection`;
5. `reviewsSection`, `faqSection` e `footer`;
6. `videoSection` e `locationSection`;
7. `seo`, `aiDiscovery` e `deployment`.

O TypeScript valida a estrutura do contrato durante `pnpm build`. Se um campo obrigatório for removido ou estiver com o tipo errado, o build falhará antes da publicação.

## Assets do cliente

Os caminhos dos assets ficam no próprio `site.ts`, portanto os arquivos podem ter nomes diferentes. Mantenha as dimensões e proporções do layout para evitar mudanças visuais e CLS.

Checklist mínimo:

- logotipo SVG;
- favicon SVG;
- hero em WebP, com versões responsivas;
- foto profissional em WebP, com versões responsivas;
- três avatares do selo da hero;
- avatares das avaliações;
- ícone da plataforma de avaliações;
- poster 16:9 do vídeo, caso a seção esteja ativa;
- vídeo local, caso não seja usado YouTube.

Sempre atualize `width`, `height`, `srcset`, `alt` e `sizes` junto com o arquivo. Esses dados reservam espaço antes do download e ajudam a evitar CLS.

## Feature flags

As seções opcionais são controladas no arquivo de configuração:

```ts
videoSection: {
  enabled: true,
  provider: 'youtube', // ou 'file'
  videoId: 'ID_DO_YOUTUBE',
  videoUrl: '',
  // ...
},
locationSection: {
  enabled: true,
  // ...
},
aiDiscovery: {
  enabled: true,
  // ...
},
```

Para vídeo local, use `provider: 'file'`, deixe `videoId` vazio e informe `videoUrl`, por exemplo `/videos/institucional.mp4`. Para remover uma seção opcional sem tocar no layout, altere apenas `enabled` para `false`.

## Avaliações do Google por Place ID

O template usa a Places API (New) durante o build. Não existe dependência da Business Profile API. Configure somente o Place ID público no `site.ts`:

```ts
reviewsSection: {
  enabled: true,
  source: 'google',
  google: {
    placeId: 'PLACE_ID_DO_ESCRITORIO',
    limit: 3,
    reviewsUrl: 'URL_PUBLICA_DAS_AVALIACOES',
  },
  // fallbacks e manualItems permanecem preenchidos
},
```

Depois, coloque `GOOGLE_PLACES_API_KEY` no `.env.local` específico do repositório do cliente. Essa é a única credencial que muda entre os sites e nunca deve entrar em `site.ts` ou ser commitada.

```powershell
Copy-Item .env.example .env.local
```

Se a chave, o Place ID, um avatar, a data ou qualquer dado não estiver disponível, o componente usa os fallbacks definidos em `reviewsSection.fallbacks`. Como a Places API não informa profissão nem cidade do autor, esse detalhe recebe `Não disponível`. Se a API falhar ou retornar menos avaliações que o limite, os espaços restantes são preenchidos por `manualItems`, mantendo o layout publicável.

O Google determina a seleção e a ordem das avaliações retornadas; a API não garante as três mais recentes. O site deixa essa condição explícita quando exibe avaliações vindas da API. Para forçar conteúdo e ordem específicos, use `source: 'manual'`.

## Grid de áreas de atuação

O grid se ajusta automaticamente à quantidade de itens em `practiceSection.items`: até quatro colunas no desktop, duas no tablet e uma no celular. Linhas incompletas são redistribuídas de forma equilibrada, portanto três áreas ocupam três colunas e cinco áreas formam uma linha com três cards e outra com dois. Não é necessário alterar CSS ou componentes.

## Deploy automático: GitHub + Vercel + Cloudflare

O comando continua sendo `pnpm deploy:vercel`, mas a publicação agora usa o código do GitHub, não o upload local da pasta `dist`. O script:

1. Detecta o repositório pelo `git remote origin` (HTTPS ou SSH, sem token na URL).
2. Valida o build local e exige uma cópia sem alterações pendentes, na branch padrão do GitHub, com o último commit já enviado por push.
3. Cria ou conecta o projeto Vercel ao repositório e configura Astro, instalação `pnpm install --frozen-lockfile`, build `pnpm run build` e saída `dist`.
4. Se disponível localmente, cadastra apenas `GOOGLE_PLACES_API_KEY` como variável privada de produção na Vercel.
5. Solicita o build remoto a partir daquele commit específico e aguarda sua conclusão.
6. Conecta o domínio e cria/atualiza o DNS na Cloudflare, como antes.

Depois da conexão, novos pushes na branch de produção geram deploys pela integração GitHub–Vercel. Não é necessário executar o script em cada atualização. Ele continua útil para publicar inicialmente, sincronizar uma chave Google nova ou reaplicar a configuração do domínio.

Os dados públicos de cada projeto ficam em `siteConfig.deployment`:

```ts
deployment: {
  projectName: 'eduardo-ferreira',
  subdomain: 'eduardoferreira',
  baseDomain: 'feito.website',
  cnameTarget: 'cname.vercel-dns-0.com',
},
```

O endereço resultante será `https://eduardoferreira.feito.website`. Atualize também `seo.siteUrl` para esse endereço antes de publicar.

### Autorizar o GitHub uma vez

Conecte a conta GitHub à Vercel e instale/autorize o [aplicativo Vercel para GitHub](https://vercel.com/docs/git/vercel-for-github). Ele precisa ter acesso ao repositório do cliente, inclusive se for privado. Se você limitar a instalação a repositórios selecionados, libere cada novo repositório; permitir todos inclui novos repositórios, mas concede acesso mais amplo.

Não é necessário adicionar um token GitHub ao template. O Git da máquina deve estar autenticado para clone/push e para a consulta de leitura da branch remota; a Vercel usa sua própria integração para obter o código. Um `VERCEL_TOKEN` sozinho não concede acesso ao GitHub. Ao migrar para um time, confirme também a integração e as permissões desse time.

O script não cria commits, não faz push, não troca branches e não cria repositórios. Esses passos devem ser realizados antes, com autorização do responsável. Caso o app Astro esteja em uma subpasta, a raiz relativa é detectada automaticamente.

As credenciais de publicação são globais e devem ser configuradas uma única vez na máquina que executa os deploys. O script procura automaticamente por:

```text
C:\Users\SEU_USUARIO\Documents\tokens-para-criar-os-sites\credentials.env
```

O arquivo contém:

- `VERCEL_TOKEN`: token da sua conta Vercel;
- `CLOUDFLARE_API_TOKEN`: token com permissão para editar DNS apenas na zona necessária;
- `CLOUDFLARE_ZONE_ID`: ID da zona `feito.website`.

Crie o arquivo global uma única vez, a partir da raiz do template:

```powershell
$feitoDirectory = Join-Path $env:USERPROFILE 'Documents\tokens-para-criar-os-sites'
New-Item -ItemType Directory -Force -Path $feitoDirectory
Copy-Item .env.automation.example (Join-Path $feitoDirectory 'credentials.env')
```

Depois, preencha o arquivo criado. Todos os repositórios gerados pelo template reutilizarão automaticamente essas mesmas credenciais. Não é necessário criar `.env.automation` dentro de cada projeto.

Variáveis configuradas diretamente no sistema ou no CI também são aceitas e têm prioridade sobre o arquivo. Para usar outro local seguro, defina `FEITO_CREDENTIALS_FILE` com o caminho absoluto do arquivo global.

`VERCEL_TEAM_ID` não é uma chave nem é obrigatório. Deixe-o vazio para publicar na conta pessoal e informe esse identificador apenas quando migrar para um time. O destino CNAME também não precisa ser fornecido: o script consulta o valor recomendado pela Vercel e usa a configuração pública do `site.ts` somente como fallback.

Em cada novo repositório de cliente, copie apenas `.env.example` para `.env.local` e preencha a chave daquele projeto:

```powershell
Copy-Item .env.example .env.local
```

### Onde fica a chave do Google

- **Desenvolvimento local:** `GOOGLE_PLACES_API_KEY` em `.env.local` do cliente (ignorado pelo Git), ou no ambiente do processo.
- **Site publicado:** variável `GOOGLE_PLACES_API_KEY` do projeto Vercel, em **Production**, como **Secret/Sensitive**. O comando a cadastra/atualiza automaticamente quando há um valor local.
- **Somente no painel:** você também pode cadastrá-la diretamente em Settings → Environment Variables na Vercel e deixar o valor local vazio. O script preserva a variável remota, sem buscar seu valor.
- **Sem chave em nenhum lugar:** as avaliações manuais continuam funcionando. O Google é consultado durante o build, não pelo navegador; novas avaliações aparecem após um novo build.
- **Previews:** o script não envia a chave para Preview/Development. Se não houver uma variável separada nesses ambientes, eles usam avaliações manuais.

Nunca use prefixo `PUBLIC_`, nunca coloque a chave no `site.ts` e nunca faça commit do `.env.local`. Os tokens Vercel/Cloudflare não são cadastrados no projeto remoto. A chave Google presente por engano no arquivo global de publicação é ignorada. Prioridade para a chave: ambiente do processo → `.env.local` → `.env`; um valor vazio explícito impede sincronização. Se a chave for alterada somente no painel, remova o valor antigo local para não sobrescrevê-la no próximo comando.

Essa configuração usa [variáveis secretas da Vercel](https://vercel.com/docs/environment-variables/sensitive-environment-variables). Guarde a chave original com segurança: ela não precisa ser exposta ao frontend nem lida de volta pelo script.

### Publicar um cliente

Faça primeiro uma simulação local, que valida a configuração e o build sem consultar GitHub, Vercel, Cloudflare ou Google Places. Ela não lê o arquivo global de credenciais e permite alterações pendentes para facilitar a revisão:

```bash
pnpm deploy:vercel -- --dry-run
```

Depois de revisar as informações e configurar as chaves, faça commit e push na branch padrão do repositório. Então publique:

```bash
pnpm deploy:vercel
```

O deploy real recusa arquivos de ambiente versionados e código diferente do último commit da branch no GitHub. A simulação não confirma permissões, existência do projeto ou DNS. Uma falha de integração GitHub não muda silenciosamente para upload de arquivos locais.

Opções adicionais:

- `--skip-build`: pula apenas a validação local; **a Vercel sempre faz o build remoto do GitHub** e não utiliza sua pasta `dist`;
- `--skip-domain`: publica na Vercel sem alterar Cloudflare ou domínio personalizado.

### Projetos publicados pelo fluxo antigo

Mantenha o mesmo `deployment.projectName`, conta/time e domínio. Depois de levar estas alterações ao repositório do cliente e fazer push, rode o comando. Ele conecta o projeto existente sem apagar o projeto nem recriar seus domínios. Se o projeto já estiver ligado a outro repositório, o script interrompe antes de alterar esse vínculo; use um nome de projeto exclusivo por cliente. A branch padrão do GitHub e a branch de produção da Vercel precisam estar alinhadas.

Se um passo remoto falhar, alterações já concluídas (como criar o projeto ou salvar a variável) não são desfeitas automaticamente. Corrija a causa e execute novamente. Se apenas o tempo de espera do build expirar, consulte primeiro o deployment indicado na Vercel para evitar builds duplicados.

### Configuração única do domínio

Para automatizar cada subdomínio, mantenha a zona DNS de `feito.website` na Cloudflare. A troca dos nameservers é feita uma única vez no registrador atual. Antes da mudança, replique na Cloudflare todos os registros existentes que sejam importantes, principalmente MX, SPF, DKIM e DMARC usados por e-mail. Depois disso, o script cria cada novo subdomínio sem ajustes manuais na Hostinger.

O token da Cloudflare deve ser restrito à edição de DNS dessa zona. Na fase inicial, `VERCEL_TEAM_ID` vazio publica na conta pessoal. Quando houver um time, basta preencher a variável; o código e o fluxo permanecem iguais.

O script pode criar e conectar o projeto automaticamente, mas não deve ser executado antes de as chaves e os dados do domínio estarem corretos. O arquivo global fica fora dos repositórios e nunca deve ser commitado.

## SEO e descoberta por agentes de IA

O conteúdo de `siteConfig` alimenta automaticamente:

- title, description, canonical, Open Graph e Twitter Cards;
- JSON-LD de `WebSite`, `LegalService`, `Person`, `WebPage` e `FAQPage`;
- `robots.txt`;
- `sitemap.xml`;
- `site.webmanifest`;
- `llms.txt`;
- `index.md`, versão limpa do conteúdo para agentes.

Antes de publicar, confira principalmente `seo.siteUrl`, `seo.defaultTitle`, `seo.titleTemplate`, `seo.defaultDescription`, `seo.defaultImage`, `seo.keywords`, `seo.areaServed`, `seo.knowsAbout`, `aiDiscovery.summary` e `aiDiscovery.usageNote`.

## Prompt recomendado para adaptar com IA

Use um pedido com limites explícitos:

```text
Adapte este template para o cliente usando os dados abaixo.
Edite somente src/config/site.ts e substitua os assets necessários em public/images.
Não altere componentes, páginas, estilos, classes CSS, breakpoints, animações ou estrutura visual.
Mantenha as feature flags existentes, salvo quando eu indicar o contrário.
Atualize também SEO, JSON-LD, conteúdo para agentes de IA, textos alternativos e dados de contato.
Ao terminar, execute pnpm build e relate qualquer dado que ainda esteja faltando.

[COLE AQUI O BRIEFING DO CLIENTE]
```

## Comandos

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm test:reviews
pnpm test:deploy
pnpm deploy:vercel -- --dry-run
```

`pnpm build` executa primeiro a checagem de tipos do Astro e depois gera o site estático em `dist`.

## Checklist antes da publicação

- nenhum dado, telefone, OAB ou nome do cliente anterior permanece;
- todos os CTAs abrem o WhatsApp correto;
- menu e links de âncora apontam para seções existentes;
- título, descrição, imagem social e URL canônica estão corretos;
- endereço e mapa correspondem ao cliente;
- vídeo e poster funcionam, ou a seção está desativada;
- avaliações foram autorizadas pelo cliente;
- textos alternativos descrevem as imagens relevantes;
- `pnpm build` termina com zero erros e zero avisos;
- `pnpm test:reviews` e `pnpm test:deploy` passam;
- o aplicativo Vercel tem acesso ao repositório GitHub do cliente;
- configuração e assets estão commitados e enviados à branch padrão, sem credenciais no Git;
- `dist/llms.txt`, `dist/index.md`, `dist/robots.txt` e `dist/sitemap.xml` contêm o domínio e os dados novos.

## Evolução do template

Melhorias visuais ou estruturais devem ser feitas somente no repositório do template e versionadas. Depois, podem ser aplicadas aos projetos dos clientes de forma controlada. O conteúdo de um cliente nunca deve ser copiado de volta para o template-base.
