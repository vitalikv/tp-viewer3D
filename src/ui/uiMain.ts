import { UiClippingButton } from './uiClippingButton';
import { UiClippingSlider } from './uiClippingSlider';
import { UiDrawCallsDiv } from './uiDrawCallsDiv';
import { UiPlayerAnimation } from './uiPlayerAnimation';

class MainUi {
  public uiClippingSlider: UiClippingSlider;
  public uiDrawCallsDiv: UiDrawCallsDiv;
  public uiPlayerAnimation: UiPlayerAnimation;
  public uiClippingButton: UiClippingButton;

  public init() {
    const container = document.body.querySelector('#container') as HTMLDivElement;

    this.uiClippingButton = new UiClippingButton(container);
    this.uiClippingSlider = new UiClippingSlider();
    this.uiPlayerAnimation = new UiPlayerAnimation(container);
    this.uiDrawCallsDiv = new UiDrawCallsDiv();
    this.uiDrawCallsDiv.init(container);
  }
}

export const uiMain = new MainUi();
