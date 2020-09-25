import { CrdtRuntime, CausalTimestamp } from "../network";

/**
 * An event issued when a CRDT is changed by another replica.
 * Crdt's should define events implementing this interface
 * and pass those to registered listeners when the Crdt's
 * state is changed by a remote message (i.e., in a
 * remote method when remoteCaller is false).
 *
 * @param caller      The Crdt instance that was changed.
 * @param type        A string containing the event's type.
 * @param timestamp   The causal timestamp of the change. Note that
 * because several CRDTs can share the same runtime, timestamps
 * may not be continguous (e.g., entries in their vector clocks
 * might skip numbers).  However, causally ordered delivery is
 * still guaranteed.
 */
export interface CrdtChangeEvent {
    readonly caller: Crdt;
    readonly type: string;
    readonly timestamp: CausalTimestamp;
}

export class Crdt<S extends Object = any> {
    readonly isCrdt = true;
    readonly parent: Crdt | null;
    readonly runtime: CrdtRuntime;
    readonly id: string;
    /**
     * The id of this crdt and all of its ancestors in order
     * from this crdt on up.
     */
    readonly fullId: string[];
    /**
     * All of this Crdt's mutable non-child-Crdt state should be stored
     * in state, which should have a descriptive type,
     * ideally a custom class.  E.g., a CounterCrdt has state of type
     * NumberState, containing a single number (the
     * current counter value).  Putting all mutable state
     * into this.state enables semidirect product
     * compositions, in which two Crdt's share the same
     * state.  Note that semidirect products may cause
     * state to change without this Crdt's action.
     */
    state: S;
    /**
     * @param parentOrRuntime A parent for this Crdt, either another
     * Crdt, or the CrdtRuntime if this has no Crdt parent.
     * Typically parent will be the Crdt containing this
     * as an instance variable, or the CrdtRuntime if there is
     * no such Crdt.  Crdts with the same parent share a common
     * namespace and causal consistency group, and the default
     * reset() behavior is to call reset() on each child.
     * Different replicas of a Crdt must be assigned parents
     * which are also replicas of each other.
     * @param id      An id for this Crdt.  All Crdts with the
     * same parent must have distinct ids, and the ids must
     * be the same for all replicas of a given CRDT, in order
     * for the CrdtRuntime to route messages to them properly.
     */
    constructor(
        parentOrRuntime: Crdt | CrdtRuntime,
        id: string,
        state: S
    ) {
        this.id = id;
        this.state = state;
        if ("isCrdt" in parentOrRuntime) {
            this.parent = parentOrRuntime;
            this.runtime = this.parent.runtime;
            this.fullId = [id, ...this.parent.fullId];
            this.parent.registerChild(this);
        }
        else {
            this.parent = null;
            this.runtime = parentOrRuntime;
            this.fullId = [id];
            this.runtime.register(this, this.id);
        }
    }

    private readonly children: Map<string, Crdt> = new Map();
    protected registerChild(child: Crdt) {
        this.children.set(child.id, child)
    }

    private readonly eventListeners = new Map<string, [(event: CrdtChangeEvent) => void, boolean][]>();
    // TODO: typing, or at least check type exists?
    // TODO: ability to remove listeners?  Look at how DOM does it.
    /**
     * TODO: copy DOM description.
     * @param  type     [description]
     * @param  listener [description]
     * @param  receiveLocal = false  If false, events with isLocal = true
     * are not delivered.
     * @return          [description]
     */
    addEventListener(
        type: string, listener: (event: CrdtChangeEvent) => void,
        receiveLocal = false
    ) {
        let list = this.eventListeners.get(type);
        if (list === undefined) {
            list = [];
            this.eventListeners.set(type, list);
        }
        list.push([listener, receiveLocal]);
    }
    /**
     * A subclass should call this in a remote method
     * when it has an event
     * it wants to deliver to listeners.
     */
    protected dispatchEvent(event: CrdtChangeEvent) {
        let list = this.eventListeners.get(event.type);
        if (list === undefined) return;
        for (let [listener, receiveLocal] of list) {
            if (receiveLocal || !event.timestamp.isLocal) {
                try {
                    listener(event);
                }
                catch(e) {}
            }
        }
    }

    send(message: Uint8Array) {
        this.runtime.send(this.fullId, message);
    }

    inReceiveInternal = false;
   /**
     * Callback used by CrdtRuntime or a parent Crdt.
     * @targetPath: the target Crdt's id followed by
     * the ids of its ancestors in ascending order,
     * excluding the current Crdt.
     * @param timestamp The timestamp of the received message
     * @param message   The received message
     */
    receive(
        targetPath: string[], timestamp: CausalTimestamp,
        message: Uint8Array
    ): boolean {
        let changed = false;
        if (targetPath.length === 0) {
            // We are the target
            changed = this.receiveInternal(timestamp, message);
        }
        else {
            let child = this.children.get(targetPath[targetPath.length - 1]);
            if (child === undefined) {
                // TODO: deliver error somewhere
                console.log("Unknown child: " + child +
                        " in: " + JSON.stringify(this.fullId))
                return false;
            }
            targetPath.length--;
            changed = this.receiveInternalForChild(
                child, targetPath, timestamp, message
            );
        }
        return changed;
    }

    /**
     * Override this to receive messages sent by send
     * on replicas of this crdt (including those sent
     * locally).
     * @param  timestamp  [description]
     * @param  message    [description]
     * @return Whether this Crdt's state was changed, i.e.,
     * CrdtChangeEvent's of type "change" should be
     * dispatched.
     */
    receiveInternal(
        _timestamp: CausalTimestamp,
        _message: Uint8Array
    ): boolean {
        return false;
    }


    /**
     * Override this to receive messages sent by send
     * on children of this Crdt.
     * The default behavior is to pass the
     * message to child unchanged, by
     * calling child.receive(targetPath, timestamp, message).
     * @param child The child
     * @param  targetPath The targetPath that would normally
     * be delivered to the child, i.e., the ids of the Crdts
     * on the path
     * from the message's ultimate target to child, excluding
     * child.
     * @param  timestamp  [description]
     * @param  message    [description]
     * @return Whether this Crdt's state was changed, i.e.,
     * a CrdtChangeEvent of type "change" should be
     * dispatched.
     */
    receiveInternalForChild(
        child: Crdt, targetPath: string[],
        timestamp: CausalTimestamp,
        message: Uint8Array
    ): boolean {
        return child.receive(
            targetPath, timestamp, message
        );
    }
}
