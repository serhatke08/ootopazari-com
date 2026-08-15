import Image from "next/image";
import Link from "next/link";

const STRIP_LINKS = [
  { href: "/bayilik-basvuru", label: "Pazar", image: "/menu/pazar.png" },
  { href: "/bayi/kiralama", label: "Kiralama", image: "/menu/kiralama.png" },
  { href: "/bayi/parcaci", label: "Parça", image: "/menu/parca.png" },
  { href: "/bayi/galeri", label: "Galeri", image: "/menu/galeri.png" },
  { href: "/bayi/expertiz", label: "Ekspertiz", image: "/menu/expertiz.png" },
] as const;

function dealerBorderColor(label: string): string {
  const key = label.trim().toLocaleLowerCase("tr");
  if (key === "ekspertiz") return "#a91414";
  if (key === "galeri") return "#5e17eb";
  if (key === "parça") return "#2e6417";
  if (key === "kiralama") return "#0081cc";
  if (key === "pazar") return "#111111";
  return "#f59e0b";
}

export function HomeQuickLinksStrip() {
  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1400px] px-2 py-3 sm:px-4 md:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STRIP_LINKS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group flex w-[4.35rem] shrink-0 flex-col items-center gap-1"
            >
              <span
                className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] bg-white ring-1 ring-zinc-900/10 ring-offset-2 ring-offset-white transition group-hover:brightness-110"
                style={{ borderColor: dealerBorderColor(d.label) }}
              >
                <Image
                  src={d.image}
                  alt=""
                  fill
                  className="h-full w-full scale-110 object-contain p-0.5"
                  sizes="48px"
                />
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
