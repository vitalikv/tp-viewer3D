export interface IDataLabel {
  id: number; // random
  idx: number; // index: in Arr
  idxtfxparent: number;
  label: string;
  description: string;
  number: string;
  children: IDataLabel[] | [] | null;
  nodes: any[] | [] | null;
  id_node_tf: string;
  fragment_guid: string;
}

export interface IAction {
  execute(): ITransform;
}

export interface ITransform {
  transformTo(): void;
  getResult(): any;
}

export abstract class ATransformToIDataLabel implements IAction, ITransform {
  abstract transformTo(): void;
  abstract getResult(): any;
  abstract execute(): ITransform;
  abstract setSrcArr(srcArr: any[]): void;
}

export abstract class ATransTo3DRefs extends ATransformToIDataLabel {
  abstract transformTo(): void;
  abstract getResult(): any;
  abstract execute(): ITransform;
  abstract setSrcArr(srcArr: any[]): void;
  abstract setAssMap(ass: Map<any, any>): void;
  abstract association(): void;
}
export abstract class ATransToTree extends ATransformToIDataLabel {
  abstract transformTo(): void;
  abstract getResult(): any;
  abstract execute(): ITransform;
  abstract setSrcArr(srcArr: any[]): void;
  abstract toTree(arr: any[]): void;
}
