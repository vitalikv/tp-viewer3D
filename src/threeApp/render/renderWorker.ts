import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';
import { VirtualControls } from './controlsWorker';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

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
  private camera!: THREE.PerspectiveCamera;
  private controls!: VirtualControls;
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

    // Опционально: настройка DRACO декодера для сжатых моделей
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
        }
        break;
      case 'loadModel':
        if (this.scene) {
          this.loadModel(msg.arrayBuffer, msg.filename);
        }
        break;
    }
  }

  private init(canvas: OffscreenCanvas, container) {
    console.log('Worker initialized');

    this.container = container;
    const width = this.container.width;
    const height = this.container.height;
    this.dpr = this.container.dpr;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(width, height, false);

    // Создаем простую сцену
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Создаем камеру
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.01, 1000);
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // Добавляем свет
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Добавляем сетку для визуализации
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);

    // Controls
    this.controls = new VirtualControls(this.camera, { width, height }, this.scene);
    (this.controls as ArcballControls).enableAnimations = false;

    this.controls.addEventListener('change', () => {
      // Обновление будет в render loop
    });

    // Start render loop
    this.animate();
  }

  private async loadModel(arrayBuffer: ArrayBuffer, filename: string) {
    try {
      this.sendProgress('Loading model...');

      // Создаем Blob и URL для загрузки
      const blob = new Blob([arrayBuffer]);
      const url = URL.createObjectURL(blob);

      // Загружаем модель
      const gltf = await this.loadGLTF(url);

      // Обрабатываем загруженную модель
      this.processModel(gltf);

      URL.revokeObjectURL(url);
      this.sendProgress(null); // Скрываем прогресс

      // Сообщаем об успешной загрузке
      self.postMessage({ type: 'modelLoaded', filename });
    } catch (error) {
      console.error('Error loading model:', error);
      this.sendProgress(null);
      self.postMessage({ type: 'modelError', error: error.message });
    }
  }

  private loadGLTF(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf),
        (progress) => {
          if (progress.lengthComputable) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            this.sendProgress(`Loading: ${percent}%`);
          }
        },
        (error) => reject(error)
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
