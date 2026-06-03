/**
 * Bayi application status normalization logic
 */

import type {
  ApplicationStatus,
  PaymentStatus,
  DealerState,
  DealerType,
} from "./bayi-types";
import { DEALER_MONTHLY_FEES } from "./bayi-types";

/**
 * Bayi başvuru durumunu normalize eder
 */
export function normalizeDealerState(
  status: ApplicationStatus,
  paymentStatus: PaymentStatus,
  membershipExpiresAt: string | null
): DealerState {
  if (status === "rejected") {
    return "rejected";
  }

  if (status === "pending") {
    return "pending";
  }

  // approved
  if (paymentStatus === "paid") {
    // Üyelik süresi dolmuş mu kontrol et
    if (membershipExpiresAt) {
      const expiresAt = new Date(membershipExpiresAt);
      const now = new Date();
      if (expiresAt < now) {
        return "overdue";
      }
    }
    return "active";
  }

  if (paymentStatus === "overdue") {
    return "overdue";
  }

  // approved ama ödeme yok (unpaid veya awaiting_payment)
  return "approved_awaiting_payment";
}

/**
 * Bayi panelinin kilitli olup olmadığını kontrol eder
 */
export function isDealerPanelLocked(state: DealerState): boolean {
  return state !== "active";
}

/**
 * Bayi başvurusu onaylı mı?
 */
export function isDealerApproved(status: ApplicationStatus): boolean {
  return status === "approved";
}

/**
 * Bayi aktif mi? (approved + paid + membership aktif)
 */
export function isDealerActive(state: DealerState): boolean {
  return state === "active";
}

/**
 * Public dealer listesinde gösterilmeli mi?
 */
export function shouldShowInPublicList(
  application: {
    status: ApplicationStatus;
    payment_status: PaymentStatus;
    membership_expires_at: string | null;
  } | null
): boolean {
  if (!application) return false;

  const state = normalizeDealerState(
    application.status,
    application.payment_status,
    application.membership_expires_at
  );

  return state === "active";
}

/**
 * Bayi tipi için aylık ücreti döner
 */
export function getMonthlyFeeForType(dealerType: DealerType): number {
  return DEALER_MONTHLY_FEES[dealerType];
}

/**
 * State'e göre kullanıcıya gösterilecek mesaj
 */
export function getDealerStateMessage(state: DealerState): string {
  switch (state) {
    case "pending":
      return "Başvurunuz inceleniyor. Onaylandığında bilgilendirileceksiniz.";
    case "approved_awaiting_payment":
      return "Başvurunuz onaylandı! Bayi panelinizi aktif etmek için ödeme yapın.";
    case "active":
      return "Bayi üyeliğiniz aktif.";
    case "overdue":
      return "Üyelik süreniz doldu. Yenilemek için ödeme yapın.";
    case "rejected":
      return "Başvurunuz reddedildi.";
  }
}

/**
 * State badge rengi
 */
export function getDealerStateBadgeColor(state: DealerState): string {
  switch (state) {
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "approved_awaiting_payment":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "overdue":
      return "bg-red-100 text-red-800 border-red-200";
    case "rejected":
      return "bg-zinc-100 text-zinc-800 border-zinc-200";
  }
}

/**
 * State badge metni
 */
export function getDealerStateBadgeText(state: DealerState): string {
  switch (state) {
    case "pending":
      return "İnceleniyor";
    case "approved_awaiting_payment":
      return "Ödeme Bekliyor";
    case "active":
      return "Aktif";
    case "overdue":
      return "Pasif";
    case "rejected":
      return "Reddedildi";
  }
}
