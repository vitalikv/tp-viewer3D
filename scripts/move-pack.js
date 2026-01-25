import { mkdir, rename, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const destDir = 'C:\\Code\\top-systems\\vite-pack-2\\pack';

async function movePack() {
  try {
    // Создаем директорию, если её нет
    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
      console.log(`Создана директория: ${destDir}`);
    }

    // Читаем текущую директорию и находим файлы пакета
    const files = await readdir('.');
    const packFiles = files.filter(file => file.startsWith('tp-viewer3d-') && file.endsWith('.tgz'));
    
    if (packFiles.length === 0) {
      console.log('Файлы пакета не найдены');
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
