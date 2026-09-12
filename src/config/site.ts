export type VideoProvider = 'youtube' | 'file';

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface NavigationLink {
  href: string;
  label: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface IdentityConfig {
  siteName: string;
  legalName: string;
  professionalName: string;
  professionalRole: string;
  professionalDescription: string;
  professionalImage: string;
  logo?: ImageAsset;
  registration: string;
}

export interface ContactConfig {
  whatsappUrl: string;
  primaryCtaLabel: string;
}

export interface HeaderConfig {
  brandHref: string;
  brandLabel: string;
  primaryNavigationLabel: string;
  mobileNavigationLabel: string;
  menuOpenLabel: string;
  links: NavigationLink[];
}

export interface HeroConfig {
  id: string;
  image: ImageAsset & {
    srcset: Array<{ src: string; width: number }>;
    sizes: string;
  };
  trust: {
    text: string;
    avatars: string[];
  };
  title: Array<{ text: string; highlighted?: boolean }>;
  description: string;
  primaryCtaLabel: string;
  secondaryCta: NavigationLink;
  scrollTarget: string;
  scrollLabel: string;
}

export interface StatsConfig {
  id: string;
  label: string;
  items: Array<{ value: string; label: string }>;
}

export interface AboutConfig {
  id: string;
  image: ImageAsset & {
    srcset: Array<{ src: string; width: number }>;
    sizes: string;
  };
  cardName: string;
  cardDetail: string;
  eyebrow: string;
  credentials: Array<{ icon: string; text: string }>;
}

export interface PracticeSectionConfig {
  id: string;
  title: string;
  highlightedTitle: string;
  description: string;
  items: Array<{ icon: string; title: string; description: string }>;
}

export interface DifferentialsSectionConfig {
  id: string;
  titlePrefix: string;
  highlightedTitle: string;
  titleSuffix: string;
  tabsLabel: string;
  ctaLabel: string;
  items: Array<{ icon: string; title: string; description: string }>;
}

export type ReviewsSource = 'google' | 'manual';

export interface ReviewItem {
  quote: string;
  name: string;
  details: string;
  rating: number | null;
  avatar: string;
  avatarPosition: string;
  publishedAt: string | null;
  publishedAtLabel: string;
  googleMapsUrl: string;
  authorProfileUrl: string;
  source: 'google' | 'manual';
}

export type ManualReviewItem = Pick<
  ReviewItem,
  'quote' | 'name' | 'details' | 'rating' | 'avatar' | 'avatarPosition'
> & Partial<Pick<ReviewItem, 'publishedAt' | 'publishedAtLabel' | 'googleMapsUrl' | 'authorProfileUrl'>>;

export interface ReviewsSectionConfig {
  enabled: boolean;
  id: string;
  title: string;
  highlightedTitle: string;
  platformLogo: ImageAsset;
  source: ReviewsSource;
  maxRating: number;
  ratingUnavailableLabel: string;
  orderingNotice: string;
  google: {
    placeId: string;
    limit: number;
    reviewsUrl: string;
  };
  fallbacks: {
    quote: string;
    name: string;
    details: string;
    avatar: string;
    avatarPosition: string;
    publishedAtLabel: string;
  };
  manualItems: ManualReviewItem[];
}

export interface FaqSectionConfig {
  id: string;
  eyebrow: string;
  title: string;
  highlightedTitle: string;
  description: string;
  ctaLabel: string;
  items: FaqItem[];
}

export interface FooterConfig {
  eyebrow: string;
  title: string;
  highlightedTitle: string;
  description: string;
  links: NavigationLink[];
  copyrightSuffix: string;
  backToTopLabel: string;
  backToTopHref: string;
  whatsapp: {
    regionLabel: string;
    closeLabel: string;
    image: ImageAsset;
    senderName: string;
    message: string;
    actionLabel: string;
    buttonLabel: string;
  };
}

export interface VideoSectionConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  highlightedTitle: string;
  description: string;
  provider: VideoProvider;
  videoId: string;
  videoUrl: string;
  poster: string;
  posterAlt: string;
  playLabel: string;
  caption: string;
}

export interface LocationSectionConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  highlightedTitle: string;
  description: string;
  address: string;
  mapQuery: string;
  mapTitle: string;
  directionsLabel: string;
}

export interface AiDiscoveryConfig {
  enabled: boolean;
  llmsPath: string;
  markdownPath: string;
  summary: string;
  usageNote: string;
}

export interface SeoConfig {
  siteUrl: string;
  locale: string;
  language: string;
  homePageTitle: string;
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultImage: string;
  defaultImageAlt: string;
  defaultImageWidth: number;
  defaultImageHeight: number;
  themeColor: string;
  favicon: string;
  keywords: string[];
  areaServed: string;
  knowsAbout: string[];
  sitemap: Array<{
    path: string;
    changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority: number;
  }>;
}

export interface DeploymentConfig {
  projectName: string;
  subdomain: string;
  baseDomain: string;
  cnameTarget: string;
}

export interface SiteConfig {
  identity: IdentityConfig;
  contact: ContactConfig;
  header: HeaderConfig;
  hero: HeroConfig;
  stats: StatsConfig;
  about: AboutConfig;
  practiceSection: PracticeSectionConfig;
  differentialsSection: DifferentialsSectionConfig;
  reviewsSection: ReviewsSectionConfig;
  faqSection: FaqSectionConfig;
  footer: FooterConfig;
  seo: SeoConfig;
  videoSection: VideoSectionConfig;
  locationSection: LocationSectionConfig;
  aiDiscovery: AiDiscoveryConfig;
  deployment: DeploymentConfig;
}

const practiceDescription = 'Defesa em todas as fases — inquérito, ação penal e recursos — em casos de ocultação e dissimulação de ativos.';

export const siteConfig = {
  identity: {
    siteName: 'Ferreira Defesa',
    legalName: 'Ferreira Defesa',
    professionalName: 'Dr. Eduardo Ferreira',
    professionalRole: 'Advogado criminalista em Direito Penal Econômico',
    professionalDescription: 'Advogado criminalista com mais de 15 anos de atuação exclusiva em Direito Penal Econômico. Formado pela USP, com especialização pela FGV Direito SP. Mais de 2.100 casos encerrados e +R$22M em ativos recuperados para clientes.',
    professionalImage: '/images/eduardo-ferreira-560.webp',
    logo: {
      src: '/images/eduardo-ferreira-logo.svg',
      width: 165,
      height: 12,
      alt: 'Eduardo Ferreira',
    },
    registration: 'OAB/SP nº 000.000',
  },
  contact: {
    whatsappUrl: 'https://wa.me/5511999999999',
    primaryCtaLabel: 'Falar com especialista',
  },
  header: {
    brandHref: '#inicio',
    brandLabel: 'Ferreira Defesa — início',
    primaryNavigationLabel: 'Navegação principal',
    mobileNavigationLabel: 'Navegação mobile',
    menuOpenLabel: 'Abrir menu',
    links: [
      { href: '#sobre', label: 'Quem somos' },
      { href: '#especialidades', label: 'Especialidades' },
      { href: '#diferenciais', label: 'Por que nós' },
      { href: '#faq', label: 'Dúvidas' },
    ],
  },
  hero: {
    id: 'inicio',
    image: {
      src: '/images/hero-legal-1672.webp',
      width: 1672,
      height: 942,
      alt: '',
      srcset: [
        { src: '/images/hero-legal-960.webp', width: 960 },
        { src: '/images/hero-legal-1672.webp', width: 1672 },
      ],
      sizes: '100vw',
    },
    trust: {
      text: '100% clientes atendidos com excelência',
      avatars: ['/images/avatar-2.webp', '/images/avatar-1.webp', '/images/avatar-3.webp'],
    },
    title: [
      { text: 'Defesa Estratégica em ' },
      { text: 'Crimes Financeiros', highlighted: true },
      { text: ' e ' },
      { text: 'Corrupção', highlighted: true },
    ],
    description: 'Atuação técnica e estratégica na defesa de empresários, executivos e pessoas investigadas em crimes financeiros complexos.',
    primaryCtaLabel: 'Quero defesa de alto nível',
    secondaryCta: { href: '#sobre', label: 'Conheça nossa atuação' },
    scrollTarget: '#numeros',
    scrollLabel: 'Ir para os números',
  },
  stats: {
    id: 'numeros',
    label: 'Resultados do escritório',
    items: [
      { value: '+R$22M', label: 'em ativos recuperados' },
      { value: '+1.700', label: 'atos processuais realizados' },
      { value: '97%', label: 'de avaliações positivas' },
      { value: '+2.100', label: 'casos analisados' },
    ],
  },
  about: {
    id: 'sobre',
    image: {
      src: '/images/eduardo-ferreira-560.webp',
      width: 560,
      height: 700,
      alt: 'Dr. Eduardo Ferreira, advogado criminalista',
      srcset: [
        { src: '/images/eduardo-ferreira-560.webp', width: 560 },
        { src: '/images/eduardo-ferreira-1122.webp', width: 1122 },
      ],
      sizes: '(max-width: 780px) calc(100vw - 34px), 392px',
    },
    cardName: 'Dr. Eduardo Ferreira',
    cardDetail: 'Criminalista | nº 000.000',
    eyebrow: 'Dr. Eduardo Ferreira',
    credentials: [
      { icon: 'lucide:circle-check', text: 'OAB/SP nº 000.000 — inscrito desde 2009' },
      { icon: 'lucide:circle-check', text: 'Pós-graduado em Direito Penal Econômico — FGV Direito SP' },
      { icon: 'lucide:circle-check', text: 'Membro da Comissão de Direito Penal Econômico OAB/SP' },
    ],
  },
  practiceSection: {
    id: 'especialidades',
    title: 'Crimes que defendemos',
    highlightedTitle: 'excelência',
    description: 'Atuação técnica e especializada nas práticas mais complexas do Direito Penal Econômico. Cada área com histórico sólido de resultados.',
    items: [
      { icon: 'lucide:credit-card', title: 'Lavagem de dinheiro', description: practiceDescription },
      { icon: 'lucide:file-text', title: 'Crimes Tributários', description: practiceDescription },
      { icon: 'lucide:credit-card', title: 'Corrupção e Improbidade', description: practiceDescription },
      { icon: 'lucide:credit-card', title: 'Fraudes Bancárias', description: practiceDescription },
      { icon: 'lucide:credit-card', title: 'Evasão de Divisas', description: practiceDescription },
      { icon: 'lucide:credit-card', title: 'Crimes Financeiros', description: practiceDescription },
      { icon: 'lucide:credit-card', title: 'Gestão Fraudulenta', description: practiceDescription },
      { icon: 'lucide:credit-card', title: 'Prevenção Corporativa', description: practiceDescription },
    ],
  },
  differentialsSection: {
    id: 'diferenciais',
    titlePrefix: 'Por que a',
    highlightedTitle: 'Ferreira Defesa',
    titleSuffix: 'é sua melhor escolha?',
    tabsLabel: 'Diferenciais da Ferreira Defesa',
    ctaLabel: 'Solicitar diagnóstico criminal',
    items: [
      { icon: 'lucide:badge-check', title: 'Atuação exclusiva em crimes financeiros', description: 'Especialização total garante maior profundidade jurídica e estratégias mais eficazes para delitos econômicos complexos.' },
      { icon: 'lucide:scale', title: 'Equipe técnica em Direito Penal Econômico', description: 'Conhecimento especializado para conduzir investigações e processos sensíveis com precisão em cada etapa.' },
      { icon: 'lucide:user-round-check', title: 'Atendimento direto com o advogado responsável', description: 'Contato próximo com quem lidera a estratégia, garantindo decisões rápidas, claras e plenamente informadas.' },
      { icon: 'lucide:lock-keyhole', title: 'Sigilo profissional absoluto e ética inabalável', description: 'Proteção rigorosa de informações, documentos e decisões em todas as fases do atendimento jurídico.' },
      { icon: 'lucide:book-open-check', title: 'Estratégias alinhadas às jurisprudências recentes', description: 'Atualização contínua para construir teses consistentes e adequadas ao cenário jurídico de cada caso.' },
      { icon: 'lucide:messages-square', title: 'Comunicação clara e acompanhamento contínuo', description: 'Você acompanha o andamento do caso com orientações objetivas, retorno próximo e transparência.' },
    ],
  },
  reviewsSection: {
    enabled: true,
    id: 'avaliacoes',
    title: 'O que nossos clientes',
    highlightedTitle: 'dizem',
    platformLogo: { src: '/images/google-icon.png', width: 41, height: 41, alt: 'Google' },
    source: 'google',
    maxRating: 5,
    ratingUnavailableLabel: 'Avaliação não disponível',
    orderingNotice: 'Avaliações selecionadas por relevância.',
    google: {
      // O Place ID é público. A chave secreta fica em GOOGLE_PLACES_API_KEY.
      placeId: '',
      limit: 3,
      reviewsUrl: '',
    },
    fallbacks: {
      quote: 'Comentário não disponível',
      name: 'Usuário do Google',
      details: 'Não disponível',
      avatar: '/images/google-icon.png',
      avatarPosition: 'center',
      publishedAtLabel: 'Data não disponível',
    },
    manualItems: [
      { quote: 'Excelente advogado, resolveu meu caso com rapidez e precisão. A atenção pessoal que recebi foi diferencial — nunca me senti desamparado durante o processo.', name: 'Carlos M.', details: 'Empresário, São Paulo', rating: 5, avatar: '/images/avatar-1.webp', avatarPosition: 'center 15%' },
      { quote: 'Profissionalismo acima de tudo. Quando a situação parecia sem saída, a equipe encontrou uma tese que virou o jogo. Recomendo sem hesitar.', name: 'Ricardo T.', details: 'Diretor Financeiro, Rio de Janeiro', rating: 5, avatar: '/images/avatar-2.webp', avatarPosition: '62% 24%' },
      { quote: 'O sigilo e a atenção ao cliente são reais. Cada dúvida foi respondida com clareza. Resultado: processo encerrado sem condenação. Gratidão enorme.', name: 'Ana P.', details: 'Executiva, Brasília', rating: 5, avatar: '/images/avatar-3.webp', avatarPosition: '76% 30%' },
    ],
  },
  faqSection: {
    id: 'faq',
    eyebrow: 'Dúvidas frequentes',
    title: 'Informação clara desde o',
    highlightedTitle: 'primeiro contato',
    description: 'Cada situação exige análise individual. Estas respostas ajudam a orientar os primeiros passos.',
    ctaLabel: 'Falar sobre meu caso',
    items: [
      { question: 'Quando devo procurar um advogado criminalista?', answer: 'O ideal é buscar orientação assim que houver conhecimento de investigação, intimação, bloqueio de bens ou qualquer risco criminal. A atuação antecipada amplia as possibilidades estratégicas.' },
      { question: 'O atendimento é sigiloso?', answer: 'Sim. Todas as conversas, documentos e informações são tratados sob sigilo profissional absoluto, desde o primeiro contato.' },
      { question: 'O escritório atende fora de São Paulo?', answer: 'Sim. A atuação pode ocorrer em todo o Brasil, com acompanhamento presencial ou remoto conforme a necessidade do caso.' },
      { question: 'Como funciona o primeiro diagnóstico?', answer: 'O primeiro contato serve para entender o contexto, identificar urgências e definir os próximos passos. Casos sensíveis recebem retorno prioritário.' },
    ],
  },
  footer: {
    eyebrow: 'Atendimento imediato e sigiloso',
    title: 'Seu caso exige uma defesa',
    highlightedTitle: 'à altura.',
    description: 'Atuação estratégica em Direito Penal Econômico, com discrição, profundidade técnica e acompanhamento pessoal.',
    links: [
      { href: '#sobre', label: 'Quem somos' },
      { href: '#especialidades', label: 'Especialidades' },
      { href: '#diferenciais', label: 'Diferenciais' },
      { href: '#faq', label: 'Dúvidas' },
    ],
    copyrightSuffix: 'Todos os direitos reservados.',
    backToTopLabel: 'Voltar ao topo',
    backToTopHref: '#inicio',
    whatsapp: {
      regionLabel: 'Atendimento pelo WhatsApp',
      closeLabel: 'Fechar convite',
      image: { src: '/images/eduardo-ferreira-560.webp', width: 48, height: 48, alt: '' },
      senderName: 'Dr. Eduardo Ferreira',
      message: 'Olá! Precisa de orientação? Vamos conversar pelo WhatsApp.',
      actionLabel: 'Iniciar conversa',
      buttonLabel: 'Abrir atendimento pelo WhatsApp',
    },
  },
  seo: {
    siteUrl: 'https://ferreiradefesa.com.br',
    locale: 'pt_BR',
    language: 'pt-BR',
    homePageTitle: 'Defesa em Crimes Financeiros e Corrupção',
    defaultTitle: 'Advocacia Criminal Estratégica | Ferreira Defesa',
    titleTemplate: '%s | Ferreira Defesa',
    defaultDescription: 'Defesa estratégica em crimes financeiros, corrupção e Direito Penal Econômico, com atendimento técnico, pessoal e sigiloso.',
    defaultImage: '/images/hero-legal-1672.webp',
    defaultImageAlt: 'Equipe jurídica da Ferreira Defesa em atendimento',
    defaultImageWidth: 1672,
    defaultImageHeight: 942,
    themeColor: '#111318',
    favicon: '/favicon.svg',
    keywords: ['advogado criminalista', 'Direito Penal Econômico', 'crimes financeiros', 'defesa criminal empresarial', 'corrupção e improbidade'],
    areaServed: 'Brasil',
    knowsAbout: ['Direito Penal Econômico', 'Crimes Financeiros', 'Crimes Tributários', 'Lavagem de Dinheiro', 'Corrupção e Improbidade', 'Defesa Criminal Empresarial'],
    sitemap: [{ path: '/', changeFrequency: 'monthly', priority: 1 }],
  },
  videoSection: {
    // Use videoId para YouTube ou videoUrl para um arquivo local.
    enabled: true,
    eyebrow: 'Apresentação institucional',
    title: 'Conheça nossa atuação',
    highlightedTitle: 'de perto.',
    description: 'Um espaço para apresentar a experiência, a forma de atendimento e os valores que orientam cada atuação.',
    provider: 'youtube',
    videoId: 'R5eWRKTx0M0',
    videoUrl: '',
    poster: 'https://i.ytimg.com/vi/R5eWRKTx0M0/maxresdefault.jpg',
    posterAlt: 'Capa do vídeo institucional',
    playLabel: 'Assistir apresentação',
    caption: 'Vídeo institucional',
  },
  locationSection: {
    // Substitua address e mapQuery pelo endereço completo de cada novo projeto.
    enabled: true,
    eyebrow: 'Localização',
    title: 'Encontre nosso',
    highlightedTitle: 'escritório.',
    description: 'Consulte nossa localização e planeje sua visita. Para atendimento presencial, entre em contato para confirmar o horário.',
    address: 'São Paulo, SP, Brasil',
    mapQuery: 'São Paulo, SP, Brasil',
    mapTitle: 'Localização da Ferreira Defesa em São Paulo',
    directionsLabel: 'Abrir no Google Maps',
  },
  aiDiscovery: {
    // Desative apenas se este projeto não puder ser descoberto por agentes.
    enabled: true,
    llmsPath: '/llms.txt',
    markdownPath: '/index.md',
    summary: 'Escritório de advocacia criminal com atuação estratégica em Direito Penal Econômico, crimes financeiros e defesa criminal empresarial no Brasil.',
    usageNote: 'O conteúdo é institucional e informativo. Não substitui análise jurídica individual e não deve ser interpretado como promessa de resultado.',
  },
  deployment: {
    // O resultado será https://eduardoferreira.feito.website.
    projectName: 'eduardo-ferreira',
    subdomain: 'eduardoferreira',
    baseDomain: 'feito.website',
    // Pode ser sobrescrito pela variável VERCEL_CNAME_TARGET.
    cnameTarget: 'cname.vercel-dns-0.com',
  },
} satisfies SiteConfig;
