import * as THREE from 'three';
import { ContextSingleton } from '@/core/ContextSingleton';
import { ApiThreeToUi } from '@/api/apiLocal/ApiThreeToUi';
import { MergeAnimation } from '@/threeApp/mergedModel/MergeAnimation';
import { OutlineMergedModel } from '@/threeApp/selection/OutlineMergedModel';
import { SceneManager } from '@/threeApp/scene/SceneManager';

export class AnimationManager extends ContextSingleton<AnimationManager> {
  private mixers: THREE.AnimationMixer[] = [];
  private clock: THREE.Clock;
  private isPlaying: boolean = false;
  private animationActions: THREE.AnimationAction[] = [];
  private animationClips: THREE.AnimationClip[] = [];
  private currentActionIndex: number = 0;
  private animationLoopId: number | null = null;
  private animationElapsedTime: number = 0;
  private animationMaxDuration: number = 0;
  private isMergedModel: boolean = false;
  private animationRoot: THREE.Object3D | null = null;
  private mergedModel: THREE.Object3D | null = null;

  constructor() {
    super();
    this.clock = new THREE.Clock();
  }

  public initAnimations(animations: THREE.AnimationClip[], model: THREE.Object3D): boolean {
    if (!animations || animations.length === 0) {
      return false;
    }

    ApiThreeToUi.inst().updatePlayerMenu(animations);

    this.dispose();

    const animationRoot = (model as any).userData?.animationRoot;
    if (animationRoot) {
      this.isMergedModel = true;
      this.animationRoot = animationRoot;
      this.mergedModel = model;

      const mixer = new THREE.AnimationMixer(animationRoot);
      this.animationActions = [];
      this.animationClips = [];

      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.enabled = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        this.animationActions.push(action);
        this.animationClips.push(clip);
      });

      this.mixers.push(mixer);
    } else {
      this.isMergedModel = false;
      const mixer = new THREE.AnimationMixer(model);
      this.animationActions = [];
      this.animationClips = [];

      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.enabled = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        this.animationActions.push(action);
        this.animationClips.push(clip);
      });

      this.mergedModel = null;
      this.mixers.push(mixer);
    }

    this.setAnimationIndex(0);
    this.isPlaying = false;

    const maxDuration = this.getAnimationDuration();
    this.animationMaxDuration = maxDuration;

    console.log(` Инициализировано ${animations.length} анимаций`);

    return true;
  }

  public setAnimationIndex(index: number): void {
    if (this.mixers.length === 0 || this.animationActions.length === 0) {
      return;
    }

    if (index < 0 || index >= this.animationActions.length) {
      return;
    }

    this.stopAnimationLoop();
    this.isPlaying = false;

    this.animationActions.forEach((action, actionIndex) => {
      action.stop();
      action.reset();
      action.paused = true;
      action.enabled = actionIndex === index;
    });

    this.mixers.forEach((mixer) => {
      mixer.time = 0;
      mixer.setTime(0);
      mixer.timeScale = 1.0;
    });

    this.currentActionIndex = index;

    this.animationElapsedTime = 0;
    this.animationMaxDuration = 0;
  }

  public pause(): void {
    if (this.mixers.length === 0) {
      return;
    }

    const selectedAction = this.animationActions[this.currentActionIndex];
    if (selectedAction) {
      selectedAction.paused = true;
    }

    this.mixers.forEach((mixer) => {
      mixer.timeScale = 0.0;
    });

    this.stopAnimationLoop();

    this.isPlaying = false;

    if (this.isMergedModel && this.mergedModel) {
      this.rebuildMergedModelBVH();
    }
  }

  public reset(): void {
    if (this.mixers.length === 0) {
      return;
    }

    this.mixers.forEach((mixer) => {
      mixer.time = 0;
    });

    this.animationActions.forEach((action) => {
      action.reset();
    });
  }

  public setSpeed(speed: number): void {
    if (this.mixers.length === 0) {
      return;
    }

    this.mixers.forEach((mixer) => {
      mixer.timeScale = speed;
    });
  }

  private getAnimationDuration(): number {
    if (this.animationClips.length === 0) {
      return 0;
    }

    return Math.max(...this.animationClips.map((clip) => clip.duration));
  }

  private updateAnimationPose(
    time: number,
    options?: { rebuildMergedModelBVH?: boolean; resetActions?: boolean }
  ): void {
    if (this.mixers.length === 0 || this.animationActions.length === 0) {
      return;
    }

    this.stopAnimationLoop();
    this.isPlaying = false;

    const clampedTime = Math.max(0, time);
    const shouldResetActions = options?.resetActions ?? clampedTime === 0;
    const selectedAction = this.animationActions[this.currentActionIndex];

    if (!selectedAction) {
      return;
    }

    this.animationActions.forEach((action, actionIndex) => {
      if (actionIndex !== this.currentActionIndex) {
        action.stop();
        action.reset();
        action.enabled = false;
      } else {
        action.enabled = true;
      }
    });

    if (shouldResetActions) {
      selectedAction.reset();
    }

    selectedAction.paused = false;
    selectedAction.play();

    this.mixers.forEach((mixer) => {
      mixer.timeScale = 1.0;
      mixer.setTime(clampedTime);
      mixer.update(0);
      mixer.timeScale = 0.0;
    });

    selectedAction.paused = true;
    selectedAction.time = clampedTime;

    if (this.isMergedModel && this.animationRoot) {
      this.animationRoot.updateMatrixWorld(true);
      this.applyAnimationsToMergedGeometry();

      if (options?.rebuildMergedModelBVH && this.mergedModel) {
        this.rebuildMergedModelBVH();
      }
    }

    this.renderScene();
  }

  private renderScene(): void {
    if (SceneManager.inst() && SceneManager.inst().renderer) {
      SceneManager.inst().render();
    }
  }

  public setAnimationPosStart(): void {
    this.updateAnimationPose(0);
    OutlineMergedModel.updateOutlineMeshes();

    if (this.isMergedModel && this.mergedModel) {
      this.rebuildMergedModelBVH();
    }
  }

  public setAnimationPosEnd(): void {
    const endTime = this.getAnimationDuration();
    const rebuild = endTime > 0;
    this.updateAnimationPose(endTime, { rebuildMergedModelBVH: rebuild, resetActions: false });
    OutlineMergedModel.updateOutlineMeshes();

    if (this.isMergedModel && this.mergedModel) {
      this.rebuildMergedModelBVH();
    }
  }

  public play() {
    if (this.mixers.length === 0 || this.animationActions.length === 0) {
      return;
    }

    this.logPlaybackProgress();

    if (this.animationLoopId !== null) {
      cancelAnimationFrame(this.animationLoopId);
      this.animationLoopId = null;
    }

    const selectedAction = this.animationActions[this.currentActionIndex];
    if (!selectedAction) {
      return;
    }

    const selectedClip = this.animationClips[this.currentActionIndex];
    const animationLabel = selectedClip?.name || `Анимация ${this.currentActionIndex + 1}`;

    this.animationActions.forEach((action, actionIndex) => {
      if (actionIndex !== this.currentActionIndex) {
        action.stop();
        action.reset();
      }
    });

    const fallbackDuration = this.animationClips.reduce((duration, clip) => Math.max(duration, clip.duration), 0);
    const maxDuration = selectedClip?.duration ?? fallbackDuration;
    this.animationMaxDuration = maxDuration;
    const isResuming = this.animationElapsedTime > 0 && this.animationElapsedTime < maxDuration;
    if (!isResuming) {
      this.animationElapsedTime = 0;
    }

    this.clock = new THREE.Clock();

    this.mixers.forEach((mixer) => {
      if (!isResuming) {
        mixer.time = 0;
        mixer.setTime(0);
      } else {
        mixer.setTime(Math.min(this.animationElapsedTime, maxDuration));
      }
      mixer.timeScale = 1.0;
    });

    if (isResuming) {
      selectedAction.time = Math.min(this.animationElapsedTime, this.animationMaxDuration);
    } else {
      selectedAction.reset();
    }

    selectedAction.paused = false;
    selectedAction.play();
    if (!selectedAction.isRunning()) {
    }

    this.isPlaying = true;

    const animate = () => {
      const delta = this.clock.getDelta();

      if (delta > 0.1) {
        this.animationLoopId = requestAnimationFrame(animate);
        return;
      }

      if (this.isPlaying) {
        this.animationElapsedTime = Math.min(this.animationElapsedTime + delta, this.animationMaxDuration);

        if (this.mixers.length > 0) {
          this.mixers.forEach((mixer) => {
            mixer.update(delta);
          });
        }

        if (this.isMergedModel && this.animationRoot) {
          this.applyAnimationsToMergedGeometry();
        }

        OutlineMergedModel.updateOutlineMeshes();
      }

      this.renderScene();

      const isFinished = this.animationElapsedTime >= this.animationMaxDuration;

      if (!isFinished && this.isPlaying) {
        this.animationLoopId = requestAnimationFrame(animate);
      } else {
        if (isFinished) {
          this.isPlaying = false;
          if (this.isMergedModel) {
            this.rebuildMergedModelBVH();
          }
          this.animationElapsedTime = 0;

          ApiThreeToUi.inst().updatePlayerBtnPlay(false);
        }
        this.animationLoopId = null;
      }

      this.logPlaybackProgress();
    };

    this.animationLoopId = requestAnimationFrame(animate);
  }

  public logPlaybackProgress(): void {
    if (this.animationClips.length === 0 || this.animationMaxDuration === 0) {
      return;
    }

    const currentTime = Math.min(this.animationElapsedTime, this.animationMaxDuration);
    const percent = Math.min(100, (currentTime / this.animationMaxDuration) * 100);
    ApiThreeToUi.inst().updatePlayerTime(currentTime, this.animationMaxDuration);
    ApiThreeToUi.inst().updatePlayerCaret(percent, this.isPlaying);
  }

  private stopAnimationLoop(): void {
    if (this.animationLoopId !== null) {
      cancelAnimationFrame(this.animationLoopId);
      this.animationLoopId = null;
      this.rebuildMergedModelBVH();
    }
  }

  private applyAnimationsToMergedGeometry(): void {
    if (!this.animationRoot) return;

    this.animationRoot.updateMatrixWorld(true);

    const tempMatrix = new THREE.Matrix4();
    const uuidToGroupMap = MergeAnimation.getUuidToGroupMap();

    this.animationRoot.traverse((node) => {
      const uuid = node.uuid;

      if (!uuidToGroupMap.has(uuid)) {
        return;
      }

      const originalMatrixWorld = (node.userData as any)?.originalMatrixWorld;

      if (!originalMatrixWorld) {
        return;
      }

      tempMatrix.copy(node.matrixWorld);
      tempMatrix.multiplyMatrices(tempMatrix, originalMatrixWorld.clone().invert());

      MergeAnimation.applyAnimationToGroup(uuid, tempMatrix);
    });
  }

  private rebuildMergedModelBVH(): void {
    if (!this.mergedModel) return;
    if (!THREE.BufferGeometry.prototype.computeBoundsTree) return;

    this.mergedModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.geometry.computeBoundsTree({ indirect: true });
      }
    });
  }

  public hasAnimations(): boolean {
    // Проверяем наличие анимаций по клипам (actions могут быть пустыми при синхронизации из воркера)
    return this.animationClips.length > 0;
  }

  // Метод для получения информации об анимациях (для синхронизации с воркером)
  public getAnimationsInfo(): { animations: Array<{ name: string; duration: number }>; maxDuration: number } {
    const animations = this.animationClips.map((clip) => ({
      name: clip.name,
      duration: clip.duration,
    }));
    return { animations, maxDuration: this.animationMaxDuration };
  }

  // Метод для синхронизации информации об анимациях из воркера
  public setAnimationsInfo(animations: THREE.AnimationClip[], maxDuration: number): void {
    this.animationClips = animations;
    this.animationMaxDuration = maxDuration;
  }

  public getAnimationMaxDuration(): number {
    return this.animationMaxDuration;
  }

  public setAnimationTime(time: number): void {
    if (!this.hasAnimations()) {
      return;
    }

    const maxDuration = this.getAnimationDuration();
    const clampedTime = Math.max(0, Math.min(time, maxDuration));

    if (this.animationMaxDuration === 0) {
      this.animationMaxDuration = maxDuration;
    }

    this.animationElapsedTime = clampedTime;

    this.updateAnimationPose(clampedTime, { resetActions: false, rebuildMergedModelBVH: false });
    this.logPlaybackProgress();
    OutlineMergedModel.updateOutlineMeshes();
  }

  public rebuildBVHIfNeeded(): void {
    if (this.isMergedModel && this.mergedModel) {
      this.rebuildMergedModelBVH();
    }
  }

  public dispose(): void {
    this.stopAnimationLoop();

    this.mixers.forEach((mixer) => {
      mixer.stopAllAction();
      mixer.uncacheRoot(mixer.getRoot());
    });

    this.mixers = [];
    this.animationActions = [];
    this.animationClips = [];
    this.isPlaying = false;
    this.isMergedModel = false;
    this.animationRoot = null;
    this.mergedModel = null;
    this.currentActionIndex = 0;
    this.animationElapsedTime = 0;
    this.animationMaxDuration = 0;
  }
}
