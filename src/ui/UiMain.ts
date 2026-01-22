import { ContextSingleton } from '@/core/ContextSingleton';
import { UiFileMenu } from '@/ui/UiFileMenu';
import { UiClippingButton } from '@/ui/UiClippingButton';
import { UiDrawCallsDiv } from '@/ui/UiDrawCallsDiv';
import { UiPlayerAnimation } from '@/ui/UiPlayerAnimation';
import { UiLoadTimeDiv } from '@/ui/UiLoadTimeDiv';

export class UiMain extends ContextSingleton<UiMain> {
  public init() {
    const container = document.body.querySelector('#container') as HTMLDivElement;

    UiFileMenu.inst().init(container);
    UiClippingButton.inst().init(container);
    UiPlayerAnimation.inst().init(container);
    UiDrawCallsDiv.inst().init(container);
    UiLoadTimeDiv.inst().init(container);
  }
}
