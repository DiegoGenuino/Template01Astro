import { execFile } from 'node:child_process';
import { isAbsolute, relative, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export type GitRunner = (args: string[]) => Promise<string>;
export interface GitSource {
  repository: string;
  branch: string;
  sha: string;
  rootDirectory: string | null;
  dirty: boolean;
}

export const gitRunner = (cwd: string): GitRunner => async (args) => {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd, encoding: 'utf8', windowsHide: true, timeout: 30_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    });
    return stdout.trim();
  } catch {
    // O stderr do Git pode incluir credenciais presentes em URLs de remotes.
    throw new Error('Falha ao consultar o Git. Verifique o repositório, o origin, a branch e a autenticação no GitHub.');
  }
};

export const parseGitHubRemote = (remote: string) => {
  const match = remote.trim().match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([a-z\d-]+)\/([a-z\d_.-]+?)(?:\.git)?\/?$/i);
  if (!match || ['.', '..'].includes(match[2])) {
    throw new Error('O origin deve apontar para um repositório github.com via HTTPS ou SSH, sem token na URL.');
  }
  return `${match[1]}/${match[2]}`;
};

export const assertNoTrackedCredentials = (files: string) => {
  const unsafe = files.split('\0').filter(Boolean).some((file) => {
    const name = file.split('/').at(-1)?.toLowerCase() || '';
    if (name === '.env.example' || name === '.env.automation.example') return false;
    return name === '.env' || name.startsWith('.env.') || name === 'credentials.env';
  });
  if (unsafe) throw new Error('Há arquivo de credenciais versionado. Remova-o do Git e revogue chaves expostas antes de publicar.');
};

export const inspectGitSource = async (root: string, run = gitRunner(root)): Promise<GitSource> => {
  const repository = parseGitHubRemote(await run(['remote', 'get-url', 'origin']));
  const [gitRoot, branch, sha, status, tracked] = await Promise.all([
    run(['rev-parse', '--show-toplevel']), run(['symbolic-ref', '--quiet', '--short', 'HEAD']),
    run(['rev-parse', 'HEAD']), run(['status', '--porcelain', '--untracked-files=all']),
    run(['ls-files', '-z']),
  ]);
  assertNoTrackedCredentials(tracked);
  if (!branch || !/^[a-f\d]{40,64}$/i.test(sha)) throw new Error('Faça checkout de uma branch com pelo menos um commit antes de publicar.');
  const directory = relative(gitRoot, root);
  if (isAbsolute(directory) || directory.split(sep).includes('..')) throw new Error('A aplicação deve estar dentro do repositório Git.');
  return { repository, branch, sha, rootDirectory: directory.split(sep).join('/') || null, dirty: Boolean(status) };
};

export const assertPushedProductionSource = async (source: GitSource, run: GitRunner) => {
  if (source.dirty) throw new Error('Existem alterações sem commit. Revise, faça commit e push antes de executar o deploy.');
  const remote = await run(['ls-remote', '--symref', 'origin', 'HEAD', `refs/heads/${source.branch}`]);
  const defaultBranch = remote.match(/^ref: refs\/heads\/(.+)\s+HEAD\r?$/m)?.[1].trim();
  if (!defaultBranch || defaultBranch !== source.branch) {
    throw new Error('O deploy de produção deve partir da branch padrão do GitHub. Faça checkout dela ou ajuste a branch padrão no GitHub.');
  }
  const remoteSha = remote.split('\n').map((line) => line.trim().split(/\s+/))
    .find(([sha, ref]) => /^[a-f\d]{40,64}$/i.test(sha) && ref === `refs/heads/${source.branch}`)?.[0];
  if (remoteSha !== source.sha) {
    throw new Error('O commit local não é o último commit da branch no GitHub. Sincronize a branch e faça push antes de publicar.');
  }
};
