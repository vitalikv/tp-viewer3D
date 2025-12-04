import { threeApp } from '@/main';

export class ModelFileLoader2 {
  progressElement;

  constructor() {
    this.progressElement = document.getElementById('progress');
    this.setupEventListeners();
  }

  setupEventListeners() {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener('change', this.handleFileInput.bind(this));
    }
  }

  handleFileInput = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'glb' && extension !== 'gltf') {
      alert('Please select a GLTF (.gltf) or GLB (.glb) file.');
      return;
    }

    this.showProgress();

    try {
      // Читаем файл как ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Отправляем прямо в рендер воркер
      threeApp.renderWorker.worker.postMessage(
        {
          type: 'loadModel',
          arrayBuffer: arrayBuffer,
          filename: file.name,
        },
        [arrayBuffer]
      ); // Важно: передаем владение ArrayBuffer
    } catch (error) {
      console.error('Error reading file:', error);
      this.hideProgress();
      alert('Error reading file');
    }

    input.value = ''; // Сброс input
  };

  private showProgress = () => {
    const text = Math.floor(Math.random() * 10001);

    if (this.progressElement) {
      this.progressElement.style.display = 'block';
      this.progressElement.textContent = text;
    }

    requestAnimationFrame(this.showProgress);
  };

  private hideProgress() {
    const progressElement = document.getElementById('progress');
    if (progressElement) {
      progressElement.style.display = 'none';
    }
  }
}
