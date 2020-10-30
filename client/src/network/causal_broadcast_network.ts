// First attempt at the interface between the runtime
// (causal broadcast network, etc.) and the Crdts.

import { CrdtRuntime } from "../crdts";

/**
 * Interface describing the causal timestamps that
 * get passed to Crdts when they receive a message
 * (e.g., a vector clock).
 * TODO: have a stripped-down interface plus a wrapper around it
 * that computes isLocal().
 */
export interface CausalTimestamp {
    /**
     * @return the message sender's replica id.
     */
    getSender(): string;
    /**
     * @return whether the message was generated by the local
     *  replica.  Must be equivalent to getSender() ===
     *  CrdtRuntime.getReplicaId().
     */
    isLocal(): boolean;
    /**
     * @return the counter for messages sent by this message's
     * sender.  It must be the same as
     * this.asVectorClock().get(this.getSender()).
     */
    getSenderCounter(): number;
    /**
     * @return this timestamp in the form of a vector clock,
     * i.e., as a map from replica ids to the number of their
     * most recent <= message.
     */
    asVectorClock(): Map<string, number>;
    // TODO: ?
}

/**
 * Interface describing a (tagged reliable) causal
 * broadcast (TRCB) network.  This network is used
 * by CrdtRuntime to broadcast messages to other
 * replicas, reliably, in causal order, and
 * tagged with causal timestamps.
 */
export interface CausalBroadcastNetwork {
    /**
     * Registers the given CrdtRuntime to receive messages
     * from other replicas.  Such messages should be delivered
     * to crdtRuntime.receive.  This method will be
     * called exactly once, before any other methods.
     * @param crdtRuntime The CrdtRuntime.
     */
    register(crdtRuntime: CrdtRuntime): void;
    /**
     * Called by CrdtRuntime when it is instructed
     * (TODO: how/where) to join the given group.
     * When joinGroup(group) is called, this should
     * asynchronously (i.e., not within this method call,
     * but later)
     * deliver all prior messages intended for group
     * to the CrdtRuntime (as if they had been sent just
     * now in causal order),
     * including messages sent by this replica in
     * previous sessions.  (TODO: make sure that plays nicely
     * with local ops; or perhaps mandate that replica ids
     * are unique for each session?  That would also help with
     * if the same user connects multiple times at once).
     * (TODO: where to deliver errors)
     * if there is a problem joining the group, e.g., it
     * does not exist or this replica does not have permission
     * to access it.
     * @param group A "group"
     * encompasses both a set of replicas (in a way
     * specific to your application, e.g., they could be
     * UIDs for group chats or documents on your server)
     * and a unit
     * of causal consistency, i.e., messages should
     * be causally consistent within a group but need
     * not be across groups.  (TODO: separate out these
     * concerns?  Perhaps have "document" vs "causalGroup").
     */
    joinGroup(group: string): void;
    /**
     * Used by CrdtRuntime to send a broadcast message.
     * This message should be delivered to the
     * registered CrdtRuntime's receive method on
     * all other replicas in group, in causal order,
     * with the given timestamp.
     * @param group An identifier for the group that
     * this message should be broadcast to (see joinGroup).
     * @param message The message to send
     * @param timestamp The CausalTimestamp returned by the
     * last call to getNextTimestamp(group).
     */
    send(group: string, message: Uint8Array, timestamp: CausalTimestamp): void;
    /**
     * @return This replica's id, used by some Crdts internally
     * (e.g., to generate unique identifiers of the form
     * (replica id, counter)).
     */
    getReplicaId(): string;
    /**
     * @param  group An identifier for the group that
     * this message should be broadcast to (see joinGroup).
     * @return       The CausalTimestamp that should
     * be sent with the next message to group.  This
     * timestamp will be used immediately to
     * deliver a message to the local replica and then
     * be passed to send along with group and that message,
     * unless there is an error processing the message
     * locally, in which case send will not be called.
     */
    getNextTimestamp(group: string): CausalTimestamp;
}