import { Crdt, CompositeCrdt } from "../core";
import { CrdtSet } from "./interfaces";

// Sets that decorate an existing set, copying its
// methods.  Override to modify methods.
// More flexible/reusable than subclassing the decorated sets.

export class DecoratedCrdtSet<C extends Crdt>
  extends CompositeCrdt
  implements CrdtSet<C>
{
  private readonly set: CrdtSet<C>;
  constructor(set: CrdtSet<C>) {
    super();
    this.set = this.addChild("set", set);
  }

  create(): C {
    return this.set.create();
  }

  restore(valueCrdt: C): this {
    this.set.restore(valueCrdt);
    return this;
  }

  clear(): void {
    this.set.clear();
  }

  delete(valueCrdt: C): boolean {
    return this.set.delete(valueCrdt);
  }

  owns(valueCrdt: C): boolean {
    return this.set.owns(valueCrdt);
  }

  has(valueCrdt: C): boolean {
    return this.set.has(valueCrdt);
  }

  get size(): number {
    return this.set.size;
  }

  [Symbol.iterator](): IterableIterator<C> {
    return this.set[Symbol.iterator]();
  }

  entries(): IterableIterator<[C, C]> {
    return this.set.entries();
  }

  keys(): IterableIterator<C> {
    return this.set.keys();
  }

  values(): IterableIterator<C> {
    return this.set.values();
  }

  reset(): void {
    return this.set.reset();
  }
}

// TODO: PlainSet version, if needed
