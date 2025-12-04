import { SvgApp } from '@/svgApp/svgApp';
import { ModelWorker } from './modelWorker';
import { ModelLoader } from '@/three/model/modelLoader';

export class ModelFileLoader {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', this.handleFileInput);
  }

  handleFileInput = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf') && !file.name.endsWith('.svg')) {
      alert('Please select a GLTF (.gltf) or GLB (.glb) file.');
      return;
    }

    const progressElement = document.getElementById('progress');
    progressElement.style.display = 'block';
    progressElement.textContent = 'Loading...';

    if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
      this.readGltfFile(file, progressElement, event);
    } else if (file.name.endsWith('.svg')) {
      this.readSvgFile(file, progressElement, event);
    }
  };

  private readGltfFile(file, progressElement, event) {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressElement.textContent = `Loading: ${percent}%`;
      }
    };

    reader.onload = (e) => {
      ModelLoader.inst().handleFileLoad(e);
      progressElement.style.display = 'none';

      event.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  }

  private readSvgFile(file, progressElement, event) {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressElement.textContent = `Loading: ${percent}%`;
      }
    };

    reader.onload = (e) => {
      progressElement.style.display = 'none';

      const svgApp = new SvgApp();
      svgApp.createSvgPage(e.target.result as string);

      event.target.value = '';
    };

    reader.readAsText(file);
  }

  handleFileInput2 = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];

    const modelWorkerHandler = new ModelWorker();

    if (file) modelWorkerHandler.loadModel(file);
  };
}
