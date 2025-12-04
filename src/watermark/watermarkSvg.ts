import { WatermarkCanvas } from '@/watermark/watermarkCanvas';

export class WatermarkSvg {
  private static currentCanvas: HTMLCanvasElement | null = null;
  private static currentSVGElement: SVGElement | undefined = undefined;
  private static ctx: CanvasRenderingContext2D | null = null;
  private static watermarkCanvas: HTMLCanvasElement | undefined = undefined;
  private static divSvgContainer: HTMLElement | undefined = undefined;

  public static init(divSvgContainer: HTMLElement, svg: SVGElement | undefined) {
    this.watermarkCanvas = WatermarkCanvas.getWatermarkCanvas();
    if (!this.watermarkCanvas) return;

    this.clear();

    this.currentSVGElement = svg;
    this.divSvgContainer = divSvgContainer;

    this.currentCanvas = document.createElement('canvas');
    this.ctx = this.currentCanvas.getContext('2d');

    const svgRect = divSvgContainer.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;
    this.currentCanvas.width = width;
    this.currentCanvas.height = height;

    this.currentCanvas.style.pointerEvents = 'none';
    this.currentCanvas.style.position = 'absolute';
    this.currentCanvas.style.width = '100%';
    this.currentCanvas.style.height = '100%';
    this.currentCanvas.style.top = '0';
    this.currentCanvas.style.left = '0';
    //this.currentCanvas.style.background = '#ffffff';

    divSvgContainer.appendChild(this.currentCanvas);

    this.renderWatermark();
  }

  private static async canvasFromSvg() {
    if (!this.currentCanvas || !this.currentSVGElement) return;
    const svgClone = this.currentSVGElement.cloneNode(true) as SVGElement;

    const canvasWidth = this.currentCanvas.width;
    const canvasHeight = this.currentCanvas.height;

    svgClone.setAttribute('width', canvasWidth.toString());
    svgClone.setAttribute('height', canvasHeight.toString());
    svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.width = canvasWidth;
    img.height = canvasHeight;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = svgUrl;
    });

    this.ctx?.clearRect(0, 0, canvasWidth, canvasHeight);
    this.ctx?.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    URL.revokeObjectURL(svgUrl);
  }

  public static async renderWatermark() {
    if (!this.watermarkCanvas || !this.currentCanvas || !this.ctx) return;

    //await this.canvasFromSvg();

    const svgRect = this.currentCanvas.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;

    this.ctx.drawImage(this.watermarkCanvas, 0, 0, width, height);
  }

  public static async updateWatermark() {
    if (!this.divSvgContainer || !this.currentCanvas) return;

    this.watermarkCanvas = WatermarkCanvas.getWatermarkCanvas();
    if (!this.watermarkCanvas) return;

    const svgRect = this.divSvgContainer.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;
    this.currentCanvas.width = width;
    this.currentCanvas.height = height;

    await this.renderWatermark();
  }

  private static clear() {
    if (this.currentCanvas) {
      this.currentCanvas.remove();
      this.currentCanvas = null;
      this.ctx = null;
      this.currentSVGElement = undefined;
    }
  }
}
