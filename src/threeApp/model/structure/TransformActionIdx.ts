import { ATransformToIDataLabel, IDataLabel, ITransform } from '@/threeApp/model/structure/IData';

// Интерфейс для входных данных
interface InputDataItem {
  name?: string;
  description?: string;
  number?: string;
  id?: string;
  fragment_guid?: string;
  children?: number[];
  nodes?: number[];
  [key: string]: unknown;
}

export class TransformActionIdx extends ATransformToIDataLabel {
  public transArr!: IDataLabel[];
  public copy!: InputDataItem[];

  constructor() {
    super();
  }
  setSrcArr(srcArr: IDataLabel[] | unknown[]) {
    this.copy = [...(srcArr as InputDataItem[])];
  }
  private getIdRef(): number {
    return Math.floor(Math.random() * 1000000); //+Date.now()
  }
  transformTo() {
    return this.copy?.map((item: InputDataItem, index: number) => {
      const obj: IDataLabel = {
        id: this.getIdRef(),
        idx: index,
        idxtfxparent: NaN,
        // label:`${index}_${item.name}`,
        label: item.name ? `${item.name}` : '',
        description: item.description ? `${item.description}` : '',
        number: item.number ? `${item.number}` : '',
        children: null,
        nodes: null,

        id_node_tf: item.id ? `${item.id}` : '',

        fragment_guid: item.fragment_guid ? `${item.fragment_guid}` : '',
      };
      // структурное логическое соответствие
      if (item.children && Array.isArray(item.children)) {
        obj.children = item.children as unknown as IDataLabel[];
      }
      // геометрическое соответствие
      if (item.nodes && Array.isArray(item.nodes)) {
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
