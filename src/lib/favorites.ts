import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SchoolKind } from "@/lib/districts";

const FIELD_BY_KIND: Record<SchoolKind, "savedMiddle" | "savedHigh"> = {
  middle: "savedMiddle",
  high: "savedHigh",
};

export async function addFavorite(
  uid: string,
  kind: SchoolKind,
  schoolCode: string
) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { [FIELD_BY_KIND[kind]]: arrayUnion(schoolCode) });
}

export async function removeFavorite(
  uid: string,
  kind: SchoolKind,
  schoolCode: string
) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { [FIELD_BY_KIND[kind]]: arrayRemove(schoolCode) });
}
