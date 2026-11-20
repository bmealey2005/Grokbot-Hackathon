"use client";

import { Button, type ButtonProps } from "@openai/apps-sdk-ui/components/Button";

export function Action({ className = "", ...props }: Omit<ButtonProps, "color" | "pill">) {
  return <Button color="primary" pill={false} size="2xl" className={`recall-action ${className}`} {...props} />;
}

export function Icon({ kind }: { kind: "arrow" | "book" | "check" | "plus" | "up" | "down" }) {
  const paths = {
    arrow: "M4 8h8m-3-3 3 3-3 3",
    book: "M3.5 2.5h8A1.5 1.5 0 0 1 13 4v9.5H4a1.5 1.5 0 1 1 0-3h9M4 2.5a1 1 0 0 0-1 1V12",
    check: "m4 8 2.5 2.5L12 5",
    plus: "M8 3v10M3 8h10",
    up: "M8 12V4M5 7l3-3 3 3",
    down: "M8 4v8M5 9l3 3 3-3",
  };
  return <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg>;
}

