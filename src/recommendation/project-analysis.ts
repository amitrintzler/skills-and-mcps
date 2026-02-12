import path from 'node:path';

import fs from 'fs-extra';

export interface ProjectSignals {
  stack: string[];
  compatibilityTags: string[];
}

export async function detectProjectSignals(projectPath: string): Promise<ProjectSignals> {
  const root = path.resolve(projectPath);
  const stack = new Set<string>();
  const compatibilityTags = new Set<string>();

  if (await fs.pathExists(path.join(root, 'package.json'))) {
    stack.add('node');
    compatibilityTags.add('node');

    const pkg = await fs.readJson(path.join(root, 'package.json'));
    const dependencies = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {})
    } as Record<string, string>;

    if ('react' in dependencies || 'next' in dependencies || 'next.js' in dependencies) {
      stack.add('react');
      compatibilityTags.add('react');
    }

    if ('typescript' in dependencies) {
      stack.add('typescript');
      compatibilityTags.add('typescript');
    }
  }

  if (
    (await fs.pathExists(path.join(root, 'pyproject.toml'))) ||
    (await fs.pathExists(path.join(root, 'requirements.txt')))
  ) {
    stack.add('python');
    compatibilityTags.add('python');
  }

  if (await fs.pathExists(path.join(root, 'Dockerfile'))) {
    compatibilityTags.add('container');
  }

  if ((await fs.pathExists(path.join(root, 'pom.xml'))) || (await fs.pathExists(path.join(root, 'build.gradle')))) {
    stack.add('java');
    compatibilityTags.add('java');
  }

  if (await fs.pathExists(path.join(root, 'go.mod'))) {
    stack.add('go');
    compatibilityTags.add('go');
  }

  if (await fs.pathExists(path.join(root, 'Cargo.toml'))) {
    stack.add('rust');
    compatibilityTags.add('rust');
  }

  if (await fs.pathExists(path.join(root, 'Gemfile'))) {
    stack.add('ruby');
    compatibilityTags.add('ruby');
  }

  if (stack.size === 0) {
    stack.add('unknown');
    compatibilityTags.add('general');
  }

  return {
    stack: Array.from(stack).sort((a, b) => a.localeCompare(b)),
    compatibilityTags: Array.from(compatibilityTags).sort((a, b) => a.localeCompare(b))
  };
}
