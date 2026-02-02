import { ContextSingleton } from '@/core/ContextSingleton';
import { SvgPages } from '@/svgApp/SvgPages';
import { WatermarkSvg } from '@/watermark/WatermarkSvg';
import { SvgUrlLoader } from '@/svgApp/SvgUrlLoader';

export class SvgApp extends ContextSingleton<SvgApp> {
  private svgContainer: HTMLDivElement;

  public async init() {
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

  public async loadSvg(
    url: string,
    callbacks?: {
      onProgress?: (percent: number) => void;
      onLoaded?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ): Promise<boolean> {
    try {
      return await SvgUrlLoader.inst().loadFromUrl(url, {
        onProgress:
          callbacks?.onProgress ||
          ((percent) => {
            console.log(`Загрузка SVG: ${percent}%`);
          }),
        onLoaded:
          callbacks?.onLoaded ||
          ((url) => {
            console.log(`SVG успешно загружен: ${url}`);
          }),
        onError:
          callbacks?.onError ||
          ((error) => {
            console.error(`Ошибка загрузки SVG: ${error}`);
          }),
      });
    } catch (error) {
      console.error('Ошибка при загрузке SVG:', error);
      throw error;
    }
  }

  private handleResize = () => {
    WatermarkSvg.updateWatermark();
    
    const activePanZoom = SvgPages.inst().getActiveSvgPanZoom();
    if (activePanZoom) {
      const sizes = activePanZoom.getSizes();
      if (sizes.width === 0) return;

      const zoom = activePanZoom.getZoom();
      if (isNaN(zoom)) {
        return;
      }

      try {
        activePanZoom.resize();
        activePanZoom.fit();
        activePanZoom.center();
      } catch (e) {
        console.warn(e);
      }
    }
  };
}
