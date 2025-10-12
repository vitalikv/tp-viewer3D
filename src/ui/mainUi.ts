import { UiClippingButton } from './uiClippingButton';
import { UiClippingSlider } from './uiClippingSlider';

class MainUi {
  public init() {
    const container = document.getElementById('btn-clipping');
    console.log(3223, container);

    new UiClippingButton('btn-clipping');
    const uiClippingSlider = new UiClippingSlider();
    uiClippingSlider.init(document.body);
  }
}

export const mainUi = new MainUi();
