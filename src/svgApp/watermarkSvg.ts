import { WatermarkCanvas } from '../watermark/watermarkCanvas';

export class WatermarkSvg {
  private static currentCanvas: HTMLCanvasElement | null = null;
  private static divSvgContainer: HTMLElement | null = null;
  private static currentSVGElement: SVGElement | null = null;
  private static ctx: CanvasRenderingContext2D | null = null;

  public static async addWatermark(divSvgContainer?: HTMLElement): Promise<void> {
    if (!divSvgContainer && !this.divSvgContainer) {
      console.error('No container provided');
      return;
    }

    if (divSvgContainer) {
      this.divSvgContainer = divSvgContainer;
      this.currentSVGElement = divSvgContainer.children[0] as SVGElement;
    }

    if (!this.currentSVGElement) {
      console.error('No SVG element found');
      return;
    }

    try {
      // Создаем canvas только один раз
      if (!this.currentCanvas) {
        this.currentCanvas = document.createElement('canvas');
        this.ctx = this.currentCanvas.getContext('2d');
        this.currentCanvas.style.pointerEvents = 'none';

        this.currentCanvas.style.position = 'absolute';
        this.currentCanvas.style.width = '100%';
        this.currentCanvas.style.height = '100%';
        this.currentCanvas.style.top = '0';
        this.currentCanvas.style.zIndex = '999';
        this.currentCanvas.style.background = '#ffffff';

        // Добавляем canvas в контейнер
        if (this.divSvgContainer) {
          this.divSvgContainer.appendChild(this.currentCanvas);
        }
      }

      // Получаем размеры SVG
      const svgRect = this.currentSVGElement.getBoundingClientRect();
      const width = svgRect.width || 800;
      const height = svgRect.height || 600;

      // Обновляем размеры canvas если нужно
      if (this.currentCanvas.width !== width || this.currentCanvas.height !== height) {
        console.log(4444);
        this.currentCanvas.width = width;
        this.currentCanvas.height = height;
      }

      // Конвертируем SVG в data URL
      const svgString = new XMLSerializer().serializeToString(this.currentSVGElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Ждем загрузки SVG изображения
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Очищаем canvas перед перерисовкой
      this.ctx.clearRect(0, 0, width, height);

      // Рисуем SVG на canvas
      this.ctx.drawImage(img, 0, 0, width, height);

      // Очищаем URL
      URL.revokeObjectURL(svgUrl);

      // Используем WatermarkCanvas для добавления водяного знака
      const watermarkCanvas = WatermarkCanvas.getWatermarkCanvas();
      this.ctx.drawImage(watermarkCanvas, 0, 0, width, height);
    } catch (error) {
      console.error('Error adding watermark:', error);
    }
  }

  // Метод для обновления водяного знака (например, при изменении размера)
  public static async updateWatermark(): Promise<void> {
    if (this.currentCanvas && this.divSvgContainer && this.currentSVGElement) {
      await this.addWatermark();
    }
  }

  // Дополнительный статический метод для получения текущего canvas
  public static getCurrentCanvas(): HTMLCanvasElement | null {
    return this.currentCanvas;
  }

  // Дополнительный статический метод для очистки
  public static clear(): void {
    if (this.currentCanvas) {
      this.ctx.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
    }
  }

  // Полная очистка и удаление canvas
  public static destroy(): void {
    if (this.currentCanvas) {
      this.currentCanvas.remove();
      this.currentCanvas = null;
      this.ctx = null;
      this.divSvgContainer = null;
      this.currentSVGElement = null;
    }
  }
}
