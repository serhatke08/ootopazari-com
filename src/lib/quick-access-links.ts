/** Sol menü + üst şerit — sıra uygulamadaki bayi şeridiyle aynı. */
export const QUICK_ACCESS_LINKS: {
  href: string;
  label: string;
  image?: string;
}[] = [
  {
    href: "/bayilik-basvuru",
    label: "Pazar",
    image: "/menu/pazar.png",
  },
  { href: "/bayi/galeri", label: "Galeri", image: "/menu/galeri.png" },
  {
    href: "/bayi/expertiz",
    label: "Ekspertiz",
    image: "/menu/expertiz.png",
  },
  {
    href: "/bayi/kiralama",
    label: "Kiralama",
    image: "/menu/kiralama.png",
  },
  { href: "/bayi/parcaci", label: "Yedek Parça", image: "/menu/parca.png" },
  {
    href: "/acil",
    label: "Acil",
    image: "/menu/acil.svg",
  },
  {
    href: "/sifir-araclar",
    label: "Sıfır Araçlar",
    image: "/menu/vitrin.svg",
  },
  {
    href: "/ikinci-el-arac",
    label: "İkinci El",
    image: "/menu/pazar.png",
  },
];
