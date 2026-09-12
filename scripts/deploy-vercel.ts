import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../src/config/site';
import { AUTOMATION_KEYS, loadDeployEnvironment, redactSecrets } from './lib/deploy-environment';
import { assertPushedProductionSource, gitRunner, inspectGitSource } from './lib/deploy-git';
import { ensureGitProject, gitDeploymentPayload, syncGoogleEnvironment } from './lib/vercel-git';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const VERCEL_API = 'https://api.vercel.com';
const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';
const GLOBAL_CREDENTIALS_FILE = process.env.FEITO_CREDENTIALS_FILE?.trim()
  || join(homedir(), 'Documents', 'tokens-para-criar-os-sites', 'credentials.env');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipBuild = args.has('--skip-build');
const skipDomain = args.has('--skip-domain');

interface VercelDeployment {
  id: string;
  url?: string;
  readyState?: string;
  alias?: string[];
}

interface VercelDomainVerification {
  type?: string;
  domain?: string;
  name?: string;
  value?: string;
}

interface VercelProjectDomain {
  name: string;
  verified?: boolean;
  verification?: VercelDomainVerification[];
}

interface VercelDomainConfiguration {
  misconfigured?: boolean;
  recommendedCNAME?: Array<{
    rank?: number;
    value?: string;
  }>;
}

interface CloudflareRecord {
  id: string;
  type: string;
  name: string;
  content: string;
}

interface CloudflareResponse<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
}

const sleep = (milliseconds: number) => new Promise((resolvePromise) => {
  setTimeout(resolvePromise, milliseconds);
});

// A simulação não lê arquivos de credenciais nem chama os provedores.
const environment = dryRun ? {} : await loadDeployEnvironment(PROJECT_ROOT, GLOBAL_CREDENTIALS_FILE);

const deploymentConfig = siteConfig.deployment;
const projectName = deploymentConfig.projectName.trim();
const subdomain = deploymentConfig.subdomain.trim();
const baseDomain = deploymentConfig.baseDomain.trim();
const customDomain = `${subdomain}.${baseDomain}`;
const vercelToken = environment.VERCEL_TOKEN?.trim() || '';
const vercelTeamId = environment.VERCEL_TEAM_ID?.trim() || '';
const cloudflareToken = environment.CLOUDFLARE_API_TOKEN?.trim() || '';
const cloudflareZoneId = environment.CLOUDFLARE_ZONE_ID?.trim() || '';
const googlePlacesKey = environment.GOOGLE_PLACES_API_KEY?.trim() || '';
const cnameTarget = environment.VERCEL_CNAME_TARGET?.trim() || deploymentConfig.cnameTarget;

const validateConfiguration = () => {
  const allowedArgs = new Set(['--', '--dry-run', '--skip-build', '--skip-domain']);
  if ([...args].some((arg) => !allowedArgs.has(arg))) throw new Error('Opção desconhecida. Use --dry-run, --skip-build ou --skip-domain.');
  const slugPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  if (!slugPattern.test(projectName)) {
    throw new Error('deployment.projectName deve conter somente letras minúsculas, números e hífens.');
  }
  if (!slugPattern.test(subdomain)) {
    throw new Error('deployment.subdomain deve conter somente letras minúsculas, números e hífens.');
  }
  if (!baseDomain.includes('.') || /\s/.test(baseDomain)) {
    throw new Error('deployment.baseDomain deve ser um domínio válido.');
  }

  if (dryRun) return;

  const missing: string[] = [];
  if (!vercelToken) missing.push('VERCEL_TOKEN');
  if (!skipDomain && !cloudflareToken) missing.push('CLOUDFLARE_API_TOKEN');
  if (!skipDomain && !cloudflareZoneId) missing.push('CLOUDFLARE_ZONE_ID');
  if (missing.length) {
    throw new Error(
      `Variáveis obrigatórias ausentes: ${missing.join(', ')}. Configure-as em ${GLOBAL_CREDENTIALS_FILE} ou no ambiente do sistema.`,
    );
  }
};

const runBuild = async () => {
  if (skipBuild) return;

  const buildEnvironment: NodeJS.ProcessEnv = { ...process.env, GOOGLE_PLACES_API_KEY: googlePlacesKey };
  for (const key of AUTOMATION_KEYS) delete buildEnvironment[key];

  const packageManagerScript = process.env.npm_execpath;
  const executable = packageManagerScript
    ? process.execPath
    : process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const buildArguments = packageManagerScript
    ? [packageManagerScript, 'run', 'build']
    : ['run', 'build'];
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(executable, buildArguments, {
      cwd: PROJECT_ROOT,
      env: buildEnvironment,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`O build terminou com código ${code ?? 'desconhecido'}.`));
    });
  });
};

const withTeamScope = (input: string) => {
  const url = new URL(input, VERCEL_API);
  if (vercelTeamId) url.searchParams.set('teamId', vercelTeamId);
  return url;
};

const readErrorMessage = async (response: Response) => {
  const text = await response.text();
  if (!text) return `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string; code?: string } };
    return parsed.error?.message || parsed.error?.code || text;
  } catch {
    return text;
  }
};

const vercelJson = async <T>(path: string, init: RequestInit = {}, allowedStatuses: number[] = []) => {
  const response = await fetch(withTeamScope(path), {
    ...init,
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok && !allowedStatuses.includes(response.status)) {
    throw new Error(`Vercel: ${await readErrorMessage(response)}`);
  }

  const text = await response.text();
  return {
    status: response.status,
    data: text ? JSON.parse(text) as T : {} as T,
  };
};

const waitForDeployment = async (deployment: VercelDeployment) => {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const { data } = await vercelJson<VercelDeployment>(`/v13/deployments/${deployment.id}`);
    const state = data.readyState;
    if (state === 'READY') return data;
    if (state === 'ERROR' || state === 'CANCELED') {
      throw new Error(`O deployment terminou no estado ${state}. Consulte os logs da Vercel.`);
    }
    await sleep(5_000);
  }
  throw new Error(`O build ainda não terminou após 15 minutos. Consulte o deployment ${deployment.id} na Vercel antes de tentar novamente.`);
};

const cloudflareJson = async <T>(path: string, init: RequestInit = {}) => {
  const response = await fetch(`${CLOUDFLARE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cloudflareToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const payload = await response.json() as CloudflareResponse<T>;
  if (!response.ok || !payload.success) {
    const message = payload.errors?.map(({ message }) => message).filter(Boolean).join('; ');
    throw new Error(`Cloudflare: ${message || `HTTP ${response.status}`}`);
  }
  return payload.result;
};

const upsertCloudflareRecord = async (type: 'CNAME' | 'TXT', name: string, content: string) => {
  const query = new URLSearchParams({ type, name });
  const records = await cloudflareJson<CloudflareRecord[]>(
    `/zones/${cloudflareZoneId}/dns_records?${query}`,
  );

  const exactRecord = records.find((record) => record.content === content);
  if (exactRecord) return exactRecord;

  const body = JSON.stringify({
    type,
    name,
    content,
    ttl: 1,
    proxied: false,
    comment: `Automação do projeto Vercel ${projectName}`,
  });

  if (type === 'CNAME' && records[0]) {
    return cloudflareJson<CloudflareRecord>(
      `/zones/${cloudflareZoneId}/dns_records/${records[0].id}`,
      { method: 'PUT', body },
    );
  }

  return cloudflareJson<CloudflareRecord>(
    `/zones/${cloudflareZoneId}/dns_records`,
    { method: 'POST', body },
  );
};

const addProjectDomain = async () => {
  const path = `/v10/projects/${encodeURIComponent(projectName)}/domains`;
  const result = await vercelJson<VercelProjectDomain>(path, {
    method: 'POST',
    body: JSON.stringify({ name: customDomain }),
  }, [409]);

  if (result.status !== 409) return result.data;

  const existing = await vercelJson<VercelProjectDomain>(
    `/v9/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(customDomain)}`,
  );
  return existing.data;
};

const getDomainConfiguration = async () => {
  const { data } = await vercelJson<VercelDomainConfiguration>(
    `/v6/domains/${encodeURIComponent(customDomain)}/config`,
  );
  return data;
};

const waitForOwnershipVerification = async (projectDomain: VercelProjectDomain) => {
  if (projectDomain.verified || !projectDomain.verification?.length) return true;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const { data } = await vercelJson<VercelProjectDomain>(
        `/v9/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(customDomain)}/verify`,
        { method: 'POST' },
      );
      if (data.verified) return true;
    } catch {
      // A verificação depende da propagação do desafio DNS.
    }
    await sleep(5_000);
  }

  return false;
};

const configureDomain = async () => {
  const projectDomain = await addProjectDomain();

  for (const verification of projectDomain.verification ?? []) {
    const type = verification.type?.toUpperCase();
    const name = verification.domain || verification.name;
    if ((type === 'TXT' || type === 'CNAME') && name && verification.value) {
      await upsertCloudflareRecord(type, name, verification.value);
    }
  }

  const ownershipVerified = await waitForOwnershipVerification(projectDomain);
  if (!ownershipVerified) {
    throw new Error(`Não foi possível verificar a propriedade de ${customDomain}. Execute o deploy novamente após a propagação do DNS.`);
  }

  const initialConfiguration = await getDomainConfiguration();
  const recommendedTarget = initialConfiguration.recommendedCNAME
    ?.filter(({ value }) => Boolean(value))
    .sort((left, right) => (left.rank ?? 999) - (right.rank ?? 999))[0]
    ?.value
    ?.replace(/\.$/, '');

  await upsertCloudflareRecord('CNAME', customDomain, recommendedTarget || cnameTarget);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const configuration = await getDomainConfiguration();
      if (configuration.misconfigured === false) return true;
    } catch {
      // DNS pode levar alguns minutos para propagar; a próxima tentativa repete a consulta.
    }
    await sleep(5_000);
  }

  return false;
};

const main = async () => {
  validateConfiguration();
  const source = await inspectGitSource(PROJECT_ROOT);
  if (!dryRun && source.dirty) throw new Error('Existem alterações sem commit. Revise, faça commit e push antes de executar o deploy.');
  await runBuild();

  if (dryRun) {
    console.log('Simulação concluída sem consultar GitHub, Vercel, Cloudflare ou Google Places.');
    console.log(`Projeto Vercel: ${projectName}`);
    console.log(`GitHub: ${source.repository}`);
    console.log(`Branch: ${source.branch}; commit: ${source.sha.slice(0, 12)}`);
    console.log(`Raiz Astro no repositório: ${source.rootDirectory || '/'}`);
    console.log(`Domínio: https://${customDomain}`);
    console.log('Build remoto: Astro / pnpm run build / dist. Nenhum upload de arquivos locais.');
    console.log('Google Places: variável privada de produção; ausência local preserva a variável remota.');
    if (source.dirty) console.warn('Pendente: faça commit e push das alterações antes do deploy real.');
    console.log('A simulação não verifica permissões, credenciais ou se o commit está no GitHub.');
    return;
  }

  // Revalida após o build, que pode gerar arquivos ou ocorrer durante uma edição.
  const latestSource = await inspectGitSource(PROJECT_ROOT);
  if (latestSource.sha !== source.sha) throw new Error('O commit mudou durante o build. Execute o deploy novamente.');
  await assertPushedProductionSource(latestSource, gitRunner(PROJECT_ROOT));

  console.log(`Conectando ${source.repository} ao projeto Vercel ${projectName}...`);
  const project = await ensureGitProject(vercelJson, projectName, source);
  const synced = await syncGoogleEnvironment(vercelJson, project.id, googlePlacesKey);
  console.log(synced
    ? 'GOOGLE_PLACES_API_KEY salva como variável privada em Production.'
    : 'Sem chave Google local: variável existente na Vercel preservada; sem chave remota, será usado o fallback manual.');
  console.log(`Iniciando build remoto do commit ${source.sha.slice(0, 12)}...`);
  const { data: deployment } = await vercelJson<VercelDeployment>('/v13/deployments?forceNew=1', {
    method: 'POST', body: JSON.stringify(gitDeploymentPayload(project, source)),
  });
  const readyDeployment = await waitForDeployment(deployment);

  let domainReady = false;
  if (!skipDomain) {
    console.log(`Configurando ${customDomain}...`);
    domainReady = await configureDomain();
  }

  console.log('Deployment concluído.');
  console.log(`GitHub conectado: novos pushes em ${source.branch} gerarão deploys automáticos.`);
  console.log(`URL Vercel: https://${readyDeployment.url || deployment.url}`);
  if (!skipDomain) {
    console.log(`Domínio: https://${customDomain}${domainReady ? '' : ' (DNS ainda em propagação)'}`);
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Falha no deploy: ${redactSecrets(message, [vercelToken, cloudflareToken, googlePlacesKey])}`);
  console.error('Se a Vercel não acessar o GitHub, autorize o aplicativo Vercel nesse repositório e confirme a conta/time do token.');
  process.exitCode = 1;
});
