import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';
import { VirtualControls } from './controlsWorker';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import { SceneManager } from '@/threeApp/scene/sceneManager';

// Полифилл для requestAnimationFrame в воркере
if (typeof self.requestAnimationFrame === 'undefined') {
  let lastTime = 0;
  self.requestAnimationFrame = function (callback: FrameRequestCallback) {
    const currentTime = performance.now();
    const timeToCall = Math.max(0, 16 - (currentTime - lastTime));
    const id = self.setTimeout(() => {
      callback(currentTime + timeToCall);
    }, timeToCall);
    lastTime = currentTime + timeToCall;
    return id;
  };

  self.cancelAnimationFrame = function (id: number) {
    self.clearTimeout(id);
  };
}

// Расширяем тип сообщений
type WorkerMessage = { type: 'init'; canvas: OffscreenCanvas; container: any } | { type: 'resize'; width: number; height: number; dpr?: number } | { type: 'event'; event: any } | { type: 'loadModel'; arrayBuffer: ArrayBuffer; filename: string };

class RenderWorker {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private controls!: VirtualControls | ArcballControls;
  private container;
  private dpr = 1;
  private loader!: GLTFLoader;
  private mixers: THREE.AnimationMixer[] = [];

  constructor() {
    this.setupLoader();
    self.onmessage = (e: MessageEvent<WorkerMessage>) => this.handleMessage(e.data);
  }

  private setupLoader() {
    this.loader = new GLTFLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    this.loader.setDRACOLoader(dracoLoader);
  }

  private handleMessage(msg: WorkerMessage) {
    switch (msg.type) {
      case 'init':
        this.init(msg.canvas, msg.container);
        break;
      case 'resize':
        if (this.renderer && this.camera) {
          this.resize(msg.width, msg.height, msg.dpr ?? this.dpr);
        }
        break;
      case 'event':
        if (this.controls) {
          this.controls.dispatchEvent(msg.event);
          SceneManager.inst().render();
        }
        break;
      case 'loadModel':
        if (this.scene) {
          this.loadModel(msg.arrayBuffer, msg.filename);
        }
        break;
    }
  }

  private async init(canvas: OffscreenCanvas, container) {
    console.log('Worker initialized');

    this.container = container;
    const width = this.container.width;
    const height = this.container.height;
    this.dpr = this.container.dpr;

    // Renderer
    // this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    // this.renderer.setPixelRatio(this.dpr);
    // this.renderer.setSize(width, height, false);

    // Создаем простую сцену
    // this.scene = new THREE.Scene();
    // this.scene.background = new THREE.Color(0xffffff);

    // Создаем камеру
    // const aspect = width / height;
    // this.camera = new THREE.PerspectiveCamera(75, aspect, 0.01, 1000);
    // this.camera.position.set(5, 5, 5);
    // this.camera.lookAt(0, 0, 0);

    // Добавляем свет
    // const ambientLight = new THREE.AmbientLight(0x404040);
    // this.scene.add(ambientLight);

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    // directionalLight.position.set(1, 1, 1);
    // this.scene.add(directionalLight);

    // // Добавляем сетку для визуализации
    // const gridHelper = new THREE.GridHelper(10, 10);
    // this.scene.add(gridHelper);

    // Start render loop
    //this.animate();

    await SceneManager.inst().initWorker({ canvas, container: { width, height, dpr: this.dpr } });
    this.scene = SceneManager.inst().scene;
    this.renderer = SceneManager.inst().renderer;
    this.camera = SceneManager.inst().camera;
    this.controls = SceneManager.inst().controls;
  }

  private async loadModel(arrayBuffer: ArrayBuffer, filename: string) {
    try {
      // Проверка, что мы в воркере
      const isInWorker = typeof window === 'undefined' || self !== window;
      console.log('[WORKER] Загрузка модели начата в воркере:', isInWorker, 'Thread:', self.constructor.name);

      this.sendProgress('Loading model...');

      // Используем parse() вместо load() для работы напрямую с ArrayBuffer в воркере
      const gltf = await this.parseGLTF(arrayBuffer, filename);

      // Обрабатываем загруженную модель
      this.processModel(gltf);

      this.sendProgress(null);
      console.log('[WORKER] Модель успешно загружена в воркере');

      // Сообщаем об успешной загрузке
      self.postMessage({ type: 'modelLoaded', filename });
    } catch (error) {
      console.error('[WORKER] Ошибка загрузки модели:', error);
      this.sendProgress(null);
      self.postMessage({ type: 'modelError', error: error.message });
    }
  }

  private parseGLTF(arrayBuffer: ArrayBuffer, filename: string): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`[WORKER] Начинаем парсинг GLTF модели: ${filename}, размер: ${arrayBuffer.byteLength} байт`);

      // Используем parse() для работы с ArrayBuffer напрямую в воркере
      // parse(data, path, onLoad, onError)
      this.loader.parse(
        arrayBuffer,
        '', // baseURL не нужен, так как мы работаем с ArrayBuffer
        (gltf) => {
          console.log('[WORKER] GLTF модель распарсена в воркере, объектов:', gltf.scene.children.length);
          resolve(gltf);
        },
        (error) => {
          console.error('[WORKER] Ошибка парсинга GLTF:', error);
          reject(error);
        }
      );
    });
  }

  private processModel(gltf: any) {
    const model = gltf.scene;

    // Добавляем модель в сцену
    this.scene.add(model);

    // Настройка анимаций
    if (gltf.animations && gltf.animations.length > 0) {
      this.setupAnimations(gltf.animations, model);
    }

    // Центрирование модели
    this.centerModel(model);

    console.log('Model loaded successfully in worker:', model);
  }

  private setupAnimations(animations: THREE.AnimationClip[], model: THREE.Group) {
    const mixer = new THREE.AnimationMixer(model);

    animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.play();
    });

    // Сохраняем mixer для обновления в animation loop
    this.mixers.push(mixer);
  }

  private centerModel(model: THREE.Group) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -center.z;

    // Масштабирование если модель слишком большая
    const maxSize = Math.max(size.x, size.y, size.z);
    if (maxSize > 10) {
      const scale = 10 / maxSize;
      model.scale.setScalar(scale);
    }
  }

  private sendProgress(text: string | null) {
    self.postMessage({ type: 'progress', data: text });
  }

  private resize(width, height, dpr) {
    if (dpr !== undefined) {
      this.dpr = dpr;
      this.renderer.setPixelRatio(this.dpr);
    }

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }

    this.controls.setSize(width, height);
  }

  private animate = () => {
    // Обновляем анимации
    const deltaTime = 0.016; // Примерное значение для 60 FPS
    this.mixers.forEach((mixer) => mixer.update(deltaTime));

    this.controls?.update();
    this.renderer?.render(this.scene, this.camera);
    self.requestAnimationFrame(this.animate);
  };
}

new RenderWorker();
