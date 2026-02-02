import { ContextSingleton } from '@/core/ContextSingleton';
import { SvgPage } from '@/svgApp/SvgPage';
import { WatermarkSvg } from '@/watermark/WatermarkSvg';
import { SvgPanZoom } from '@/svgApp/SvgPanZoom';

export class SvgPages extends ContextSingleton<SvgPages> {
  private container: HTMLDivElement;
  private divPages: HTMLDivElement;
  private arrPages: HTMLDivElement[] = [];
  private arrSvgPages: SvgPage[] = [];
  private activePageIndex: number = -1;

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
    this.arrSvgPages.push(svgPage);
    this.activePageIndex = this.arrPages.length - 1;

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
    this.activePageIndex = pageIndex;
  }

  public getActiveSvgPanZoom(): SvgPanZoom | null {
    if (this.activePageIndex >= 0 && this.activePageIndex < this.arrSvgPages.length) {
      return this.arrSvgPages[this.activePageIndex].getSvgPanZoom();
    }
    return null;
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
