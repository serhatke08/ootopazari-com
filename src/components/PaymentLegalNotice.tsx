import Link from "next/link";

type Props = {
  className?: string;
};

export function PaymentLegalNotice({ className = "" }: Props) {
  return (
    <p className={`text-xs leading-relaxed text-zinc-500 ${className}`}>
      Ödemeye devam ederek{" "}
      <Link href="/mesafeli-satis-sozlesmesi" className="underline">
        Mesafeli Satış Sözleşmesi
      </Link>
      ,{" "}
      <Link href="/on-bilgilendirme-formu" className="underline">
        Ön Bilgilendirme Formu
      </Link>
      ,{" "}
      <Link href="/teslimat-kosullari" className="underline">
        Teslimat Koşulları
      </Link>{" "}
      ve{" "}
      <Link href="/iade-iptal-politikasi" className="underline">
        İade ve İptal Politikası
      </Link>
      &apos;nı okuduğunuzu kabul etmiş olursunuz. Hizmetler dijitaldir; fiziksel
      kargo yapılmaz.
    </p>
  );
}
