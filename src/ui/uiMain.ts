import { UiFileLoader } from '@/ui/uiFileLoader';
import { UiFileMenu } from '@/ui/uiFileMenu';
import { UiClippingButton } from '@/ui/uiClippingButton';
import { UiDrawCallsDiv } from '@/ui/uiDrawCallsDiv';
import { UiPlayerAnimation } from '@/ui/uiPlayerAnimation';
import { UiLoadTimeDiv } from '@/ui/uiLoadTimeDiv';

export class UiMain {
  public init() {
    const container = document.body.querySelector('#container') as HTMLDivElement;

    UiFileLoader.inst().init(container);
    UiFileMenu.inst().init(container);
    UiClippingButton.inst().init(container);
    UiPlayerAnimation.inst().init(container);
    UiDrawCallsDiv.inst().init(container);
    UiLoadTimeDiv.inst().init(container);
  }
}
