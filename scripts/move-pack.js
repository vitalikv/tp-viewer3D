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
    version: packageJson.version
  };
}

async function movePack() {
  try {
    // Получаем информацию о пакете из package.json
    const { name, version } = await getPackageInfo();
    const expectedPackFile = `${name}-${version}.tgz`;

    // Создаем директорию, если её нет
    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
      console.log(`Создана директория: ${destDir}`);
    }

    // Читаем текущую директорию и находим файл пакета
    const files = await readdir('.');
    const packFiles = files.filter(file => file === expectedPackFile);
    
    if (packFiles.length === 0) {
      console.log(`Файлы пакета не найдены. Ожидаемый файл: ${expectedPackFile}`);
      process.exit(1);
    }

    // Перемещаем каждый файл
    for (const file of packFiles) {
      const destPath = join(destDir, file);
      await rename(file, destPath);
      console.log(`Перемещен: ${file} -> ${destPath}`);
    }
  } catch (error) {
    console.error('Ошибка при перемещении пакета:', error);
    process.exit(1);
  }
}

movePack();
