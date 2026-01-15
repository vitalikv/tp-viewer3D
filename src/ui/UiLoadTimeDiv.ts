import { ContextSingleton } from '@/core/ContextSingleton';

export class UiLoadTimeDiv extends ContextSingleton<UiLoadTimeDiv> {
  private act: boolean = true;
  private container: HTMLDivElement;
  private divInfo: HTMLDivElement;
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  public init(wrapContainer: HTMLDivElement) {
    if (!this.act) return;
    this.container = this.crDiv();
    wrapContainer.append(this.container);

    this.eventStop({ div: this.container });

    this.divInfo = this.container.querySelector('#loadTime');
    this.updateText('---');
  }

  private crDiv() {
    let div = document.createElement('div');
    div.innerHTML = this.html();
    div = div.children[0] as HTMLDivElement;

    return div;
  }

  private html() {
    const css1 = `position: absolute; top: 100px; right: 0px; background: #ffffff; border: 1px solid #222222;`;
    const css2 = `display: flex; justify-content: center; align-items: center; width: 120px; height: 40px; font-size: 14px; color: #222222;`;

    const html = `<div style="${css1}">
        <div id="loadTime" style="${css2}">---</div>
    </div>`;

    return html;
  }

  private eventStop({ div }) {
    const arrEvent = ['onmousedown', 'onwheel', 'onmousewheel', 'onmousemove', 'ontouchstart', 'ontouchend', 'ontouchmove'];

    arrEvent.forEach((events) => {
      div[events] = (e) => {
        e.stopPropagation();
      };
    });
  }

  public startTimer() {
    if (this.isRunning) {
      this.stopTimer();
    }
    
    this.startTime = performance.now();
    this.isRunning = true;
    this.updateText('0.000');
    this.animate();
  }

  public stopTimer() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Обновляем финальное время после остановки таймера
    requestAnimationFrame(() => {
      const elapsed = (performance.now() - this.startTime) / 1000;
      this.updateText(elapsed.toFixed(3));
    });
  }

  private animate = () => {
    if (!this.isRunning) return;

    const elapsed = (performance.now() - this.startTime) / 1000;
    this.updateText(elapsed.toFixed(3));

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private updateText(value: string | number) {
    if (!this.divInfo) return;

    this.divInfo.textContent = value + ' сек';
  }
}

