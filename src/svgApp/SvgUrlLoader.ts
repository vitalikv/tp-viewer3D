import { ContextSingleton } from '@/core/ContextSingleton';
import { SvgPages } from '@/svgApp/SvgPages';
import { UiFileMenu } from '@/ui/UiFileMenu';

export class SvgUrlLoader extends ContextSingleton<SvgUrlLoader> {
  private extractFilename(url: string): string {
    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname;
      const lastSlashIndex = pathname.lastIndexOf('/');
      let filename = 'svg-file.svg';

      if (lastSlashIndex >= 0 && lastSlashIndex < pathname.length - 1) {
        filename = pathname.substring(lastSlashIndex + 1);
      }

      try {
        return decodeURIComponent(filename);
      } catch (_e) {
        return filename;
      }
    } catch (_e) {
      return 'svg-file.svg';
    }
  }

  private async fetchWithProgress(url: string, onProgress?: (percent: number) => void): Promise<string> {
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
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let receivedLength = 0;

    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (!done && result.value) {
        const chunk = decoder.decode(result.value, { stream: true });
        chunks.push(chunk);
        receivedLength += result.value.length;

        if (onProgress && total > 0) {
          const percent = Math.round((receivedLength / total) * 100);
          onProgress(percent);
        }
      }
    }

    // Объединяем все chunks в одну строку
    return chunks.join('');
  }

  public async loadFromUrl(
    url: string,
    callbacks?: {
      onProgress?: (percent: number) => void;
      onLoaded?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ): Promise<boolean> {
    try {
      if (callbacks?.onProgress) {
        callbacks.onProgress(0);
      }

      const svgText = await this.fetchWithProgress(url, callbacks?.onProgress);

      // Показываем контейнер SVG и добавляем страницу
      SvgPages.inst().showContainerSvg();
      const index = SvgPages.inst().addSvgPage(svgText);

      // Добавляем файл в меню
      const filename = this.extractFilename(url);
      UiFileMenu.inst().addItem(filename, 'svg', index);

      if (callbacks?.onLoaded) {
        callbacks.onLoaded(url);
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (callbacks?.onError) {
        callbacks.onError(errorMessage);
      }
      throw error;
    }
  }
}
