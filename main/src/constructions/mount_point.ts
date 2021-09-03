import { CMountPointSave } from "../../generated/proto_compiled";
import {
  CausalTimestamp,
  Crdt,
  CrdtEventsRecord,
  CrdtInitToken,
  Pre,
} from "../core";

export interface CMountPointEventsRecord extends CrdtEventsRecord {
  /**
   * Emitted at the end of a call to mount().
   *
   * Note this is not a CrdtEvent and has no associated
   * timestamp, since calls to mount are local, not associated
   * with a message.
   */
  Mount: {};
  /**
   * Emitted at the end of a call to unmount().
   *
   * Note this is not a CrdtEvent and has no associated
   * timestamp, since calls to unmount are local, not associated
   * with a message.
   */
  Unmount: {};
}

/**
 * A wrapper around a Crdt that can be mounted and
 * unmounted.  While unmounted, the wrapped Crdt cannot
 * be used; messages received from other replicas are
 * queued until the next time it is mounted.
 *
 * For example, the TODO subclass can be used to wrap
 * individual documents in a Google Drive-style collaborative
 * document system, so that they are not loaded into
 * memory unless the local user is actively using them.
 *
 * For the purposes of eventual consistency, we regard
 * this Crdt's state as formally equal to what its
 * state would be if its wrapped Crdt was mounted and
 * had received all currently queued messages.
 * In other words, it acts like a CompositeCrdt with
 * the wrapped Crdt as its single child, named "".
 *
 * When unmounted locally, the local state differs from this formal
 * state - the wrapped Crdt is instead unusable.  Likewise,
 * when unmounted locally, save data differs from that of the
 * formal state: the saveData of the wrapped Crdt and its
 * descendants are left unchanged from the last time it
 * was unmounted locally, while messages queued since then
 * are stored in our own saveData.
 *
 * The above formalism extends to Change events for this Crdt
 * and its ancestors: if a message is received for the
 * wrapped Crdt but it is unmounted, this Crdt and all
 * of its ancestors will emit Change events immediately,
 * as if it was mounted; later, when the wrapped Crdt is
 * mounted and the message is replayed, this Crdt and all
 * of its ancestors will **not** emit Change events, although
 * the wrapped Crdt will emit all events as usual.
 *
 * Note that
 * mounting/unmounting operations are not replicated, so
 * different replicas may be in different actual states.
 *
 * @type C the type of the wrapped Crdt
 */
export class CMountPoint<C extends Crdt> extends Crdt<CMountPointEventsRecord> {
  /**
   * Name: "".  undefined iff unmounted.
   */
  private wrappedCrdt: C | undefined = undefined;
  /**
   * messageQueue is always empty this is mounted
   * (wrappedCrdt !== undefined).
   */
  private messageQueue: [
    targetPath: string[],
    timestamp: CausalTimestamp,
    message: Uint8Array
  ][] = [];
  private needsDelayedLoad = false;

  private toMount?: C;
  /**
   * Call this before mount to specify
   * and construct the wrapped Crdt.  mount should be called shortly
   * afterwards (ideally in the same thread).
   *
   * The wrapped Crdt is not actually loaded and
   * delivered queued messages until mount, so in between
   * prepareMount and mount, you can do any setup needed
   * to prepare for the loading and queued messages
   * (e.g., adding event listeners for queued messages).
   *
   * TODO: I don't like this API; will CrdtInitTokens make
   * it better?  Concern is that callers might need to
   * do some setup in between constructing toMount and when
   * it receives messages (e.g., registering event handlers,
   * linking to GUI).  We could instead use a callback
   * with generic args in the constructor, like in
   * collections.
   */
  prepareMount<D extends C>(preToMount: Pre<D>): D {
    if (this.isMounted) {
      throw new Error("prepareMount called but already mounted");
    }
    if (this.toMount !== undefined) {
      throw new Error("prepareMount called twice");
    }
    const toMount = preToMount(new CrdtInitToken("", this));
    this.toMount = toMount;
    return toMount;
  }

  /**
   * [mount description]
   *
   * Note that if there are queued messages, they will
   * now be delivered, with some unusual behaviors:
   * - wrappedCrdt and its descendants will dispatch
   * all of their events with the original (queued) timestamps,
   * which may be causally prior to timestamps that have
   * appeared in events for other Crdts.
   * - this Crdt and its ancestors will not dispatch Change
   * events for the queued messages; they were already dispatched when the messages
   * were originally received.
   *
   * @param toMount Must be constructed with the same
   * type and constructor arguments each time.
   * @throw if this.isMounted
   */
  mount(): void {
    if (this.toMount === undefined) {
      throw new Error("prepareMount must be called before mount");
    }
    this.wrappedCrdt = this.toMount;
    delete this.toMount;

    if (this.needsDelayedLoad) {
      this.runtime.delayedLoadDescendants(this);
      // TODO (for unmount): delayed load should also
      // invalidate any preemptive save
      // from the last time we were unmounted.
    }
    this.processMessageQueue();

    this.emit("Mount", {});
  }

  /**
   * Deliver all messages in messageQueue to wrappedCrdt,
   * which must be defined, initialized, and loaded.
   */
  private processMessageQueue() {
    for (const queued of this.messageQueue) {
      this.wrappedCrdt!.receive(...queued);
    }
    this.messageQueue = [];
  }

  /**
   * [unmount description]
   *
   * @throw if !this.isMounted
   */
  unmount(): void {
    throw new Error("not yet implemented");
    if (!this.isMounted) {
      throw new Error("unmount called but already unmounted");
    }
    // TODO: need to save wrappedCrdt and its descendants.
    this.wrappedCrdt = undefined;
    this.messageQueue = [];

    this.emit("Unmount", {});
  }

  get isMounted(): boolean {
    return this.wrappedCrdt !== undefined;
  }

  get mountedCrdt(): C | undefined {
    return this.wrappedCrdt;
  }

  protected receiveInternal(
    targetPath: string[],
    timestamp: CausalTimestamp,
    message: Uint8Array
  ): void {
    if (targetPath.length === 0) {
      // We are the target
      throw new Error("CMountPoint received message for itself");
    }
    if (targetPath[targetPath.length - 1] !== "") {
      throw new Error(
        "Unknown child: " +
          targetPath[targetPath.length - 1] +
          " in: " +
          JSON.stringify(targetPath) +
          ', children: [""]'
      );
    }

    targetPath.length--;
    if (this.wrappedCrdt !== undefined) {
      this.wrappedCrdt.receive(targetPath, timestamp, message);
    } else {
      this.messageQueue.push([targetPath, timestamp, message]);
    }
  }

  getChild(name: string): Crdt<CrdtEventsRecord> {
    // TODO: what to do if not mounted.
    // For now, just throw an error.
    // Should make consistent with DeletingMutCSet,
    // whatever we do.
    if (name !== "") {
      throw new Error("Unknown child: " + name + ', children: [""]');
    }
    if (this.wrappedCrdt === undefined) {
      throw new Error('TODO: getChild("") called but not mounted');
    }
    return this.wrappedCrdt;
  }

  canGc(): boolean {
    if (this.wrappedCrdt !== undefined) {
      return this.wrappedCrdt.canGc();
    } else {
      // TODO: would like to return true if the messageQueue
      // is empty; however, it is possible that the saved state
      // is nontrivial, so we must conservatively return false.
      return false;
      // return this.messageQueue.length === 0;
    }
  }

  save(): [
    saveData: Uint8Array,
    children: Map<string, Crdt<CrdtEventsRecord>>
  ] {
    const saveMessage = CMountPointSave.create({
      messageQueue: this.messageQueue.map(
        ([targetPath, timestamp, message]) => {
          return {
            targetPath,
            timestamp: this.runtime.timestampSerializer.serialize(timestamp),
            message,
          };
        }
      ),
    });
    const saveData = CMountPointSave.encode(saveMessage).finish();
    if (this.wrappedCrdt !== undefined) {
      // Also save wrappedCrdt.  Note that in this case,
      // our saveData just encodes an empty array.
      return [saveData, new Map([["", this.wrappedCrdt]])];
    } else {
      return [saveData, new Map()];
    }
  }

  load(saveData: Uint8Array): boolean {
    this.needsDelayedLoad = true;

    const save = CMountPointSave.decode(saveData);
    this.messageQueue = save.messageQueue.map((queuedMessage) => [
      queuedMessage.targetPath!,
      this.runtime.timestampSerializer.deserialize(
        queuedMessage.timestamp!,
        this.runtime
      ),
      queuedMessage.message,
    ]);
    // Note that our mount state may be different from
    // what it was during saving.  So the loaded messageQueue
    // might be nonempty even if we are currently mounted,
    // in which case we should load the state by first loading
    // wrappedCrdt, then processing the message queue.
    if (this.wrappedCrdt !== undefined) {
      // Let wrappedCrdt be loaded recursively, then process
      // the messageQueue in postLoad().
      return true;
    } else {
      // messageQueue is reserved for when we are mounted;
      // wrappedCrdt cannot be loaded yet.
      return false;
    }
  }

  /**
   * If the wrapped Crdt is mounted now but it wasn't when
   * saveData was generated, replays the saved queued
   * messages.  Note that this will cause the wrapped
   * Crdt to dispatch events with old (pre-save) timestamps,
   * contrary to most load/postLoad methods which do not
   * dispatch any events.  However this Crdt and its
   * ancestors will not dispatch Change
   * events for the queued messages; they were already dispatched when the messages
   * were originally received (before saving).
   *
   * @return [description]
   */
  postLoad() {
    // See comments in load().
    if (this.wrappedCrdt !== undefined) {
      this.processMessageQueue();
    }
  }
}
