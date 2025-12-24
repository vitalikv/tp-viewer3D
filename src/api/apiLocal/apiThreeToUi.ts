import * as THREE from 'three';
import { ContextSingleton } from '@/core/ContextSingleton';
import { UiPlayerAnimation } from '@/ui/UiPlayerAnimation';
import { UiDrawCallsDiv } from '@/ui/UiDrawCallsDiv';

export class ApiThreeToUi extends ContextSingleton<ApiThreeToUi> {
  private isInWorker(): boolean {
    return typeof window === 'undefined' && typeof self !== 'undefined';
  }

  public updatePlayerMenu(animations: THREE.AnimationClip[]) {
    if (this.isInWorker()) {
      const animationsData = animations.map((anim) => ({
        name: anim.name,
        duration: anim.duration,
      }));
      self.postMessage({ type: 'updatePlayerMenu', animations: animationsData });
    } else {
      UiPlayerAnimation.inst().updatePlayerMenu(animations);
    }
  }

  public updatePlayerTime(time: number, maxTime: number) {
    if (this.isInWorker()) {
      self.postMessage({ type: 'updatePlayerTime', time, maxTime });
    } else {
      UiPlayerAnimation.inst().updatePlayerTime(time, maxTime);
    }
  }

  public updatePlayerCaret(percent: number, isPlaying: boolean) {
    if (this.isInWorker()) {
      self.postMessage({ type: 'updatePlayerCaret', percent, isPlaying });
    } else {
      UiPlayerAnimation.inst().updatePlayerCaret(percent, isPlaying);
    }
  }

  public updatePlayerBtnPlay(isPlaying: boolean) {
    if (this.isInWorker()) {
      self.postMessage({ type: 'updatePlayerBtnPlay', isPlaying });
    } else {
      UiPlayerAnimation.inst().updateBtnPlay(isPlaying);
    }
  }

  public updateDrawCalls(value: string | number) {
    if (this.isInWorker()) {
      self.postMessage({ type: 'updateDrawCalls', value });
    } else {
      UiDrawCallsDiv.inst().updateText(value);
    }
  }
}
