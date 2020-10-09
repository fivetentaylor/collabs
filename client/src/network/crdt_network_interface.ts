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
 * Interface describing the CrdtRuntime's view of
 * the network, which handles causal broadcast of
 * Crdt messages to other replicas.
 */
export interface CrdtNetwork {
    /**
     * Used by CrdtRuntime to send a broadcast message.
     * @param group An identifier for the group that
     * this message should be broadcast to.  A group
     * encompasses both a set of replicas and a unit
     * of causal consistency, i.e., messages should
     * be causally consistent within a group but need
     * not be across groups.
     * @param message The message to send
     * @param timestamp The CausalTimestamp returned by the
     * last call to getNextTimestamp(group).
     */
    send(group: string, message: Uint8Array, timestamp: CausalTimestamp): void;
    /**
     * Registers the given CrdtRuntime to receive messages
     * from other replicas.  Such messages should be delivered
     * to crdtRuntime.receive.  This method will be
     * called exactly once.
     * @param crdtRuntime The CrdtRuntime.
     */
    register(crdtRuntime: CrdtRuntime): void;
    /**
     * @return This replica's id, used by some Crdts internally
     * (e.g., to generate unique identifiers of the form
     * (replica id, counter)).
     */
    getReplicaId(): string;
    /**
     * @param  group An identifier for the group that
     * this message should be broadcast to.
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