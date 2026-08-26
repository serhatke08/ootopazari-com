import Image from "next/image";
import Link from "next/link";
import { QUICK_ACCESS_LINKS } from "@/lib/quick-access-links";

function dealerBorderColor(label: string): string {
  const key = label.trim().toLocaleLowerCase("tr");
  if (key === "ekspertiz") return "#a91414";
  if (key === "galeri") return "#5e17eb";
  if (key === "parça") return "#2e6417";
  if (key === "kiralama") return "#0081cc";
  if (key === "pazar") return "#111111";
  if (key === "acil") return "#dc2626";
  if (key === "vitrin") return "#0f766e";
  return "#f59e0b";
}

export function HomeQuickLinksStrip() {
  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1400px] px-2 py-1.5 sm:px-4 md:px-6">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_ACCESS_LINKS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group flex w-[3.75rem] shrink-0 flex-col items-center gap-0.5"
            >
              <span
                className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 bg-white ring-1 ring-zinc-900/10 ring-offset-1 ring-offset-white transition group-hover:brightness-110"
                style={{ borderColor: dealerBorderColor(d.label) }}
              >
                {d.image ? (
                  d.image.endsWith(".svg") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.image}
                      alt=""
                      className="h-full w-full scale-110 object-contain p-0.5"
                    />
                  ) : (
                    <Image
                      src={d.image}
                      alt=""
                      fill
                      className="h-full w-full scale-110 object-contain p-0.5"
                      sizes="40px"
                    />
                  )
                ) : (
                  <span className="text-[10px] font-bold text-zinc-700">
                    {d.label.slice(0, 1)}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[9px] font-medium leading-tight text-zinc-800">
                {d.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
