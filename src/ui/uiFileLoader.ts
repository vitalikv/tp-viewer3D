import { SvgApp } from '@/svgApp/svgApp';
import { ModelLoader } from '@/threeApp/model/modelLoader';
import { ContextSingleton } from '@/threeApp/core/ContextSingleton';

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

  private readGltfFile(file, progressElement, event) {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressElement.textContent = `Loading: ${percent}%`;
      }
    };

    reader.onload = (e) => {
      progressElement.style.display = 'none';
      ModelLoader.inst().handleFileLoad(e);
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
}
