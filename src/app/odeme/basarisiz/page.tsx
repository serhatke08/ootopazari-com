import Link from "next/link";

export default function OdemeBasarisizPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-center sm:px-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-8">
        <p className="text-2xl font-black text-red-950">Ödeme tamamlanamadı</p>
        <p className="mt-3 text-sm leading-6 text-red-900">
          İşlem iptal edildi veya kartınızdan çekim yapılamadı. Tekrar
          deneyebilir veya farklı bir kart kullanabilirsiniz.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/ilan-one-cikar"
            className="rounded-lg bg-[#ffc400] px-4 py-2 text-sm font-black text-black hover:bg-[#ffd24d]"
          >
            Tekrar dene
          </Link>
          <Link
            href="/iletisim"
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/50"
          >
            Destek
          </Link>
        </div>
      </div>
    </div>
  );
}
