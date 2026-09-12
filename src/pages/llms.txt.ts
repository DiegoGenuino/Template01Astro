import type { APIRoute } from 'astro';
import { siteConfig } from '@/config/site';

export const prerender = true;

export const GET: APIRoute = () => {
  const { aiDiscovery, identity, seo } = siteConfig;

  if (!aiDiscovery.enabled) {
    return new Response('Not found', { status: 404 });
  }

  const siteUrl = seo.siteUrl.replace(/\/$/, '');
  const body = `# ${identity.siteName}

> ${aiDiscovery.summary}

Idioma principal: português do Brasil. Área de atendimento: ${seo.areaServed}. ${aiDiscovery.usageNote}

## Conteúdo principal

- [Visão geral institucional](${siteUrl}${aiDiscovery.markdownPath}): Conteúdo limpo sobre o escritório, profissional responsável, áreas de atuação, atendimento, localização e dúvidas frequentes.

## Navegação

- [Site oficial](${siteUrl}/): Página institucional completa da ${identity.siteName}.
- [Áreas de atuação](${siteUrl}/#especialidades): Especialidades relacionadas ao Direito Penal Econômico e à defesa criminal empresarial.
- [Quando buscar ajuda](${siteUrl}/#quando-buscar-ajuda): Situações que podem exigir orientação jurídica imediata.
- [Sobre o profissional](${siteUrl}/#sobre): Experiência e apresentação de ${identity.professionalName}.
- [Como funciona o atendimento](${siteUrl}/#como-funciona): Etapas do contato inicial ao acompanhamento jurídico.
- [Dúvidas frequentes](${siteUrl}/#faq): Respostas institucionais sobre atendimento e sigilo.
- [Localização](${siteUrl}/#localizacao): Região de atendimento presencial e acesso ao mapa.

## Optional

- [Sitemap](${siteUrl}/sitemap.xml): Relação das páginas públicas indexáveis.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
