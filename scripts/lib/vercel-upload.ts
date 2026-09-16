import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import type { GitSource } from './deploy-git';
import type { GitProject } from './vercel-git';

export interface DeploymentFile {
  file: string;
  sha: string;
  size: number;
  contents: Buffer;
}

export const collectDeploymentFiles = async (distDirectory: string) => {
  const files: DeploymentFile[] = [];

  const visit = async (directory: string) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = `${directory}${sep}${entry.name}`;
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const contents = await readFile(absolutePath);
      files.push({
        file: relative(distDirectory, absolutePath).split(sep).join('/'),
        sha: createHash('sha1').update(contents).digest('hex'),
        size: contents.length,
        contents,
      });
    }
  };

  try {
    await visit(distDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('A pasta dist não existe. Execute o build ou remova --skip-build.');
    }
    throw error;
  }
  if (!files.length) throw new Error('A pasta dist está vazia.');
  return files.sort((left, right) => left.file.localeCompare(right.file));
};

export const assertUploadProjectCompatible = (project: GitProject | undefined, source: GitSource) => {
  if (!project?.link) return;
  const linkedRepository = `${project.link.org}/${project.link.repo}`.toLowerCase();
  if (linkedRepository !== source.repository.toLowerCase()) {
    throw new Error(
      'Este projeto Vercel já está conectado a outro repositório. Escolha outro deployment.projectName; nenhum arquivo foi enviado.',
    );
  }
};

export const uploadDeploymentPayload = (
  name: string,
  files: DeploymentFile[],
  project?: GitProject,
) => ({
  name,
  ...(project?.id ? { project: project.id } : {}),
  target: 'production',
  files: files.map(({ file, sha, size }) => ({ file, sha, size })),
  projectSettings: { framework: null },
});
