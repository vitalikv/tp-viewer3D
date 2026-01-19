import { ATransToTree, IDataLabel, ITransform } from '@/threeApp/model/structure/IData';

export class TransToTree extends ATransToTree {
  public transArr!: IDataLabel[];
  public copy!: IDataLabel[];
  private arrTransform: IDataLabel[] = [];

  constructor() {
    super();
  }

  transformTo() {
    const copy = [...this.copy];
    this.toTree(copy);
    return this.arrTransform;
  }

  getResult(): IDataLabel[] {
    return this.transArr;
  }

  execute(): ITransform {
    this.transArr = this.transformTo();
    return this;
  }

  setSrcArr(srcArr: IDataLabel[] | unknown[]) {
    this.copy = [...(srcArr as IDataLabel[])];
  }

  toTree(arr: IDataLabel[]) {
    for (const label of arr) {
      if (
        'children' in label &&
        label.children !== null &&
        Array.isArray(label.children) &&
        label.children.length > 0
      ) {
        // Проверяем, является ли children массивом чисел (индексов) или уже массивом объектов
        const firstChild = label.children[0];
        const isNumberArray = typeof firstChild === 'number';

        let childObjs: IDataLabel[] = [];
        if (isNumberArray) {
          childObjs = (label.children as number[]).reduce((acc: IDataLabel[], childIdx: number) => {
            const obj = this.copy[childIdx];
            if (obj) {
              obj.idxtfxparent = label.idx;
              acc.push(obj);
            }
            return acc;
          }, []);
        } else {
          childObjs = label.children as IDataLabel[];
        }

        if (childObjs.length > 0) {
          label.children = childObjs;
          //----- start sub(label.children) ---
          for (const lab of childObjs) {
            if ('children' in lab && lab.children !== null && Array.isArray(lab.children) && lab.children.length > 0) {
              const firstSubChild = lab.children[0];
              const isSubNumberArray = typeof firstSubChild === 'number';

              let subChildObjs: IDataLabel[] = [];
              if (isSubNumberArray) {
                subChildObjs = (lab.children as number[]).reduce((acc: IDataLabel[], childIdx: number) => {
                  const obj = this.copy[childIdx];
                  if (obj) {
                    obj.idxtfxparent = lab.idx;
                    acc.push(obj);
                  }
                  return acc;
                }, []);
              } else {
                subChildObjs = lab.children as IDataLabel[];
              }
              lab.children = subChildObjs.length > 0 ? subChildObjs : null;
            }
          }
        } else {
          label.children = null;
        }

        this.arrTransform.push(label);
      } else {
        this.arrTransform.push(label);
      }
    }
  }
}
