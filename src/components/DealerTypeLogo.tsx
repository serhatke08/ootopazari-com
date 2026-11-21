/** Uygulamadaki bayi chip’i: logo daireyi doldurur, siyah çerçeve üstüne biner. */
export function DealerTypeLogo({
  src,
  size = 44,
  className = "",
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 overflow-hidden rounded-full bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-full border-[2.5px] border-black" />
    </span>
  );
}
