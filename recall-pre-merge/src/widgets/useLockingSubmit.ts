"use client";

import type { AnswerResult } from "@/lib/schema";
import { useRef, useState } from "react";

export function useLockingSubmit(onSubmit: (result: AnswerResult) => void) {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);

  function lockAndSubmit(result: AnswerResult) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    onSubmit(result);
  }

  return { locked, lockAndSubmit };
}
