/** Sol menü + üst şerit ortak liste */
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
  {
    href: "/?q=ekspertiz",
    label: "Ekspertiz",
    image: "/menu/expertiz.png",
  },
  { href: "/?q=galeri", label: "Galeri", image: "/menu/galeri.png" },
  { href: "/?q=par%C3%A7a", label: "Parça", image: "/menu/parca.png" },
  {
    href: "/?q=kiralama",
    label: "Kiralama",
    image: "/menu/kiralama.png",
  },
];
