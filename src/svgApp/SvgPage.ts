import { SvgUseHandler } from '@/svgApp/SvgUseHandler';
import { SvgPanZoom } from '@/svgApp/SvgPanZoom';

export class SvgPage {
  private div: HTMLDivElement;
  private svgPanZoom: SvgPanZoom | null = null;

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
    
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    
    new SvgUseHandler(svg);

    this.svgPanZoom = new SvgPanZoom(svg, this.div);
  }

  public getPage() {
    return this.div;
  }

  public getSvgPanZoom() {
    return this.svgPanZoom;
  }
}
