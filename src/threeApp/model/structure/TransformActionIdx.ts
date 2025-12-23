import { ATransformToIDataLabel, IDataLabel, ITransform } from '@/threeApp/model/structure/IData';

export class TransformActionIdx extends ATransformToIDataLabel {
  public transArr!: IDataLabel[];
  public copy!: any[];

  constructor() {
    super();
  }
  setSrcArr(srcArr: any[]) {
    this.copy = [...srcArr];
  }
  private getIdRef(): number {
    return Math.floor(Math.random() * 1000000); //+Date.now()
  }
  transformTo() {
    return this.copy?.map((item: any, index: number) => {
      const obj: IDataLabel = {
        id: this.getIdRef(),
        idx: index,
        idxtfxparent: NaN,
        // label:`${index}_${item.name}`,
        label: `${item.name}`,
        description: `${item.description}`,
        number: `${item.number}`,
        children: null,
        nodes: null,

        id_node_tf: 'id' in item ? item.id : '',

        fragment_guid: 'fragment_guid' in item ? `${item.fragment_guid}` : '',
      };
      // структурное логическое соответствие
      //@ts-ignore
      if (item.children) {
        obj.children = item.children;
      }
      // геометрическое соответствие
      //@ts-ignore
      if (item.nodes) {
        obj.nodes = item.nodes;
      }

      return obj;
    });
  }
  execute(): ITransform {
    this.transArr = this.transformTo();
    return this;
  }
  getResult(): IDataLabel[] {
    return this.transArr;
  }
}
