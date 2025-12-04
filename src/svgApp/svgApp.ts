import { SvgPages } from '@/svgApp/svgPages';
import { WatermarkSvg } from '@/watermark/watermarkSvg';

export class SvgApp {
  private svgContainer: HTMLDivElement;

  public init() {
    window.addEventListener('resize', this.handleResize);
    const container = document.body.querySelector('#container') as HTMLDivElement;

    this.svgContainer = document.createElement('div');
    this.svgContainer.style.position = 'absolute';
    this.svgContainer.style.width = '100%';
    this.svgContainer.style.height = '100%';
    this.svgContainer.style.top = '0';
    this.svgContainer.style.background = '#ffffff';
    this.svgContainer.style.zIndex = '3';
    this.svgContainer.setAttribute('nameId', 'svgContainer');
    container.append(this.svgContainer);

    SvgPages.inst().init(this.svgContainer);

    WatermarkSvg.init(this.svgContainer, undefined);

    this.svgContainer.addEventListener('wheel', () => {
      WatermarkSvg.updateWatermark();
    });

    this.svgContainer.style.display = 'none';
  }

  private handleResize = () => {
    WatermarkSvg.updateWatermark();
  };
}
