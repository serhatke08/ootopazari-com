"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchBodyStylesForModel,
  fetchBrandModelsHierarchy,
  fetchBrandsByCategory,
  fetchChildBrandModels,
  fetchEnginesForModel,
  fetchPackagesForEngine,
  type IdNameRow,
} from "@/lib/vehicle-hierarchy";
import {
  ContentFilterService,
  composeListingDescription,
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
import { listingCreatedClientField } from "@/lib/client-analytics";
import {
  humanizeEidsFailMessage,
  isEidsMinistryGateError,
} from "@/lib/eids";
import { compressListingImageFiles } from "@/lib/compress-listing-image";
import { MAX_LISTING_PHOTOS } from "@/lib/listing-feed-cover";
import { evaluateListingQualityAfterSave } from "@/lib/listing-quality";
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
  | "boosts";

/**
 * Bakanlık EİDS API (GetKullaniciKodu) açılana kadar web'de e-Devlet adımını atla.
 * Plaka → doğrudan fotoğraf / açıklama. true yapınca eski zorunlu akış döner.
 */
const WEB_EIDS_STEP_ENABLED = false;

const VEHICLE_PAGES_ALL: FlowPage[] = [
  "category",
  "year",
  "brand",
  "model",
  "bodyStyle",
  "engine",
  "package",
  "transmission",
  "details",
  "eids",
  "content",
  "boosts",
];

const VEHICLE_PAGES: FlowPage[] = WEB_EIDS_STEP_ENABLED
  ? VEHICLE_PAGES_ALL
  : VEHICLE_PAGES_ALL.filter((p) => p !== "eids");

const OTHER_PAGES: FlowPage[] = ["category", "content", "boosts"];

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
};

export function CreateListingFlow({
  categories: rawCategories,
  userCountryId,
  listingQuota,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [engines, setEngines] = useState<IdNameRow[]>([]);
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
  const [hasExpertise, setHasExpertise] = useState(false);
  const [plate, setPlate] = useState("");

  const [eidsAccountOk, setEidsAccountOk] = useState(false);
  const [eidsVehicleOk, setEidsVehicleOk] = useState(false);
  const [eidsBusy, setEidsBusy] = useState(false);
  const [eidsMsg, setEidsMsg] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);
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

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState<ListingDraftPayload | null>(
    null
  );
  const draftSkip = useRef(false);
  const lock = useRef(false);

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
    push(bodyStyleName);
    push(engineName);
    push(packageName);
    return parts;
  }, [
    categoryName,
    vehicleYear,
    brandName,
    seriesName,
    modelName,
    bodyStyleName,
    engineName,
    packageName,
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

  const rebuildPages = useCallback((vehicle: boolean) => {
    setPages(vehicle ? VEHICLE_PAGES : OTHER_PAGES);
  }, []);

  const persistDraft = useCallback(async () => {
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
      hasExpertise,
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
      pageIndex,
      webStep: pageIndex + 1,
      source: "web",
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
    hasExpertise,
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
    pageIndex,
  ]);

  useEffect(() => {
    void (async () => {
      const sp = new URLSearchParams(window.location.search);
      const eidsStatus = sp.get("eids"); // ok | fail
      const eidsDurum = sp.get("durum")?.trim() || "";
      const step = sp.get("step");
      const fromEids =
        step === "eids" || eidsStatus === "ok" || eidsStatus === "fail";

      const d = await fetchListingDraft();
      const cityRows = await fetchCities(supabase);
      setCities(cityRows.map((c) => ({ id: c.id, name: c.name })));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let kodOk = false;
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
          kodOk = true;
          setEidsAccountOk(true);
        }
      }

      // e-Devlet dönüşü / taslak: plaka sonrası içerik (eids kapalıysa content)
      if (fromEids && d && draftHasProgress(d)) {
        await applyDraft(d);
        const vehicle = isVehicleCategoryCode(d.categoryCode);
        const list = vehicle ? VEHICLE_PAGES : OTHER_PAGES;
        setPages(list);
        const eidsIdx = list.indexOf("eids");
        const contentIdx = list.indexOf("content");
        if (WEB_EIDS_STEP_ENABLED && eidsIdx >= 0) setPageIndex(eidsIdx);
        else if (contentIdx >= 0) setPageIndex(contentIdx);
      } else if (d && draftHasProgress(d)) {
        setDraftBanner(d);
      }

      if (eidsStatus === "ok") {
        if (kodOk) {
          setEidsAccountOk(true);
          setEidsMsg(
            "Hesap e-Devlet ile doğrulandı. Plakayı yazıp «Plaka yetkisi al»a bas."
          );
        } else if (isEidsMinistryGateError(eidsDurum)) {
          setEidsMsg(humanizeEidsFailMessage(eidsDurum));
        } else {
          setEidsMsg(
            `e-Devlet tamamlandı ama kullanıcı kodu kaydedilemedi${
              eidsDurum ? ` (${eidsDurum})` : ""
            }. Telefonunun e-Devlet’teki numara ile aynı olduğundan emin ol; sonra tekrar «Hesabı doğrula» dene.`
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
    async (nextIndex: number) => {
      let i = nextIndex;
      while (i < pages.length) {
        const p = pages[i];
        if (p === "bodyStyle" && bodyStyles.length === 0) {
          i++;
          continue;
        }
        if (p === "engine" && engines.length === 0) {
          i++;
          continue;
        }
        if (p === "package" && packages.length === 0) {
          i++;
          continue;
        }
        break;
      }
      setPageIndex(Math.min(i, pages.length - 1));
      await persistDraft();
    },
    [pages, bodyStyles.length, engines.length, packages.length, persistDraft]
  );

  const goNext = async () => {
    setErr(null);
    const block = validateCurrentPage();
    if (block) {
      setErr(block);
      return;
    }
    if (pageIndex >= pages.length - 1) {
      await publish();
      return;
    }
    await goTo(pageIndex + 1);
  };

  /** Sayfa bazlı zorunlu alanlar — mobil akışla aynı sıkılık. */
  function validateCurrentPage(): string | null {
    if (page === "details" && isVehicle) {
      if (parseMileageTry(mileage) == null) {
        return "Kilometre zorunlu.";
      }
      const plaka = plate.trim().replace(/\s+/g, "");
      if (plaka.length < 5) {
        return "Plaka zorunlu.";
      }
      if (!color) return "Renk seçin.";
      if (!fuelType) return "Yakıt tipi seçin.";
      if (!condition) return "Araç durumu seçin.";
    }
    if (WEB_EIDS_STEP_ENABLED && page === "eids" && isVehicle) {
      if (!eidsAccountOk) {
        return "Önce e-Devlet ile hesabı doğrulayın.";
      }
      if (!eidsVehicleOk) {
        return "Plaka yetkisini tamamlayın (sorgula).";
      }
    }
    if (page === "content") {
      if (files.length === 0) return "En az bir fotoğraf ekleyin.";
      if (!title.trim()) return "Başlık zorunlu.";
      if (!description.trim()) return "Açıklama zorunlu.";
      if (parsePriceTry(priceStr) == null) return "Geçerli fiyat girin.";
    }
    if (page === "boosts") {
      if (!cityId) return "Şehir seçin.";
      if (!district.trim()) return "İlçe / semt yazın.";
      if (!isValidTrMobile10(normalizePhoneDigits(phone).slice(-10))) {
        return "Geçerli cep telefonu girin.";
      }
    }
    return null;
  }

  const goBack = async () => {
    setErr(null);
    if (pageIndex <= 0) return;
    setPageIndex((i) => i - 1);
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
  };

  const loadEngines = async (mId: string) => {
    const rows = await fetchEnginesForModel(supabase, mId);
    setEngines(rows);
  };

  const loadPackages = async (eId: string) => {
    const rows = await fetchPackagesForEngine(supabase, eId);
    setPackages(rows);
  };

  const selectCategory = async (c: CategoryRow) => {
    const code = String(c.code ?? "");
    const vehicle = isVehicleCategoryCode(code);
    const nextPages = vehicle ? VEHICLE_PAGES : OTHER_PAGES;
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

  async function applyDraft(d: ListingDraftPayload) {
    draftSkip.current = true;
    if (d.categoryId) {
      setCategoryId(d.categoryId);
      setCategoryCode(d.categoryCode ?? null);
      setCategoryName(d.categoryName ?? null);
      rebuildPages(isVehicleCategoryCode(d.categoryCode));
      if (d.categoryId) await loadBrands(d.categoryId);
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
    if (d.hasExpertise != null) setHasExpertise(Boolean(d.hasExpertise));
    if (d.plate) setPlate(d.plate);
    if (d.eidsAccountOk) setEidsAccountOk(true);
    if (d.eidsVehicleOk) setEidsVehicleOk(true);
    if (d.title) setTitle(d.title);
    if (d.description) setDescription(d.description);
    if (d.price) setPriceStr(formatPriceThousandsTr(String(d.price)));
    if (d.cityId) setCityId(d.cityId);
    if (d.district) setDistrict(d.district);
    if (d.phone) setPhone(d.phone);
    const idx = Math.min(
      Math.max(d.pageIndex ?? 0, 0),
      (isVehicleCategoryCode(d.categoryCode) ? VEHICLE_PAGES : OTHER_PAGES)
        .length - 1
    );
    setPageIndex(idx);
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
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setEidsMsg("Oturum gerekli.");
        return;
      }
      if (!eidsAccountOk) {
        setEidsMsg("Önce e-Devlet ile hesabı doğrula.");
        return;
      }
      const res = await fetch("/api/eids/lookup-vehicle", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plaka: plate.trim() }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        markaAdi?: string;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setEidsMsg(
          body.error?.includes("03_") || body.error?.includes("telefon")
            ? "Telefon numarası uyuşmazlığı."
            : body.error || "Plaka yetkisi alınamadı."
        );
        return;
      }
      setEidsVehicleOk(true);
      setEidsMsg(
        body.markaAdi
          ? `Yetki OK · ${body.markaAdi}`
          : "Plaka yetkisi doğrulandı."
      );
    } catch {
      setEidsMsg("Plaka sorgusu başarısız.");
    } finally {
      setEidsBusy(false);
    }
  };

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
      if (files.length === 0) {
        setErr("En az bir fotoğraf ekleyin.");
        return;
      }
      if (isVehicle) {
        if (!brandId || (!modelId && !parentId && !childId)) {
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
        if (plate.trim().replace(/\s+/g, "").length < 5) {
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
        if (!condition) {
          setErr("Araç durumu seçin.");
          return;
        }
        if (
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
        driveType: null,
        vehicleCondition: condition,
        warranty: null,
        heavyDamageRecorded: false,
        plakaUyruk: plate.trim() || null,
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

      if (listingQuota && !listingQuota.unlimited && listingQuota.remaining <= 0) {
        setErr(`Son 12 ayda ${listingQuota.limit} ücretsiz hakkınız doldu.`);
        return;
      }

      const resolvedModel = childId || parentId || modelId;
      const base: Record<string, unknown> = {
        user_id: user.id,
        category_id: categoryId,
        title: title.trim(),
        description: desc,
        price: priceNum,
        is_fixed_price: true,
        is_negotiable: false,
        city_id: cityId,
        district: district.trim() || null,
        contact_phone: formatContactPhone(ten),
        activated_at: new Date().toISOString(),
        ...moderationPayload(),
        ...listingCreatedClientField(),
      };
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
        base.has_expertise = hasExpertise;
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
        categoryId,
      });
      if (duplicateId) {
        setErr(DUPLICATE_LIVE_LISTING_MESSAGE);
        return;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("listings")
        .insert(sanitizeListingClientWrite(base, "insert"))
        .select("id")
        .single();

      if (insErr || !inserted?.id) {
        const msg = insErr?.message ?? "Kayıt başarısız.";
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
      window.location.href = "/profil/ilanlarim";
      return;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yayınlanamadı.");
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
        return "Fotoğraf, başlık, fiyat";
      case "boosts":
        return "Konum ve yayınla";
      default:
        return "İlan ver";
    }
  })();

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

  return (
    <div className="mx-auto max-w-md space-y-3 pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-[#002776]">İlan Ver</h1>
        {listingQuota && !listingQuota.unlimited ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
            Hak: {listingQuota.remaining}/{listingQuota.limit}
          </span>
        ) : null}
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

      <h2 className="text-base font-extrabold text-[#002776]">{heading}</h2>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
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
                    setModelId(m.id);
                    setModelName(m.name ?? null);
                    await loadBody(m.id);
                    await loadEngines(m.id);
                    await goNext();
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
                      setModelId(m.id);
                      setModelName(m.name ?? null);
                      await loadBody(m.id);
                      await loadEngines(m.id);
                      await goNext();
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
                    setModelId(m.id);
                    setModelName(m.name ?? null);
                    await loadBody(m.id);
                    await loadEngines(m.id);
                    await goNext();
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
                      await loadPackages(e.id);
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
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              value={mileage}
              onChange={(e) =>
                setMileage(formatMileageThousandsTr(e.target.value))
              }
              inputMode="numeric"
              placeholder="85.000"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Renk <span className="text-red-600">*</span>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              value={color ?? ""}
              onChange={(e) => setColor(e.target.value || null)}
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
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              value={fuelType ?? ""}
              onChange={(e) => setFuelType(e.target.value || null)}
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
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              value={condition ?? ""}
              onChange={(e) => setCondition(e.target.value || null)}
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
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={hasExpertise}
              onChange={(e) => setHasExpertise(e.target.checked)}
            />
            Ekspertiz var
          </label>
          <label className="block text-sm font-medium">
            Plaka <span className="text-red-600">*</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 uppercase"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toLocaleUpperCase("tr"))}
              placeholder="34ABC123"
              required
            />
          </label>
        </div>
      ) : null}

      {page === "eids" ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/edevlet_icon.png"
              alt=""
              className="h-8 w-8 object-contain"
            />
            <p className="text-sm text-zinc-700">
              Uygulamadaki gibi: önce kimlik, sonra plaka yetkisi.
            </p>
          </div>
          <p className="text-sm">
            Hesap:{" "}
            <span
              className={
                eidsAccountOk
                  ? "font-bold text-emerald-700"
                  : "font-bold text-amber-700"
              }
            >
              {eidsAccountOk ? "Doğrulandı" : "Bekliyor"}
            </span>
          </p>
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
          <label className="block text-sm font-medium">
            Plaka
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 uppercase"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toLocaleUpperCase("tr"))}
              disabled={!eidsAccountOk}
            />
          </label>
          <button
            type="button"
            disabled={eidsBusy || !eidsAccountOk || !plate.trim()}
            onClick={() => void lookupPlate()}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Plakayı sorgula
          </button>
          {eidsMsg ? (
            <p
              className={`text-sm font-medium ${
                eidsVehicleOk ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              {eidsMsg}
            </p>
          ) : null}
          <Link href="/profil/eids" className="text-sm text-zinc-600 underline">
            Doğrulama paneli
          </Link>
        </div>
      ) : null}

      {page === "content" ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const list = e.target.files;
              if (!list) return;
              setFiles((prev) =>
                [...prev, ...Array.from(list)].slice(0, MAX_LISTING_PHOTOS)
              );
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-dashed border-zinc-300 py-6 text-sm font-semibold text-zinc-700"
          >
            Fotoğraf ekle ({files.length}/{MAX_LISTING_PHOTOS})
          </button>
          {thumbUrls.length ? (
            <div className="grid grid-cols-3 gap-2">
              {thumbUrls.map((u, i) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setCoverIndex(i)}
                  className={`relative overflow-hidden rounded-lg border-2 ${
                    coverIndex === i ? "border-[#ffcc00]" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Başlık"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Açıklama"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Fiyat (TL) — örn. 1.250.000"
            value={priceStr}
            onChange={(e) =>
              setPriceStr(formatPriceThousandsTr(e.target.value))
            }
            inputMode="numeric"
          />
        </div>
      ) : null}

      {page === "boosts" ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <label className="block text-sm font-medium">
            Şehir
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              value={cityId ?? ""}
              onChange={(e) => setCityId(e.target.value || null)}
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
            İlçe
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Telefon
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
          </label>
          <p className="text-xs text-zinc-500">
            Öne çıkarma paketleri yayın sonrası Profil → İlanlarım’dan
            alınabilir.
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
        {page !== "category" &&
        page !== "year" &&
        page !== "brand" &&
        page !== "model" &&
        page !== "bodyStyle" &&
        page !== "engine" &&
        page !== "package" &&
        page !== "transmission" ? (
          <button
            type="button"
            disabled={
              busy ||
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
                ? "Yayınlanıyor…"
                : "İlanı yayınla"
              : "İleri"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
