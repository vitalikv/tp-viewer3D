import { Transform3DRefs } from '@/threeApp/model/structure/Transform3DRefs';
import { TransformActionIdx } from '@/threeApp/model/structure/TransformActionIdx';
import { TransToTree } from '@/threeApp/model/structure/TransToTree';
import DataTransformStructure from '@/threeApp/model/structure/DataTransformStructure';
import { IDataLabel } from '@/threeApp/model/structure/IData';

export class InitData {
  private structure = { value: [] };
  private tree: IDataLabel[] = [];

  constructor({ structure, gltf }: { structure: unknown; gltf: unknown }) {
    if (!structure) return;

    const gltfData = gltf as {
      scene: unknown;
      animations?: unknown[];
      parser: {
        json: {
          extras?: {
            tflex?: {
              structure?: unknown;
            };
          };
          [key: string]: unknown;
        };
        associations: Map<
          { uuid: string; id: string | number; [key: string]: unknown },
          { nodes?: string | number; [key: string]: unknown }
        >;
      };
      [key: string]: unknown;
    };

    const transform: DataTransformStructure = new DataTransformStructure(
      structure as unknown[],
      gltfData,
      new TransformActionIdx(),
      new Transform3DRefs(),
      new TransToTree()
    );

    transform.findsChildrens();
    const tree: IDataLabel[] = transform.tree() as IDataLabel[];

    this.tree = tree;
    this.structure.value = this.groups(tree);
  }

  public getStructure() {
    return this.structure;
  }

  public getTree() {
    return this.tree;
  }

  // группируем nodes
  private groups(val: IDataLabel[]) {
    let arr = [];
    const set = new Set();

    for (const item of val) {
      if ('children' in item && item.children !== null && item.children.length > 0) {
        const obj = {
          ...item,
        };
        obj.children = [...item.children];
      }

      if (Number.isNaN(item.idxtfxparent)) {
        set.add({ ...item });
      }
    }

    arr = Array.from(set);

    if (arr.length && arr.length > 0) {
      for (const objCopy of arr) {
        if (objCopy.childsGeom) {
          if (objCopy.children == null) {
            objCopy.children = [...objCopy.childsGeom];
          } else {
            objCopy.children = objCopy.children.concat(objCopy.childsGeom);
          }
        }
      }
    }

    return arr;
  }
}
