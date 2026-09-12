import type { GitSource } from './deploy-git';

export type VercelRequest = <T>(path: string, init?: RequestInit, allowedStatuses?: number[]) => Promise<{ status: number; data: T }>;
export interface GitProject {
  id: string;
  name: string;
  link?: { type: string; org?: string; repo?: string; repoId?: number | string; productionBranch?: string } | null;
}

export const astroBuildSettings = (source: GitSource) => ({
  framework: 'astro',
  buildCommand: 'pnpm run build',
  installCommand: 'pnpm install --frozen-lockfile',
  outputDirectory: 'dist',
  rootDirectory: source.rootDirectory,
});

const assertMatchingProject = (project: GitProject, source: GitSource) => {
  if (!project.link) return;
  const { type, org, repo, productionBranch } = project.link;
  if (type !== 'github' || `${org}/${repo}`.toLowerCase() !== source.repository.toLowerCase()) {
    throw new Error('Este projeto Vercel já está conectado a outro repositório. Escolha outro deployment.projectName; o vínculo existente não foi alterado.');
  }
  if (productionBranch && productionBranch !== source.branch) {
    throw new Error('A branch de produção na Vercel é diferente da branch atual. Alinhe a configuração antes de publicar.');
  }
};

export const ensureGitProject = async (api: VercelRequest, name: string, source: GitSource) => {
  let result = await api<GitProject>(`/v9/projects/${encodeURIComponent(name)}`, {}, [404]);
  if (result.status === 404) {
    result = await api<GitProject>('/v11/projects', {
      method: 'POST', body: JSON.stringify({
        name, ...astroBuildSettings(source),
        gitRepository: { type: 'github', repo: source.repository },
      }),
    });
  }
  let project = result.data;
  if (!project.id) throw new Error('A Vercel não retornou o identificador do projeto.');
  assertMatchingProject(project, source);
  const path = `/v9/projects/${encodeURIComponent(project.id)}`;
  if (!project.link) {
    // Endpoint também utilizado pelo provider Terraform oficial da Vercel.
    await api(path + '/link', {
      method: 'POST', body: JSON.stringify({ type: 'github', repo: source.repository }),
    });
    project = (await api<GitProject>(path)).data;
    assertMatchingProject(project, source);
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
  return {
    name: project.name, project: project.id, target: 'production',
    gitSource: { type: 'github', repoId: project.link.repoId, ref: source.branch, sha: source.sha },
    projectSettings: astroBuildSettings(source),
  };
};
