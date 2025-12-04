import { UiFileLoader } from '@/ui/uiFileLoader';
import { UiClippingButton } from '@/ui/uiClippingButton';
import { UiClippingSlider } from '@/ui/uiClippingSlider';
import { UiDrawCallsDiv } from '@/ui/uiDrawCallsDiv';
import { UiPlayerAnimation } from '@/ui/uiPlayerAnimation';

class MainUi {
  public uiFileLoader: UiFileLoader;
  public uiClippingSlider: UiClippingSlider;
  public uiDrawCallsDiv: UiDrawCallsDiv;
  public uiPlayerAnimation: UiPlayerAnimation;
  public uiClippingButton: UiClippingButton;

  public init() {
    const container = document.body.querySelector('#container') as HTMLDivElement;

    this.uiFileLoader = new UiFileLoader(container);
    this.uiClippingButton = new UiClippingButton(container);
    this.uiClippingSlider = new UiClippingSlider();
    this.uiPlayerAnimation = new UiPlayerAnimation(container);
    this.uiDrawCallsDiv = new UiDrawCallsDiv();
    this.uiDrawCallsDiv.init(container);
  }
}

export const uiMain = new MainUi();
