import { ATransToTree, IDataLabel, ITransform } from '@/threeApp/model/structure/IData';

export class TransToTree extends ATransToTree {
  public transArr!: IDataLabel[];
  public copy!: any[];
  private arrTransform: any[] = [];

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

  setSrcArr(srcArr: any[]) {
    this.copy = [...srcArr];
  }

  toTree(arr: any[]) {
    for (const label of arr) {
      if ('children' in label && label.children !== null && label.children.length > 0) {
        const childObjs = label.children.reduce((acc: any[], idx: number) => {
          if (typeof idx === 'number') {
            const obj = this.copy[idx];

            if (obj) {
              obj.idxtfxparent = label.idx;
              acc.push(obj);
            }
          }
          return acc;
        }, []);

        if (childObjs.length > 0) label.children = childObjs;
        //----- start sub(label.children) ---
        for (const lab of label.children) {
          if ('children' in lab && lab.children !== null && lab.children.length > 0) {
            const childObjs = lab.children.reduce((acc: any[], idx: number) => {
              if (typeof idx === 'number') {
                const obj = this.copy[idx];

                if (obj) {
                  obj.idxtfxparent = lab.idx;
                  acc.push(obj);
                }
              }
              return acc;
            }, []);
            lab.children = childObjs;
          }
        }

        this.arrTransform.push(label);
      } else {
        this.arrTransform.push(label);
      }
    }
  }
}
