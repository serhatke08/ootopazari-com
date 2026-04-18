import Image from "next/image";
import { ADMIN_VERIFIED_BADGE_SRC } from "@/lib/admin-profile";

type Props = {
  className?: string;
  size?: number;
};

/**
 * Admin / destek hesabı için kullanıcı adının yanında gösterilen doğrulama işareti.
 */
export function AdminVerifiedBadge({ className, size = 18 }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center align-middle ${className ?? ""}`}
      title="Doğrulanmış hesap"
      aria-label="Doğrulanmış hesap"
    >
      <Image
        src={ADMIN_VERIFIED_BADGE_SRC}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        unoptimized
      />
    </span>
  );
}
