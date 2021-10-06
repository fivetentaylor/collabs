# Custom Collaborative Data Types

A core feature of Collabs is that you can extend the library with your own collaborative data types. This includes both creating [data models](./data_modeling.md) as compositions of existing types, as well as implementing completely new types from scratch (e.g., an algorithm from a [CRDT](https://crdt.tech/) paper). Thus you are not stuck with only the types/operations/semantics that we provide.

See [template-custom-type](https://github.com/composablesys/collabs/tree/master/template-custom-type) for a template that you can use to get started. The template comes with a simple custom type `CPair` as an example (in `src/custom_type.ts`).

## Superclasses

We recommend using one of the following superclasses for your custom type. However, if none of them are suitable, you can use [`Crdt`](./typedoc/classes/Crdt.html) directly as your superclass. (All collaborative types must ultimately be subclasses of `Crdt`).

See the API docs for a class (linked in the headers below) for instructions on how to subclass them.

If your custom type is implementing one of the interfaces `CBoolean`, `CList`, `CMap`, `CSet`, you probably want to extend the corresponding abstract helper class instead of the classes listed here. E.g., to implement a `CList` that would otherwise extend `CObject`, instead extend [`AbstractCListCObject`](./typedoc/classes/AbstractCListCObject.html).

<!-- TODO: examples here, or in class docs? -->

### [`CObject`](./typedoc/classes/CObject.html)

For classes whose instance variables are themselves collaborative types. This is the most common and easiest to use superclass, and suffices for many [Data Models](./data_modeling.md).

### [`CPrimitive`](./typedoc/classes/CPrimitive.html)

For implementing an [operation-based CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type#Operation-based_CRDTs) directly, using raw message passing.

### [`SemidirectProduct`](./typedoc/classes/SemidirectProduct.html)

For combining non-commuting operations in the same type, adding operations to an existing type, or tweaking the semantics of existing operations in the face of concurrency. `SemidirectProduct` offers a similar amount of flexibility as `CPrimitive`, but supports composition / reusing existing types and operations. Specifically, it implements the [semidirect product of op-based CRDTs](https://doi.org/10.1145/3408976).

> **Caution:** As of 9/2021, the library's semidirect product support is under construction, so the API is subject to change. There are also a few variants ([`SemidirectProduct`](./typedoc/classes/SemidirectProduct.html), [`SemidirectProductRev`](./typedoc/classes/SemidirectProductRev.html), and [`MultipleSemidirectProduct`](./typedoc/classes/MultipleSemidirectProduct.html)). The final version(s) will probably look most like the current `SemidirectProductRev`.

<!-- TODO: Crdt -->

## Adding Events

See [Adding Events to Custom Types](./events.md).