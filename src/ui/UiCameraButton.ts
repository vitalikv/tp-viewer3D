import { ApiUiToThree } from '@/api/apiLocal/ApiUiToThree';
import { ContextSingleton } from '@/core/ContextSingleton';

export class UiCameraButton extends ContextSingleton<UiCameraButton> {
  private container: HTMLElement;
  private button: HTMLButtonElement;
  private cameraType: 'Perspective' | 'Orthographic' = 'Perspective';

  public init(container: HTMLDivElement) {
    this.container = container;
    const div = this.crDiv();
    this.container.append(div);
    this.eventStop({ div });

    this.button = div.children[0] as HTMLButtonElement;
    this.button.addEventListener('click', () => this.toggle());

    this.syncCameraType();
    this.updateText();
  }

  private syncCameraType() {
    try {
      this.cameraType = ApiUiToThree.inst().getCameraType();
    } catch (e) {
      this.cameraType = 'Perspective';
    }
  }

  private crDiv() {
    const div = document.createElement('div');
    div.innerHTML = this.html();

    return div;
  }

  private html() {
    const css1 = `position: absolute; top: 10px; right: 20px; background: white; padding: 10px; cursor: pointer; z-index: 10;`;

    const html = `<button nameId="btnCamera" style="${css1}">Перспектива</button>`;

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
    this.cameraType = this.cameraType === 'Perspective' ? 'Orthographic' : 'Perspective';
    this.updateText();
    ApiUiToThree.inst().toggleCamera(this.cameraType);
  }

  private updateText() {
    this.button.textContent = this.cameraType === 'Perspective' ? 'Перспектива' : 'Ортогональная';
  }
}
