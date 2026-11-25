import type { Metadata } from "next";
import { HaritaMap } from "./HaritaMap";

export const metadata: Metadata = {
  title: "Harita",
  description: "Bayi, petrol, yemek ve otel haritası",
};

export default function HaritaPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HaritaMap />
    </div>
  );
}
