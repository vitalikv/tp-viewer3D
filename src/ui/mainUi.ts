import { UiClippingButton } from './uiClippingButton';

class MainUi {
  public init() {
    const container = document.getElementById('btn-clipping');
    console.log(3223, container);

    new UiClippingButton('btn-clipping');
  }
}

export const mainUi = new MainUi();
