import { ContextSingleton } from '@/core/ContextSingleton';
import { SvgPages } from '@/svgApp/SvgPages';

export class UiFileMenu extends ContextSingleton<UiFileMenu> {
  private divMenu: HTMLDivElement;

  public init(container: HTMLDivElement) {
    this.divMenu = this.crDiv();
    container.append(this.divMenu);

    this.eventStop({ div: this.divMenu });
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
    left: 300px; 
    top: 10px; 
    min-width: 150px; 
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color:rgb(133, 133, 133);
    background: #fff; 
    border: 1px solid #222222; 
    cursor: pointer;
    z-index: 3;`;

    const html = `<div style="${css1}"></div>`;

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

  public addItem(item: string, type: string, index: number | undefined) {
    const divItem = document.createElement('div');
    divItem.innerHTML = item;
    divItem.setAttribute('nameId', 'item');
    divItem.style.margin = '5px';
    this.divMenu.append(divItem);

    divItem.onmousedown = () => {
      if (type === 'gltf') {
        SvgPages.inst().hideContainerSvg();
      } else if (type === 'svg') {
        SvgPages.inst().showContainerSvg();
        SvgPages.inst().showPage(index || 0);
      }
    };
  }
}
