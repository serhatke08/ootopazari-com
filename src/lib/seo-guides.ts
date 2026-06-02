export type SeoGuidePage = {
  slug: string;
  title: string;
  navLabel: string;
  description: string;
  paragraphs: string[];
};

export const SEO_GUIDE_PAGES: SeoGuidePage[] = [
  {
    slug: "oto-pazari-nedir",
    title: "Oto Pazarı Nedir? Türkiye'nin Araç İlan Platformu",
    navLabel: "Oto Pazarı nedir?",
    description:
      "Oto Pazarı, ikinci el araba ve sıfır otomobil ilanlarını tek platformda toplayan Türkiye geneli bir oto pazarıdır.",
    paragraphs: [
      "Oto Pazarı, alıcı ve satıcıları buluşturan ücretsiz bir araç ilan platformudur. Marka, model, şehir ve fiyat filtreleriyle binlerce güncel ilanı tarayabilir; favorilerinize ekleyerek takip edebilir ve satıcıyla doğrudan mesajlaşabilirsiniz.",
      "Galeri, ekspertiz, parça ve kiralık kategorilerinde de ilan oluşturabilirsiniz. Platform hem bireysel satıcılar hem de bayiler için tasarlanmıştır; güvenilir alıcı ve satıcılarla hızlıca iletişime geçmenizi sağlar.",
    ],
  },
  {
    slug: "ikinci-el-araba-alirken",
    title: "İkinci El Araba Alırken Dikkat Edilecekler",
    navLabel: "İkinci el alırken",
    description:
      "İkinci el otomobil alırken ekspertiz, fiyat karşılaştırması ve satıcı doğrulama ipuçları — Oto Pazarı rehberi.",
    paragraphs: [
      "İkinci el araba alırken ilanın fiyat geçmişini, kilometre bilgisini ve ekspertiz durumunu mutlaka inceleyin. Oto Pazarı'nda ilan detaylarında fiyat değişimlerini görebilir, satıcıyla mesajlaşarak ek bilgi isteyebilirsiniz.",
      "Araç görmeden kapora veya ön ödeme yapmayın; mümkünse ekspertiz raporu talep edin. Şehir ve marka filtreleriyle benzer ilanları karşılaştırarak piyasa fiyatına uygun teklifler bulabilirsiniz.",
    ],
  },
  {
    slug: "ucretsiz-arac-ilani-nasil-verilir",
    title: "Ücretsiz Araç İlanı Nasıl Verilir?",
    navLabel: "Ücretsiz ilan verme",
    description:
      "Oto Pazarı'nda ücretsiz ilan verme adımları: kayıt, fotoğraf yükleme, fiyat belirleme ve yayınlama.",
    paragraphs: [
      "Oto Pazarı'nda ücretsiz ilan vermek için hesap oluşturup «İlan ver» bölümünden aracınızın marka, model, yıl ve fiyat bilgilerini girin. Net fotoğraflar ve açıklayıcı bir metin ilanınızın daha çok görüntülenmesini sağlar.",
      "İlanınız onaylandıktan sonra ana sayfada ve arama sonuçlarında listelenir. Dilediğiniz zaman fiyat güncelleyebilir, ilanınızı öne çıkarabilir veya mesajlar üzerinden alıcılarla iletişim kurabilirsiniz.",
    ],
  },
  {
    slug: "sifir-otomobil-ilanlari",
    title: "Sıfır Otomobil İlanları Rehberi",
    navLabel: "Sıfır otomobil ilanları",
    description:
      "Sıfır araç ilanlarını Oto Pazarı'nda nasıl bulursunuz? Bayi ve bireysel sıfır kilometre otomobil ilanları.",
    paragraphs: [
      "Sıfır otomobil arayanlar Oto Pazarı'nda marka, model ve şehir filtrelerini kullanarak güncel sıfır araç ilanlarını listeleyebilir. Galeri ve bayi ilanları ayrı kategorilerde yer alır.",
      "İlan detayında satıcı bilgilerini inceleyin, mesajlaşarak teslimat ve garanti koşullarını netleştirin. Favorilere ekleyerek takip ettiğiniz sıfır araç ilanlarından haberdar olabilirsiniz.",
    ],
  },
  {
    slug: "araba-satarken-ilan-verme",
    title: "Araba Satarken İlan Verme Rehberi",
    navLabel: "Araba satarken",
    description:
      "Aracınızı hızlı satmak için Oto Pazarı'nda etkili ilan oluşturma ipuçları ve fiyatlandırma önerileri.",
    paragraphs: [
      "Araba satarken doğru fiyatlandırma en önemli adımdır. Benzer marka ve modeldeki ilanları karşılaştırarak rekabetçi bir fiyat belirleyin. Dış, iç ve motor bölümünden çekilmiş kaliteli fotoğraflar güven oluşturur.",
      "Ekspertiz raporu, bakım geçmişi ve hasar bilgilerini açıkça paylaşın. Oto Pazarı mesajlaşma özelliğiyle alıcı sorularını hızlı yanıtlayarak satış sürecinizi kısaltabilirsiniz.",
    ],
  },
];

export function getSeoGuideBySlug(slug: string): SeoGuidePage | undefined {
  return SEO_GUIDE_PAGES.find((g) => g.slug === slug);
}

export function getAllSeoGuideSlugs(): string[] {
  return SEO_GUIDE_PAGES.map((g) => g.slug);
}
