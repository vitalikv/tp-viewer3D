import { OffscreenCanvasManager } from '@/threeApp/worker/offscreenCanvasManager';
import { SceneManager } from '@/threeApp/scene/sceneManager';

export interface IWatermarkParams {
  activated?: boolean;
  contentType?: 'datetime' | 'text';
  text?: string;
  textColor?: string;
  opacityText?: number;
  opacityLogo?: number;
  fontSize?: number;
  width?: number;
  height?: number;
  urlLogo?: string | undefined;
  scaleLogo?: number;
  padding?: number;
  spacing?: number;
}

export class WatermarkCanvas {
  private static container: HTMLElement | { width: number; height: number; dpr: number; virtDom: boolean };
  private static canvas: HTMLCanvasElement | OffscreenCanvas;
  private static ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private static imgLogo: HTMLImageElement | null = null;

  private static params: Required<IWatermarkParams> = {
    activated: false,
    contentType: 'datetime',
    text: '',
    textColor: '#000000',
    opacityText: 1,
    opacityLogo: 0.3,
    fontSize: 16,
    width: 150,
    height: 100,
    urlLogo: '',
    scaleLogo: 1,
    padding: 0,
    spacing: 100,
  };

  public static setParams(params: IWatermarkParams) {
    this.params = { ...this.params, ...params } as Required<IWatermarkParams>;
  }

  public static async init(container: HTMLElement | { width: number; height: number; dpr: number; virtDom: boolean }) {
    if (!this.params.activated) return;

    this.container = container;

    this.createCanvas();

    try {
      await this.loadImage();
      this.getWatermarkCanvas();
    } catch {
      console.log('Не удалось загрузить Logo:', this.params.urlLogo);
      this.getWatermarkCanvas();
    }
  }

  private static loadImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.params.urlLogo === '') {
        reject();
        return;
      }

      if (this.params.urlLogo) {
        this.imgLogo = new Image();
        this.imgLogo.crossOrigin = 'anonymous';
        this.imgLogo.onload = () => {
          this.params.width = this.imgLogo!.width * this.params.scaleLogo;
          this.params.height = this.imgLogo!.height * this.params.scaleLogo;
          resolve();
        };
        this.imgLogo.onerror = () => {
          this.imgLogo = null;
          reject();
        };
        this.imgLogo.src = this.params.urlLogo;
      } else {
        reject();
      }
    });
  }

  private static createCanvas() {
    const rect = this.getClientRect();

    const isWorker = OffscreenCanvasManager.inst().isWorker;

    if (!isWorker) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    } else {
      this.canvas = new OffscreenCanvas(rect.width, rect.height);
    }

    const ctx = this.canvas.getContext('2d');
    this.ctx = ctx;
  }

  private static getClientRect() {
    return SceneManager.inst().getClientRect();
  }

  private static updateTexture() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const workAreaWidth = this.canvas.width - this.params.padding * 2;
    const workAreaHeight = this.canvas.height - this.params.padding * 2;

    const effectiveWidth = this.params.width + this.params.spacing;
    const effectiveHeight = this.params.height + this.params.spacing;

    const repeatX = Math.max(1, Math.floor(workAreaWidth / effectiveWidth));
    const repeatY = Math.max(1, Math.floor(workAreaHeight / effectiveHeight));

    const totalGridWidth = repeatX * this.params.width + (repeatX - 1) * this.params.spacing;
    const totalGridHeight = repeatY * this.params.height + (repeatY - 1) * this.params.spacing;

    const startX = this.params.padding + (workAreaWidth - totalGridWidth) / 2;
    const startY = this.params.padding + (workAreaHeight - totalGridHeight) / 2;

    for (let x = 0; x < repeatX; x++) {
      for (let y = 0; y < repeatY; y++) {
        const posX = startX + x * effectiveWidth;
        const posY = startY + y * effectiveHeight;

        if (posX + this.params.width <= this.canvas.width - this.params.padding && posY + this.params.height <= this.canvas.height - this.params.padding) {
          this.drawSingleWatermark(posX, posY);
        }
      }
    }

    if (repeatX === 1 || repeatY === 1) {
      let scale = 1;

      if (this.params.width <= this.canvas.width && this.params.height <= this.canvas.height) {
        scale = 1;
      } else {
        scale = Math.min(this.canvas.width / this.params.width, this.canvas.height / this.params.height) * 0.9;
      }

      const scaledWidth = this.params.width * scale;
      const scaledHeight = this.params.height * scale;
      const scaledX = (this.canvas.width - scaledWidth) / 2;
      const scaledY = (this.canvas.height - scaledHeight) / 2;

      this.drawSingleWatermark(scaledX, scaledY, scaledWidth, scaledHeight);
    }
  }

  private static drawSingleWatermark(x: number, y: number, width?: number, height?: number) {
    this.ctx.save();

    const drawWidth = width || this.params.width;
    const drawHeight = height || this.params.height;

    if (this.imgLogo) {
      this.drawLogo(x, y, drawWidth, drawHeight);
    }

    let displayText: string | string[];
    if (this.params.contentType === 'datetime') {
      displayText = this.getCurrentDateTime();
    } else {
      displayText = this.params.text;
    }

    this.ctx.fillStyle = this.hexToRgba(this.params.textColor, this.params.opacityText);

    const fontSize = this.params.fontSize;
    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (this.params.contentType === 'datetime') {
      const [time, date] = this.getCurrentDateTime();

      const centerX = x + drawWidth / 2;
      const centerY = y + drawHeight / 2;
      const lineHeight = fontSize * 1.2;

      this.ctx.fillText(time, centerX, centerY - lineHeight / 2);
      this.ctx.fillText(date, centerX, centerY + lineHeight / 2);
    } else {
      this.ctx.fillText(displayText as string, x + drawWidth / 2, y + drawHeight / 2);
    }

    this.ctx.restore();
  }

  private static drawLogo(x: number, y: number, width?: number, height?: number) {
    if (!this.imgLogo) return;

    const drawWidth = width || this.params.width;
    const drawHeight = height || this.params.height;

    this.ctx.globalAlpha = this.params.opacityLogo;
    this.ctx.drawImage(this.imgLogo, x, y, drawWidth, drawHeight);
    this.ctx.globalAlpha = 1.0;
  }

  private static hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private static getCurrentDateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    return [`${hours}:${minutes}:${seconds}`, `${day}.${month}.${year}`];
  }

  public static getWatermarkCanvas() {
    if (!this.canvas) return;

    const rect = this.getClientRect();

    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    this.updateTexture();

    return this?.canvas;
  }
}
