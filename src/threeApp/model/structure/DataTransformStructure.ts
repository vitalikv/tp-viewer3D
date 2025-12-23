import { IDataLabel, ATransformToIDataLabel, ATransTo3DRefs, ATransToTree } from '@/threeApp/model/structure/IData';

export default class DataTransformStructure {
  private dataStructure: any | null = null;
  private copy!: any[];

  private treeArr: any[] | null = null;

  public gltf: any | null = null;

  constructor(dataStructure: any, gltf: any, private trfIDataLabel: ATransformToIDataLabel, private trfTrTo3DRefs: ATransTo3DRefs, private trfTransToTree: ATransToTree) {
    this.gltf = gltf;

    this.dataStructure = dataStructure;
    this.copy = [...dataStructure];

    this.trfIDataLabel?.setSrcArr(this.copy);
    const copy2 = this.addLabelToTree(this.copy);
    //@ts-ignore
    this.treeArr = this.transformArr(this.addAssts3dObjRefs(copy2));
  }

  public tree(): any {
    return this.treeArr;
  }

  public findsChildrens(): any {
    const json = this.dataStructure;
    return json;
  }

  public addLabelToTree(json: any): IDataLabel[] | undefined {
    return this.trfIDataLabel?.execute().getResult() as IDataLabel[];
  }

  private transformArr(arr: IDataLabel[] | undefined): IDataLabel[] | null {
    if (arr == undefined) return null;
    this.trfTransToTree.setSrcArr(arr);
    return this.trfTransToTree.execute().getResult();
  }

  addAssts3dObjRefs(copy: any[]): any[] {
    const assMap = this.gltf.parser.associations;
    this.trfTrTo3DRefs.setAssMap(assMap);
    this.trfTrTo3DRefs.setSrcArr(copy);
    return this.trfTrTo3DRefs.execute().getResult();
  }
  addAssotiation3DObjRef(tree: any[]): any[] {
    const assMap = this.gltf.parser.associations;
    const refs = tree.map((modelObj) => {
      if (modelObj.nodes && modelObj.nodes.length > 0) {
        assMap.forEach((value: any, key: any, map: any) => {
          if (value && 'nodes' in value && value.nodes !== 'undefined' && parseInt(value.nodes) === parseInt(modelObj.nodes[0])) {
            modelObj.uuid = `${key.uuid}`;
            modelObj.ref3dId = `${key.id}`;
          }
        });
      }
      return modelObj;
    });

    return refs;
  }
}
