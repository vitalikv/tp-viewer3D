import {
  IDataLabel,
  ATransformToIDataLabel,
  ATransTo3DRefs,
  ATransToTree,
  GLTFAssociationKey,
  GLTFAssociationValue,
} from '@/threeApp/model/structure/IData';

// Интерфейс для GLTF parser
interface GLTFParser {
  json: {
    extras?: {
      tflex?: {
        structure?: unknown;
      };
    };
    [key: string]: unknown;
  };
  associations: Map<GLTFAssociationKey, GLTFAssociationValue>;
}

// Интерфейс для GLTF объекта
interface GLTFData {
  scene: unknown;
  animations?: unknown[];
  parser: GLTFParser;
  [key: string]: unknown;
}

export default class DataTransformStructure {
  private dataStructure: unknown[] | null = null;
  private copy!: unknown[];

  private treeArr: IDataLabel[] | null = null;

  public gltf: GLTFData | null = null;

  constructor(
    dataStructure: unknown[],
    gltf: GLTFData,
    private trfIDataLabel: ATransformToIDataLabel,
    private trfTrTo3DRefs: ATransTo3DRefs,
    private trfTransToTree: ATransToTree
  ) {
    this.gltf = gltf;

    this.dataStructure = dataStructure;
    this.copy = [...dataStructure];

    this.trfIDataLabel?.setSrcArr(this.copy);
    const copy2 = this.addLabelToTree();
    //@ts-ignore
    this.treeArr = this.transformArr(this.addAssts3dObjRefs(copy2));
  }

  public tree(): IDataLabel[] | null {
    return this.treeArr;
  }

  public findsChildrens(): unknown[] | null {
    return this.dataStructure;
  }

  public addLabelToTree(): IDataLabel[] | undefined {
    return this.trfIDataLabel?.execute().getResult() as IDataLabel[];
  }

  private transformArr(arr: IDataLabel[] | undefined): IDataLabel[] | null {
    if (arr == undefined) return null;
    this.trfTransToTree.setSrcArr(arr);
    return this.trfTransToTree.execute().getResult();
  }

  addAssts3dObjRefs(copy: IDataLabel[]): IDataLabel[] {
    const assMap = this.gltf.parser.associations;
    this.trfTrTo3DRefs.setAssMap(assMap);
    this.trfTrTo3DRefs.setSrcArr(copy);
    return this.trfTrTo3DRefs.execute().getResult();
  }
  addAssotiation3DObjRef(tree: IDataLabel[]): IDataLabel[] {
    const assMap = this.gltf.parser.associations;
    const refs = tree.map((modelObj) => {
      if (modelObj.nodes && modelObj.nodes.length > 0) {
        assMap.forEach((value: GLTFAssociationValue, key: GLTFAssociationKey) => {
          if (
            value &&
            'nodes' in value &&
            value.nodes !== undefined &&
            typeof value.nodes !== 'undefined' &&
            parseInt(String(value.nodes)) === modelObj.nodes[0]
          ) {
            (modelObj as IDataLabel & { uuid?: string; ref3dId?: string }).uuid = `${key.uuid}`;
            (modelObj as IDataLabel & { uuid?: string; ref3dId?: string }).ref3dId = `${key.id}`;
          }
        });
      }
      return modelObj;
    });

    return refs;
  }
}
