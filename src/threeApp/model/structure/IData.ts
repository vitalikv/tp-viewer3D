export interface IDataLabel {
  id: number; // random
  idx: number; // index: in Arr
  idxtfxparent: number;
  label: string;
  description: string;
  number: string;
  children: IDataLabel[] | [] | null;
  nodes: number[] | null;
  id_node_tf: string;
  fragment_guid: string;
  uuid?: string;
  ref3dId?: string;
  childsGeom?: IDataLabel[];
}

export interface IAction {
  execute(): ITransform;
}

export interface ITransform {
  transformTo(): void;
  getResult(): IDataLabel[];
}

export abstract class ATransformToIDataLabel implements IAction, ITransform {
  abstract transformTo(): void;
  abstract getResult(): IDataLabel[];
  abstract execute(): ITransform;
  abstract setSrcArr(srcArr: IDataLabel[] | unknown[]): void;
}

// Интерфейс для GLTF parser associations
export interface GLTFAssociationValue {
  nodes?: string | number;
  [key: string]: unknown;
}

export interface GLTFAssociationKey {
  uuid: string;
  id: string | number;
  [key: string]: unknown;
}

export abstract class ATransTo3DRefs extends ATransformToIDataLabel {
  abstract transformTo(): void;
  abstract getResult(): IDataLabel[];
  abstract execute(): ITransform;
  abstract setSrcArr(srcArr: IDataLabel[] | unknown[]): void;
  abstract setAssMap(ass: Map<GLTFAssociationKey, GLTFAssociationValue>): void;
  abstract association(): void;
}
export abstract class ATransToTree extends ATransformToIDataLabel {
  abstract transformTo(): void;
  abstract getResult(): IDataLabel[];
  abstract execute(): ITransform;
  abstract setSrcArr(srcArr: IDataLabel[] | unknown[]): void;
  abstract toTree(arr: IDataLabel[]): void;
}
