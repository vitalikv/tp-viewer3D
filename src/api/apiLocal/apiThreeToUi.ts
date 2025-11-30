import * as THREE from 'three';
import { uiMain } from '../../ui/uiMain';

export class ApiThreeToUi {
  public static updatePlayerMenu(animations: THREE.AnimationClip[]) {
    uiMain.uiPlayerAnimation.updatePlayerMenu(animations);
  }

  public static updatePlayerTime(time: number, maxTime: number) {
    uiMain.uiPlayerAnimation.updatePlayerTime(time, maxTime);
  }

  public static updatePlayerCaret(percent: number, isPlaying: boolean) {
    uiMain.uiPlayerAnimation.updatePlayerCaret(percent, isPlaying);
  }

  public static updatePlayerBtnPlay(isPlaying: boolean) {
    uiMain.uiPlayerAnimation.updateBtnPlay(isPlaying);
  }
}
