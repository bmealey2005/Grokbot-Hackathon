"use client";

import { useSyncExternalStore } from "react";

let stamp = 0;

function subscribe(onStoreChange: () => void) {
  const id = window.setInterval(() => {
    stamp = Date.now();
    onStoreChange();
  }, 30_000);
  return () => window.clearInterval(id);
}

function getStamp() {
  if (stamp === 0) stamp = Date.now();
  return stamp;
}

/** Client clock for "next review" labels. Server render gets 0. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getStamp, () => 0);
}
