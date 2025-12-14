import * as THREE from 'three';
import { UiPlayerAnimation } from '@/ui/uiPlayerAnimation';
import { UiDrawCallsDiv } from '@/ui/uiDrawCallsDiv';
import { OffscreenCanvasManager } from '@/threeApp/worker/offscreenCanvasManager';

export class ApiThreeToUi {
  public static updatePlayerMenu(animations: THREE.AnimationClip[]) {
    const isWorker = OffscreenCanvasManager.inst().isWorker;
    if (!isWorker) {
      UiPlayerAnimation.inst().updatePlayerMenu(animations);
    }
  }

  public static updatePlayerTime(time: number, maxTime: number) {
    const isWorker = OffscreenCanvasManager.inst().isWorker;
    if (!isWorker) {
      UiPlayerAnimation.inst().updatePlayerTime(time, maxTime);
    }
  }

  public static updatePlayerCaret(percent: number, isPlaying: boolean) {
    const isWorker = OffscreenCanvasManager.inst().isWorker;
    if (!isWorker) {
      UiPlayerAnimation.inst().updatePlayerCaret(percent, isPlaying);
    }
  }

  public static updatePlayerBtnPlay(isPlaying: boolean) {
    const isWorker = OffscreenCanvasManager.inst().isWorker;
    if (!isWorker) {
      UiPlayerAnimation.inst().updateBtnPlay(isPlaying);
    }
  }

  public static updateDrawCalls(value: string | number) {
    const isWorker = OffscreenCanvasManager.inst().isWorker;
    if (!isWorker) {
      UiDrawCallsDiv.inst().updateText(value);
    }
  }
}
