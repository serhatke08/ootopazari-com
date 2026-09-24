/**
 * Arama dikeyleri: ikinci el, sıfır, kiralık, parça (+ galeri / ekspertiz).
 * Her hub kendi URL’sinde indexlenir; yasal sayfalar SERP’i kirletmez.
 */

export type SeoHubPage = {
  slug: string;
  /** `/ikinci-el-arac` */
  path: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  sections: { heading: string; body: string }[];
  ctaPrimary: { href: string; label: string };
  ctaSecondary: { href: string; label: string };
  related: { href: string; label: string }[];
};

export const SEO_HUB_PAGES: SeoHubPage[] = [
  {
    slug: "ikinci-el-arac",
    path: "/ikinci-el-arac",
    title: "İkinci El Araç İlanları",
    h1: "İkinci El Araç İlanları",
    description:
      "Oto Pazarı'nda güncel ikinci el araç ilanları. Marka, model, motor ve paket bilgisiyle ikinci el araba ve otomobil ilanlarını inceleyin; satıcıyla ücretsiz mesajlaşın.",
    intro:
      "Türkiye genelinde ikinci el araç ilanlarını marka, model, yıl, kilometre ve şehir filtreleriyle tarayın. Her ilanda teknik özellikler net; alıcı–satıcı mesajlaşması platform üzerinden yürür.",
    sections: [
      {
        heading: "İkinci el araç alırken nelere bakmalısınız?",
        body: "Fiyatı benzer marka–model ilanlarla karşılaştırın, kilometre ve model yılını doğrulayın, ekspertiz veya hasar kaydı isteyin. Oto Pazarı ilanlarında marka, seri/model, motor ve paket bilgileri ayrı tutulur; böylece arama sonuçlarında da anlamlı başlıklar görürsünüz.",
      },
      {
        heading: "Neden Oto Pazarı?",
        body: "Ücretsiz ilan, gelişmiş filtreler, favoriler ve güvenli mesajlaşma. Galeri bayileri ile bireysel satıcılar aynı akışta; acil ve öne çıkan ilanlarla hızlı karar verebilirsiniz.",
      },
      {
        heading: "İkinci el ilan nasıl verilir?",
        body: "Hesap oluşturup İlan Ver adımlarını izleyin: kategori, marka, model, motor, paket, fiyat ve fotoğraflar. Onay sonrası ilanınız ikinci el araç aramalarında listelenir.",
      },
    ],
    ctaPrimary: { href: "/", label: "İkinci el ilanları gör" },
    ctaSecondary: { href: "/ilan-ver", label: "Ücretsiz ilan ver" },
    related: [
      { href: "/sifir-araclar", label: "Sıfır araçlar" },
      { href: "/kiralik-arac", label: "Kiralık araç" },
      { href: "/parca", label: "Yedek parça" },
      { href: "/rehber/ikinci-el-araba-alirken", label: "İkinci el alma rehberi" },
    ],
  },
  {
    slug: "sifir-arac",
    path: "/sifir-araclar",
    title: "Sıfır Araç İlanları",
    h1: "Sıfır Araç İlanları",
    description:
      "Oto Pazarı sıfır araç vitrini: sıfır kilometre araba ve otomobil ilanları. Marka, model ve paket bilgisiyle güncel sıfır araç ilanlarını keşfedin.",
    intro:
      "Sıfır araç arayanlar için özel vitrin. Bayi ve bireysel sıfır kilometre ilanlarını tek listede görün; marka–model–motor–paket ile doğru aracı bulun.",
    sections: [
      {
        heading: "Sıfır araç alırken",
        body: "Garanti süresi, teslimat ve kampanya koşullarını satıcıyla mesajda netleştirin. İlan başlıklarında marka ve paket bilgisi yer alır; böylece Google ve sitede arama sonuçları anlamlı kalır.",
      },
      {
        heading: "Vitrine çıkarmak",
        body: "Satıcılar sıfır araç paketleriyle ilanlarını bu sayfada öne çıkarabilir. Detaylı paketler için ilan öne çıkarma ve sıfır vitrin seçeneklerine bakın.",
      },
    ],
    ctaPrimary: { href: "/sifir-araclar", label: "Sıfır araçları incele" },
    ctaSecondary: { href: "/ilan-ver", label: "Sıfır araç ilanı ver" },
    related: [
      { href: "/ikinci-el-arac", label: "İkinci el araç" },
      { href: "/bayi/galeri", label: "Galeriler" },
      { href: "/rehber/sifir-otomobil-ilanlari", label: "Sıfır otomobil rehberi" },
    ],
  },
  {
    slug: "kiralik-arac",
    path: "/kiralik-arac",
    title: "Kiralık Araç",
    h1: "Kiralık Araç ve Araç Kiralama",
    description:
      "Oto Pazarı'nda kiralık araç ve araç kiralama bayileri. Günlük, haftalık veya uzun dönem kiralık araba seçeneklerini inceleyin; kiralama firmalarıyla iletişime geçin.",
    intro:
      "Kısa veya uzun dönem kiralık araç ihtiyacınız için Oto Pazarı kiralama bayilerini listeleyin. Şehir ve firma bilgisiyle doğru kiralama noktasını bulun.",
    sections: [
      {
        heading: "Kiralık araç nasıl seçilir?",
        body: "Kullanım sürenize, bütçenize ve segmente göre filtreleyin. Sigorta, km limiti ve depozito şartlarını bayiyle konuşmadan sözleşmeyin. Platform üzerinden mesajlaşarak teklif alın.",
      },
      {
        heading: "Kiralama bayisi olmak",
        body: "Filo işleten işletmeler kiralama bayiliği ile Oto Pazarı'nda görünürlük kazanır. Başvuru ve panel üzerinden araç/filo ilanlarınızı yönetebilirsiniz.",
      },
    ],
    ctaPrimary: { href: "/bayi/kiralama", label: "Kiralama bayileri" },
    ctaSecondary: { href: "/bayilik-basvuru", label: "Bayilik başvurusu" },
    related: [
      { href: "/ikinci-el-arac", label: "İkinci el araç" },
      { href: "/sifir-araclar", label: "Sıfır araçlar" },
      { href: "/parca", label: "Yedek parça" },
      { href: "/bayi/expertiz", label: "Ekspertiz" },
    ],
  },
  {
    slug: "oto-yedek-parca",
    path: "/parca",
    title: "Oto Yedek Parça",
    h1: "Oto Yedek Parça İlanları",
    description:
      "Oto Pazarı Parça Pazarı: sıfır ve ikinci el oto yedek parça ilanları. Parçacı bayilerden orijinal ve muadil parça bulun, satıcıyla mesajlaşın.",
    intro:
      "Kaporta, mekanik, elektrik ve bakım parçalarını tek pazarda arayın. Sıfır veya ikinci el parça ilanlarını fiyat ve durum bilgisiyle karşılaştırın.",
    sections: [
      {
        heading: "Doğru parçayı bulmak",
        body: "Araç marka–model–yıl uyumunu, parça kodunu ve durumu (sıfır / ikinci el) kontrol edin. Şüpheli fiyatlarda satıcıdan fatura ve iade koşullarını sorun.",
      },
      {
        heading: "Parçacı bayilik",
        body: "Yedek parça satıcıları Parçacı bayiliği ile mağaza ve ürünlerini Oto Pazarı'nda yayınlar. Parça Pazarı ana sayfasından güncel ilanlara ulaşılır.",
      },
    ],
    ctaPrimary: { href: "/parca", label: "Parça ilanları" },
    ctaSecondary: { href: "/bayi/parcaci", label: "Parçacı bayileri" },
    related: [
      { href: "/ikinci-el-arac", label: "İkinci el araç" },
      { href: "/bayi/expertiz", label: "Ekspertiz" },
      { href: "/bayi/galeri", label: "Galeriler" },
    ],
  },
  {
    slug: "oto-galeri",
    path: "/bayi/galeri",
    title: "Oto Galeri Bayileri",
    h1: "Oto Galeri ve İkinci El Galeriler",
    description:
      "Oto Pazarı'nda onaylı oto galeri bayileri. İkinci el araç satan galerileri keşfedin, stok ve iletişim bilgilerine ulaşın.",
    intro:
      "Güvenilir galeri bayileri Oto Pazarı'nda listelenir. Galeri sayfalarından stok ve iletişim bilgilerine ulaşabilir, araç ilanlarını inceleyebilirsiniz.",
    sections: [
      {
        heading: "Galeri mi bireysel satıcı mı?",
        body: "Galeriler genellikle daha geniş stok ve faturalı satış sunar. Bireysel ilanlarda fiyat avantajı olabilir; her iki durumda da ekspertiz ve test sürüşü önerilir.",
      },
    ],
    ctaPrimary: { href: "/bayi/galeri", label: "Galerileri gör" },
    ctaSecondary: { href: "/ikinci-el-arac", label: "İkinci el ilanlar" },
    related: [
      { href: "/bayi/expertiz", label: "Ekspertiz" },
      { href: "/sifir-araclar", label: "Sıfır araçlar" },
    ],
  },
  {
    slug: "arac-ekspertiz",
    path: "/bayi/expertiz",
    title: "Araç Ekspertiz",
    h1: "Araç Ekspertiz Hizmetleri",
    description:
      "Oto Pazarı'nda araç ekspertiz bayileri. Boya, değişen parça ve mekanik kontrol için ekspertiz noktalarını bulun.",
    intro:
      "İkinci el araç almadan önce ekspertiz yaptırmak riski azaltır. Oto Pazarı ekspertiz bayileriyle bölgenizdeki noktaları keşfedin.",
    sections: [
      {
        heading: "Ekspertizde ne bakarlar?",
        body: "Kaporta boya/değişen, alt takım, motor–şanzıman, elektronik ve yol testi. Raporu satıcıyla paylaşarak pazarlık gücünüzü artırabilirsiniz.",
      },
    ],
    ctaPrimary: { href: "/bayi/expertiz", label: "Ekspertiz bayileri" },
    ctaSecondary: { href: "/ikinci-el-arac", label: "İkinci el ilanlar" },
    related: [
      { href: "/rehber/ikinci-el-araba-alirken", label: "İkinci el alma rehberi" },
      { href: "/bayi/galeri", label: "Galeriler" },
    ],
  },
];

export function getSeoHubBySlug(slug: string): SeoHubPage | undefined {
  return SEO_HUB_PAGES.find((h) => h.slug === slug);
}

export function getSeoHubByPath(path: string): SeoHubPage | undefined {
  const normalized = path.replace(/\/+$/, "") || "/";
  return SEO_HUB_PAGES.find((h) => h.path === normalized);
}

export function getAllSeoHubSlugs(): string[] {
  return SEO_HUB_PAGES.map((h) => h.slug);
}
