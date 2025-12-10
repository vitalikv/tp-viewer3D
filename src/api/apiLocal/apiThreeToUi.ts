import * as THREE from 'three';
import { UiPlayerAnimation } from '@/ui/uiPlayerAnimation';
import { UiDrawCallsDiv } from '@/ui/uiDrawCallsDiv';

export class ApiThreeToUi {
  public static updatePlayerMenu(animations: THREE.AnimationClip[]) {
    if ((document as any)?.isWorker === undefined) {
      UiPlayerAnimation.inst().updatePlayerMenu(animations);
    }
  }

  public static updatePlayerTime(time: number, maxTime: number) {
    if ((document as any)?.isWorker === undefined) {
      UiPlayerAnimation.inst().updatePlayerTime(time, maxTime);
    }
  }

  public static updatePlayerCaret(percent: number, isPlaying: boolean) {
    if ((document as any)?.isWorker === undefined) {
      UiPlayerAnimation.inst().updatePlayerCaret(percent, isPlaying);
    }
  }

  public static updatePlayerBtnPlay(isPlaying: boolean) {
    if ((document as any)?.isWorker === undefined) {
      UiPlayerAnimation.inst().updateBtnPlay(isPlaying);
    }
  }

  public static updateDrawCalls(value: string | number) {
    if ((document as any)?.isWorker === undefined) {
      UiDrawCallsDiv.inst().updateText(value);
    }
  }
}
