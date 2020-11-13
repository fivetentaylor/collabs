// // Default base classes for defining new Crdts, which
// // implement resets and out-of-order message receipt for you
// // (the abstract methods in Crdt).
//
// import { Crdt, CrdtRuntime, CrdtEvent } from "./crdt_core";
// import { CausalTimestamp } from "../network";
// import { HardResettable, ResetWrapperCrdt } from "./resettable";
//
// /**
//  * Default base class for Crdt's which no have no primitive (non-Crdt)
//  * state, instead relying on child Crdt's for their functionality.
//  * This is a convenience class that implements the abstract
//  * methods resetInternal, resetStrongInternal, and receiveOutOfOrderInternal
//  * for you by delegating to the children, with no efficiency cost.
//  *
//  * receiveInternal and receiveInternalPreInit throw an error by
//  * default, since all internal operations should happen
//  * on the child Crdt's, although they can be overridden in case
//  * you want to define messages that call local operations on the
//  * children (TODO).
//  */
// export class DefaultCompositeCrdt extends Crdt<null> {
//     constructor(
//         parentOrRuntime: Crdt | CrdtRuntime,
//         id: string
//     ) {
//         super(parentOrRuntime, id, null);
//     }
//
//     /**
//      * TODO: if overridden, should only do PURE local operations
//      * on children.
//      * @param _timestamp [description]
//      * @param _message   [description]
//      */
//     protected receiveInternal(_timestamp: CausalTimestamp, _message: Uint8Array): void {
//         throw new Error("receiveInternal not implemented: not expecting any messages");
//     }
//     protected receiveOutOfOrderInternal(timestamp: CausalTimestamp, message: Uint8Array): void {
//         // So long as receiveInternal fulfils its contract, the
//         // local operations on children will correctly get redirected
//         // to their own receiveInternalOutOfOrder methods.
//         this.receiveInternal(timestamp, message);
//     }
//     reset(): void {
//         // TODO: optimize this so child resets are done receiver-side,
//         // once local ops are implemented.  Same for strongReset().
//         // Reset all children
//         for (let child of this.children.values()) child.reset();
//     }
//     strongReset(): void {
//         // Strong reset all children
//         for (let child of this.children.values()) child.strongReset();
//     }
// }
//
// // TODO: strong resets here.
// /**
//  * Default base class for "primitive" Crdt's which manage their own state
//  * instead of relying on child Crdt's.  This is a convenience class that
//  * implements the abstract
//  * methods resetInternal, resetStrongInternal, and receiveOutOfOrderInternal
//  * for you by recording all messages delivered to the Crdt, replaying
//  * them as necessary for resetInternal and receiveOutOfOrderInternal,
//  * and using a standard construction for resetStrong methods.  Thus
//  * the class comes at a storage cost: all non-reset messages are stored
//  * in memory.
//  *
//  * This class may also be used for Crdt's which have children; in that
//  * case, all message sent to the children (that are not generated by
//  * local operations in its own receiveInternal) are also recorded
//  * and replayed.  That can lead to redundancy if the children
//  * themselves implement resetInternal, resetStrongInternal, and
//  * receiveOutOfOrderInternal (nontrivially); e.g., if they or their
//  * children also extend this class, their messages will be
//  * double-recorded.  You can avoid this redundancy by passing
//  * the resettable = false flag to those children,
//  * disabling their own resets, although only if you know they
//  * will not be reset individually (outside of this class's reset
//  * operations).  On the other hand, doing so may be more storage-
//  * efficient than extending DefaultCompositeCrdt if each of this
//  * Crdt's messages leads to many child messages.  In that case,
//  * this class will store only its own messages, while
//  * using DefaultCompositeCrdt with resettable children will instead cause
//  * the more-numerous child messages to be stored.
//  */
// export abstract class DefaultPrimitiveCrdt<S extends Object> extends Crdt<S> implements HardResettable {
//     public readonly resettable: boolean
//     resetWrapperCrdt?: ResetWrapperCrdt<S>;
//     /**
//      * @param keepOnlyMaximal=false Store only causally maximal
//      * messages in the history, to save space (although possibly
//      * at some CPU cost).  This is only allowed if the state
//      * only ever depends on the causally maximal messages.
//      */
//     constructor(
//         parentOrRuntime: Crdt | CrdtRuntime,
//         id: string,
//         initialState: S,
//         resettable = true,
//         keepOnlyMaximal = false
//     ) {
//         if (resettable) {
//             let resetWrapperCrdt = new ResetWrapperCrdt<S>(
//                 parentOrRuntime, id + "_reset", keepOnlyMaximal
//             );
//             super(resetWrapperCrdt, id, initialState);
//             this.resetWrapperCrdt = resetWrapperCrdt;
//             resetWrapperCrdt.setupReset(this);
//             resetWrapperCrdt.addEventListener(
//                 "Reset", (event: CrdtEvent) =>
//                 this.dispatchEvent({
//                     caller: this,
//                     type: event.type,
//                     timestamp: event.timestamp
//                 }), true
//             );
//         }
//         else super(parentOrRuntime, id, initialState);
//         this.resettable = resettable;
//     }
//
//     // TODO: new abstract methods
//
//     reset() {
//         if (this.resettable) {
//             this.resetWrapperCrdt!.reset();
//         }
//         // else do nothing
//     }
//
//     resetStrong() {
//         if (this.resettable) {
//             // TODO
//         }
//         // else do nothing
//     }
//
//     protected receiveOutOfOrderInternal(
//         timestamp: CausalTimestamp,
//         message: Uint8Array
//     ) {
//         if (this.resettable) {
//             this.resetWrapperCrdt!.doOutOfOrder(timestamp, message);
//         }
//         else {
//             throw new Error("mapping method called but resettable is false");
//         }
//     }
//
//     abstract hardReset(): void;
// }
//
// // TODO: DefaultSemidirectProduct