import { ApiUiToThree } from '@/api/apiLocal/ApiUiToThree';
import { ContextSingleton } from '@/core/ContextSingleton';
import { UiClippingSlider } from '@/ui/UiClippingSlider';

export class UiClippingButton extends ContextSingleton<UiClippingButton> {
  private container: HTMLElement;
  private button: HTMLButtonElement;
  private isEnabled: boolean = false;

  public init(container: HTMLDivElement) {
    this.container = container;
    const div = this.crDiv();
    this.container.append(div);
    this.eventStop({ div });

    this.button = div.children[0] as HTMLButtonElement;
    this.button.addEventListener('click', () => this.toggle());

    this.updateText();
  }

  private crDiv() {
    const div = document.createElement('div');
    div.innerHTML = this.html();

    return div;
  }

  private html() {
    const css1 = `position: absolute; bottom: 70px; right: 20px; background: white; padding: 10px; cursor: pointer; z-index: 10;`;

    const html = `<button nameId="btnClipping" style="${css1}">Вкл сечение</button>`;

    return html;
  }

  private eventStop({ div }) {
    const arrEvent = [
      'onmousedown',
      'onwheel',
      'onmousewheel',
      'onmousemove',
      'ontouchstart',
      'ontouchend',
      'ontouchmove',
    ];

    arrEvent.forEach((events) => {
      div[events] = (e) => {
        e.stopPropagation();
      };
    });
  }

  private toggle() {
    this.isEnabled = !this.getEnabled();
    this.updateText();

    if (this.isEnabled) {
      ApiUiToThree.inst().activateClippingBvh();

      UiClippingSlider.inst().init(this.container);
      UiClippingSlider.inst().showSlider();
    } else {
      ApiUiToThree.inst().deActivateClippingBvh();

      UiClippingSlider.inst().hideSlider();
    }
  }

  private updateText() {
    this.button.textContent = this.getEnabled() ? 'Выкл сечение' : 'Вкл сечение';
  }

  private getEnabled() {
    return this.isEnabled;
  }
}
