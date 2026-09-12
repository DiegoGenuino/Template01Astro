import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

export const AUTOMATION_KEYS = [
  'VERCEL_TOKEN', 'VERCEL_TEAM_ID', 'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID', 'VERCEL_CNAME_TARGET',
] as const;

type Environment = Record<string, string | undefined>;

export const selectDeployEnvironment = (
  system: Environment, global: Environment, local: Environment,
  legacy: Environment = {}, base: Environment = {},
) => {
  const result: Environment = {};
  for (const key of AUTOMATION_KEYS) {
    result[key] = system[key] ?? global[key] ?? legacy[key] ?? local[key] ?? base[key];
  }
  // A chave do cliente nunca é herdada do arquivo global de publicação.
  result.GOOGLE_PLACES_API_KEY = system.GOOGLE_PLACES_API_KEY
    ?? local.GOOGLE_PLACES_API_KEY ?? base.GOOGLE_PLACES_API_KEY;
  return result;
};

export const loadDeployEnvironment = async (root: string, globalFile: string) => {
  const readEnv = async (path: string) => {
    try {
      return parseEnv(await readFile(path, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw new Error('Não foi possível ler um arquivo de ambiente. Verifique caminho e permissões.');
    }
  };
  const [global, local, legacy, base] = await Promise.all([
    readEnv(globalFile), readEnv(join(root, '.env.local')),
    readEnv(join(root, '.env.automation')), readEnv(join(root, '.env')),
  ]);
  return selectDeployEnvironment(process.env, global, local, legacy, base);
};

export const redactSecrets = (message: string, values: Array<string | undefined>) => {
  let safe = message;
  for (const secret of values.filter((value): value is string => Boolean(value)).sort((a, b) => b.length - a.length)) {
    safe = safe.split(secret).join('[REDACTED]');
  }
  return safe;
};
