import { UiFileLoader } from '@/ui/uiFileLoader';
import { UiClippingButton } from '@/ui/uiClippingButton';
import { UiDrawCallsDiv } from '@/ui/uiDrawCallsDiv';
import { UiPlayerAnimation } from '@/ui/uiPlayerAnimation';

export class UiMain {
  public init() {
    const container = document.body.querySelector('#container') as HTMLDivElement;

    UiFileLoader.inst().init(container);
    UiClippingButton.inst().init(container);
    UiPlayerAnimation.inst().init(container);
    UiDrawCallsDiv.inst().init(container);
  }
}
