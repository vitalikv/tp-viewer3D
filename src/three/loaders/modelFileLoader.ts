import { threeApp } from '../threeApp';
import { ModelWorker } from './modelWorker';

export class ModelFileLoader {
  mixer = null;
  currentAnimations = [];

  constructor() {
    this.mixer = null;
    this.currentAnimations = [];

    this.setupEventListeners();
  }

  setupEventListeners() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', this.handleFileInput);

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

  handleFileInput = (event) => {
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
      threeApp.modelLoader.handleFileLoad(e);
      progressElement.style.display = 'none';

      event.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  };

  handleFileInput2 = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];

    const modelWorkerHandler = new ModelWorker();

    if (file) modelWorkerHandler.loadModel(file);
  };
}
