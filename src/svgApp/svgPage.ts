import { SvgUseHandler } from './svgUseHandler';

export class SvgPage {
  private div: HTMLDivElement;

  public init(svgHTML: string, container: HTMLDivElement) {
    this.div = document.createElement('div');
    this.div.setAttribute('nameId', 'svgPage');
    this.div.style.position = 'absolute';
    this.div.style.width = '100%';
    this.div.style.height = '100%';
    this.div.style.top = '0';
    this.div.style.left = '0';
    this.div.style.background = '#ffffff';
    this.div.style.overflow = 'hidden';
    this.div.innerHTML = svgHTML;
    container.append(this.div);

    const svg = this.div.children[0] as SVGElement;
    new SvgUseHandler(svg);
  }

  public getPage() {
    return this.div;
  }
}
