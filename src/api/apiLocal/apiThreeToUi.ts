import * as THREE from 'three';
import { UiPlayerAnimation } from '@/ui/uiPlayerAnimation';
import { UiDrawCallsDiv } from '@/ui/uiDrawCallsDiv';

export class ApiThreeToUi {
  public static updatePlayerMenu(animations: THREE.AnimationClip[]) {
    const isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    if (isWorker) {
      // Отправляем из воркера в основной поток
      const animationsData = animations.map((anim) => ({
        name: anim.name,
        duration: anim.duration,
      }));
      self.postMessage({ type: 'updatePlayerMenu', animations: animationsData });
    } else {
      UiPlayerAnimation.inst().updatePlayerMenu(animations);
    }
  }

  public static updatePlayerTime(time: number, maxTime: number) {
    const isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    if (isWorker) {
      self.postMessage({ type: 'updatePlayerTime', time, maxTime });
    } else {
      UiPlayerAnimation.inst().updatePlayerTime(time, maxTime);
    }
  }

  public static updatePlayerCaret(percent: number, isPlaying: boolean) {
    const isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    if (isWorker) {
      self.postMessage({ type: 'updatePlayerCaret', percent, isPlaying });
    } else {
      UiPlayerAnimation.inst().updatePlayerCaret(percent, isPlaying);
    }
  }

  public static updatePlayerBtnPlay(isPlaying: boolean) {
    const isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    if (isWorker) {
      self.postMessage({ type: 'updatePlayerBtnPlay', isPlaying });
    } else {
      UiPlayerAnimation.inst().updateBtnPlay(isPlaying);
    }
  }

  public static updateDrawCalls(value: string | number) {
    const isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    if (isWorker) {
      self.postMessage({ type: 'updateDrawCalls', value });
    } else {
      UiDrawCallsDiv.inst().updateText(value);
    }
  }
}
