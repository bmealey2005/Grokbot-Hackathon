import type { Metadata } from "next";
import { HomeScreen } from "./HomeScreen";

export const metadata: Metadata = {
  title: "Make a quiz",
  description: "Paste your notes. Recall turns them into questions that change as you learn.",
};

export default function Home() {
  return <HomeScreen />;
}
