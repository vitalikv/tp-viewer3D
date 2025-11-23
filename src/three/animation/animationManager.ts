import * as THREE from 'three';
import { threeApp } from '../threeApp';

export class AnimationManager {
  private mixers: THREE.AnimationMixer[] = [];
  private clock: THREE.Clock;
  private isPlaying: boolean = false;
  private animationActions: THREE.AnimationAction[] = [];
  private animationClips: THREE.AnimationClip[] = [];
  private animationLoopId: number | null = null;

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

    // Очищаем предыдущие анимации
    this.dispose();

    const mixer = new THREE.AnimationMixer(model);
    this.animationActions = [];
    this.animationClips = [];

    animations.forEach((clip, index) => {
      const action = mixer.clipAction(clip);
      // Включаем action (чтобы он был активен)
      action.enabled = true;
      action.setLoop(THREE.LoopOnce, 1); // Один раз
      action.clampWhenFinished = true; // Оставаться в конечной позиции
      this.animationActions.push(action);
      this.animationClips.push(clip);
      // Запускаем action, но пока не устанавливаем время
      console.log(`▶️ Инициализирована анимация: ${clip.name || `Анимация ${index + 1}`} (длительность: ${clip.duration.toFixed(2)}с)`);
    });

    this.mixers.push(mixer);
    this.isPlaying = true;

    console.log(`✅ Инициализировано ${animations.length} анимаций`);

    return true;
  }

  private play(): void {
    if (this.mixers.length === 0 || this.animationActions.length === 0) {
      console.warn('⚠️ Нет анимаций для воспроизведения');
      return;
    }

    // Запускаем все actions
    this.animationActions.forEach((action) => {
      action.play();
    });

    this.mixers.forEach((mixer) => {
      mixer.timeScale = 1.0;
    });

    this.isPlaying = true;
    console.log('▶️ Анимации запущены');
  }

  public stop(): void {
    if (this.mixers.length === 0) {
      console.warn('⚠️ Нет анимаций для остановки');
      return;
    }

    this.mixers.forEach((mixer) => {
      mixer.timeScale = 0.0;
    });

    this.isPlaying = false;
    console.log('⏸️ Анимации остановлены');
  }

  public pause(): void {
    this.stop();
  }

  public resume(): void {
    this.play();
  }

  /**
   * Сбрасывает анимации в начальное состояние
   */
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

  // Запускает и воспроизводит анимацию до её завершения
  public animation() {
    // Проверяем, есть ли анимации для воспроизведения
    if (this.mixers.length === 0 || this.animationActions.length === 0) {
      console.warn('⚠️ Нет анимаций для воспроизведения. Сначала инициализируйте анимации через initAnimations()');
      return;
    }

    // Останавливаем предыдущий цикл, если он был запущен
    if (this.animationLoopId !== null) {
      cancelAnimationFrame(this.animationLoopId);
      this.animationLoopId = null;
    }

    // Сбрасываем clock для точного отслеживания времени
    this.clock = new THREE.Clock();

    // Сбрасываем время миксеров
    this.mixers.forEach((mixer) => {
      mixer.time = 0;
      mixer.timeScale = 1.0;
    });

    // Сбрасываем и запускаем все actions явно
    this.animationActions.forEach((action, index) => {
      action.reset();
      action.play();
      // Проверяем, что action действительно запущен
      if (!action.isRunning()) {
        console.warn(`⚠️ Action ${index} не запущен после вызова play()`);
      }
    });

    this.isPlaying = true;
    console.log(`▶️ Запущено ${this.animationActions.length} анимаций, mixer time: ${this.mixers[0]?.time || 0}`);

    // Получаем максимальную длительность всех анимаций
    const maxDuration = Math.max(...this.animationClips.map((clip) => clip.duration));
    console.log(`🎬 Запуск воспроизведения анимации (длительность: ${maxDuration.toFixed(2)}с)`);

    // Переменная для отслеживания прошедшего времени
    let elapsedTime = 0;

    // Запускаем цикл анимации
    const animate = () => {
      // Получаем дельту времени и обновляем прошедшее время
      const delta = this.clock.getDelta();

      // Пропускаем слишком большие дельты (например, при смене вкладки)
      if (delta > 0.1) {
        this.animationLoopId = requestAnimationFrame(animate);
        return;
      }

      elapsedTime += delta;

      // Обновляем анимации
      if (this.isPlaying && this.mixers.length > 0) {
        this.mixers.forEach((mixer) => {
          mixer.update(delta);
        });
      }

      // Рендерим сцену
      if (threeApp.sceneManager && threeApp.sceneManager.renderer) {
        threeApp.sceneManager.render();
      }

      // Проверяем, завершилась ли анимация (сравниваем прошедшее время с максимальной длительностью)
      const isFinished = elapsedTime >= maxDuration;

      // Если анимация не завершилась и она воспроизводится, продолжаем цикл
      if (!isFinished && this.isPlaying) {
        this.animationLoopId = requestAnimationFrame(animate);
      } else {
        // Анимация завершена
        if (isFinished) {
          console.log(`✅ Анимация завершена (время: ${elapsedTime.toFixed(2)}с из ${maxDuration.toFixed(2)}с)`);
          // Останавливаем actions
          this.animationActions.forEach((action) => {
            action.stop();
          });
          this.isPlaying = false;
        }
        this.animationLoopId = null;
      }
    };

    // Запускаем цикл анимации (первый кадр)
    this.animationLoopId = requestAnimationFrame(animate);
  }

  private stopAnimationLoop(): void {
    if (this.animationLoopId !== null) {
      cancelAnimationFrame(this.animationLoopId);
      this.animationLoopId = null;
      console.log('🛑 Цикл анимации остановлен');
    }
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
    console.log('🗑️ Анимации очищены');
  }
}
