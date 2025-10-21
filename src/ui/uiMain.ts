import { UiClippingButton } from './uiClippingButton';
import { UiClippingSlider } from './uiClippingSlider';
import { UiDrawCallsDiv } from './uiDrawCallsDiv';

class MainUi {
  public uiClippingSlider: UiClippingSlider;
  public uiDrawCallsDiv: UiDrawCallsDiv;

  public init() {
    const container = document.body.querySelector('#container') as HTMLDivElement;

    new UiClippingButton('btn-clipping');
    this.uiClippingSlider = new UiClippingSlider();

    this.uiDrawCallsDiv = new UiDrawCallsDiv();
    this.uiDrawCallsDiv.init(container);
  }
}

export const uiMain = new MainUi();
