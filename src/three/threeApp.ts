import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Stats from 'stats.js';

export class ThreeApp {
  stats = null;
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
  loader = null;
  mixer = null;
  currentAnimations = [];

  constructor() {
    this.stats = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.loader = null;
    this.mixer = null;
    this.currentAnimations = [];

    this.initStats();
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLights();
    this.initHelpers();
    this.setupLoaders();
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  initStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.getElementById('stats').appendChild(this.stats.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdddddd);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(5, 5, 5);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.getElementById('container').appendChild(this.renderer.domElement);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  initHelpers() {
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);
  }

  setupLoaders() {
    this.loader = new GLTFLoader();

    // Настройка Draco Loader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('three/examples/jsm/libs/draco/');
    this.loader.setDRACOLoader(dracoLoader);
  }

  setupEventListeners() {
    window.addEventListener('resize', this.handleWindowResize.bind(this));

    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', this.handleFileInput.bind(this));

    // Элементы управления анимацией
    document.getElementById('play-btn').addEventListener('click', () => {
      if (this.mixer) {
        const speedControl = document.getElementById('speed-control') as HTMLInputElement;
        this.mixer.timeScale = speedControl.value;
      }
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
      if (this.mixer) this.mixer.timeScale = 0;
    });

    document.getElementById('speed-control').addEventListener('input', (e) => {
      if (this.mixer) this.mixer.timeScale = (e.target as HTMLInputElement).value;
    });
  }

  handleWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  handleFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
      alert('Please select a GLTF (.gltf) or GLB (.glb) file.');
      return;
    }

    const progressElement = document.getElementById('progress');
    progressElement.style.display = 'block';
    progressElement.textContent = 'Loading...';

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressElement.textContent = `Loading: ${percent}%`;
      }
    };

    reader.onload = (e) => {
      this.handleFileLoad(e);
      progressElement.style.display = 'none';
    };

    reader.readAsArrayBuffer(file);
  }

  handleFileLoad(e) {
    const contents = e.target.result;
    this.clearScene();

    this.loader.parse(
      contents,
      '',
      (gltf) => {
        const model = gltf.scene;

        // Проверяем наличие анимаций
        const hasAnimations = gltf.animations && gltf.animations.length > 0;

        if (hasAnimations) {
          // Для анимированных моделей не применяем мерж
          this.scene.add(model);
          this.setupAnimations(gltf.animations);
          document.getElementById('animation-controls').style.display = 'block';
        } else {
          // Для статических моделей применяем оптимизацию
          this.processModelWithMerge(model);
          document.getElementById('animation-controls').style.display = 'none';
        }

        // Центрируем модель
        this.centerModel(model);

        this.renderer.render(this.scene, this.camera);
        console.log(this.renderer.info.programs);
        console.log(this.renderer.info.render);
        console.log(this.renderer.info.memory);
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
        alert('Error loading model. Please check console for details.');
      }
    );
  }

  clearScene() {
    // Удаляем все меши, кроме помощников
    this.scene.traverse((child) => {
      if (child.isMesh && !(child instanceof THREE.GridHelper)) {
        this.scene.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Очищаем анимации
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
  }

  processModelWithMerge(model) {
    this.centerModel(model);
    const mergedMeshes = this.mergeGeometriesWithMaterials(model);
    this.disposeHierarchy(model);

    const mergedGroup = new THREE.Group();
    mergedMeshes.forEach((mesh) => mergedGroup.add(mesh));
    this.scene.add(mergedGroup);
  }

  centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Настраиваем камеру под размер модели
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    this.camera.position.z = maxDim * 1.5;
    this.controls.target.copy(center);
    this.controls.update();
  }

  disposeHierarchy(node) {
    if (node.isMesh) {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose());
        } else {
          node.material.dispose();
        }
      }
    }
    node.children.forEach((child) => this.disposeHierarchy(child));
  }

  mergeGeometriesWithMaterials(scene) {
    const meshEntries = [];

    // Собираем все меши с мировыми матрицами
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.updateWorldMatrix(true, false);
        meshEntries.push({
          mesh: child,
          worldMatrix: child.matrixWorld.clone(),
        });
      }
    });

    // Группируем по материалам
    const materialGroups = new Map();

    meshEntries.forEach(({ mesh, worldMatrix }) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material, idx) => {
        const key = material.uuid || `mat_${idx}`;

        if (!materialGroups.has(key)) {
          materialGroups.set(key, {
            material: material,
            geometries: [],
          });
        }

        const geometry = this.prepareGeometry(mesh.geometry, worldMatrix);
        materialGroups.get(key).geometries.push(geometry);
      });
    });

    // Объединяем геометрии
    const mergedMeshes = [];

    materialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, false);

      if (mergedGeometry) {
        mergedMeshes.push(new THREE.Mesh(mergedGeometry, group.material));
      }
    });

    return mergedMeshes;
  }

  prepareGeometry(geometry, matrix) {
    const clonedGeo = geometry.clone();
    clonedGeo.applyMatrix4(matrix);

    if (clonedGeo.index) {
      clonedGeo.toNonIndexed();
    }

    return clonedGeo;
  }

  setupAnimations(animations) {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }

    this.mixer = new THREE.AnimationMixer(this.scene);
    this.currentAnimations = [];

    animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      action.play();
      this.currentAnimations.push(action);
    });

    // Устанавливаем нормальную скорость
    if (this.mixer) {
      const speedControl = document.getElementById('speed-control') as HTMLInputElement;
      this.mixer.timeScale = speedControl.value;
    }
  }

  startAnimationLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.stats.begin();

      // Обновляем анимации
      if (this.mixer) {
        this.mixer.update(0.016); // 60 FPS
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      this.stats.end();
    };

    animate();
  }
}
