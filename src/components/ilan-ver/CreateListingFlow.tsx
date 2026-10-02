"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchBodyStylesForModel,
  fetchBrandModelsHierarchy,
  fetchBrandsByCategory,
  fetchChildBrandModels,
  fetchEnginesForModel,
  fetchPackagesForEngine,
  engineCapacityCcFromRow,
  type EngineOptionRow,
  type IdNameRow,
} from "@/lib/vehicle-hierarchy";
import {
  ContentFilterService,
  composeListingDescription,
  categoryAllowsBodyExpertiz,
  expertizPanelsToJson,
  formatContactPhone,
  isValidTrMobile10,
  isVehicleCategoryCode,
  moderationPayload,
  normalizePhoneDigits,
  parseMileageTry,
  parsePriceTry,
  formatPriceThousandsTr,
  formatMileageThousandsTr,
  sanitizeListingClientWrite,
} from "@/lib/listing-create";
import type { ExpertizDurum } from "@/lib/expertiz";
import {
  PANEL_LABELS,
  expandExpertizPartial,
  parseExpertizPanels,
  type PanelKey,
} from "@/lib/expertiz";
import { ExpertizCarPreview } from "@/components/ExpertizDiagram";
import { ACIL_PACKS } from "@/lib/listing-acil";
import {
  FEATURE_BOOST_PACKS,
  formatTryPrice,
} from "@/lib/listing-feature-boost";
import { listingCreatedClientField } from "@/lib/client-analytics";
import {
  humanizeEidsFailMessage,
  humanizeEidsLookupError,
  isEidsMinistryGateError,
  WEB_EIDS_UI_ENABLED,
} from "@/lib/eids-ui";
import { compressListingImageFiles } from "@/lib/compress-listing-image";
import { MAX_LISTING_PHOTOS } from "@/lib/listing-feed-cover";
import {
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_TITLE_MAX_LENGTH,
} from "@/lib/listing-text-limits";
import { evaluateListingQualityAfterSave, listingNeedsQualityResubmitOnEdit } from "@/lib/listing-quality";
import { getSupabaseEnv } from "@/lib/env";
import { fetchCities, type CategoryRow } from "@/lib/listings-data";
import { publicListingImageUrl } from "@/lib/storage";
import {
  recordActivationUse,
  type ListingQuotaSnapshot,
} from "@/lib/listing-quota";
import {
  DUPLICATE_LIVE_LISTING_MESSAGE,
  findLiveDuplicateListingId,
  isDuplicateLiveListingError,
} from "@/lib/listing-duplicate";
import {
  deleteListingDraft,
  draftHasProgress,
  draftSummaryLine,
  fetchListingDraft,
  saveListingDraft,
  type ListingDraftPayload,
} from "@/lib/listing-draft";
import { sortByCreateListingCategoryOrder } from "@/lib/vehicle-category-sort";
import { FlowSelectTile } from "@/components/ilan-ver/FlowSelectTile";
import {
  brandLogoSrc,
  categoryIconSrc,
} from "@/lib/brand-category-icons";

type FlowPage =
  | "category"
  | "year"
  | "brand"
  | "model"
  | "bodyStyle"
  | "engine"
  | "package"
  | "transmission"
  | "details"
  | "eids"
  | "content"
  | "expertiz"
  | "boosts";

/**
 * Sıra: kategori → yıl → marka → model → motor → paket → vites → kasa
 * → araç detayları → e-Devlet → foto/içerik → expertiz şeması → paketler
 */
const WEB_EIDS_STEP_ENABLED = WEB_EIDS_UI_ENABLED;

const VEHICLE_PAGES_ALL: FlowPage[] = [
  "category",
  "year",
  "brand",
  "model",
  "engine",
  "package",
  "transmission",
  "bodyStyle",
  "details",
  "eids",
  "content",
  "expertiz",
  "boosts",
];

const VEHICLE_PAGES: FlowPage[] = WEB_EIDS_STEP_ENABLED
  ? VEHICLE_PAGES_ALL
  : VEHICLE_PAGES_ALL.filter((p) => p !== "eids");

/** Düzenlemede e-Devlet / paket satışı yok — aynı motor→kasa sırası */
const EDIT_VEHICLE_PAGES: FlowPage[] = VEHICLE_PAGES_ALL.filter(
  (p) => p !== "eids" && p !== "boosts"
);

const OTHER_PAGES: FlowPage[] = ["category", "content", "boosts"];
const EDIT_OTHER_PAGES: FlowPage[] = ["category", "content"];

const MIN_LISTING_PRICE_TRY = 1000;

type EidsMismatch = {
  field: "year" | "brand" | "model";
  title: string;
  detail: string;
  goPage: FlowPage;
  goLabel: string;
};

function normTrToken(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Marka / model: bir taraf diğerini içeriyorsa OK (GETZ vs Getz 1.5…). */
function looseNameMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normTrToken(a ?? "");
  const nb = normTrToken(b ?? "");
  if (!na || !nb) return true;
  return na.includes(nb) || nb.includes(na);
}

const COLORS = [
  "Beyaz",
  "Siyah",
  "Gri",
  "Gümüş Gri",
  "Füme",
  "Lacivert",
  "Mavi",
  "Turkuaz",
  "Yeşil",
  "Sarı",
  "Turuncu",
  "Kırmızı",
  "Bordo",
  "Pembe",
  "Mor",
  "Kahverengi",
  "Bej",
  "Altın",
  "Bronz",
];

const TRANSMISSIONS = ["Manuel", "Otomatik", "Yarı Otomatik"];
const FUELS = ["Benzin", "Dizel", "Elektrik", "Hibrit", "LPG", "LPG & Benzin"];
const CONDITIONS = ["İkinci El", "Sıfır"];
const DRIVE_TYPES = [
  "Önden Çekiş",
  "Arkadan İtiş",
  "4WD (Sürekli)",
  "4WD (Bağlanabilir)",
] as const;
const PLATE_TR = "Türkiye (TR) Plakalı";
const PLATE_FOREIGN = "Yabancı Plakalı";

const EXPERTIZ_OPTIONS: { value: ExpertizDurum; label: string }[] = [
  { value: "orijinal", label: "Orijinal" },
  { value: "boyalı", label: "Boyalı" },
  { value: "lokal_boyalı", label: "Lokal boyalı" },
  { value: "değişen", label: "Değişen" },
];

function extForFile(f: File): string {
  const n = f.name.split(".").pop()?.toLowerCase();
  if (n && /^[a-z0-9]+$/i.test(n)) return n;
  if (f.type === "image/png") return "png";
  if (f.type === "image/webp") return "webp";
  return "jpg";
}

function mimeForUpload(f: File): string | undefined {
  if (f.type) return f.type;
  const e = extForFile(f);
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  return "image/jpeg";
}

type Props = {
  categories: CategoryRow[];
  userCountryId: string | null;
  listingQuota: ListingQuotaSnapshot | null;
  editListingId?: string | null;
  editListingNumber?: string | null;
  initialGalleryUrls?: string[];
  initialListingPayload?: Record<string, unknown> | null;
};

export function CreateListingFlow({
  categories: rawCategories,
  userCountryId,
  listingQuota,
  editListingId = null,
  editListingNumber = null,
  initialGalleryUrls = [],
  initialListingPayload = null,
}: Props) {
  const isEditMode = Boolean(editListingId);
  const vehiclePages = isEditMode ? EDIT_VEHICLE_PAGES : VEHICLE_PAGES;
  const otherPages = isEditMode ? EDIT_OTHER_PAGES : OTHER_PAGES;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPrefilled = useRef(false);
  const editOpenedSnapshot = useRef<{
    moderation_status?: unknown;
    quality_passive_source?: unknown;
    cover_quality_score?: unknown;
  } | null>(null);

  const categories = useMemo(
    () =>
      sortByCreateListingCategoryOrder(rawCategories, (c) =>
        String(c.code ?? "")
      ),
    [rawCategories]
  );

  const [pages, setPages] = useState<FlowPage[]>(["category"]);
  const [pageIndex, setPageIndex] = useState(0);
  const page = pages[pageIndex] ?? "category";

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const isVehicle = isVehicleCategoryCode(categoryCode);

  const [vehicleYear, setVehicleYear] = useState<number | null>(null);
  const [brands, setBrands] = useState<IdNameRow[]>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [brandCode, setBrandCode] = useState<string | null>(null);

  const [hierarchical, setHierarchical] = useState(false);
  const [parents, setParents] = useState<IdNameRow[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [children, setChildren] = useState<IdNameRow[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [flatModels, setFlatModels] = useState<IdNameRow[]>([]);
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);

  const [bodyStyles, setBodyStyles] = useState<IdNameRow[]>([]);
  const [bodyStyleId, setBodyStyleId] = useState<string | null>(null);
  const [bodyStyleName, setBodyStyleName] = useState<string | null>(null);
  const [engines, setEngines] = useState<EngineOptionRow[]>([]);
  const [engineId, setEngineId] = useState<string | null>(null);
  const [engineName, setEngineName] = useState<string | null>(null);
  const [packages, setPackages] = useState<IdNameRow[]>([]);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [packageName, setPackageName] = useState<string | null>(null);

  const [transmission, setTransmission] = useState<string | null>(null);
  const [mileage, setMileage] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [driveType, setDriveType] = useState<string | null>(null);
  const [horsepowerStr, setHorsepowerStr] = useState("");
  const [engineCapacityStr, setEngineCapacityStr] = useState("");
  const [warranty, setWarranty] = useState(false);
  const [heavyDamageRecord, setHeavyDamageRecord] = useState(false);
  const [isTradeable, setIsTradeable] = useState(false);
  const [plateNationality, setPlateNationality] = useState(PLATE_TR);
  const [hasExpertise, setHasExpertise] = useState(false);
  const [expertiz, setExpertiz] = useState<
    Partial<Record<PanelKey, ExpertizDurum | "">>
  >({});
  const [expertizConfirmed, setExpertizConfirmed] = useState(false);
  const [plate, setPlate] = useState("");
  const showExpertiz = categoryAllowsBodyExpertiz(categoryCode, categoryName);

  const [eidsAccountOk, setEidsAccountOk] = useState(false);
  const [eidsVehicleOk, setEidsVehicleOk] = useState(false);
  const [eidsBusy, setEidsBusy] = useState(false);
  const [eidsMsg, setEidsMsg] = useState<string | null>(null);
  const [eidsOfficial, setEidsOfficial] = useState<{
    markaAdi: string | null;
    ticariAdi: string | null;
    modelYili: string | null;
  } | null>(null);
  const [eidsMismatches, setEidsMismatches] = useState<EidsMismatch[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>(
    () => (initialGalleryUrls?.length ? [...initialGalleryUrls] : [])
  );
  const [coverIndex, setCoverIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [cities, setCities] = useState<{ id: string; name: string | null }[]>(
    []
  );
  const [cityId, setCityId] = useState<string | null>(null);
  const [district, setDistrict] = useState("");
  const [phone, setPhone] = useState("");
  /** 'none' | 'acil' | 'boost' | 'both' — app ile aynı */
  const [packageIntent, setPackageIntent] = useState<
    "none" | "acil" | "boost" | "both"
  >("none");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrorId, setFieldErrorId] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState<ListingDraftPayload | null>(
    null
  );
  const draftSkip = useRef(false);
  const lock = useRef(false);
  /** e-Devlet dönüşünde kategori flaşını önlemek (SSR ile aynı initial → hydration OK) */
  const [bootReady, setBootReady] = useState(true);

  const progress = pages.length ? (pageIndex + 1) / pages.length : 0;

  const seriesName =
    hierarchical && parentId
      ? parents.find((p) => p.id === parentId)?.name?.trim() || null
      : null;

  const selectionTrail = useMemo(() => {
    const parts: string[] = [];
    const push = (v: string | null | undefined) => {
      const t = (v ?? "").trim();
      if (t) parts.push(t);
    };
    push(categoryName);
    if (vehicleYear != null) push(String(vehicleYear));
    push(brandName);
    if (seriesName && seriesName !== (modelName ?? "").trim()) {
      push(seriesName);
    }
    push(modelName);
    push(engineName);
    push(packageName);
    push(transmission);
    push(bodyStyleName);
    return parts;
  }, [
    categoryName,
    vehicleYear,
    brandName,
    seriesName,
    modelName,
    engineName,
    packageName,
    transmission,
    bodyStyleName,
  ]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now + 1 - 1980 + 1 }, (_, i) => now + 1 - i);
  }, []);

  const modelOptions = hierarchical
    ? parentId && children.length
      ? children
      : parents
    : flatModels;

  const persistDraft = useCallback(async (overrides?: Partial<ListingDraftPayload>) => {
    if (isEditMode) return;
    if (draftSkip.current) return;
    const payload: ListingDraftPayload = {
      categoryId,
      categoryCode,
      categoryName,
      vehicleYear,
      brandId,
      brandName,
      brandCode,
      modelId: childId || parentId || modelId,
      modelName,
      bodyStyleId,
      bodyStyleName,
      engineId,
      engineName,
      packageId,
      packageName,
      transmission,
      mileage,
      fuelType,
      color,
      vehicleCondition: condition,
      driveType,
      horsepower: horsepowerStr || null,
      engineCapacity: engineCapacityStr || null,
      warranty,
      heavyDamageRecord,
      isTradeable,
      plateNationality,
      hasExpertise,
      expertizPanels: expertiz as Record<string, string>,
      plate,
      eidsAccountOk,
      eidsVehicleOk,
      title,
      description,
      price: priceStr,
      cityId,
      district,
      phone,
      coverPhotoIndex: coverIndex,
      packageIntent,
      pageIndex,
      webStep: pageIndex + 1,
      source: "web",
      ...overrides,
    };
    if (!draftHasProgress(payload)) return;
    await saveListingDraft(payload);
  }, [
    categoryId,
    categoryCode,
    categoryName,
    vehicleYear,
    brandId,
    brandName,
    brandCode,
    childId,
    parentId,
    modelId,
    modelName,
    bodyStyleId,
    bodyStyleName,
    engineId,
    engineName,
    packageId,
    packageName,
    transmission,
    mileage,
    fuelType,
    color,
    condition,
    driveType,
    horsepowerStr,
    engineCapacityStr,
    warranty,
    heavyDamageRecord,
    isTradeable,
    plateNationality,
    hasExpertise,
    expertiz,
    plate,
    eidsAccountOk,
    eidsVehicleOk,
    title,
    description,
    priceStr,
    cityId,
    district,
    phone,
    coverIndex,
    packageIntent,
    pageIndex,
    isEditMode,
  ]);

  useEffect(() => {
    void (async () => {
      const cityRows = await fetchCities(supabase);
      setCities(cityRows.map((c) => ({ id: c.id, name: c.name })));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: row } = await supabase
          .from("profiles")
          .select("phone, eids_kullanici_kodu")
          .eq("id", user.id)
          .maybeSingle();
        const p = (row as { phone?: string | null } | null)?.phone;
        if (p && !phone) setPhone(String(p).replace(/^0/, ""));
        const kod = (row as { eids_kullanici_kodu?: string | null } | null)
          ?.eids_kullanici_kodu;
        if (kod && String(kod).trim()) {
          setEidsAccountOk(true);
        }
      }

      // Düzenleme: ilanı doldur, taslak/eids boot yok
      if (isEditMode && initialListingPayload && !editPrefilled.current) {
        editPrefilled.current = true;
        await hydrateFromListing(initialListingPayload);
        setBootReady(true);
        return;
      }
      if (isEditMode) {
        setBootReady(true);
        return;
      }

      const sp = new URLSearchParams(window.location.search);
      const eidsStatus = sp.get("eids"); // ok | fail
      const eidsDurum = sp.get("durum")?.trim() || "";
      const step = sp.get("step");
      const fromEids =
        step === "eids" || eidsStatus === "ok" || eidsStatus === "fail";
      if (fromEids) {
        setBootReady(false);
      }

      const d = await fetchListingDraft();

      let kodOk = false;
      if (user) {
        const { data: row } = await supabase
          .from("profiles")
          .select("eids_kullanici_kodu")
          .eq("id", user.id)
          .maybeSingle();
        const kod = (row as { eids_kullanici_kodu?: string | null } | null)
          ?.eids_kullanici_kodu;
        if (kod && String(kod).trim()) {
          kodOk = true;
          setEidsAccountOk(true);
        }
      }

      // e-Devlet dönüşü: taslağı aç ve doğrudan eids (veya content) adımına in
      if (fromEids && d && draftHasProgress(d)) {
        await applyDraft(d, {
          landOn: WEB_EIDS_STEP_ENABLED ? "eids" : "content",
        });
      } else if (d && draftHasProgress(d)) {
        setDraftBanner(d);
      }

      if (eidsStatus === "ok") {
        if (kodOk) {
          setEidsAccountOk(true);
          setEidsMsg(
            "Hesap doğrulandı. Plakayı yazıp sorgula."
          );
        } else if (isEidsMinistryGateError(eidsDurum)) {
          setEidsMsg(humanizeEidsFailMessage(eidsDurum));
        } else {
          setEidsMsg(
            `e-Devlet tamamlandı ama kullanıcı kodu kaydedilemedi${
              eidsDurum ? ` (${eidsDurum})` : ""
            }. Telefonunun e-Devlet’teki numara ile aynı olduğundan emin ol; sonra tekrar dene.`
          );
        }
      } else if (eidsStatus === "fail") {
        setEidsMsg(humanizeEidsFailMessage(eidsDurum));
      }

      try {
        if (eidsStatus || eidsDurum) {
          sessionStorage.setItem(
            "eids_last_web_result",
            JSON.stringify({
              at: Date.now(),
              eids: eidsStatus,
              durum: eidsDurum,
              kodOk,
            })
          );
        }
      } catch {
        /* ignore */
      }

      if (fromEids || eidsStatus) {
        const u = new URL(window.location.href);
        u.searchParams.delete("eids");
        u.searchParams.delete("yetkiKodu");
        u.searchParams.delete("durum");
        u.searchParams.delete("state");
        const land = WEB_EIDS_STEP_ENABLED ? "eids" : "content";
        u.searchParams.set("step", land);
        window.history.replaceState({}, "", `${u.pathname}?step=${land}`);
      }
      setBootReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void persistDraft();
    }, 800);
    return () => window.clearTimeout(t);
  }, [persistDraft]);

  const goTo = useCallback(
    async (
      nextIndex: number,
      lens?: { body?: number; engine?: number; pack?: number }
    ) => {
      const bodyLen = lens?.body ?? bodyStyles.length;
      const engLen = lens?.engine ?? engines.length;
      const packLen = lens?.pack ?? packages.length;
      let i = nextIndex;
      while (i < pages.length) {
        const p = pages[i];
        if (p === "bodyStyle" && bodyLen === 0) {
          i++;
          continue;
        }
        if (p === "engine" && engLen === 0) {
          i++;
          continue;
        }
        if (p === "package" && packLen === 0) {
          i++;
          continue;
        }
        if (
          p === "expertiz" &&
          !categoryAllowsBodyExpertiz(categoryCode, categoryName)
        ) {
          i++;
          continue;
        }
        break;
      }
      setErr(null);
      setFieldErrorId(null);
      setPageIndex(Math.min(i, pages.length - 1));
      scrollFlowToTop();
      // persistDraft burada ÇAĞRILMAZ: setState henüz commit değilken eski
      // engineId:null taslağa yazılıyordu → e-Devlet/plaka sonrası motor kayboluyordu.
      // Kayıt: debounced effect + seçimde flush + startEids/saveDraftAndExit.
    },
    [
      pages,
      bodyStyles.length,
      engines.length,
      packages.length,
      categoryCode,
      categoryName,
    ]
  );

  /** Sayfa bazlı zorunlu alanlar — mobil akışla aynı sıkılık.
   *  Liste seçimleri (marka/model…) tile tıklanınca setState + goNext yarışır;
   *  onları burada kontrol etme — sticky İleri zaten selectionHasValue ile kilitli. */
  function validateCurrentPage(): { message: string; fieldId: string } | null {
    if (page === "details" && isVehicle) {
      if (parseMileageTry(mileage) == null) {
        return { message: "Kilometre zorunlu.", fieldId: "ilan-ver-mileage" };
      }
      if (!color) {
        return { message: "Renk seçin.", fieldId: "ilan-ver-color" };
      }
      if (!fuelType) {
        return { message: "Yakıt tipi seçin.", fieldId: "ilan-ver-fuel" };
      }
      if (!isEditMode && !condition) {
        return { message: "Araç durumu seçin.", fieldId: "ilan-ver-condition" };
      }
      if (!driveType) {
        return { message: "Çekiş seçin.", fieldId: "ilan-ver-drive" };
      }
      const plaka = plate.trim().replace(/\s+/g, "");
      if (!isEditMode && plaka.length < 5) {
        return { message: "Plaka zorunlu.", fieldId: "ilan-ver-plate" };
      }
    }
    if (page === "expertiz" && showExpertiz && !expertizConfirmed) {
      return {
        message: "Expertiz bilgilerini doğru girdiğinizi onaylayın.",
        fieldId: "ilan-ver-expertiz-confirm",
      };
    }
    if (WEB_EIDS_STEP_ENABLED && page === "eids" && isVehicle) {
      if (!eidsAccountOk) {
        return {
          message: "Önce e-Devlet ile hesabı doğrulayın.",
          fieldId: "ilan-ver-eids",
        };
      }
      if (!eidsVehicleOk) {
        return {
          message: "Plaka yetkisini tamamlayın (sorgula).",
          fieldId: "ilan-ver-eids",
        };
      }
    }
    if (page === "content") {
      const photoCount =
        files.length + (isEditMode ? existingGalleryUrls.length : 0);
      if (photoCount === 0) {
        return {
          message: "En az bir fotoğraf ekleyin.",
          fieldId: "ilan-ver-photos-box",
        };
      }
      if (!title.trim()) {
        return { message: "Başlık zorunlu.", fieldId: "ilan-ver-title" };
      }
      if (!description.trim()) {
        return { message: "Açıklama zorunlu.", fieldId: "ilan-ver-description" };
      }
      if (parsePriceTry(priceStr) == null) {
        return { message: "Geçerli fiyat girin.", fieldId: "ilan-ver-price" };
      }
      const priceNum = parsePriceTry(priceStr);
      if (priceNum != null && priceNum < MIN_LISTING_PRICE_TRY) {
        return {
          message: `İlan fiyatı en az ${MIN_LISTING_PRICE_TRY} ₺ olmalı.`,
          fieldId: "ilan-ver-price",
        };
      }
      if (!cityId) {
        return { message: "Şehir seçin.", fieldId: "ilan-ver-city" };
      }
      if (!district.trim()) {
        return { message: "İlçe / semt yazın.", fieldId: "ilan-ver-district" };
      }
      if (!isValidTrMobile10(normalizePhoneDigits(phone).slice(-10))) {
        return {
          message: "Geçerli cep telefonu girin.",
          fieldId: "ilan-ver-phone",
        };
      }
    }
    if (page === "boosts") {
      // Paket isteğe bağlı — konum content’te doğrulandı
    }
    return null;
  }

  function scrollToField(fieldId: string) {
    window.requestAnimationFrame(() => {
      const el = document.getElementById(fieldId);
      const target = el ?? document.getElementById("ilan-ver-err");
      if (!target) return;
      // center kullanma — alt alanlarda site footer’ı ekrana çekiyor
      const top =
        target.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        try {
          el.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
    });
  }

  function scrollFlowToTop() {
    window.requestAnimationFrame(() => {
      const topEl = document.getElementById("ilan-ver-top");
      if (topEl) {
        const top =
          topEl.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        return;
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  const goBack = async () => {
    setErr(null);
    setFieldErrorId(null);
    if (pageIndex <= 0) return;
    let i = pageIndex - 1;
    while (i > 0) {
      const p = pages[i];
      if (p === "bodyStyle" && bodyStyles.length === 0) {
        i--;
        continue;
      }
      if (p === "engine" && engines.length === 0) {
        i--;
        continue;
      }
      if (p === "package" && packages.length === 0) {
        i--;
        continue;
      }
      if (
        p === "expertiz" &&
        !categoryAllowsBodyExpertiz(categoryCode, categoryName)
      ) {
        i--;
        continue;
      }
      break;
    }
    setPageIndex(Math.max(0, i));
    scrollFlowToTop();
    await persistDraft();
  };

  const loadBrands = async (catId: string) => {
    const rows = await fetchBrandsByCategory(supabase, catId);
    setBrands(rows);
  };

  const loadModels = async (bId: string) => {
    const hier = await fetchBrandModelsHierarchy(supabase, bId);
    setHierarchical(hier.hierarchical);
    if (hier.hierarchical) {
      setParents(hier.parents);
      setChildren([]);
      setFlatModels([]);
    } else {
      setFlatModels(hier.parents);
      setParents([]);
      setChildren([]);
    }
  };

  const loadBody = async (mId: string) => {
    const rows = await fetchBodyStylesForModel(supabase, mId);
    setBodyStyles(rows);
    return rows;
  };

  const loadEngines = async (mId: string) => {
    const rows = await fetchEnginesForModel(supabase, mId);
    setEngines(rows);
    return rows;
  };

  /** Model seçildikten sonra motor/kasa atlanmasın (setState yarışı). */
  const afterModelChosen = async (mId: string, mName: string | null) => {
    setModelId(mId);
    setModelName(mName);
    setBodyStyleId(null);
    setBodyStyleName(null);
    setEngineId(null);
    setEngineName(null);
    setPackageId(null);
    setPackageName(null);
    setPackages([]);
    const bodies = await loadBody(mId);
    const engs = await loadEngines(mId);
    const modelIdx = pages.indexOf("model");
    const next = modelIdx >= 0 ? modelIdx + 1 : pageIndex + 1;
    await goTo(next, {
      body: bodies.length,
      engine: engs.length,
      pack: 0,
    });
  };

  const loadPackages = async (eId: string) => {
    const rows = await fetchPackagesForEngine(supabase, eId);
    setPackages(rows);
    return rows;
  };

  /** Mevcut ilanı düzenleme akışına doldur (motor→paket→vites→kasa sırası). */
  const hydrateFromListing = async (row: Record<string, unknown>) => {
    draftSkip.current = true;
    editOpenedSnapshot.current = {
      moderation_status: row.moderation_status,
      quality_passive_source: row.quality_passive_source,
      cover_quality_score: row.cover_quality_score,
    };

    const cat = categories.find((c) => c.id === String(row.category_id ?? ""));
    const code = String(cat?.code ?? "");
    const vehicle = isVehicleCategoryCode(code);
    const list = vehicle ? vehiclePages : otherPages;
    setPages(list);

    if (cat) {
      setCategoryId(cat.id);
      setCategoryCode(code);
      setCategoryName(cat.name ?? code);
    } else if (row.category_id) {
      setCategoryId(String(row.category_id));
    }

    setTitle(String(row.title ?? ""));
    setDescription(String(row.description ?? ""));
    if (row.price != null && row.price !== "") {
      const p = Number(row.price);
      if (Number.isFinite(p)) {
        setPriceStr(formatPriceThousandsTr(String(Math.round(p))));
      }
    }
    if (row.city_id) setCityId(String(row.city_id));
    if (row.district != null) setDistrict(String(row.district));
    const phoneRaw = String(row.contact_phone ?? "").replace(/\D/g, "");
    if (phoneRaw.length >= 10) {
      const digits =
        phoneRaw.length === 11 && phoneRaw.startsWith("0")
          ? phoneRaw.slice(1)
          : phoneRaw.slice(-10);
      setPhone(digits);
    }

    if (vehicle) {
      if (row.vehicle_year != null) {
        const y = Number(row.vehicle_year);
        if (Number.isFinite(y)) setVehicleYear(y);
      }
      if (row.vehicle_mileage != null && row.vehicle_mileage !== "") {
        setMileage(formatMileageThousandsTr(String(row.vehicle_mileage)));
      }
      if (row.fuel_type) setFuelType(String(row.fuel_type));
      if (row.transmission_type) setTransmission(String(row.transmission_type));
      if (row.color) setColor(String(row.color));
      if (row.drive_type) setDriveType(String(row.drive_type));
      if (row.engine_power != null && row.engine_power !== "") {
        setHorsepowerStr(String(row.engine_power));
      }
      if (row.engine_capacity != null && row.engine_capacity !== "") {
        setEngineCapacityStr(String(row.engine_capacity).replace(".", ","));
      }
      setHeavyDamageRecord(row.is_damaged === true);
      setIsTradeable(row.is_tradeable === true);
      setHasExpertise(row.has_expertise === true);
      const parsed = parseExpertizPanels(row.expertiz_panels);
      if (parsed) {
        setExpertiz(parsed);
        setExpertizConfirmed(true);
      }

      if (cat?.id) await loadBrands(cat.id);

      const bid =
        row.vehicle_brand_id != null && String(row.vehicle_brand_id) !== ""
          ? String(row.vehicle_brand_id)
          : null;
      if (bid) {
        setBrandId(bid);
        const brandRow = (await fetchBrandsByCategory(supabase, cat!.id)).find(
          (b) => b.id === bid
        );
        setBrandName(brandRow?.name ?? null);
        setBrandCode(brandRow?.code ?? null);
        await loadModels(bid);

        const mid =
          row.vehicle_brand_model_id != null &&
          String(row.vehicle_brand_model_id) !== ""
            ? String(row.vehicle_brand_model_id)
            : null;
        const modelLabel =
          row.vehicle_model != null ? String(row.vehicle_model).trim() : "";

        let resolvedMid = mid;
        if (!resolvedMid && modelLabel) {
          const hier = await fetchBrandModelsHierarchy(supabase, bid);
          const pool = hier.hierarchical
            ? [...hier.parents]
            : [...hier.parents];
          // children may need fetch — try flat parents first, then all parents as models
          const hit =
            pool.find(
              (m) =>
                (m.name ?? "").trim().toLocaleLowerCase("tr-TR") ===
                modelLabel.toLocaleLowerCase("tr-TR")
            ) ??
            pool.find((m) =>
              modelLabel
                .toLocaleLowerCase("tr-TR")
                .includes((m.name ?? "").trim().toLocaleLowerCase("tr-TR"))
            );
          if (hit) resolvedMid = hit.id;
          if (!hit && hier.hierarchical) {
            for (const p of hier.parents) {
              const kids = await fetchChildBrandModels(supabase, p.id);
              const k = kids.find(
                (m) =>
                  (m.name ?? "").trim().toLocaleLowerCase("tr-TR") ===
                    modelLabel.toLocaleLowerCase("tr-TR") ||
                  modelLabel
                    .toLocaleLowerCase("tr-TR")
                    .includes((m.name ?? "").trim().toLocaleLowerCase("tr-TR"))
              );
              if (k) {
                setParentId(p.id);
                setChildren(kids);
                resolvedMid = k.id;
                break;
              }
            }
          }
        }

        if (resolvedMid) {
          setModelId(resolvedMid);
          setParentId((prev) => prev || resolvedMid);
          setChildId(resolvedMid);
          setModelName(modelLabel || null);
          const bodies = await loadBody(resolvedMid);
          const engs = await loadEngines(resolvedMid);

          const bodyLabel =
            row.body_type != null ? String(row.body_type).trim() : "";
          if (bodyLabel && bodies.length) {
            const bHit = bodies.find(
              (b) =>
                (b.name ?? "").trim().toLocaleLowerCase("tr-TR") ===
                bodyLabel.toLocaleLowerCase("tr-TR")
            );
            if (bHit) {
              setBodyStyleId(bHit.id);
              setBodyStyleName(bHit.name ?? null);
            }
          }

          const pkgId =
            row.vehicle_engine_package_id != null &&
            String(row.vehicle_engine_package_id) !== ""
              ? String(row.vehicle_engine_package_id)
              : null;
          if (pkgId) {
            const { data: pkg } = await supabase
              .from("vehicle_engine_packages")
              .select("id,name,engine_id")
              .eq("id", pkgId)
              .maybeSingle();
            const engId =
              pkg && typeof pkg === "object"
                ? String(
                    (pkg as { engine_id?: string | null }).engine_id ?? ""
                  ) || null
                : null;
            if (engId) {
              setEngineId(engId);
              const eng = engs.find((e) => e.id === engId);
              setEngineName(eng?.name ?? null);
              const packs = await loadPackages(engId);
              setPackageId(pkgId);
              setPackageName(
                (pkg as { name?: string | null } | null)?.name ??
                  packs.find((p) => p.id === pkgId)?.name ??
                  null
              );
            }
          }
        } else if (modelLabel) {
          setModelName(modelLabel);
        }
      }
    }

    const contentIdx = list.indexOf("content");
    setPageIndex(contentIdx >= 0 ? contentIdx : Math.max(0, list.length - 1));
    setTimeout(() => {
      draftSkip.current = false;
    }, 500);
  };

  const selectCategory = async (c: CategoryRow) => {
    const code = String(c.code ?? "");
    const vehicle = isVehicleCategoryCode(code);
    const nextPages = vehicle ? vehiclePages : otherPages;
    setCategoryId(c.id);
    setCategoryCode(code);
    setCategoryName(c.name ?? code);
    setBrandId(null);
    setModelId(null);
    setParentId(null);
    setChildId(null);
    setBodyStyleId(null);
    setEngineId(null);
    setPackageId(null);
    setPages(nextPages);
    setDraftBanner(null);
    if (vehicle) await loadBrands(c.id);
    setPageIndex(1);
    await persistDraft();
  };

  async function applyDraft(
    d: ListingDraftPayload,
    opts?: { landOn?: FlowPage }
  ) {
    draftSkip.current = true;
    const vehicle = isVehicleCategoryCode(d.categoryCode);
    const list = vehicle ? VEHICLE_PAGES : OTHER_PAGES;
    // Sayfa + index'i await ÖNCESİ set et — kategori flaşını önler
    setPages(list);
    let idx = Math.min(Math.max(d.pageIndex ?? 0, 0), list.length - 1);
    if (opts?.landOn) {
      const forced = list.indexOf(opts.landOn);
      if (forced >= 0) idx = forced;
    }
    setPageIndex(idx);

    if (d.categoryId) {
      setCategoryId(d.categoryId);
      setCategoryCode(d.categoryCode ?? null);
      setCategoryName(d.categoryName ?? null);
      await loadBrands(d.categoryId);
    }
    if (d.vehicleYear) setVehicleYear(d.vehicleYear);
    if (d.brandId) {
      setBrandId(d.brandId);
      setBrandName(d.brandName ?? null);
      setBrandCode(d.brandCode ?? null);
      await loadModels(d.brandId);
    }
    if (d.modelId) {
      setModelId(d.modelId);
      setParentId(d.modelId);
      setChildId(d.modelId);
      setModelName(d.modelName ?? null);
      await loadBody(d.modelId);
      await loadEngines(d.modelId);
    }
    if (d.bodyStyleId) {
      setBodyStyleId(d.bodyStyleId);
      setBodyStyleName(d.bodyStyleName ?? null);
    }
    if (d.engineId) {
      setEngineId(d.engineId);
      setEngineName(d.engineName ?? null);
      await loadPackages(d.engineId);
    }
    if (d.packageId) {
      setPackageId(d.packageId);
      setPackageName(d.packageName ?? null);
    }
    if (d.transmission) setTransmission(d.transmission);
    if (d.mileage) setMileage(formatMileageThousandsTr(String(d.mileage)));
    if (d.color) setColor(d.color);
    if (d.fuelType) setFuelType(d.fuelType);
    if (d.vehicleCondition) setCondition(d.vehicleCondition);
    if (d.driveType) setDriveType(d.driveType);
    if (d.horsepower) setHorsepowerStr(String(d.horsepower));
    if (d.engineCapacity) setEngineCapacityStr(String(d.engineCapacity));
    if (d.warranty != null) setWarranty(Boolean(d.warranty));
    if (d.heavyDamageRecord != null)
      setHeavyDamageRecord(Boolean(d.heavyDamageRecord));
    if (d.isTradeable != null) setIsTradeable(Boolean(d.isTradeable));
    if (d.plateNationality) setPlateNationality(d.plateNationality);
    if (d.hasExpertise != null) setHasExpertise(Boolean(d.hasExpertise));
    if (d.expertizPanels && typeof d.expertizPanels === "object") {
      const parsed = parseExpertizPanels(d.expertizPanels);
      if (parsed) setExpertiz(parsed);
      else {
        // Taslakta UI durum anahtarları (orijinal/boyalı…) olabilir
        setExpertiz(d.expertizPanels as Partial<Record<PanelKey, ExpertizDurum | "">>);
      }
    }
    if (d.plate) setPlate(d.plate);
    if (d.eidsAccountOk) setEidsAccountOk(true);
    if (d.eidsVehicleOk) setEidsVehicleOk(true);
    if (d.title) setTitle(d.title);
    if (d.description) setDescription(d.description);
    if (d.price) setPriceStr(formatPriceThousandsTr(String(d.price)));
    if (d.cityId) setCityId(d.cityId);
    if (d.district) setDistrict(d.district);
    if (d.phone) setPhone(d.phone);
    if (
      d.packageIntent === "acil" ||
      d.packageIntent === "boost" ||
      d.packageIntent === "both" ||
      d.packageIntent === "none"
    ) {
      setPackageIntent(d.packageIntent);
    }
    // landOn varsa tekrar taslak index'ine basma
    if (!opts?.landOn) {
      setPageIndex(Math.min(Math.max(d.pageIndex ?? 0, 0), list.length - 1));
    } else {
      const forced = list.indexOf(opts.landOn);
      if (forced >= 0) setPageIndex(forced);
    }
    setDraftBanner(null);
    setTimeout(() => {
      draftSkip.current = false;
    }, 500);
  }

  const startEids = async () => {
    setEidsBusy(true);
    setEidsMsg(null);
    try {
      await persistDraft();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setEidsMsg("Oturum gerekli.");
        return;
      }
      const res = await fetch("/api/eids/start", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "web",
          webReturnPath: "/ilan-ver?step=eids",
        }),
      });
      const body = (await res.json()) as {
        authUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.authUrl) {
        setEidsMsg(body.error || "e-Devlet başlatılamadı.");
        return;
      }
      window.location.href = body.authUrl;
    } catch {
      setEidsMsg("e-Devlet açılamadı.");
    } finally {
      setEidsBusy(false);
    }
  };

  const lookupPlate = async () => {
    setEidsBusy(true);
    setEidsMsg(null);
    setEidsMismatches([]);
    setEidsOfficial(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setEidsMsg("Oturum gerekli. Tekrar giriş yap.");
        return;
      }
      if (!eidsAccountOk) {
        setEidsMsg("Önce e-Devlet ile hesabı doğrula.");
        return;
      }
      const plakaNo = plate.trim();
      const res = await fetch("/api/eids/lookup-vehicle", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plakaNo, plaka: plakaNo }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        markaAdi?: string;
        error?: string;
        message?: string;
        errors?: string[];
        data?: {
          markaAdi?: string | null;
          ticariAdi?: string | null;
          modelYili?: string | null;
        };
      };
      if (!res.ok || !body.ok) {
        console.warn("[eids lookup-vehicle]", {
          status: res.status,
          body,
          plakaNo,
        });
        setEidsVehicleOk(false);
        setEidsMsg(
          humanizeEidsLookupError({
            status: res.status,
            error: body.error,
            message: body.message,
            errors: body.errors,
          })
        );
        return;
      }
      const marka = (body.data?.markaAdi || body.markaAdi || null)?.trim() || null;
      const ticari = body.data?.ticariAdi?.trim() || null;
      const yil = body.data?.modelYili?.trim() || null;
      setEidsOfficial({ markaAdi: marka, ticariAdi: ticari, modelYili: yil });
      setEidsVehicleOk(true);
      setPlateNationality(PLATE_TR);
      // e-Devlet TR plaka yetkisi → uyruk kilitli TR
      setPlateNationality(PLATE_TR);

      const mismatches: EidsMismatch[] = [];
      const officialYear = yil ? Number.parseInt(yil, 10) : NaN;
      if (
        Number.isFinite(officialYear) &&
        vehicleYear != null &&
        officialYear !== vehicleYear
      ) {
        mismatches.push({
          field: "year",
          title: "Model yılı uyuşmuyor",
          detail: `Sen: ${vehicleYear} · e-Devlet: ${officialYear}`,
          goPage: "year",
          goLabel: "Model yılını düzelt",
        });
      }
      if (marka && brandName && !looseNameMatch(brandName, marka)) {
        mismatches.push({
          field: "brand",
          title: "Marka uyuşmuyor",
          detail: `Sen: ${brandName} · e-Devlet: ${marka}`,
          goPage: "brand",
          goLabel: "Markayı düzelt",
        });
      }
      if (ticari && modelName && !looseNameMatch(modelName, ticari)) {
        mismatches.push({
          field: "model",
          title: "Model uyuşmuyor",
          detail: `Sen: ${modelName} · e-Devlet: ${ticari}`,
          goPage: "model",
          goLabel: "Modeli düzelt",
        });
      }
      setEidsMismatches(mismatches);

      const officialLine = [marka, ticari, yil].filter(Boolean).join(" · ");
      if (mismatches.length === 0) {
        setEidsMsg(
          officialLine
            ? `Plaka yetkisi OK · ${officialLine}`
            : "Plaka yetkisi doğrulandı."
        );
      } else {
        setEidsMsg(
          `Plaka yetkisi OK, ama girdiğin bilgiler e-Devlet kaydıyla uyuşmuyor${
            officialLine ? ` (${officialLine})` : ""
          }.`
        );
      }
    } catch (e) {
      console.warn("[eids lookup-vehicle] exception", e);
      setEidsVehicleOk(false);
      setEidsMsg("Plaka sorgusu başarısız. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setEidsBusy(false);
    }
  };

  /** e-Devlet kaydına göre yıl / marka / modeli otomatik hizala */
  const autoFixFromEids = async () => {
    if (!eidsOfficial) return;
    setEidsBusy(true);
    setErr(null);
    try {
      const yil = eidsOfficial.modelYili
        ? Number.parseInt(eidsOfficial.modelYili, 10)
        : NaN;
      if (Number.isFinite(yil)) {
        setVehicleYear(yil);
      }

      const prevModelId = childId || parentId || modelId;
      const prevEngineId = engineId;
      const prevEngineName = engineName;
      const prevPackageId = packageId;
      const prevPackageName = packageName;
      const prevBodyId = bodyStyleId;
      const prevBodyName = bodyStyleName;

      let modelPool: IdNameRow[] = hierarchical
        ? [...parents, ...children]
        : [...flatModels];

      if (eidsOfficial.markaAdi) {
        const brandHit =
          brands.find((b) => looseNameMatch(b.name, eidsOfficial.markaAdi)) ??
          null;
        if (brandHit) {
          setBrandId(brandHit.id);
          setBrandName(brandHit.name ?? null);
          setBrandCode(brandHit.code ?? null);
          const hier = await fetchBrandModelsHierarchy(supabase, brandHit.id);
          setHierarchical(hier.hierarchical);
          if (hier.hierarchical) {
            setParents(hier.parents);
            setChildren([]);
            setFlatModels([]);
            modelPool = [...hier.parents];
          } else {
            setFlatModels(hier.parents);
            setParents([]);
            setChildren([]);
            modelPool = [...hier.parents];
          }
        }
      }

      if (eidsOfficial.ticariAdi && modelPool.length > 0) {
        let best: IdNameRow | null = null;
        let bestLen = 0;
        for (const m of modelPool) {
          const n = (m.name ?? "").trim();
          if (!n || !looseNameMatch(n, eidsOfficial.ticariAdi)) continue;
          const len = normTrToken(n).length;
          if (len > bestLen) {
            best = m;
            bestLen = len;
          }
        }
        if (best) {
          const modelChanged = best.id !== prevModelId;
          setModelId(best.id);
          setParentId(best.id);
          setChildId(best.id);
          setModelName(best.name ?? null);

          if (modelChanged) {
            setBodyStyleId(null);
            setBodyStyleName(null);
            setEngineId(null);
            setEngineName(null);
            setPackageId(null);
            setPackageName(null);
            setPackages([]);
          }

          const bodies = await loadBody(best.id);
          const engs = await loadEngines(best.id);

          let keepEngineId: string | null = null;
          let keepPackId: string | null = null;
          let packLen = 0;

          if (!modelChanged && prevEngineId) {
            const engOk = engs.some((e) => e.id === prevEngineId);
            if (engOk) {
              keepEngineId = prevEngineId;
              setEngineId(prevEngineId);
              setEngineName(prevEngineName);
              const packs = await loadPackages(prevEngineId);
              packLen = packs.length;
              if (prevPackageId && packs.some((p) => p.id === prevPackageId)) {
                keepPackId = prevPackageId;
                setPackageId(prevPackageId);
                setPackageName(prevPackageName);
              } else {
                setPackageId(null);
                setPackageName(null);
              }
            } else {
              setEngineId(null);
              setEngineName(null);
              setPackageId(null);
              setPackageName(null);
              setPackages([]);
            }
          }

          if (!modelChanged && prevBodyId && bodies.some((b) => b.id === prevBodyId)) {
            setBodyStyleId(prevBodyId);
            setBodyStyleName(prevBodyName);
          } else if (modelChanged || (prevBodyId && !bodies.some((b) => b.id === prevBodyId))) {
            setBodyStyleId(null);
            setBodyStyleName(null);
          }

          // Sadece gerçekten eksikse motor/paket/kasa sayfasına at
          if (engs.length > 0 && !keepEngineId) {
            const idx = pages.indexOf("engine");
            if (idx >= 0) {
              await goTo(idx, {
                body: bodies.length,
                engine: engs.length,
                pack: 0,
              });
              setEidsMsg(
                "Seçimin e-Devlet kaydına göre düzeltildi. Motor / donanımı seç."
              );
              return;
            }
          }
          if (packLen > 0 && keepEngineId && !keepPackId) {
            const idx = pages.indexOf("package");
            if (idx >= 0) {
              await goTo(idx, {
                body: bodies.length,
                engine: engs.length,
                pack: packLen,
              });
              setEidsMsg(
                "Seçimin e-Devlet kaydına göre düzeltildi. Paketi seç."
              );
              return;
            }
          }
          const bodyKept =
            !modelChanged &&
            prevBodyId &&
            bodies.some((b) => b.id === prevBodyId);
          if (bodies.length > 0 && !bodyKept) {
            const idx = pages.indexOf("bodyStyle");
            if (idx >= 0) {
              await goTo(idx, {
                body: bodies.length,
                engine: engs.length,
                pack: packLen,
              });
              setEidsMsg(
                "Seçimin e-Devlet kaydına göre düzeltildi. Kasa tipini seç."
              );
              return;
            }
          }
        }
      }

      setEidsMsg("Seçimin e-Devlet kaydına göre düzeltildi.");
    } catch (e) {
      console.warn("[eids autoFix]", e);
      setErr("Otomatik düzeltme başarısız. Manuel seç.");
    } finally {
      setEidsBusy(false);
    }
  };

  /** Marka/model sonrası doldurulması gereken ama boş kalan adımlar (sayfa sırasıyla) */
  function hierarchyGaps(): { page: FlowPage; label: string }[] {
    if (!isVehicle) return [];
    const gaps: { page: FlowPage; label: string }[] = [];
    if (engines.length > 0 && !engineId) {
      gaps.push({ page: "engine", label: "Motor / donanım" });
    }
    if (packages.length > 0 && !packageId) {
      gaps.push({ page: "package", label: "Paket" });
    }
    if (!transmission) {
      gaps.push({ page: "transmission", label: "Vites" });
    }
    if (bodyStyles.length > 0 && !bodyStyleId) {
      gaps.push({ page: "bodyStyle", label: "Kasa tipi" });
    }
    return gaps;
  }

  const goNext = async () => {
    // Sticky İleri focus’u sayfayı footer’a kaydırmasın
    if (typeof document !== "undefined") {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) ae.blur();
    }
    setErr(null);
    setFieldErrorId(null);
    const block = validateCurrentPage();
    if (block) {
      setErr(block.message);
      setFieldErrorId(block.fieldId);
      scrollToField(block.fieldId);
      return;
    }

    // eids çıkışında eksik hiyerarşi — sadece yeni ilan
    if (isVehicle && page === "eids" && !isEditMode) {
      let engId = engineId;
      let engName = engineName;
      let packId = packageId;
      let packName = packageName;
      let bodyId = bodyStyleId;
      let bodyName = bodyStyleName;
      let trans = transmission;
      let packCount = packages.length;

      if (!engId || !packId || !bodyId || !trans) {
        const d = await fetchListingDraft().catch(() => null);
        if (d) {
          if (!engId && d.engineId) {
            engId = d.engineId;
            engName = d.engineName ?? null;
            setEngineId(engId);
            setEngineName(engName);
            const rows = await loadPackages(engId);
            packCount = rows.length;
          }
          if (!packId && d.packageId) {
            packId = d.packageId;
            packName = d.packageName ?? null;
            setPackageId(packId);
            setPackageName(packName);
          }
          if (!bodyId && d.bodyStyleId) {
            bodyId = d.bodyStyleId;
            bodyName = d.bodyStyleName ?? null;
            setBodyStyleId(bodyId);
            setBodyStyleName(bodyName);
          }
          if (!trans && d.transmission) {
            trans = d.transmission;
            setTransmission(trans);
          }
        }
      }

      // Motor seçili ama paket listesi henüz yüklenmediyse yükle
      if (engId && packCount === 0) {
        const rows = await loadPackages(engId);
        packCount = rows.length;
      }

      const gaps: { page: FlowPage; label: string }[] = [];
      if (engines.length > 0 && !engId) {
        gaps.push({ page: "engine", label: "Motor / donanım" });
      }
      if (packCount > 0 && !packId) {
        gaps.push({ page: "package", label: "Paket" });
      }
      if (!trans) {
        gaps.push({ page: "transmission", label: "Vites" });
      }
      if (bodyStyles.length > 0 && !bodyId) {
        gaps.push({ page: "bodyStyle", label: "Kasa tipi" });
      }
      if (gaps.length > 0) {
        const labels = gaps.map((g) => g.label).join(", ");
        const idx = pages.indexOf(gaps[0].page);
        if (idx >= 0) await goTo(idx);
        setErr(
          `Eksik kalan: ${labels}. Bu sayfada eklenmesi gereken şeyler.`
        );
        setFieldErrorId(null);
        return;
      }
    }

    if (pageIndex >= pages.length - 1) {
      await publish();
      return;
    }
    await goTo(pageIndex + 1);
  };

  // Kullanıcı yıl/marka/model düzeltince eids adımında uyuşmazlığı tazele
  useEffect(() => {
    if (!eidsOfficial || !eidsVehicleOk) return;
    const mismatches: EidsMismatch[] = [];
    const officialYear = eidsOfficial.modelYili
      ? Number.parseInt(eidsOfficial.modelYili, 10)
      : NaN;
    if (
      Number.isFinite(officialYear) &&
      vehicleYear != null &&
      officialYear !== vehicleYear
    ) {
      mismatches.push({
        field: "year",
        title: "Model yılı uyuşmuyor",
        detail: `Sen: ${vehicleYear} · e-Devlet: ${officialYear}`,
        goPage: "year",
        goLabel: "Model yılını düzelt",
      });
    }
    if (
      eidsOfficial.markaAdi &&
      brandName &&
      !looseNameMatch(brandName, eidsOfficial.markaAdi)
    ) {
      mismatches.push({
        field: "brand",
        title: "Marka uyuşmuyor",
        detail: `Sen: ${brandName} · e-Devlet: ${eidsOfficial.markaAdi}`,
        goPage: "brand",
        goLabel: "Markayı düzelt",
      });
    }
    if (
      eidsOfficial.ticariAdi &&
      modelName &&
      !looseNameMatch(modelName, eidsOfficial.ticariAdi)
    ) {
      mismatches.push({
        field: "model",
        title: "Model uyuşmuyor",
        detail: `Sen: ${modelName} · e-Devlet: ${eidsOfficial.ticariAdi}`,
        goPage: "model",
        goLabel: "Modeli düzelt",
      });
    }
    setEidsMismatches(mismatches);
    if (mismatches.length === 0) {
      const officialLine = [
        eidsOfficial.markaAdi,
        eidsOfficial.ticariAdi,
        eidsOfficial.modelYili,
      ]
        .filter(Boolean)
        .join(" · ");
      setEidsMsg(
        officialLine
          ? `Plaka yetkisi OK · ${officialLine}`
          : "Plaka yetkisi doğrulandı."
      );
    }
  }, [eidsOfficial, eidsVehicleOk, vehicleYear, brandName, modelName]);

  async function publish() {
    if (busy || lock.current) return;
    lock.current = true;
    setErr(null);
    setBusy(true);
    try {
      const priceNum = parsePriceTry(priceStr);
      if (priceNum == null) {
        setErr("Geçerli fiyat girin.");
        return;
      }
      if (priceNum < MIN_LISTING_PRICE_TRY) {
        setErr(`İlan fiyatı en az ${MIN_LISTING_PRICE_TRY} ₺ olmalı.`);
        return;
      }
      if (!title.trim()) {
        setErr("Başlık gerekli.");
        return;
      }
      if (!description.trim()) {
        setErr("Açıklama gerekli.");
        return;
      }
      if (!cityId) {
        setErr("Şehir seçin.");
        return;
      }
      if (!isValidTrMobile10(normalizePhoneDigits(phone).slice(-10))) {
        setErr("Geçerli cep telefonu girin.");
        return;
      }
      if (files.length === 0 && !(isEditMode && existingGalleryUrls.length > 0)) {
        setErr("En az bir fotoğraf ekleyin.");
        return;
      }
      if (isVehicle) {
        if (!brandId || (!modelId && !parentId && !childId && !modelName)) {
          setErr("Marka ve model seçin.");
          return;
        }
        if (!vehicleYear) {
          setErr("Yıl seçin.");
          return;
        }
        if (!transmission) {
          setErr("Vites seçin.");
          return;
        }
        if (parseMileageTry(mileage) == null) {
          setErr("Kilometre zorunlu.");
          return;
        }
        if (!isEditMode && plate.trim().replace(/\s+/g, "").length < 5) {
          setErr("Plaka zorunlu.");
          return;
        }
        if (!color) {
          setErr("Renk seçin.");
          return;
        }
        if (!fuelType) {
          setErr("Yakıt tipi seçin.");
          return;
        }
        if (!isEditMode && !condition) {
          setErr("Araç durumu seçin.");
          return;
        }
        if (
          !isEditMode &&
          WEB_EIDS_STEP_ENABLED &&
          (!eidsAccountOk || !eidsVehicleOk)
        ) {
          setErr("e-Devlet hesap ve plaka doğrulamasını tamamlayın.");
          return;
        }
      }
      if (!district.trim()) {
        setErr("İlçe / semt yazın.");
        return;
      }

      const digits = normalizePhoneDigits(phone);
      const ten =
        digits.length === 11 && digits.startsWith("0")
          ? digits.slice(1)
          : digits.slice(-10);

      const desc = composeListingDescription({
        userDescription: description,
        isVehicle,
        isMotorcycle: categoryCode === "motosiklet",
        otherBrandNote: null,
        seriModelNote: modelName,
        kasaTipiNote: bodyStyleName,
        motorNote: engineName,
        paketNote: packageName,
        fuelType,
        transmissionType: transmission,
        driveType,
        vehicleCondition: condition,
        warranty,
        heavyDamageRecorded: heavyDamageRecord,
        plakaUyruk: plateNationality,
      });

      const filter = ContentFilterService.validateListingContent(
        title.trim(),
        desc
      );
      if (!filter.ok) {
        setErr(filter.message ?? "İçerik reddedildi.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErr("Oturum yok.");
        return;
      }

      if (
        !isEditMode &&
        listingQuota &&
        !listingQuota.unlimited &&
        listingQuota.remaining <= 0
      ) {
        setErr(`Son 12 ayda ${listingQuota.limit} ücretsiz hakkınız doldu.`);
        return;
      }

      const resolvedModel = childId || parentId || modelId;

      // Yakıt Elektrik → elektrikli kategorisinde yayınla (otomobil/SUV seçilmiş olsa bile)
      let publishCategoryId = categoryId;
      const fuelNorm = (fuelType ?? "").toLocaleLowerCase("tr");
      const isElectricFuel =
        fuelNorm.includes("elektrik") && !fuelNorm.includes("hibrit");
      if (
        isVehicle &&
        isElectricFuel &&
        (categoryCode === "otomobil" ||
          categoryCode === "suv_pickup" ||
          categoryCode === "panelvan")
      ) {
        const evCat = categories.find(
          (c) => String(c.code ?? "").toLowerCase() === "elektrikli"
        );
        if (evCat?.id) publishCategoryId = evCat.id;
      }

      const base: Record<string, unknown> = {
        category_id: publishCategoryId,
        title: title.trim(),
        description: desc,
        price: priceNum,
        is_fixed_price: true,
        is_negotiable: false,
        city_id: cityId,
        district: district.trim() || null,
        contact_phone: formatContactPhone(ten),
      };
      if (!isEditMode) {
        base.user_id = user.id;
        base.activated_at = new Date().toISOString();
        Object.assign(base, moderationPayload(), listingCreatedClientField());
      } else {
        Object.assign(base, moderationPayload());
      }
      if (userCountryId) base.country_id = userCountryId;
      if (isVehicle) {
        base.vehicle_brand_id = brandId;
        base.vehicle_model = modelName || "—";
        base.vehicle_year = vehicleYear;
        base.vehicle_mileage = parseMileageTry(mileage);
        base.fuel_type = fuelType;
        base.transmission_type = transmission;
        base.color = color;
        base.body_type = bodyStyleName;
        base.drive_type = driveType;
        base.is_tradeable = isTradeable;
        base.is_damaged = heavyDamageRecord;
        const hp = Number.parseInt(horsepowerStr.replace(/\D/g, ""), 10);
        if (Number.isFinite(hp) && hp > 0) base.engine_power = hp;
        const cc = Number.parseFloat(
          engineCapacityStr.replace(",", ".").replace(/[^\d.]/g, "")
        );
        if (Number.isFinite(cc) && cc > 0) base.engine_capacity = cc;
        base.has_expertise = showExpertiz ? hasExpertise : false;
        if (showExpertiz) {
          base.expertiz_panels = expertizPanelsToJson(expertiz);
        } else if (isEditMode) {
          base.expertiz_panels = null;
        }
        if (resolvedModel) base.vehicle_brand_model_id = resolvedModel;
        if (packageId) base.vehicle_engine_package_id = packageId;
      }

      const duplicateId = await findLiveDuplicateListingId(supabase, {
        userId: user.id,
        title: title.trim(),
        price: priceNum,
        vehicleModel: isVehicle ? String(base.vehicle_model ?? "") : null,
        vehicleYear: isVehicle ? vehicleYear : null,
        vehicleMileage: isVehicle
          ? (typeof base.vehicle_mileage === "number"
              ? base.vehicle_mileage
              : null)
          : null,
        categoryId: publishCategoryId,
        excludeListingId: isEditMode ? editListingId : null,
      });
      if (duplicateId) {
        setErr(DUPLICATE_LIVE_LISTING_MESSAGE);
        return;
      }

      if (isEditMode && editListingId) {
        const qualityResubmitPending = editOpenedSnapshot.current
          ? listingNeedsQualityResubmitOnEdit(editOpenedSnapshot.current)
          : false;

        const { error: upErr } = await supabase
          .from("listings")
          .update(
            sanitizeListingClientWrite(base, "update", {
              qualityResubmitPending,
            })
          )
          .eq("id", editListingId)
          .eq("user_id", user.id);

        if (upErr) {
          setErr(upErr.message ?? "Güncelleme başarısız.");
          return;
        }

        const env = getSupabaseEnv();
        let coverUrl: string | undefined;
        let galleryUrlsForDb: string[];

        if (files.length > 0) {
          const preparedFiles = await compressListingImageFiles(files);
          const { data: listed, error: listErr } = await supabase.storage
            .from("listings-images")
            .list(editListingId);
          if (listErr) {
            setErr(`Depo okunamadı: ${listErr.message}`);
            return;
          }
          let maxI = -1;
          for (const o of listed ?? []) {
            const m = /^(\d+)\./i.exec(o.name);
            if (m) maxI = Math.max(maxI, parseInt(m[1], 10));
          }
          const startIdx = maxI + 1;
          for (let i = 0; i < preparedFiles.length; i++) {
            const f = preparedFiles[i];
            const ext = extForFile(f);
            const path = `${editListingId}/${startIdx + i}.${ext}`;
            const { error: upFi } = await supabase.storage
              .from("listings-images")
              .upload(path, f, {
                upsert: true,
                contentType: mimeForUpload(f),
              });
            if (upFi) {
              setErr(`Görsel yüklenemedi: ${upFi.message}`);
              return;
            }
          }
          const { data: listed2 } = await supabase.storage
            .from("listings-images")
            .list(editListingId);
          const names = (listed2 ?? [])
            .map((o) => o.name)
            .filter((n) => /^\d+\.[a-z0-9]+$/i.test(n))
            .sort((a, b) => {
              const na = parseInt(a.split(".")[0], 10);
              const nb = parseInt(b.split(".")[0], 10);
              return na - nb;
            });
          galleryUrlsForDb = names.map((n) =>
            publicListingImageUrl(env, `${editListingId}/${n}`)
          );
          coverUrl = galleryUrlsForDb[coverIndex] ?? galleryUrlsForDb[0];
        } else {
          galleryUrlsForDb = [...existingGalleryUrls];
          coverUrl =
            existingGalleryUrls[coverIndex] ?? existingGalleryUrls[0];
        }

        if (!coverUrl) {
          setErr("Kapak görseli belirlenemedi.");
          return;
        }

        const { error: imgErr } = await supabase
          .from("listings")
          .update({ image_url: coverUrl, images: galleryUrlsForDb })
          .eq("id", editListingId)
          .eq("user_id", user.id);
        if (imgErr) {
          const retry = await supabase
            .from("listings")
            .update({ image_url: coverUrl })
            .eq("id", editListingId)
            .eq("user_id", user.id);
          if (retry.error) {
            setErr(`Kapak güncellenemedi: ${retry.error.message}`);
            return;
          }
        }

        if (!qualityResubmitPending) {
          await evaluateListingQualityAfterSave(
            supabase,
            editListingId,
            "listings"
          );
        }

        window.location.href = "/profil/ilanlarim";
        return;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("listings")
        .insert(sanitizeListingClientWrite(base, "insert"))
        .select("id, listing_number")
        .single();

      if (insErr || !inserted?.id) {
        const msg = insErr?.message ?? "Kayıt başarısız.";
        if (/price_below_minimum/i.test(msg)) {
          setErr(`İlan fiyatı en az ${MIN_LISTING_PRICE_TRY} ₺ olmalı.`);
          return;
        }
        setErr(
          isDuplicateLiveListingError(msg)
            ? DUPLICATE_LIVE_LISTING_MESSAGE
            : msg
        );
        return;
      }

      const listingId = inserted.id as string;
      await recordActivationUse(
        supabase,
        user.id,
        listingId,
        listingQuota?.unlimited ? "membership" : "free"
      );

      const env = getSupabaseEnv();
      const prepared = await compressListingImageFiles(files);
      const galleryUrls: string[] = [];
      for (let i = 0; i < prepared.length; i++) {
        const f = prepared[i];
        const path = `${listingId}/${i}.${extForFile(f)}`;
        const { error: upErr } = await supabase.storage
          .from("listings-images")
          .upload(path, f, {
            upsert: true,
            contentType: mimeForUpload(f),
          });
        if (upErr) throw new Error(upErr.message);
        galleryUrls.push(publicListingImageUrl(env, path));
      }
      const coverUrl =
        galleryUrls[Math.min(coverIndex, galleryUrls.length - 1)] ??
        galleryUrls[0];
      await supabase
        .from("listings")
        .update({ image_url: coverUrl, images: galleryUrls })
        .eq("id", listingId);

      await evaluateListingQualityAfterSave(supabase, listingId, "listings");
      await deleteListingDraft();
      const listingRef = String(
        (inserted as { listing_number?: number | string }).listing_number ??
          listingId
      );
      if (packageIntent === "boost" || packageIntent === "both") {
        const q = new URLSearchParams({ listing: listingRef });
        if (packageIntent === "both") q.set("next", "acil");
        window.location.href = `/ilan-one-cikar?${q.toString()}`;
        return;
      }
      if (packageIntent === "acil") {
        window.location.href = `/ilan-acil?listing=${encodeURIComponent(listingRef)}`;
        return;
      }
      window.location.href = "/profil/ilanlarim";
      return;
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Yayınlanamadı.";
      setErr(
        /price_below_minimum/i.test(raw)
          ? `İlan fiyatı en az ${MIN_LISTING_PRICE_TRY} ₺ olmalı.`
          : raw
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const heading = (() => {
    switch (page) {
      case "category":
        return "Kategori seç";
      case "year":
        return "Model yılı";
      case "brand":
        return "Marka seç";
      case "model":
        return "Model seç";
      case "bodyStyle":
        return "Kasa tipi";
      case "engine":
        return "Motor / donanım";
      case "package":
        return "Paket";
      case "transmission":
        return "Vites";
      case "details":
        return "Araç detayları";
      case "eids":
        return "e-Devlet doğrulama";
      case "content":
        return "Fotoğraf, içerik, konum";
      case "expertiz":
        return "Kaporta ekspertiz";
      case "boosts":
        return "Daha hızlı sat";
      default:
        return "İlan ver";
    }
  })();

  function togglePackageIntent(kind: "acil" | "boost") {
    setPackageIntent((prev) => {
      if (kind === "acil") {
        if (prev === "acil") return "none";
        if (prev === "boost") return "both";
        if (prev === "both") return "boost";
        return "acil";
      }
      if (prev === "boost") return "none";
      if (prev === "acil") return "both";
      if (prev === "both") return "acil";
      return "boost";
    });
  }

  const saveDraftAndExit = async () => {
    setErr(null);
    try {
      // Banner taslağı varken boş kategoriye basma
      if (draftBanner && pageIndex === 0 && !categoryId) {
        window.location.href = "/";
        return;
      }
      draftSkip.current = false;
      await persistDraft();
      window.location.href = "/profil/ilanlarim";
    } catch (e) {
      console.warn("[saveDraftAndExit]", e);
      setErr("Taslak kaydedilemedi. Tekrar dene.");
    }
  };

  const thumbUrls = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );
  useEffect(
    () => () => {
      for (const u of thumbUrls) URL.revokeObjectURL(u);
    },
    [thumbUrls]
  );

  // Eski: seçili satırı ortalıyordu → İleri’de site footer ekrana geliyordu. Kaldırıldı.
  // Sayfa değişince scrollFlowToTop / hata olunca scrollToField kullanılıyor.

  const selectionHasValue = (() => {
    switch (page) {
      case "category":
        return Boolean(categoryId);
      case "year":
        return vehicleYear != null;
      case "brand":
        return Boolean(brandId);
      case "model":
        return Boolean(modelId || childId || parentId);
      case "bodyStyle":
        return bodyStyles.length === 0 || Boolean(bodyStyleId);
      case "engine":
        return engines.length === 0 || Boolean(engineId);
      case "package":
        return packages.length === 0 || Boolean(packageId);
      case "transmission":
        return Boolean(transmission);
      default:
        return true;
    }
  })();

  const fieldRing = (id: string) =>
    fieldErrorId === id
      ? "border-red-500 ring-2 ring-red-300"
      : "border-zinc-300";

  return (
    <div id="ilan-ver-top" className="mx-auto max-w-md space-y-3 pb-24">
      {!bootReady ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
          {isEditMode ? "İlan yükleniyor…" : "e-Devlet dönüşü yükleniyor…"}
        </div>
      ) : null}
      {bootReady ? (
        <>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="shrink-0 text-lg font-bold text-[#002776]">
            {isEditMode ? "İlanı Düzenle" : "İlan Ver"}
          </h1>
          {isEditMode && editListingNumber ? (
            <p className="text-xs font-medium text-zinc-500">
              #{editListingNumber}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {isEditMode ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/profil/ilanlarim";
              }}
              disabled={busy}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 sm:text-xs"
            >
              Çık
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void saveDraftAndExit()}
              disabled={busy}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 sm:text-xs"
            >
              Taslak kaydet ve çık
            </button>
          )}
          {!isEditMode && listingQuota && !listingQuota.unlimited ? (
            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
              Hak: {listingQuota.remaining}/{listingQuota.limit}
            </span>
          ) : null}
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-[#002776] transition-all duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {selectionTrail.length > 0 ? (
        <p
          className="rounded-lg border border-[#002776]/12 bg-white px-3 py-2 text-[12.5px] font-bold leading-snug text-[#002776]/90"
          title={selectionTrail.join(" › ")}
        >
          {selectionTrail.join(" › ")}
        </p>
      ) : null}

      {draftBanner ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm">
          <p className="font-bold text-blue-900">Kayıtlı taslak</p>
          <p className="mt-0.5 text-blue-800">{draftSummaryLine(draftBanner)}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#ffcc00] px-3 py-1.5 text-xs font-bold"
              onClick={() => void applyDraft(draftBanner)}
            >
              Devam et
            </button>
            <button
              type="button"
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold"
              onClick={() => {
                void deleteListingDraft();
                setDraftBanner(null);
              }}
            >
              Sil
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-[#002776]">{heading}</h2>
        {page === "eids" ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              eidsAccountOk
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {eidsAccountOk ? "Hesap doğrulandı" : "Hesap bekliyor"}
          </span>
        ) : null}
      </div>

      {err ? (
        <p
          id="ilan-ver-err"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {err}
        </p>
      ) : null}

      {page === "category" ? (
        <div>
          {categories.map((c) => (
            <FlowSelectTile
              key={c.id}
              compact
              title={c.name ?? c.code ?? c.id}
              selected={categoryId === c.id}
              leading={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={categoryIconSrc(c.code)}
                  alt=""
                  className="h-7 w-7 object-contain"
                />
              }
              onClick={() => void selectCategory(c)}
            />
          ))}
        </div>
      ) : null}

      {page === "year" ? (
        <div className="max-h-[60vh] overflow-y-auto">
          {years.map((y) => (
            <FlowSelectTile
              key={y}
              compact
              title={String(y)}
              selected={vehicleYear === y}
              onClick={() => {
                setVehicleYear(y);
                void goNext();
              }}
            />
          ))}
        </div>
      ) : null}

      {page === "brand" ? (
        <div className="max-h-[60vh] overflow-y-auto">
          {brands.map((b) => {
            const logo = brandLogoSrc(b.code);
            return (
              <FlowSelectTile
                key={b.id}
                compact
                title={b.name ?? b.code ?? b.id}
                selected={brandId === b.id}
                leading={
                  logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt=""
                      className="h-7 w-7 object-contain"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        if (el.dataset.fallback === "1") {
                          el.style.display = "none";
                          return;
                        }
                        el.dataset.fallback = "1";
                        const code = (b.code ?? "")
                          .trim()
                          .toLowerCase()
                          .replace(/\s+/g, "_");
                        el.src = `/car_brands/${code}-seeklogo.png`;
                      }}
                    />
                  ) : null
                }
                onClick={() => {
                  void (async () => {
                    setBrandId(b.id);
                    setBrandName(b.name ?? null);
                    setBrandCode(b.code ?? null);
                    setModelId(null);
                    setParentId(null);
                    setChildId(null);
                    await loadModels(b.id);
                    await goNext();
                  })();
                }}
              />
            );
          })}
        </div>
      ) : null}

      {page === "model" ? (
        <div className="max-h-[60vh] overflow-y-auto">
          {hierarchical && parentId && children.length > 0 ? (
            children.map((m) => (
              <FlowSelectTile
                compact
                key={m.id}
                title={m.name ?? m.id}
                selected={childId === m.id}
                onClick={() => {
                  void (async () => {
                    setChildId(m.id);
                    await afterModelChosen(m.id, m.name ?? null);
                  })();
                }}
              />
            ))
          ) : hierarchical ? (
            parents.map((m) => (
              <FlowSelectTile
                compact
                key={m.id}
                title={m.name ?? m.id}
                selected={parentId === m.id}
                onClick={() => {
                  void (async () => {
                    setParentId(m.id);
                    const kids = await fetchChildBrandModels(supabase, m.id);
                    setChildren(kids);
                    if (kids.length === 0) {
                      await afterModelChosen(m.id, m.name ?? null);
                    }
                  })();
                }}
              />
            ))
          ) : (
            modelOptions.map((m) => (
              <FlowSelectTile
                compact
                key={m.id}
                title={m.name ?? m.id}
                selected={modelId === m.id}
                onClick={() => {
                  void (async () => {
                    await afterModelChosen(m.id, m.name ?? null);
                  })();
                }}
              />
            ))
          )}
        </div>
      ) : null}

      {page === "bodyStyle" ? (
        <div>
          {(bodyStyles.length ? bodyStyles : [{ id: "_skip", name: "Atla (seçenek yok)" }]).map(
            (b) => (
              <FlowSelectTile
                compact
                key={b.id}
                title={b.name ?? b.id}
                selected={bodyStyleId === b.id}
                onClick={() => {
                  void (async () => {
                    if (b.id !== "_skip") {
                      setBodyStyleId(b.id);
                      setBodyStyleName(b.name ?? null);
                    }
                    await goNext();
                  })();
                }}
              />
            )
          )}
        </div>
      ) : null}

      {page === "engine" ? (
        <div>
          {(engines.length ? engines : [{ id: "_skip", name: "Atla (seçenek yok)" }]).map(
            (e) => (
              <FlowSelectTile
                compact
                key={e.id}
                title={e.name ?? e.id}
                selected={engineId === e.id}
                onClick={() => {
                  void (async () => {
                    if (e.id !== "_skip") {
                      setEngineId(e.id);
                      setEngineName(e.name ?? null);
                      setPackageId(null);
                      setPackageName(null);
                      const eng = engines.find((x) => x.id === e.id);
                      if (eng?.horsepower != null && Number(eng.horsepower) > 0) {
                        setHorsepowerStr(String(Math.round(Number(eng.horsepower))));
                      }
                      const cc = eng
                        ? engineCapacityCcFromRow(
                            eng.engine_capacity_cc,
                            eng.name
                          )
                        : null;
                      if (cc != null) {
                        setEngineCapacityStr(String(cc));
                      }
                      const rows = await loadPackages(e.id);
                      // setState yarışında taslak motoru silmesin — hemen yaz
                      void persistDraft({
                        engineId: e.id,
                        engineName: e.name ?? null,
                        packageId: null,
                        packageName: null,
                      });
                      const engIdx = pages.indexOf("engine");
                      await goTo(engIdx >= 0 ? engIdx + 1 : pageIndex + 1, {
                        pack: rows.length,
                      });
                      return;
                    }
                    await goNext();
                  })();
                }}
              />
            )
          )}
        </div>
      ) : null}

      {page === "package" ? (
        <div>
          {(packages.length ? packages : [{ id: "_skip", name: "Atla (seçenek yok)" }]).map(
            (p) => (
              <FlowSelectTile
                compact
                key={p.id}
                title={p.name ?? p.id}
                selected={packageId === p.id}
                onClick={() => {
                  void (async () => {
                    if (p.id !== "_skip") {
                      setPackageId(p.id);
                      setPackageName(p.name ?? null);
                      void persistDraft({
                        packageId: p.id,
                        packageName: p.name ?? null,
                      });
                    }
                    await goNext();
                  })();
                }}
              />
            )
          )}
        </div>
      ) : null}

      {page === "transmission" ? (
        <div>
          {TRANSMISSIONS.map((t) => (
            <FlowSelectTile
                compact
              key={t}
              title={t}
              selected={transmission === t}
              onClick={() => {
                setTransmission(t);
                void persistDraft({ transmission: t });
                void goNext();
              }}
            />
          ))}
        </div>
      ) : null}

      {page === "details" ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <label className="block text-sm font-medium">
            Kilometre <span className="text-red-600">*</span>
            <input
              id="ilan-ver-mileage"
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldRing("ilan-ver-mileage")}`}
              value={mileage}
              onChange={(e) => {
                setFieldErrorId(null);
                setMileage(formatMileageThousandsTr(e.target.value));
              }}
              inputMode="numeric"
              placeholder="85.000"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Renk <span className="text-red-600">*</span>
            <select
              id="ilan-ver-color"
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldRing("ilan-ver-color")}`}
              value={color ?? ""}
              onChange={(e) => {
                setFieldErrorId(null);
                setColor(e.target.value || null);
              }}
              required
            >
              <option value="">Seçin</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Yakıt <span className="text-red-600">*</span>
            <select
              id="ilan-ver-fuel"
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldRing("ilan-ver-fuel")}`}
              value={fuelType ?? ""}
              onChange={(e) => {
                setFieldErrorId(null);
                setFuelType(e.target.value || null);
              }}
              required
            >
              <option value="">Seçin</option>
              {FUELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Durum <span className="text-red-600">*</span>
            <select
              id="ilan-ver-condition"
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldRing("ilan-ver-condition")}`}
              value={condition ?? ""}
              onChange={(e) => {
                setFieldErrorId(null);
                setCondition(e.target.value || null);
              }}
              required
            >
              <option value="">Seçin</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Motor gücü (hp)
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                value={horsepowerStr}
                onChange={(e) =>
                  setHorsepowerStr(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                placeholder="örn. 90"
              />
            </label>
            <label className="block text-sm font-medium">
              Motor hacmi (cc)
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                value={engineCapacityStr}
                onChange={(e) =>
                  setEngineCapacityStr(e.target.value.replace(/[^\d.,]/g, ""))
                }
                inputMode="decimal"
                placeholder="örn. 1360"
              />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Çekiş <span className="text-red-600">*</span>
            <select
              id="ilan-ver-drive"
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldRing("ilan-ver-drive")}`}
              value={driveType ?? ""}
              onChange={(e) => {
                setFieldErrorId(null);
                setDriveType(e.target.value || null);
              }}
              required
            >
              <option value="">Seçin</option>
              {DRIVE_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            {(
              [
                {
                  key: "warranty",
                  label: "Servis garantisi",
                  value: warranty,
                  set: setWarranty,
                },
                {
                  key: "heavy",
                  label: "Ağır hasar kayıtlı",
                  value: heavyDamageRecord,
                  set: setHeavyDamageRecord,
                },
                {
                  key: "trade",
                  label: "Takas",
                  value: isTradeable,
                  set: setIsTradeable,
                },
              ] as const
            ).map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-zinc-800">
                  {row.label}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.value}
                  onClick={() => row.set(!row.value)}
                  className={`relative h-8 w-[4.5rem] shrink-0 rounded-full text-[11px] font-bold transition ${
                    row.value
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-300 text-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow transition ${
                      row.value ? "left-[2.2rem]" : "left-0.5"
                    }`}
                  />
                  <span
                    className={`relative z-10 px-1 ${
                      row.value ? "pr-7" : "pl-7"
                    }`}
                  >
                    {row.value ? "Evet" : "Hayır"}
                  </span>
                </button>
              </div>
            ))}
          </div>

          <label className="block text-sm font-medium">
            Plaka / Uyruk
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 disabled:bg-zinc-100 disabled:text-zinc-600"
              value={plateNationality}
              disabled={eidsVehicleOk}
              onChange={(e) => setPlateNationality(e.target.value)}
            >
              <option value={PLATE_TR}>{PLATE_TR}</option>
              <option value={PLATE_FOREIGN}>{PLATE_FOREIGN}</option>
            </select>
            {eidsVehicleOk ? (
              <span className="mt-1 block text-[11px] text-emerald-700">
                e-Devlet TR plaka doğrulandı — değiştirilemez.
              </span>
            ) : (
              <span className="mt-1 block text-[11px] text-zinc-500">
                Sonraki adımda e-Devlet TR doğrularsa kilitlenir. Yabancıysa
                “Yabancı Plakalı” seç.
              </span>
            )}
          </label>

          <label className="block text-sm font-medium">
            Plaka <span className="text-red-600">*</span>
            <input
              id="ilan-ver-plate"
              className={`mt-1 w-full rounded-lg border px-3 py-2 uppercase ${fieldRing("ilan-ver-plate")}`}
              value={plate}
              onChange={(e) => {
                setFieldErrorId(null);
                setPlate(e.target.value.toLocaleUpperCase("tr"));
              }}
              placeholder="34ABC123"
              required
            />
          </label>
        </div>
      ) : null}

      {page === "expertiz" && showExpertiz ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={hasExpertise}
              onChange={(e) => setHasExpertise(e.target.checked)}
            />
            Expertiz raporu var
          </label>

          <div>
            <p className="mb-1 text-sm font-bold text-zinc-900">
              Kaporta ekspertiz şeması
            </p>
            <p className="mb-2 text-xs text-zinc-500">
              Parça durumunu seç; şema renklenir (uygulamadaki gibi).
            </p>
            <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="mx-auto max-h-72 w-full max-w-sm">
                <ExpertizCarPreview
                  panels={expandExpertizPartial(expertiz)}
                  className="max-h-72"
                />
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
              {(Object.keys(PANEL_LABELS) as PanelKey[]).map((key) => (
                <div
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-700">
                    {PANEL_LABELS[key]}
                  </span>
                  <select
                    className="min-w-[10rem] rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium"
                    value={expertiz[key] ?? "orijinal"}
                    onChange={(e) => {
                      const v = e.target.value as ExpertizDurum;
                      setExpertiz((prev) => ({ ...prev, [key]: v }));
                    }}
                  >
                    {EXPERTIZ_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div
            id="ilan-ver-expertiz-confirm"
            className={`rounded-lg border-2 p-4 ${
              fieldErrorId === "ilan-ver-expertiz-confirm"
                ? "border-red-400 bg-red-50"
                : "border-blue-200 bg-blue-50"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={expertizConfirmed}
                onChange={(e) => {
                  setFieldErrorId(null);
                  setExpertizConfirmed(e.target.checked);
                }}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-blue-300 text-blue-600"
              />
              <div className="text-sm">
                <p className="font-semibold text-blue-900">
                  Expertiz bilgilerini doğru girdiğimi onaylıyorum{" "}
                  <span className="text-red-600">*</span>
                </p>
                <p className="mt-1 text-xs text-blue-800">
                  Yanlış girilen expertiz bilgisi ilanın kaldırılmasına yol
                  açabilir. Kaput, çamurluk, kapı vb. tüm bölgeleri doğru
                  işaretlediğinden emin ol.
                </p>
              </div>
            </label>
          </div>
        </div>
      ) : null}

      {page === "eids" ? (
        <div id="ilan-ver-eids" className="space-y-4">
          {!eidsAccountOk ? (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={eidsBusy}
                onClick={() => void startEids()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-bold text-zinc-900 disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/branding/edevlet_icon.png"
                  alt=""
                  className="h-5 w-5 object-contain"
                />
                e-Devlet ile doğrula
              </button>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[280px] space-y-2 text-center">
              <label className="block text-sm font-medium text-zinc-800">
                Plaka
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-center text-base font-semibold uppercase tracking-wide disabled:bg-zinc-100"
                  value={plate}
                  onChange={(e) =>
                    setPlate(e.target.value.toLocaleUpperCase("tr"))
                  }
                  placeholder="34ABC123"
                  disabled={!eidsAccountOk}
                />
              </label>
              <button
                type="button"
                disabled={eidsBusy || !eidsAccountOk || !plate.trim()}
                onClick={() => void lookupPlate()}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-[#ffcc00] disabled:opacity-50"
              >
                {eidsBusy ? "Sorgulanıyor…" : "Plakayı sorgula"}
              </button>
              <p className="text-left text-[11px] leading-snug text-zinc-500">
                Not: Sadece kendi adına kayıtlı veya e-Devlet’te yetkili
                göründüğün araçları sorgulayabilirsin (ör. malik, eş, anne/baba,
                çocuk — yetki tanımlıysa). Başkasının plakasını sorgulayamazsın.
              </p>
            </div>
          )}

          {eidsMsg && !eidsVehicleOk ? (
            <p className="text-center text-sm font-medium text-amber-800">
              {eidsMsg}
            </p>
          ) : null}

          {eidsOfficial && eidsVehicleOk ? (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="grid grid-cols-2 divide-x divide-zinc-200">
                <div className="p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                    Senin seçimin
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li
                      className={
                        eidsMismatches.some((m) => m.field === "brand")
                          ? "font-semibold text-red-600"
                          : "text-zinc-800"
                      }
                    >
                      <span className="block text-[10px] font-medium uppercase text-zinc-400">
                        Marka
                      </span>
                      {brandName || "—"}
                    </li>
                    <li
                      className={
                        eidsMismatches.some((m) => m.field === "model")
                          ? "font-semibold text-red-600"
                          : "text-zinc-800"
                      }
                    >
                      <span className="block text-[10px] font-medium uppercase text-zinc-400">
                        Model
                      </span>
                      {modelName || "—"}
                    </li>
                    <li
                      className={
                        eidsMismatches.some((m) => m.field === "year")
                          ? "font-semibold text-red-600"
                          : "text-zinc-800"
                      }
                    >
                      <span className="block text-[10px] font-medium uppercase text-zinc-400">
                        Yıl
                      </span>
                      {vehicleYear ?? "—"}
                    </li>
                  </ul>
                </div>
                <div className="p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    e-Devlet
                  </p>
                  <ul className="space-y-2 text-sm text-zinc-800">
                    <li>
                      <span className="block text-[10px] font-medium uppercase text-zinc-400">
                        Marka
                      </span>
                      {eidsOfficial.markaAdi || "—"}
                    </li>
                    <li>
                      <span className="block text-[10px] font-medium uppercase text-zinc-400">
                        Model
                      </span>
                      {eidsOfficial.ticariAdi || "—"}
                    </li>
                    <li>
                      <span className="block text-[10px] font-medium uppercase text-zinc-400">
                        Yıl
                      </span>
                      {eidsOfficial.modelYili || "—"}
                    </li>
                  </ul>
                </div>
              </div>
              {eidsMismatches.length === 0 ? (
                (() => {
                  const gaps = hierarchyGaps();
                  if (gaps.length > 0) {
                    return (
                      <div className="border-t border-amber-100 bg-amber-50 px-3 py-3">
                        <p className="mb-1 text-center text-xs font-semibold text-emerald-800">
                          Bilgiler uyuşuyor · plaka yetkisi OK
                        </p>
                        <p className="mb-2 text-center text-xs font-medium text-amber-900">
                          Eksik kalan:{" "}
                          {gaps.map((g) => g.label).join(", ")}. Bu sayfada
                          eklenmesi gereken şeyler.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = pages.indexOf(gaps[0].page);
                            if (idx >= 0) void goTo(idx);
                          }}
                          className="w-full rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-amber-700"
                        >
                          Eksikleri tamamla
                        </button>
                      </div>
                    );
                  }
                  return (
                    <p className="border-t border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
                      Bilgiler uyuşuyor · plaka yetkisi OK
                    </p>
                  );
                })()
              ) : (
                <div className="border-t border-red-100 bg-red-50 px-3 py-3">
                  <p className="mb-2 text-center text-xs font-medium text-red-800">
                    {eidsMismatches.map((m) => m.title).join(" · ")}
                  </p>
                  <button
                    type="button"
                    disabled={eidsBusy}
                    onClick={() => void autoFixFromEids()}
                    className="w-full rounded-lg bg-red-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {eidsBusy ? "Düzeltiliyor…" : "Otomatik düzelt"}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {page === "content" ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <input
            ref={fileInputRef}
            id="ilan-ver-photos"
            type="file"
            accept="image/*,image/heic,image/heif,.heic,.heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              const list = e.target.files;
              if (!list || list.length === 0) return;
              const incoming = Array.from(list).filter((f) => {
                const t = (f.type || "").toLowerCase();
                const n = f.name.toLowerCase();
                return (
                  t.startsWith("image/") ||
                  n.endsWith(".heic") ||
                  n.endsWith(".heif") ||
                  n.endsWith(".jpg") ||
                  n.endsWith(".jpeg") ||
                  n.endsWith(".png") ||
                  n.endsWith(".webp")
                );
              });
              if (incoming.length === 0) {
                setErr("Geçerli bir fotoğraf seç (JPG, PNG, WEBP veya HEIC).");
                e.target.value = "";
                return;
              }
              setErr(null);
              setFiles((prev) => {
                const next = [...prev, ...incoming].slice(0, MAX_LISTING_PHOTOS);
                if (next.length >= MAX_LISTING_PHOTOS && incoming.length > 0) {
                  /* limit reached — ok */
                }
                return next;
              });
              e.target.value = "";
            }}
          />
          <label
            id="ilan-ver-photos-box"
            htmlFor="ilan-ver-photos"
            className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-zinc-50 py-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 ${
              fieldErrorId === "ilan-ver-photos-box"
                ? "border-red-500 ring-2 ring-red-300"
                : "border-zinc-300"
            }`}
          >
            Fotoğraf ekle (
            {files.length + (isEditMode ? existingGalleryUrls.length : 0)}/
            {MAX_LISTING_PHOTOS})
            <span className="mt-1 text-[11px] font-normal text-zinc-500">
              Birden fazla seçebilirsin
            </span>
          </label>
          {isEditMode && existingGalleryUrls.length > 0 && files.length === 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {existingGalleryUrls.map((u, i) => (
                <div
                  key={`ex-${u}-${i}`}
                  className={`relative overflow-hidden rounded-lg border-2 ${
                    coverIndex === i ? "border-[#ffcc00]" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverIndex(i)}
                    className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white"
                  >
                    {coverIndex === i ? "Kapak" : "Kapak yap"}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {isEditMode && existingGalleryUrls.length > 0 ? (
            <p className="text-xs text-zinc-500">
              {existingGalleryUrls.length} mevcut görsel korunur
              {files.length > 0 ? "; yeni fotoğraflar eklenecek." : "."}
            </p>
          ) : null}
          {thumbUrls.length ? (
            <div className="grid grid-cols-3 gap-2">
              {thumbUrls.map((u, i) => (
                <div
                  key={`${u}-${i}`}
                  className={`relative overflow-hidden rounded-lg border-2 ${
                    coverIndex === i ? "border-[#ffcc00]" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverIndex(i)}
                    className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white"
                  >
                    {coverIndex === i ? "Kapak" : "Kapak yap"}
                  </button>
                  <button
                    type="button"
                    aria-label="Fotoğrafı sil"
                    onClick={() => {
                      setFiles((prev) => {
                        const next = prev.filter((_, idx) => idx !== i);
                        setCoverIndex((c) => {
                          if (next.length === 0) return 0;
                          if (c === i) return 0;
                          if (c > i) return c - 1;
                          return c;
                        });
                        return next;
                      });
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-zinc-500">
              Henüz fotoğraf yok. Yukarıdan ekle.
            </p>
          )}
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <label
                htmlFor="ilan-ver-title"
                className="text-sm font-medium text-zinc-700"
              >
                Başlık <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] tabular-nums text-zinc-500">
                {title.length}/{LISTING_TITLE_MAX_LENGTH}
              </span>
            </div>
            <input
              id="ilan-ver-title"
              className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldRing("ilan-ver-title")}`}
              placeholder="Başlık"
              value={title}
              maxLength={LISTING_TITLE_MAX_LENGTH}
              required
              onChange={(e) => {
                setFieldErrorId(null);
                setTitle(e.target.value);
              }}
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <label
                htmlFor="ilan-ver-description"
                className="text-sm font-medium text-zinc-700"
              >
                Açıklama <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] tabular-nums text-zinc-500">
                {description.length}/{LISTING_DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="ilan-ver-description"
              className={`min-h-[100px] w-full rounded-lg border px-3 py-2 text-sm ${fieldRing("ilan-ver-description")}`}
              placeholder="Açıklama"
              value={description}
              maxLength={LISTING_DESCRIPTION_MAX_LENGTH}
              required
              onChange={(e) => {
                setFieldErrorId(null);
                setDescription(e.target.value);
              }}
            />
          </div>
          <div>
            <label
              htmlFor="ilan-ver-price"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Fiyat (TL) <span className="text-red-600">*</span>
            </label>
            <input
              id="ilan-ver-price"
              className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldRing("ilan-ver-price")}`}
              placeholder="örn. 1.250.000"
              value={priceStr}
              required
              onChange={(e) => {
                setFieldErrorId(null);
                setPriceStr(formatPriceThousandsTr(e.target.value));
              }}
              inputMode="numeric"
            />
          </div>
          <label className="block text-sm font-medium">
            Şehir <span className="text-red-600">*</span>
            <select
              id="ilan-ver-city"
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldRing("ilan-ver-city")}`}
              value={cityId ?? ""}
              onChange={(e) => {
                setFieldErrorId(null);
                setCityId(e.target.value || null);
              }}
            >
              <option value="">Seçin</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            İlçe <span className="text-red-600">*</span>
            <input
              id="ilan-ver-district"
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldRing("ilan-ver-district")}`}
              value={district}
              onChange={(e) => {
                setFieldErrorId(null);
                setDistrict(e.target.value);
              }}
            />
          </label>
          <label className="block text-sm font-medium">
            Telefon <span className="text-red-600">*</span>
            <input
              id="ilan-ver-phone"
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldRing("ilan-ver-phone")}`}
              value={phone}
              onChange={(e) => {
                setFieldErrorId(null);
                setPhone(e.target.value);
              }}
              inputMode="tel"
            />
          </label>
        </div>
      ) : null}

      {page === "boosts" ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            İsteğe bağlı. Paket seçersen yayın sonrası ödeme sayfasına
            gidersin; seçmezsen paketsiz yayınlanır.
          </p>
          <button
            type="button"
            onClick={() => togglePackageIntent("acil")}
            className={`w-full rounded-xl border-2 p-4 text-left transition ${
              packageIntent === "acil" || packageIntent === "both"
                ? "border-orange-500 bg-orange-50"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 text-lg ${
                  packageIntent === "acil" || packageIntent === "both"
                    ? "text-orange-600"
                    : "text-zinc-300"
                }`}
              >
                {packageIntent === "acil" || packageIntent === "both"
                  ? "●"
                  : "○"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-zinc-900">Acil ilan</p>
                  <p className="text-sm font-extrabold text-orange-700">
                    {ACIL_PACKS.map((p) => `${p.label} ${p.priceTry}₺`).join(
                      " · "
                    )}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-zinc-600">
                  Acil vitrinde öne çıksın, alıcılar daha çabuk görsün.
                </p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => togglePackageIntent("boost")}
            className={`w-full rounded-xl border-2 p-4 text-left transition ${
              packageIntent === "boost" || packageIntent === "both"
                ? "border-indigo-600 bg-indigo-50"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 text-lg ${
                  packageIntent === "boost" || packageIntent === "both"
                    ? "text-indigo-600"
                    : "text-zinc-300"
                }`}
              >
                {packageIntent === "boost" || packageIntent === "both"
                  ? "●"
                  : "○"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-zinc-900">Öne çıkarma</p>
                  <p className="text-sm font-extrabold text-indigo-700">
                    {formatTryPrice(FEATURE_BOOST_PACKS[0].fallbackPriceTry)} –{" "}
                    {formatTryPrice(
                      FEATURE_BOOST_PACKS[FEATURE_BOOST_PACKS.length - 1]
                        .fallbackPriceTry
                    )}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-zinc-600">
                  Ana akışta daha görünür olsun. (
                  {FEATURE_BOOST_PACKS.map((p) => p.label).join(" / ")})
                </p>
              </div>
            </div>
          </button>
          <p className="text-xs text-zinc-500">
            Paketsiz devam edersen doğrudan yayınlanır. Paket seçtiysen ödeme
            tamamlanınca vitrin / öne çıkarma aktif olur.
          </p>
        </div>
      ) : null}

      <div className="sticky bottom-16 z-10 flex gap-2 border-t border-zinc-200 bg-zinc-50/95 py-3 backdrop-blur sm:bottom-0">
        <button
          type="button"
          onClick={() => void goBack()}
          disabled={pageIndex === 0 || busy}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          Geri
        </button>
        <button
          type="button"
          disabled={
            busy ||
            !selectionHasValue ||
            (WEB_EIDS_STEP_ENABLED &&
              page === "eids" &&
              !eidsVehicleOk &&
              isVehicle)
          }
          onClick={() => void goNext()}
          className="flex-1 rounded-lg bg-[#ffcc00] px-4 py-2.5 text-sm font-bold text-zinc-900 disabled:opacity-50"
        >
          {pageIndex >= pages.length - 1
            ? busy
              ? isEditMode
                ? "Kaydediliyor…"
                : "Yayınlanıyor…"
              : isEditMode
                ? "Değişiklikleri kaydet"
                : packageIntent === "none"
                  ? "Paketsiz devam et / yayınla"
                  : "Devam et / yayınla"
            : "İleri"}
        </button>
      </div>
        </>
      ) : null}
    </div>
  );
}
