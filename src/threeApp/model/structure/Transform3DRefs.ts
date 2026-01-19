/**
 * ATransform3DRefs
 */

import {
  IDataLabel,
  ITransform,
  ATransTo3DRefs,
  GLTFAssociationKey,
  GLTFAssociationValue,
} from '@/threeApp/model/structure/IData';

export class Transform3DRefs extends ATransTo3DRefs {
  public transArr!: IDataLabel[];
  public copy!: IDataLabel[];
  private assMap!: Map<GLTFAssociationKey, GLTFAssociationValue>;
  constructor() {
    super();
  }
  setAssMap(ass: Map<GLTFAssociationKey, GLTFAssociationValue>): void {
    this.assMap = ass;
  }
  private getIdRef(): number {
    return Math.floor(Math.random() * 10000000);
  }
  // связь с геометрией node[ноды] записи в таблице
  transformTo(): IDataLabel[] {
    const refs = this.copy.map((modelObj) => {
      if (modelObj.nodes && modelObj.nodes.length > 0) {
        if (modelObj.nodes.length == 1) {
          const key = this.getObjfromAsLoader(modelObj.nodes[0]);
          modelObj.uuid = `${key.uuid}`;
          modelObj.ref3dId = `${key.id}`;
        }
        if (modelObj.nodes.length > 1) {
          const childrenGeometr = modelObj.nodes.map((idnode: number) => {
            const key = this.getObjfromAsLoader(idnode);
            const ch = {
              id: this.getIdRef(),
              idx: NaN,
              idxtfxparent: modelObj.idx,
              label: `Тело_${modelObj.idx}_${key.id}`,
              description: '',
              number: '',
              uuid: `${key.uuid}`,
              ref3dId: `${key.id}`,
              children: null,
              nodes: null,
            };

            return ch;
          });
          modelObj.childsGeom = childrenGeometr;
        }
      }
      return modelObj;
    });
    return refs;
  }
  getResult(): IDataLabel[] {
    return this.transArr;
  }
  execute(): ITransform {
    this.transArr = this.transformTo();
    return this;
  }
  setSrcArr(srcArr: IDataLabel[]) {
    this.copy = [...srcArr];
  }
  association(): void {
    throw new Error('Method not implemented.');
  }

  private getObjfromAsLoader(idx: number): GLTFAssociationKey {
    let obj3dref!: GLTFAssociationKey; // ссылка на обьект3Д

    this.assMap.forEach((value: GLTFAssociationValue, key: GLTFAssociationKey) => {
      if (value && 'nodes' in value && value.nodes !== undefined && typeof value.nodes !== 'undefined') {
        if (parseInt(String(value.nodes)) === idx) {
          obj3dref = key;
        }
      }
    });

    return obj3dref;
  }

  private pureAddProp(key: string | number | symbol, value: unknown, object: object) {
    return {
      ...object,
      [key]: value,
    };
  }
  private compose =
    (...fns: Array<(x: unknown) => unknown>) =>
    (x: unknown) =>
      fns.reduce((acc, fn) => fn(acc), x);
}
