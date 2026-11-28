type Props = {
  size?: number;
  className?: string;
};

export function ListingEidsPendingBadge({ size = 22, className }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-white shadow ${className ?? ""}`}
      style={{ width: size + 4, height: size + 4 }}
      title="e-Devlet doğrulaması bekleniyor"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/edevlet_icon.png"
        alt=""
        width={size}
        height={size}
        className="object-contain"
      />
    </span>
  );
}
