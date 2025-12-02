import * as THREE from 'three';
import { threeApp } from '../threeApp';
import { ApiThreeToUi } from '../../api/apiLocal/apiThreeToUi';
import { MergeAnimation } from '../mergedModel/mergeAnimation';
import { OutlineSelection } from '../mergedModel/outlineSelection';

export class AnimationManager {
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
    this.clock = new THREE.Clock();
  }

  /**
   * Инициализирует анимации из GLTF модели
   * @param animations - массив анимационных клипов из GLTF
   * @param model - модель (группа или сцена), к которой применяются анимации
   * @returns true, если анимации были успешно инициализированы
   */
  public initAnimations(animations: THREE.AnimationClip[], model: THREE.Object3D): boolean {
    if (!animations || animations.length === 0) {
      console.log('ℹ️ Нет анимаций для инициализации');
      return false;
    }
    console.log('animations.length', animations);
    ApiThreeToUi.updatePlayerMenu(animations);

    // Очищаем предыдущие анимации
    this.dispose();

    // Проверяем, есть ли виртуальная иерархия для анимации (смерженная модель)
    const animationRoot = (model as any).userData?.animationRoot;
    if (animationRoot) {
      this.isMergedModel = true;
      this.animationRoot = animationRoot;
      this.mergedModel = model;
      console.log('🎬 Обнаружена смерженная модель, используем виртуальную иерархию для анимации');

      // Используем виртуальную иерархию для анимации
      const mixer = new THREE.AnimationMixer(animationRoot);
      this.animationActions = [];
      this.animationClips = [];

      animations.forEach((clip, index) => {
        const action = mixer.clipAction(clip);
        action.enabled = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        this.animationActions.push(action);
        this.animationClips.push(clip);
        console.log(`▶️ Инициализирована анимация: ${clip.name || `Анимация ${index + 1}`} (длительность: ${clip.duration.toFixed(2)}с)`);
      });

      this.mixers.push(mixer);
    } else {
      // Обычная модель без мержа
      this.isMergedModel = false;
      const mixer = new THREE.AnimationMixer(model);
      this.animationActions = [];
      this.animationClips = [];

      animations.forEach((clip, index) => {
        const action = mixer.clipAction(clip);
        action.enabled = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        this.animationActions.push(action);
        this.animationClips.push(clip);
        console.log(`▶️ Инициализирована анимация: ${clip.name || `Анимация ${index + 1}`} (длительность: ${clip.duration.toFixed(2)}с)`);
      });

      this.mergedModel = null;
      this.mixers.push(mixer);
    }

    this.setAnimationIndex(0);
    this.isPlaying = false;
    console.log(`✅ Инициализировано ${animations.length} анимаций`);

    return true;
  }

  public setAnimationIndex(index: number): void {
    if (this.mixers.length === 0 || this.animationActions.length === 0) {
      console.warn('⚠️ Нет анимаций для установки индекса');
      return;
    }

    if (index < 0 || index >= this.animationActions.length) {
      console.warn(`⚠️ Индекс анимации ${index} выходит за пределы доступных анимаций`);
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

    const clip = this.animationClips[index];
    console.log(`ℹ️ Активная анимация: ${clip?.name || `Анимация ${index + 1}`}`);

    this.animationElapsedTime = 0;
    this.animationMaxDuration = 0;
  }

  public pause(): void {
    if (this.mixers.length === 0) {
      console.warn('⚠️ Нет анимаций для остановки');
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
    console.log('⏸️ Анимации остановлены');
  }

  public reset(): void {
    if (this.mixers.length === 0) {
      console.warn('⚠️ Нет анимаций для сброса');
      return;
    }

    // Сбрасываем время всех миксеров
    this.mixers.forEach((mixer) => {
      mixer.time = 0;
    });

    // Сбрасываем все actions в начало
    this.animationActions.forEach((action) => {
      action.reset();
    });

    console.log('⏮️ Анимации сброшены в начало');
  }

  /**
   * Устанавливает скорость воспроизведения анимаций
   * @param speed - скорость (1.0 = нормальная, 2.0 = в 2 раза быстрее, 0.5 = в 2 раза медленнее)
   */
  public setSpeed(speed: number): void {
    if (this.mixers.length === 0) {
      console.warn('⚠️ Нет анимаций для изменения скорости');
      return;
    }

    this.mixers.forEach((mixer) => {
      mixer.timeScale = speed;
    });

    console.log(`⚡ Скорость анимаций установлена: ${speed}x`);
  }

  private getAnimationDuration(): number {
    if (this.animationClips.length === 0) {
      return 0;
    }

    return Math.max(...this.animationClips.map((clip) => clip.duration));
  }

  private updateAnimationPose(time: number, options?: { rebuildMergedModelBVH?: boolean; resetActions?: boolean }): void {
    if (this.mixers.length === 0 || this.animationActions.length === 0) {
      console.warn('⚠️ Нет анимаций для установки позиции');
      return;
    }

    this.stopAnimationLoop();
    this.isPlaying = false;

    const clampedTime = Math.max(0, time);
    const shouldResetActions = options?.resetActions ?? clampedTime === 0;
    const selectedAction = this.animationActions[this.currentActionIndex];

    if (!selectedAction) {
      console.warn('⚠️ Текущая анимация не найдена');
      return;
    }

    this.animationActions.forEach((action, actionIndex) => {
      if (actionIndex !== this.currentActionIndex) {
        action.stop();
        action.reset();
      }
    });

    if (shouldResetActions) {
      selectedAction.reset();
    }

    selectedAction.paused = false;
    selectedAction.play();
    selectedAction.paused = false;

    this.mixers.forEach((mixer) => {
      mixer.timeScale = 1.0;

      const deltaTime = clampedTime - mixer.time;
      if (deltaTime > 0) {
        mixer.update(deltaTime);
      } else {
        mixer.setTime(clampedTime);
      }

      mixer.timeScale = 0.0;
    });

    selectedAction.paused = true;

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
    if (threeApp.sceneManager && threeApp.sceneManager.renderer) {
      threeApp.sceneManager.render();
    }
  }

  public setAnimationPosStart(): void {
    this.updateAnimationPose(0);
    OutlineSelection.updateOutlineMeshes();
  }

  public setAnimationPosEnd(): void {
    const endTime = this.getAnimationDuration();
    const rebuild = endTime > 0;
    this.updateAnimationPose(endTime, { rebuildMergedModelBVH: rebuild, resetActions: false });
    OutlineSelection.updateOutlineMeshes();
  }

  // Запускает и воспроизводит анимацию до её завершения
  public play() {
    if (this.mixers.length === 0 || this.animationActions.length === 0) {
      console.warn('⚠️ Нет анимаций для воспроизведения. Сначала инициализируйте анимации через initAnimations()');
      return;
    }

    this.logPlaybackProgress();

    if (this.animationLoopId !== null) {
      cancelAnimationFrame(this.animationLoopId);
      this.animationLoopId = null;
    }

    const selectedAction = this.animationActions[this.currentActionIndex];
    if (!selectedAction) {
      console.warn('⚠️ Текущая анимация не найдена');
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

    console.log(`🎬 Запуск воспроизведения: ${animationLabel} (длительность: ${maxDuration.toFixed(2)}с)`);

    // Сбрасываем clock для точного отслеживания времени
    this.clock = new THREE.Clock();

    // Сбрасываем время миксеров
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
      console.warn(`⚠️ Action ${this.currentActionIndex} не запущен после вызова play()`);
    }

    this.isPlaying = true;
    console.log(`▶️ Запущена анимация: ${animationLabel}, mixer time: ${this.mixers[0]?.time || 0}`);

    const animate = () => {
      // Получаем дельту времени и обновляем прошедшее время
      const delta = this.clock.getDelta();

      // Пропускаем слишком большие дельты (например, при смене вкладки)
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

        // Обновляем outline меши после обновления анимации
        OutlineSelection.updateOutlineMeshes();
      }

      // Рендерим сцену
      this.renderScene();

      // Проверяем, завершилась ли анимация (сравниваем прошедшее время с максимальной длительностью)
      const isFinished = this.animationElapsedTime >= this.animationMaxDuration;

      // Если анимация не завершилась и она воспроизводится, продолжаем цикл
      if (!isFinished && this.isPlaying) {
        this.animationLoopId = requestAnimationFrame(animate);
      } else {
        if (isFinished) {
          console.log(`✅ Анимация завершена (время: ${this.animationElapsedTime.toFixed(2)}с из ${this.animationMaxDuration.toFixed(2)}с)`);
          this.isPlaying = false;
          if (this.isMergedModel) {
            this.rebuildMergedModelBVH();
          }
          this.animationElapsedTime = 0;

          ApiThreeToUi.updatePlayerBtnPlay(false);
        }
        this.animationLoopId = null;
      }

      this.logPlaybackProgress();
    };

    // Запускаем цикл анимации (первый кадр)
    this.animationLoopId = requestAnimationFrame(animate);
  }

  public logPlaybackProgress(): void {
    if (this.animationClips.length === 0 || this.animationMaxDuration === 0) {
      console.log('ℹ️ Анимация не запущена или не инициализирована (0% / 0.00с)');
      return;
    }

    const currentTime = Math.min(this.animationElapsedTime, this.animationMaxDuration);
    const percent = Math.min(100, (currentTime / this.animationMaxDuration) * 100);
    console.log(`ℹ️ Анимация ${percent.toFixed(1)}% (${currentTime.toFixed(2)}с из ${this.animationMaxDuration.toFixed(2)}с)`);
    ApiThreeToUi.updatePlayerTime(currentTime, this.animationMaxDuration);
    ApiThreeToUi.updatePlayerCaret(percent, this.isPlaying);
  }

  private stopAnimationLoop(): void {
    if (this.animationLoopId !== null) {
      cancelAnimationFrame(this.animationLoopId);
      this.animationLoopId = null;
      console.log('🛑 Цикл анимации остановлен');
      this.rebuildMergedModelBVH();
    }
  }

  /**
   * Применяет трансформации из виртуальной иерархии к группам в смерженной геометрии
   */
  private applyAnimationsToMergedGeometry(): void {
    if (!this.animationRoot) return;

    // Обновляем мировые матрицы всех узлов
    this.animationRoot.updateMatrixWorld(true);

    const tempMatrix = new THREE.Matrix4();
    const uuidToGroupMap = MergeAnimation.getUuidToGroupMap();

    // Обходим все узлы в виртуальной иерархии и применяем трансформации
    this.animationRoot.traverse((node) => {
      const uuid = node.uuid;

      // Применяем трансформации только к узлам, которые имеют маппинг (т.е. являются мешами)
      // Трансформации групп уже учтены в мировых матрицах их детей через иерархию
      if (!uuidToGroupMap.has(uuid)) {
        return; // Пропускаем узлы без маппинга (группы, которые не были мешами)
      }

      // Если есть маппинг, значит узел был мешем, и originalMatrixWorld должен быть сохранен
      const originalMatrixWorld = (node.userData as any)?.originalMatrixWorld;

      if (!originalMatrixWorld) {
        console.warn(`⚠️ Узел ${uuid} имеет маппинг, но нет originalMatrixWorld`);
        return;
      }

      // Вычисляем относительную трансформацию: новая мировая матрица * обратная исходная
      // Мировая матрица меша уже учитывает трансформации всех родительских групп
      tempMatrix.copy(node.matrixWorld);
      tempMatrix.multiplyMatrices(tempMatrix, originalMatrixWorld.clone().invert());

      // Применяем относительную трансформацию к группе в смерженной геометрии
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

  /**
   * Очищает все анимации и освобождает ресурсы
   */
  public dispose(): void {
    // Останавливаем цикл анимации
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
    console.log('🗑️ Анимации очищены');
  }
}
