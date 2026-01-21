import { ContextSingleton } from '@/core/ContextSingleton';
import { ThreeApp } from '@/threeApp/ThreeApp';
import { InitModel } from '@/threeApp/model/InitModel';
import { OffscreenCanvasManager } from '@/threeApp/worker/OffscreenCanvasManager';
import { UiLoadTimeDiv } from '@/ui/UiLoadTimeDiv';

export class ModelUrlLoader extends ContextSingleton<ModelUrlLoader> {
  private extractBasePath(url: string): string {
    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname;
      const lastSlashIndex = pathname.lastIndexOf('/');
      if (lastSlashIndex >= 0) {
        return urlObj.origin + pathname.substring(0, lastSlashIndex + 1);
      }
      return urlObj.origin + '/';
    } catch (_e) {
      // Если URL невалидный, возвращаем текущую директорию
      return './';
    }
  }

  private async fetchWithProgress(url: string, onProgress?: (percent: number) => void): Promise<ArrayBuffer> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (!done && result.value) {
        chunks.push(result.value);
        receivedLength += result.value.length;

        if (onProgress && total > 0) {
          const percent = Math.round((receivedLength / total) * 100);
          onProgress(percent);
        }
      }
    }

    // Объединяем все chunks в один ArrayBuffer
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    return allChunks.buffer;
  }

  public async loadFromUrl(
    url: string,
    callbacks?: {
      onProgress?: (percent: number) => void;
      onLoaded?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ): Promise<boolean> {
    // Запускаем таймер загрузки
    UiLoadTimeDiv.inst().startTimer();

    const isWorker = ThreeApp.inst().isWorker;

    if (isWorker) {
      // Используем воркер для загрузки модели
      return new Promise((resolve, reject) => {
        OffscreenCanvasManager.inst().loadModelFromUrl(url, {
          onProgress: (text) => {
            if (text && callbacks?.onProgress) {
              // Парсим процент из текста "Loading: X%"
              const match = text.match(/(\d+)%/);
              if (match) {
                callbacks.onProgress(parseInt(match[1], 10));
              }
            }
          },
          onLoaded: (loadedUrl) => {
            UiLoadTimeDiv.inst().stopTimer();
            if (callbacks?.onLoaded) {
              callbacks.onLoaded(loadedUrl);
            }
            resolve(true);
          },
          onError: (error) => {
            UiLoadTimeDiv.inst().stopTimer();
            if (callbacks?.onError) {
              callbacks.onError(error);
            }
            reject(new Error(error));
          },
        });
      });
    } else {
      // Загружаем напрямую в основном потоке
      try {
        if (callbacks?.onProgress) {
          callbacks.onProgress(0);
        }

        const arrayBuffer = await this.fetchWithProgress(url, callbacks?.onProgress);

        const basePath = this.extractBasePath(url);
        const result = await InitModel.inst().handleFileLoad(arrayBuffer, basePath);

        if (result && callbacks?.onLoaded) {
          UiLoadTimeDiv.inst().stopTimer();
          callbacks.onLoaded(url);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        UiLoadTimeDiv.inst().stopTimer();
        if (callbacks?.onError) {
          callbacks.onError(errorMessage);
        }
        throw error;
      }
    }
  }
}
