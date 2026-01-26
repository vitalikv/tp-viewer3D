import { mkdir, rename, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const destDir = 'C:\\Code\\top-systems\\front-viewer3D\\pack';

async function getPackageInfo() {
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);
  return {
    name: packageJson.name,
    version: packageJson.version,
  };
}

async function movePack() {
  try {
    const { name, version } = await getPackageInfo();
    const expectedPackFile = `${name}-${version}.tgz`;

    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
    }

    const files = await readdir('.');
    const packFiles = files.filter((file) => file === expectedPackFile);

    if (packFiles.length === 0) {
      process.exit(1);
    }

    for (const file of packFiles) {
      const destPath = join(destDir, file);
      await rename(file, destPath);
    }
  } catch (error) {
    console.error('Ошибка при перемещении пакета:', error);
    process.exit(1);
  }
}

movePack();
