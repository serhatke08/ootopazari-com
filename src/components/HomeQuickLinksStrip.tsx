import Image from "next/image";
import Link from "next/link";
import { QUICK_ACCESS_LINKS } from "@/lib/quick-access-links";

function dealerBorderColor(label: string): string {
  const key = label.trim().toLocaleLowerCase("tr");
  if (key === "ekspertiz") return "#a91414";
  if (key === "galeri") return "#5e17eb";
  if (key === "parça") return "#2e6417";
  if (key === "kiralama") return "#0081cc";
  if (key === "bayilikler" || key === "bayilik" || key === "pazar")
    return "#111111";
  return "#f59e0b";
}

export function HomeQuickLinksStrip() {
  if (QUICK_ACCESS_LINKS.length === 0) return null;

  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1400px] px-2 py-3 sm:px-4 md:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_ACCESS_LINKS.map((d) => (
            <Link
              key={d.href + d.label}
              href={d.href}
              className="group flex w-[4.35rem] shrink-0 flex-col items-center gap-1"
            >
              <span
                className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] bg-white ring-1 ring-zinc-900/10 ring-offset-2 ring-offset-white transition group-hover:brightness-110"
                style={{ borderColor: dealerBorderColor(d.label) }}
              >
                {d.image ? (
                  <Image
                    src={d.image}
                    alt=""
                    fill
                    className="h-full w-full scale-110 object-contain p-0.5"
                    sizes="48px"
                  />
                ) : (
                  <span className="text-sm font-semibold text-zinc-800">
                    {d.label.trim().slice(0, 1).toUpperCase() || "B"}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-zinc-800">
                {d.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

