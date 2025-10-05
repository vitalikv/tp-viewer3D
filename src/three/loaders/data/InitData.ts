import { Transform3DRefs } from './Transform3DRefs';
import { TransformActionIdx } from './TransformActionIdx';
import { TransToTree } from './TransToTree';
import DataTransformStructure from './DataTransformStructure';

export class InitData {
  private structure = { value: [] };
  private tree = [];

  constructor({ structure, gltf }) {
    const transform: DataTransformStructure = new DataTransformStructure(structure, gltf, new TransformActionIdx(), new Transform3DRefs(), new TransToTree());

    transform.findsChildrens();
    const tree: any = transform.tree();

    this.tree = tree;
    this.structure.value = this.groups(tree);

    console.log(555, tree, this.structure.value);
  }

  public getStructure() {
    return this.structure;
  }

  public getTree() {
    return this.tree;
  }

  // группируем nodes
  private groups(val) {
    let arr = [];
    const set = new Set();

    for (let item of val) {
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
      for (let objCopy of arr) {
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
