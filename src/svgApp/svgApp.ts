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

    const divSvg = document.createElement('div');
    divSvgContainer.append(divSvg);
    divSvg.style.position = 'absolute';
    divSvg.style.width = '100%';
    divSvg.style.height = '100%';
    divSvg.style.top = '0';
    divSvg.innerHTML = svgHTML;

    const svg = divSvg.children[0] as SVGElement;
    svg.style.position = 'absolute';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.top = '0';
    svg.style.background = '#ffffff';

    const divCanvas = document.createElement('div');
    divSvgContainer.append(divCanvas);
    divCanvas.style.position = 'absolute';
    divCanvas.style.width = '100%';
    divCanvas.style.height = '100%';
    divCanvas.style.top = '0';
    divCanvas.style.pointerEvents = 'none';

    await WatermarkCanvas.init(divCanvas);

    new SvgUseHandler(svg);

    WatermarkSvg.init(divCanvas, svg);
    //WatermarkSvg.updateWatermark();

    divSvgContainer.addEventListener('wheel', () => {
      console.log(888);
      WatermarkSvg.renderWatermark();
    });
  }

  private handleResize = () => {
    console.log(9999);
    WatermarkSvg.updateWatermark();
  };
}
