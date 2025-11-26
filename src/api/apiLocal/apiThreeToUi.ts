import * as THREE from 'three';
import { uiMain } from '../../ui/uiMain';

export class ApiThreeToUi {
  public static updatePlayerTime(time: number) {
    uiMain.uiPlayerAnimation.updatePlayerTime(time);
  }

  public static updatePlayerMenu(animations: THREE.AnimationClip[]) {
    uiMain.uiPlayerAnimation.updatePlayerMenu(animations);
  }
}
