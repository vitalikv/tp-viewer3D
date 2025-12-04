import { ContextSingleton } from '@/core/ContextSingleton';
import { SvgPage } from '@/svgApp/svgPage';
import { WatermarkSvg } from '@/watermark/watermarkSvg';

export class SvgPages extends ContextSingleton<SvgPages> {
  private container: HTMLDivElement;
  private divPages: HTMLDivElement;
  private arrPages: HTMLDivElement[] = [];

  public init(container: HTMLDivElement) {
    if (!container) return;
    this.container = container;

    this.divPages = document.createElement('div');
    this.divPages.setAttribute('nameId', 'svgPages');
    container.append(this.divPages);
  }

  public addSvgPage(svgHTML: string) {
    if (!this.container) return;

    this.container.style.display = '';
    this.hidePages();

    const svgPage = new SvgPage();
    svgPage.init(svgHTML, this.divPages);

    this.arrPages.push(svgPage.getPage());

    WatermarkSvg.updateWatermark();

    return this.arrPages.length - 1;
  }

  public getSvgPage(pageIndex: number) {
    return this.arrPages[pageIndex] || '';
  }

  public hidePages() {
    if (!this.container) return;

    this.arrPages.forEach((page) => {
      page.style.display = 'none';
    });
  }

  public showPage(pageIndex: number) {
    if (!this.container) return;

    this.hidePages();
    this.arrPages[pageIndex].style.display = '';
  }

  public hideContainerSvg() {
    if (!this.container) return;
    this.container.style.display = 'none';
  }

  public showContainerSvg() {
    if (!this.container) return;
    this.container.style.display = '';
  }
}
