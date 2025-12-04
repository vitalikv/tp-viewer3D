import * as THREE from 'three';
import { UiPlayerAnimation } from '@/ui/uiPlayerAnimation';
import { UiDrawCallsDiv } from '@/ui/uiDrawCallsDiv';

export class ApiThreeToUi {
  public static updatePlayerMenu(animations: THREE.AnimationClip[]) {
    UiPlayerAnimation.inst().updatePlayerMenu(animations);
  }

  public static updatePlayerTime(time: number, maxTime: number) {
    UiPlayerAnimation.inst().updatePlayerTime(time, maxTime);
  }

  public static updatePlayerCaret(percent: number, isPlaying: boolean) {
    UiPlayerAnimation.inst().updatePlayerCaret(percent, isPlaying);
  }

  public static updatePlayerBtnPlay(isPlaying: boolean) {
    UiPlayerAnimation.inst().updateBtnPlay(isPlaying);
  }

  public static updateDrawCalls(value: string | number) {
    UiDrawCallsDiv.inst().updateText(value);
  }
}
