import { ContextSingleton } from '@/core/ContextSingleton';

import { ThreeApp } from '@/threeApp/threeApp';
import { SvgPages } from '@/svgApp/svgPages';
import { InitModel } from '@/threeApp/model/initModel';
import { UiFileMenu } from './uiFileMenu';
import { UiLoadTimeDiv } from './uiLoadTimeDiv';
import { OffscreenCanvasManager } from '@/threeApp/worker/offscreenCanvasManager';

export class UiFileLoader extends ContextSingleton<UiFileLoader> {
  private container: HTMLElement;
  private div: HTMLDivElement;
  private fileInput: HTMLInputElement;

  public init(container: HTMLDivElement) {
    this.container = container;
    this.div = this.crDiv();
    this.container.append(this.div);
    this.eventStop({ div: this.div });

    this.initEvent();
  }

  private crDiv() {
    let div = document.createElement('div');
    div.innerHTML = this.html();
    div = div.children[0] as HTMLDivElement;

    return div;
  }

  private html() {
    const css1 = `
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 100;
    background: white;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);`;

    const css2 = `
    position: absolute;
    top: 70px;
    left: 20px;
    z-index: 100;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 5px;
    display: none;`;

    const html = `
    <div>
        <input type="file" id="file-input" style="${css1}" accept=".gltf,.glb,.svg" />
        <div id="progress" style="${css2}"></div>
    </div>`;

    return html;
  }

  private eventStop({ div }) {
    const arrEvent = ['onmousedown', 'onwheel', 'onmousewheel', 'onmousemove', 'ontouchstart', 'ontouchend', 'ontouchmove'];

    arrEvent.forEach((events) => {
      div[events] = (e) => {
        e.stopPropagation();
      };
    });
  }

  private initEvent() {
    this.fileInput = this.container.querySelector('#file-input') as HTMLInputElement;
    this.fileInput.addEventListener('change', this.handleFileInput);
  }

  private handleFileInput = (event) => {
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

  private readGltfFile = (file, progressElement, event) => {
    // Запускаем таймер загрузки
    UiLoadTimeDiv.inst().startTimer();

    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      const isInMainThread = typeof window !== 'undefined' && self === window;
      console.log('[MAIN THREAD] Отправка файла в воркер:', file.name, 'Размер:', file.size, 'В основном потоке:', isInMainThread);

      // Используем воркер для загрузки модели
      OffscreenCanvasManager.inst().loadModel(file, {
        onProgress: (text) => {
          if (text) {
            progressElement.style.display = 'block';
            progressElement.textContent = text;
          } else {
            progressElement.style.display = 'none';
          }
        },
        onLoaded: (filename) => {
          progressElement.style.display = 'none';
          UiLoadTimeDiv.inst().stopTimer();
          UiFileMenu.inst().addItem(filename, 'gltf', undefined);
          SvgPages.inst().hideContainerSvg();
          event.target.value = '';
        },
        onError: (error) => {
          progressElement.style.display = 'none';
          UiLoadTimeDiv.inst().stopTimer();
          alert(`Ошибка загрузки модели: ${error}`);
          event.target.value = '';
        },
      });
    } else {
      // Используем старый способ загрузки
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressElement.textContent = `Loading: ${percent}%`;
        }
      };

      reader.onload = async (e) => {
        progressElement.style.display = 'none';
        UiLoadTimeDiv.inst().stopTimer();

        const result = await InitModel.inst().handleFileLoad(e.target.result);
        if (result) {
          UiFileMenu.inst().addItem(`${file.name}`, 'gltf', undefined);
          SvgPages.inst().hideContainerSvg();
        }

        event.target.value = '';
      };

      reader.onerror = () => {
        UiLoadTimeDiv.inst().stopTimer();
      };

      reader.readAsArrayBuffer(file);
    }
  };

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

      SvgPages.inst().showContainerSvg();
      const index = SvgPages.inst().addSvgPage(e.target.result as string);
      UiFileMenu.inst().addItem(`${file.name}`, 'svg', index);

      event.target.value = '';
    };

    reader.readAsText(file);
  }
}
