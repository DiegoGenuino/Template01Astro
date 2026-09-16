import type { GitSource } from './deploy-git';

export type VercelRequest = <T>(path: string, init?: RequestInit, allowedStatuses?: number[]) => Promise<{ status: number; data: T }>;
export type GitHubProvider = 'github' | 'github-limited';
export interface GitProject {
  id: string;
  name: string;
  link?: { type: string; org?: string; repo?: string; repoId?: number | string; productionBranch?: string } | null;
}
export interface GitHubConnection {
  provider: GitHubProvider;
  namespace: string;
  namespaceId: string | number;
  installationId?: number;
  repositoryId: string | number;
}

export type GitHubAccessReason = 'namespace-unavailable' | 'reauth-required' | 'repository-unauthorized';

export class GitHubAccessError extends Error {
  constructor(public readonly reason: GitHubAccessReason, message: string) {
    super(message);
    this.name = 'GitHubAccessError';
  }
}

interface GitNamespace {
  id: string | number;
  installationId?: number;
  name?: string;
  provider: string;
  requireReauth?: boolean;
  slug: string;
}

interface GitRepositorySearch {
  error?: { code?: string; message?: string };
  repos?: Array<{
    id: string | number;
    name: string;
    namespace: string;
    slug: string;
  }>;
}

const GITHUB_PROVIDERS: GitHubProvider[] = ['github', 'github-limited'];

const repositoryParts = (source: GitSource) => {
  const [owner, name] = source.repository.split('/');
  if (!owner || !name) throw new Error('Não foi possível identificar a conta e o repositório GitHub pelo origin.');
  return { owner, name };
};

const matchesRepository = (
  repository: NonNullable<GitRepositorySearch['repos']>[number],
  owner: string,
  name: string,
) => {
  const expected = `${owner}/${name}`.toLowerCase();
  return `${repository.namespace}/${repository.name}`.toLowerCase() === expected
    || repository.slug.toLowerCase() === expected
    || (repository.namespace.toLowerCase() === owner.toLowerCase()
      && repository.slug.toLowerCase() === name.toLowerCase());
};

export const resolveGitHubConnection = async (
  api: VercelRequest,
  source: GitSource,
): Promise<GitHubConnection> => {
  const { owner, name } = repositoryParts(source);
  const namespaceGroups = await Promise.all(GITHUB_PROVIDERS.map(async (provider) => {
    const query = new URLSearchParams({ provider, viewerMetadata: 'true' });
    return (await api<GitNamespace[]>(`/v1/integrations/git-namespaces?${query}`)).data;
  }));
  const namespaces = namespaceGroups.flat().filter((namespace) => (
    GITHUB_PROVIDERS.includes(namespace.provider as GitHubProvider)
    && [namespace.slug, namespace.name].some((value) => value?.toLowerCase() === owner.toLowerCase())
  ));

  if (!namespaces.length) {
    throw new GitHubAccessError(
      'namespace-unavailable',
      `A conta GitHub "${owner}" detectada no origin não está conectada à conta/time Vercel atual. `
      + `A Vercel não pode criar um vínculo Git para "${source.repository}" neste escopo.`,
    );
  }

  let requiresReauthentication = false;
  for (const namespace of namespaces) {
    if (namespace.requireReauth) {
      requiresReauthentication = true;
      continue;
    }
    const provider = namespace.provider as GitHubProvider;
    const query = new URLSearchParams({
      provider,
      namespaceId: String(namespace.id),
      query: name,
    });
    if (namespace.installationId) query.set('installationId', String(namespace.installationId));
    const { data } = await api<GitRepositorySearch>(`/v1/integrations/search-repo?${query}`);
    const repository = data.repos?.find((candidate) => matchesRepository(candidate, owner, name));
    if (repository) {
      return {
        provider,
        namespace: namespace.slug,
        namespaceId: namespace.id,
        installationId: namespace.installationId,
        repositoryId: repository.id,
      };
    }
  }

  if (requiresReauthentication) {
    throw new GitHubAccessError(
      'reauth-required',
      `A conexão GitHub da conta "${owner}" precisa ser autenticada novamente na Vercel. `
      + 'Renove a conexão e execute o deploy outra vez.',
    );
  }
  throw new GitHubAccessError(
    'repository-unauthorized',
    `A Vercel reconheceu a conta GitHub "${owner}", mas o aplicativo não tem acesso ao repositório "${source.repository}". `
    + 'Autorize esse repositório na instalação do aplicativo Vercel para GitHub e execute novamente.',
  );
};

export const astroBuildSettings = (source: GitSource) => ({
  framework: 'astro',
  buildCommand: 'pnpm run build',
  installCommand: 'pnpm install --frozen-lockfile',
  outputDirectory: 'dist',
  rootDirectory: source.rootDirectory,
});

const assertMatchingProject = (project: GitProject, source: GitSource, connection?: GitHubConnection) => {
  if (!project.link) return;
  const { type, org, repo, repoId, productionBranch } = project.link;
  if (!GITHUB_PROVIDERS.includes(type as GitHubProvider) || `${org}/${repo}`.toLowerCase() !== source.repository.toLowerCase()) {
    throw new Error('Este projeto Vercel já está conectado a outro repositório. Escolha outro deployment.projectName; o vínculo existente não foi alterado.');
  }
  if (connection && repoId && String(repoId) !== String(connection.repositoryId)) {
    throw new Error('O projeto Vercel está conectado a outro identificador de repositório GitHub. O vínculo existente não foi alterado.');
  }
  if (productionBranch && productionBranch !== source.branch) {
    throw new Error('A branch de produção na Vercel é diferente da branch atual. Alinhe a configuração antes de publicar.');
  }
};

export const ensureGitProject = async (
  api: VercelRequest,
  name: string,
  source: GitSource,
  connection: GitHubConnection,
) => {
  let result = await api<GitProject>(`/v9/projects/${encodeURIComponent(name)}`, {}, [404]);
  if (result.status === 404) {
    result = await api<GitProject>('/v11/projects', {
      method: 'POST', body: JSON.stringify({
        name, ...astroBuildSettings(source),
        gitRepository: { type: connection.provider, repo: source.repository },
      }),
    });
  }
  let project = result.data;
  if (!project.id) throw new Error('A Vercel não retornou o identificador do projeto.');
  assertMatchingProject(project, source, connection);
  const path = `/v9/projects/${encodeURIComponent(project.id)}`;
  if (!project.link) {
    // Endpoint também utilizado pelo provider Terraform oficial da Vercel.
    await api(path + '/link', {
      method: 'POST', body: JSON.stringify({ type: connection.provider, repo: source.repository }),
    });
    project = (await api<GitProject>(path)).data;
    assertMatchingProject(project, source, connection);
  }
  if (!project.link?.repoId) {
    throw new Error('O vínculo GitHub não foi confirmado. Autorize o aplicativo Vercel no repositório e execute novamente.');
  }
  await api(path, { method: 'PATCH', body: JSON.stringify(astroBuildSettings(source)) });
  return project;
};

export const syncGoogleEnvironment = async (api: VercelRequest, projectId: string, value?: string) => {
  const key = value?.trim();
  if (!key) return false; // Preserva a variável já cadastrada no painel, sem tentar lê-la.
  const { data } = await api<{ failed?: unknown[] }>(`/v10/projects/${encodeURIComponent(projectId)}/env?upsert=true`, {
    method: 'POST', body: JSON.stringify({
      key: 'GOOGLE_PLACES_API_KEY', value: key, type: 'sensitive', visibility: 'secret',
      target: ['production'], comment: 'Google Places deste cliente; uso privado durante o build Astro.',
    }),
  });
  if (data.failed?.length) throw new Error('Não foi possível salvar GOOGLE_PLACES_API_KEY na Vercel. Verifique as permissões da variável.');
  return true;
};

export const gitDeploymentPayload = (project: GitProject, source: GitSource) => {
  assertMatchingProject(project, source);
  if (!project.link?.repoId) throw new Error('Projeto sem vínculo GitHub confirmado.');
  const type = project.link.type as GitHubProvider;
  return {
    name: project.name, project: project.id, target: 'production',
    gitSource: { type, repoId: project.link.repoId, ref: source.branch, sha: source.sha },
    projectSettings: astroBuildSettings(source),
  };
};
