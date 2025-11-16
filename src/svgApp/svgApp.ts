import { SvgUseHandler } from './svgUseHandler';

export class SvgApp {
  public createSvgPage(svgHTML: string) {
    const divSvgContainer = document.createElement('div');
    document.getElementById('container')?.append(divSvgContainer);

    divSvgContainer.style.position = 'absolute';
    divSvgContainer.style.width = '100%';
    divSvgContainer.style.height = '100%';
    divSvgContainer.style.top = '0';
    divSvgContainer.style.background = '#ffffff';
    divSvgContainer.innerHTML = svgHTML;

    new SvgUseHandler(divSvgContainer.children[0] as SVGElement);
  }
}
