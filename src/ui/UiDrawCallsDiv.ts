import { ContextSingleton } from '@/core/ContextSingleton';

export class UiDrawCallsDiv extends ContextSingleton<UiDrawCallsDiv> {
  private act: boolean = true;
  private container: HTMLDivElement;
  private divInfo: HTMLDivElement;

  public init(wrapContainer: HTMLDivElement) {
    if (!this.act) return;
    this.container = this.crDiv();
    wrapContainer.append(this.container);

    this.eventStop({ div: this.container });

    this.divInfo = this.container.querySelector('#counterDrawCalls');
  }

  private crDiv() {
    let div = document.createElement('div');
    div.innerHTML = this.html();
    div = div.children[0] as HTMLDivElement;

    return div;
  }

  private html() {
    const css1 = `position: absolute; top: 50px; right: 0px; background: #ffffff; border: 1px solid #222222;`;
    const css2 = `display: flex; justify-content: center; align-items: center; width: 78px; height: 40px; font-size: 14px; color: #222222;`;

    const html = `<div style="${css1}">
        <div id="counterDrawCalls" style="${css2}">---</div>
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

  public updateText(value: string | number) {
    if (!this.divInfo) return;

    this.divInfo.textContent = value + '';
  }
}
