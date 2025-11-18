import { SvgUseHandler } from './svgUseHandler';
import { WatermarkSvg } from '../watermark/watermarkSvg';
import { WatermarkCanvas } from '../watermark/watermarkCanvas';

export class SvgApp {
  constructor() {
    window.addEventListener('resize', this.handleResize);
  }

  public async createSvgPage(svgHTML: string) {
    const divSvgContainer = document.createElement('div');
    document.getElementById('container')?.append(divSvgContainer);

    divSvgContainer.style.position = 'absolute';
    divSvgContainer.style.width = '100%';
    divSvgContainer.style.height = '100%';
    divSvgContainer.style.top = '0';
    divSvgContainer.style.background = '#ffffff';
    divSvgContainer.innerHTML = svgHTML;

    const svg = divSvgContainer.children[0] as SVGElement;
    svg.style.position = 'absolute';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.top = '0';
    svg.style.background = '#ffffff';

    await WatermarkCanvas.init(divSvgContainer);

    new SvgUseHandler(svg);

    WatermarkSvg.init(divSvgContainer, svg);
  }

  private handleResize = () => {
    console.log(9999);
    WatermarkSvg.updateWatermark();
  };
}
