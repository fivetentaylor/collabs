import { DefaultElementSerializer, ElementSerializer } from "../../util";
import { Crdt } from "../core";
import { RootCrdt } from "../core/runtime";
import { LwwCRegister } from "../register";
import { TombstoneMutCSet } from "../set";
import {
  MovableMutCListEntry,
  MovableMutCListFromSet,
} from "./movable_mut_list_from_set";
import {
  TreedocDenseLocalList,
  TreedocLocWrapper,
} from "./treedoc_dense_local_list";

export class TombstoneMutCList<
  C extends Crdt,
  InsertArgs extends any[]
> extends MovableMutCListFromSet<
  C,
  InsertArgs,
  TreedocLocWrapper,
  LwwCRegister<TreedocLocWrapper>,
  TombstoneMutCSet<
    MovableMutCListEntry<C, TreedocLocWrapper, LwwCRegister<TreedocLocWrapper>>,
    [TreedocLocWrapper, InsertArgs]
  >,
  TreedocDenseLocalList<
    MovableMutCListEntry<C, TreedocLocWrapper, LwwCRegister<TreedocLocWrapper>>
  >
> {
  constructor(
    valueConstructor: (...args: InsertArgs) => C,
    argsSerializer: ElementSerializer<InsertArgs> = DefaultElementSerializer.getInstance()
  ) {
    super(
      (setValueConstructor, setArgsSerializer) =>
        new TombstoneMutCSet(setValueConstructor, setArgsSerializer),
      (initialValue, registerSerializer) =>
        new LwwCRegister(initialValue, registerSerializer),
      new TreedocDenseLocalList(),
      valueConstructor,
      argsSerializer
    );
  }

  owns(value: C): boolean {
    // Avoid errors from value.parent in case it
    // is the root.
    if ((value as Crdt as RootCrdt).isRootCrdt) return false;

    return this.set.owns(
      value.parent as MovableMutCListEntry<
        C,
        TreedocLocWrapper,
        LwwCRegister<TreedocLocWrapper>
      >
    );
  }

  /**
   * Note: event will show up as Insert (if it is indeed
   * inserted, i.e., the restore wasn't redundant).
   * @param value [description]
   */
  restore(value: C): void {
    if (!this.owns(value)) {
      throw new Error("this.owns(value) is false");
    }
    this.set.restore(
      value.parent as MovableMutCListEntry<
        C,
        TreedocLocWrapper,
        LwwCRegister<TreedocLocWrapper>
      >
    );
  }
}