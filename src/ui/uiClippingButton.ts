import { uiMain } from './uiMain';
import { ApiUiToThree } from '../api/apiLocal/apiUiToThree';

export class UiClippingButton {
  private button: HTMLButtonElement;
  private isEnabled: boolean = false;

  constructor(container: HTMLDivElement) {
    const div = this.crDiv();
    container.append(div);
    this.eventStop({ div });

    this.button = div.children[0] as HTMLButtonElement;
    this.button.addEventListener('click', () => this.toggle());

    this.updateText();
  }

  private crDiv() {
    let div = document.createElement('div');
    div.innerHTML = this.html();
    //div = div.children[0] as HTMLDivElement;

    return div;
  }

  private html() {
    const css1 = `position: absolute; bottom: 70px; right: 20px; background: white; padding: 10px; cursor: pointer;`;

    const html = `<button nameId="btnClipping" style="${css1}">Вкл сечение</button>`;

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

  private toggle() {
    this.isEnabled = !this.getEnabled();
    this.updateText();

    if (this.isEnabled) {
      ApiUiToThree.activateClippingBvh();

      uiMain.uiClippingSlider.init(document.body);
      uiMain.uiClippingSlider.showSlider();
    } else {
      ApiUiToThree.deActivateClippingBvh();

      uiMain.uiClippingSlider.hideSlider();
    }
  }

  private updateText() {
    this.button.textContent = this.getEnabled() ? 'Выкл сечение' : 'Вкл сечение';
  }

  private getEnabled() {
    return this.isEnabled;
  }
}
