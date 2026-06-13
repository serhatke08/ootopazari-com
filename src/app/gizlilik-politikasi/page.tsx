import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Oto Pazarı gizlilik ve kişisel veri işleme politikası.",
  alternates: {
    canonical: "/gizlilik-politikasi",
  },
};

export default function GizlilikPolitikasiPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950">
          Gizlilik Politikası
        </h1>
        <p className="mt-4">
          Oto Pazarı, üyelik oluşturma, ilan yayınlama, mesajlaşma, favori
          işlemleri, bayi başvuruları ve ödeme destek süreçleri için gerekli
          kişisel verileri işler.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          İşlenen veriler
        </h2>
        <p className="mt-2">
          Ad soyad, kullanıcı adı, e-posta, telefon, ilan içerikleri, araç
          bilgileri, şehir bilgisi, mesaj kayıtları, destek talepleri ve ödeme
          işlem referansları işlenebilir. Kart bilgileri Oto Pazarı tarafından
          saklanmaz.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Kullanım amacı
        </h2>
        <p className="mt-2">
          Veriler hesap güvenliği, ilan yayını, alıcı-satıcı iletişimi, ödeme
          doğrulama, kötüye kullanım önleme, yasal yükümlülükler ve kullanıcı
          desteği amacıyla kullanılır.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">
          Saklama ve güvenlik
        </h2>
        <p className="mt-2">
          Veriler yalnızca hizmetin gerektirdiği süre boyunca saklanır. Yetkisiz
          erişimi önlemek için erişim kontrolleri, oturum doğrulama ve sunucu
          tarafı güvenlik kontrolleri uygulanır.
        </p>
        <h2 className="mt-6 text-xl font-black text-zinc-950">Başvuru</h2>
        <p className="mt-2">
          Gizlilik ve kişisel veri talepleriniz için destek@otopazari.com
          adresinden iletişime geçebilirsiniz.
        </p>
      </article>
    </div>
  );
}
