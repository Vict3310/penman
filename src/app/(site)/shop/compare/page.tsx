import type { Metadata } from "next";
import { ComparePage } from "@/components/shop/compare";

export const metadata: Metadata = { title: "Compare Cars", description: "Compare your selected cars side by side." };
export default function Page() { return <ComparePage />; }
