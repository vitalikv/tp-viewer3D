import { UiClippingButton } from './uiClippingButton';
import { UiClippingSlider } from './uiClippingSlider';

class MainUi {
  public uiClippingSlider: UiClippingSlider;

  public init() {
    new UiClippingButton('btn-clipping');

    this.uiClippingSlider = new UiClippingSlider();
  }
}

export const uiMain = new MainUi();
