import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { redactSecrets, selectDeployEnvironment } from '../scripts/lib/deploy-environment';
import { assertNoTrackedCredentials, assertPushedProductionSource, inspectGitSource, parseGitHubRemote, type GitSource } from '../scripts/lib/deploy-git';
import { astroBuildSettings, ensureGitProject, gitDeploymentPayload, syncGoogleEnvironment, type GitProject, type VercelRequest } from '../scripts/lib/vercel-git';

const source: GitSource = { repository: 'studio/client', branch: 'main', sha: 'a'.repeat(40), rootDirectory: null, dirty: false };
const project: GitProject = { id: 'prj_client', name: 'client', link: { type: 'github', org: 'studio', repo: 'client', repoId: 123, productionBranch: 'main' } };
type Call = { path: string; method: string; body: Record<string, unknown> | undefined };

const mockApi = (respond: (call: Call) => { status: number; data: unknown }) => {
  const calls: Call[] = [];
  const api: VercelRequest = async <T>(path: string, init: RequestInit = {}) => {
    const call = { path, method: init.method || 'GET', body: init.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const result = respond(call);
    return { status: result.status, data: result.data as T };
  };
  return { api, calls };
};

test('aceita remotes GitHub HTTPS e SSH sem credenciais', () => {
  for (const url of ['https://github.com/studio/client.git', 'git@github.com:studio/client.git', 'ssh://git@github.com/studio/client', 'https://github.com/studio/client/']) {
    assert.equal(parseGitHubRemote(url), 'studio/client');
  }
  for (const url of ['https://token@github.com/studio/client.git', 'https://github.com.evil.test/studio/client', 'https://gitlab.com/studio/client', 'C:/local/repo', 'https://github.com/studio/..']) {
    assert.throws(() => parseGitHubRemote(url));
  }
});

test('recusa arquivos de ambiente versionados, permitindo somente exemplos', () => {
  assert.doesNotThrow(() => assertNoTrackedCredentials('.env.example\0.env.automation.example\0src/config/site.ts\0'));
  for (const path of ['.env', '.env.local', '.env.production', 'subfolder/credentials.env', 'subfolder/.env.automation']) {
    assert.throws(() => assertNoTrackedCredentials(path + '\0'), /credenciais versionado/);
  }
});

test('descobre a raiz Astro em um subdiretório e identifica alterações locais', async () => {
  const root = resolve('test-workspace');
  const source = await inspectGitSource(resolve(root, 'apps', 'web'), async (args) => {
    if (args[0] === 'remote') return 'git@github.com:studio/client.git';
    if (args.includes('--show-toplevel')) return root;
    if (args[0] === 'symbolic-ref') return 'main';
    if (args[0] === 'status') return ' M src/config/site.ts';
    if (args[0] === 'ls-files') return 'apps/web/package.json\0';
    return 'a'.repeat(40);
  });
  assert.equal(source.rootDirectory, 'apps/web');
  assert.equal(source.dirty, true);
});

const remote = (sha: string, branch = 'main') => `ref: refs/heads/${branch}\tHEAD\n${sha}\tHEAD\n${sha}\trefs/heads/${branch}`;
test('publica somente o último commit enviado à branch padrão do GitHub', async () => {
  await assertPushedProductionSource(source, async () => remote(source.sha));
  await assertPushedProductionSource(source, async () => remote(source.sha).replaceAll('\n', '\r\n'));
  await assert.rejects(assertPushedProductionSource(source, async () => remote('b'.repeat(40))), /Sincronize/);
  await assert.rejects(assertPushedProductionSource(source, async () => remote(source.sha, 'develop')), /branch padrão/);
  await assert.rejects(assertPushedProductionSource({ ...source, dirty: true }, async () => { throw new Error('não deve consultar a rede'); }), /sem commit/);
});

test('separa tokens globais da chave Google do cliente e prioriza .env.local', () => {
  const env = selectDeployEnvironment(
    { VERCEL_TOKEN: 'system-token' },
    { VERCEL_TOKEN: 'global-token', CLOUDFLARE_API_TOKEN: 'cloudflare', GOOGLE_PLACES_API_KEY: 'wrong-client' },
    { GOOGLE_PLACES_API_KEY: 'client-key' }, {}, { GOOGLE_PLACES_API_KEY: 'base-key' },
  );
  assert.equal(env.VERCEL_TOKEN, 'system-token');
  assert.equal(env.CLOUDFLARE_API_TOKEN, 'cloudflare');
  assert.equal(env.GOOGLE_PLACES_API_KEY, 'client-key');
  assert.equal(selectDeployEnvironment({}, { GOOGLE_PLACES_API_KEY: 'wrong' }, {}).GOOGLE_PLACES_API_KEY, undefined);
  assert.equal(selectDeployEnvironment({ GOOGLE_PLACES_API_KEY: '' }, {}, { GOOGLE_PLACES_API_KEY: 'local' }).GOOGLE_PLACES_API_KEY, '');
});

test('cria projeto já conectado ao GitHub com build Astro', async () => {
  const { api, calls } = mockApi(({ method }) => method === 'GET' ? { status: 404, data: {} } : { status: 200, data: project });
  assert.deepEqual(await ensureGitProject(api, 'client', source), project);
  assert.equal(calls[1].path, '/v11/projects');
  assert.deepEqual(calls[1].body?.gitRepository, { type: 'github', repo: 'studio/client' });
  assert.equal(calls[1].body?.framework, 'astro');
  assert.equal(calls[1].body?.outputDirectory, 'dist');
});

test('conecta projeto antigo sem criar outro e conserva o identificador', async () => {
  let connected = false;
  const { api, calls } = mockApi(({ path, method }) => {
    if (method === 'POST' && path.endsWith('/link')) connected = true;
    return { status: 200, data: connected ? project : { ...project, link: null } };
  });
  assert.equal((await ensureGitProject(api, 'client', source)).id, project.id);
  assert.ok(calls.some(({ path }) => path === '/v9/projects/prj_client/link'));
  assert.ok(!calls.some(({ path }) => path === '/v11/projects'));
  assert.ok(!calls.some(({ method }) => method === 'DELETE'));
});

test('reexecução não recria vínculo GitHub já existente', async () => {
  const { api, calls } = mockApi(() => ({ status: 200, data: project }));
  await ensureGitProject(api, 'client', source);
  assert.deepEqual(calls.map(({ method }) => method), ['GET', 'PATCH']);
});

test('interrompe antes de escrever em projeto de outro repositório ou branch', async () => {
  for (const link of [{ ...project.link, repo: 'other' }, { ...project.link, productionBranch: 'develop' }]) {
    const { api, calls } = mockApi(() => ({ status: 200, data: { ...project, link } }));
    await assert.rejects(ensureGitProject(api, 'client', source));
    assert.deepEqual(calls.map(({ method }) => method), ['GET']);
  }
});

test('falha de autorização GitHub não gera upload estático alternativo', async () => {
  const { api, calls } = mockApi(({ method }) => {
    if (method === 'POST') throw new Error('GitHub integration required');
    return { status: 404, data: {} };
  });
  await assert.rejects(ensureGitProject(api, 'client', source), /GitHub/);
  assert.equal(calls.length, 2);
});

test('chave Google é a única variável enviada, secreta e apenas em produção', async () => {
  const { api, calls } = mockApi(() => ({ status: 201, data: { failed: [] } }));
  assert.equal(await syncGoogleEnvironment(api, project.id, 'client-key'), true);
  assert.match(calls[0].path, /env\?upsert=true$/);
  assert.deepEqual(calls[0].body, {
    key: 'GOOGLE_PLACES_API_KEY', value: 'client-key', type: 'sensitive', visibility: 'secret',
    target: ['production'], comment: 'Google Places deste cliente; uso privado durante o build Astro.',
  });
});

test('chave vazia preserva ambiente remoto sem ler nem apagar seus valores', async () => {
  const { api, calls } = mockApi(() => { throw new Error('não deve chamar API'); });
  assert.equal(await syncGoogleEnvironment(api, project.id, ''), false);
  assert.equal(await syncGoogleEnvironment(api, project.id, undefined), false);
  assert.equal(await syncGoogleEnvironment(api, project.id, '   '), false);
  assert.equal(calls.length, 0);
});

test('interrompe se Vercel informar erro parcial ao salvar variável', async () => {
  const { api } = mockApi(() => ({ status: 201, data: { failed: [{ error: 'conflict' }] } }));
  await assert.rejects(syncGoogleEnvironment(api, project.id, 'client-key'), /Não foi possível salvar/);
});

test('deployment fixa SHA no GitHub e nunca inclui arquivos locais ou segredos', () => {
  const payload = gitDeploymentPayload(project, source);
  assert.equal(payload.project, project.id);
  assert.deepEqual(payload.gitSource, { type: 'github', repoId: 123, ref: 'main', sha: source.sha });
  assert.equal('files' in payload, false);
  assert.equal('env' in payload, false);
  assert.equal(astroBuildSettings({ ...source, rootDirectory: 'apps/web' }).rootDirectory, 'apps/web');
  assert.throws(() => gitDeploymentPayload({ ...project, link: null }, source));
});

test('mensagens de erro ocultam tokens e chaves', () => {
  assert.equal(redactSecrets('token=secret key=client-key', ['secret', 'client-key', undefined]), 'token=[REDACTED] key=[REDACTED]');
});
