import { Resettable, ResettableEventsRecord } from "../composers/resettable";
import { Crdt, CrdtEvent } from "../core/crdt";

export interface RegisterSetEvent<T> extends CrdtEvent {
  readonly caller: Register<T>;
  readonly value: T;
}

export interface RegisterEventsRecord<T> extends ResettableEventsRecord {
  Set: RegisterSetEvent<T>;
}

/** An opaque register of type T, any semantics. */
export interface Register<
  T,
  Events extends RegisterEventsRecord<T> = RegisterEventsRecord<T>
> extends Resettable,
    Crdt<Events> {
  // Set and get-able
  value: T;
}
