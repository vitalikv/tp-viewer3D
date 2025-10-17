import { threeApp } from '../three/threeApp';
import { uiMain } from './uiMain';

export class UiClippingButton {
  private button: HTMLButtonElement;
  private isEnabled: boolean = false;

  constructor(nameId: string) {
    this.button = document.getElementById(nameId) as HTMLButtonElement;
    this.button.addEventListener('click', () => this.toggle());
    this.updateText();
  }

  private toggle(): void {
    this.isEnabled = !this.getEnabled();
    this.updateText();

    if (this.isEnabled) {
      const model = threeApp.modelLoader.getModel();
      threeApp.clippingBvh.initClipping({ model });
      threeApp.sceneManager.render();

      uiMain.uiClippingSlider.init(document.body);
      uiMain.uiClippingSlider.showSlider();
    } else {
      threeApp.clippingBvh.destroy();
      threeApp.sceneManager.render();

      uiMain.uiClippingSlider.hideSlider();
    }
  }

  private updateText(): void {
    this.button.textContent = this.getEnabled() ? 'Выкл сечение' : 'Вкл сечение';
  }

  private getEnabled(): boolean {
    return this.isEnabled;
  }
}
