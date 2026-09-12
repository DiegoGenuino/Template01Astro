import type { APIRoute } from 'astro';
import { siteConfig } from '@/config/site';

export const prerender = true;

export const GET: APIRoute = () => {
  const { aiDiscovery, faqSection, identity, locationSection, processSection, seo, urgencySection } = siteConfig;

  if (!aiDiscovery.enabled) {
    return new Response('Not found', { status: 404 });
  }

  const siteUrl = seo.siteUrl.replace(/\/$/, '');
  const areas = seo.knowsAbout.map((area) => `- ${area}`).join('\n');
  const faqs = faqSection.items
    .map(({ question, answer }) => `### ${question}\n\n${answer}`)
    .join('\n\n');
  const urgencyItems = urgencySection.items
    .map(({ title, description }) => `- **${title}:** ${description}`)
    .join('\n');
  const processSteps = processSection.items
    .map(({ title, description, detail }, index) => `${index + 1}. **${title}:** ${description} ${detail}`)
    .join('\n');

  const body = `# ${identity.siteName}

> ${aiDiscovery.summary}

## Sobre o escritório

${seo.defaultDescription}

A ${identity.legalName} atua em ${seo.areaServed}, com atendimento técnico, pessoal e sigiloso. ${aiDiscovery.usageNote}

## Profissional responsável

### ${identity.professionalName}

**Atuação:** ${identity.professionalRole}.

${identity.professionalDescription}

## Áreas de atuação

${areas}

## Atendimento

O atendimento pode ocorrer presencialmente ou de forma remota, conforme a necessidade do caso. Conversas, documentos e informações são tratados sob sigilo profissional. O primeiro contato é destinado a compreender o contexto, identificar urgências e orientar os próximos passos.

## Quando buscar orientação jurídica

${urgencyItems}

## Como funciona o atendimento

${processSteps}

## Localização

${locationSection.address}. Para atendimento presencial, é necessário entrar em contato previamente para confirmar o horário.

## Perguntas frequentes

${faqs}

## Fontes oficiais

- [Site institucional](${siteUrl}/)
- [Sitemap](${siteUrl}/sitemap.xml)
- [Resumo para agentes](${siteUrl}${aiDiscovery.llmsPath})
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
