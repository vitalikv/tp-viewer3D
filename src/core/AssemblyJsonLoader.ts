import { ContextSingleton } from '@/core/ContextSingleton';

export class AssemblyJsonLoader extends ContextSingleton<AssemblyJsonLoader> {
  private jsonData: unknown;

  public setJson(jsonData: unknown) {
    this.jsonData = jsonData;
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

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (callbacks?.onProgress) {
        callbacks.onProgress(50);
      }

      const jsonData = await response.json();
      this.jsonData = jsonData;

      if (callbacks?.onProgress) {
        callbacks.onProgress(100);
      }

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

  public getJson(): unknown {
    return this.jsonData;
  }
}
