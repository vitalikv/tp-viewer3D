import { threeApp } from '../three/threeApp';

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
    } else {
      //threeApp.clippingBvh.disableClipping();
      threeApp.clippingBvh.destroy(); // Полное уничтожение (если нужно освободить память)
    }
  }

  private updateText(): void {
    this.button.textContent = this.getEnabled() ? 'Выкл сечение' : 'Вкл сечение';
  }

  private getEnabled(): boolean {
    return this.isEnabled;
  }
}
