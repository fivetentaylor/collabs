import { CObject, CPrimitive } from "../base_collabs";
import { Collab } from "../core";
import { MakeAbstractSet } from "./abstract_set";

export const AbstractSet_Collab = MakeAbstractSet(Collab);
export const AbstractSet_CObject = MakeAbstractSet(CObject);
export const AbstractSet_CPrimitive = MakeAbstractSet(CPrimitive);
