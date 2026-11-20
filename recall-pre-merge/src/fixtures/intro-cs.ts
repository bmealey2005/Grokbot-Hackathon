import type { Deck } from "@/lib/schema";

export const INTRO_CS_DECK_ID = "intro-cs-big-o";

/** Fixed timestamp so fixture tests stay stable. */
export const INTRO_CS_CREATED_AT = Date.parse("2026-02-01T00:00:00.000Z");

/**
 * Pre-extracted deck from a second subject, so the demo is not only cell biology.
 * Facts are the study content for this deck, not a live extraction.
 */
export const introCsDeck: Deck = {
  id: INTRO_CS_DECK_ID,
  title: "Intro CS: Big-O",
  createdAt: INTRO_CS_CREATED_AT,
  concepts: [
    {
      id: "big-o",
      term: "Big-O",
      definition:
        "An upper bound on how a procedure's steps grow as the input size n grows, ignoring constant factors.",
      facts: [
        "O(f) means the running time stays within a constant times f(n) for large n.",
        "Big-O describes the worst-case growth rate students use to compare algorithms.",
        "Constants and lower-order terms are dropped, so 3n + 10 is O(n).",
      ],
      related: ["linear", "quadratic", "logarithmic"],
    },
    {
      id: "constant-time",
      term: "Constant time",
      definition: "Work that does not grow with n. Array index lookup and a hash-table average lookup are O(1).",
      facts: [
        "Pushing or popping one end of a stack is constant time.",
        "A constant-time step inside a loop over n items still makes the loop linear.",
      ],
      related: ["hash-table", "big-o", "stack"],
    },
    {
      id: "logarithmic",
      term: "Logarithmic",
      definition: "O(log n) growth. The input is cut by a constant fraction at each step, as in binary search.",
      facts: [
        "Doubling n adds only a fixed amount of work for a logarithmic algorithm.",
        "Binary search on a sorted array is O(log n).",
      ],
      related: ["binary-search", "big-o", "linear"],
    },
    {
      id: "linear",
      term: "Linear",
      definition: "O(n) growth. The work is proportional to the number of items, as in a single scan of an array.",
      facts: [
        "Finding the maximum of an unsorted list takes one pass and is linear.",
        "Linear search checks items one by one until it finds the target or reaches the end.",
      ],
      related: ["linear-search", "big-o", "quadratic"],
    },
    {
      id: "n-log-n",
      term: "O(n log n)",
      definition:
        "Growth of efficient comparison sorts such as mergesort and heapsort: n items, each taking logarithmic work.",
      facts: [
        "Mergesort splits the list in half and then merges the sorted halves.",
        "Comparison sorts cannot do better than O(n log n) in the worst case.",
      ],
      related: ["logarithmic", "quadratic", "linear"],
    },
    {
      id: "quadratic",
      term: "Quadratic",
      definition: "O(n^2) growth. Nested loops that each run n times, as in selection sort, produce quadratic time.",
      facts: [
        "Checking every pair in a list of n items is quadratic.",
        "A quadratic algorithm that is fine for n = 100 becomes painful near n = 100,000.",
      ],
      related: ["linear", "big-o", "n-log-n"],
    },
    {
      id: "binary-search",
      term: "Binary search",
      definition:
        "Search a sorted array by comparing the target with the middle item and discarding half of the range.",
      facts: [
        "The array must already be sorted, or the discarded half might hold the target.",
        "Each comparison halves the search space, so the search is O(log n).",
      ],
      related: ["logarithmic", "linear-search", "big-o"],
    },
    {
      id: "linear-search",
      term: "Linear search",
      definition: "Scan items from one end to the other until the target appears. No sorting is required.",
      facts: [
        "Worst case, the target is last or missing, so every item is checked.",
        "Linear search is O(n) and works on unsorted data.",
      ],
      related: ["linear", "binary-search", "big-o"],
    },
    {
      id: "hash-table",
      term: "Hash table",
      definition:
        "A map from keys to values that hashes the key to a bucket. Average lookup, insert, and delete are O(1).",
      facts: [
        "A collision puts two keys in the same bucket and must be resolved by chaining or probing.",
        "A poor hash or a tiny table turns the average case toward linear.",
      ],
      related: ["constant-time", "linear", "big-o"],
    },
    {
      id: "stack",
      term: "Stack",
      definition: "A last-in, first-out collection. Push and pop happen at the same end, called the top.",
      facts: [
        "Function calls form a stack: the most recent call returns first.",
        "Depth-first traversal uses a stack, either the call stack or an explicit one.",
      ],
      related: ["queue", "recursion", "constant-time"],
    },
    {
      id: "queue",
      term: "Queue",
      definition: "A first-in, first-out collection. Items enter at the back and leave from the front.",
      facts: [
        "Breadth-first search keeps the next nodes in a queue.",
        "Enqueue and dequeue are constant time with a linked list or a circular buffer.",
      ],
      related: ["stack", "constant-time", "linear"],
    },
    {
      id: "recursion",
      term: "Recursion",
      definition:
        "A procedure that calls itself on a smaller input and stops at a base case that does not call itself.",
      facts: [
        "Each call waits on the call stack until the smaller call returns.",
        "A missing base case recurses until the stack overflows.",
      ],
      related: ["stack", "binary-search", "n-log-n"],
    },
  ],
};
