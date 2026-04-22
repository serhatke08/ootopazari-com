"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchBodyStyleEngineRow,
  fetchBodyStylesForModel,
  fetchBrandModelsHierarchy,
  fetchBrandsByCategory,
  fetchChildBrandModels,
  fetchEnginesForBodyStyle,
  fetchPackagesForEngine,
  type IdNameRow,
} from "@/lib/vehicle-hierarchy";
import {
  ContentFilterService,
  buildVehicleModelText,
  composeListingDescription,
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
} from "@/lib/listing-create";
import {
  STEP3_BODY_USE_STEP1,
  computeListingBodyTypeFinal,
} from "@/lib/listing-body-type-final";
import { getSupabaseEnv } from "@/lib/env";
import { fetchCities } from "@/lib/listings-data";
import { publicListingImageUrl } from "@/lib/storage";
import type { ExpertizDurum } from "@/lib/expertiz";
import {
  PANEL_LABELS,
  expandExpertizPartial,
  parseExpertizPanels,
  type PanelKey,
} from "@/lib/expertiz";
import { ExpertizCarPreview } from "@/components/ExpertizDiagram";

const OTHER = "__other__";

type Category = { id: string; name: string | null; code: string | null };

type Props = {
  categories: Category[];
  userCountryId: string | null;
  /** Doluysa güncelleme modu */
  editListingId?: string | null;
  editListingNumber?: string | null;
  initialGalleryUrls?: string[];
  initialListingPayload?: Record<string, unknown> | null;
};

function labelOf(rows: IdNameRow[], id: string | null): string | null {
  if (!id) return null;
  const r = rows.find((x) => x.id === id);
  if (!r) return null;
  return (r.name ?? r.code ?? "").trim() || null;
}

function extForFile(f: File): string {
  const n = f.name.split(".").pop()?.toLowerCase();
  if (n && /^[a-z0-9]+$/i.test(n)) return n;
  if (f.type === "image/png") return "png";
  if (f.type === "image/jpeg" || f.type === "image/jpg") return "jpg";
  if (f.type === "image/webp") return "webp";
  if (f.type === "image/heic" || f.type === "image/heif") return "heic";
  return "jpg";
}

function mimeForUpload(f: File): string | undefined {
  if (f.type && f.type !== "") return f.type;
  const e = extForFile(f).toLowerCase();
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "heic" || e === "heif") return "image/heic";
  if (e === "gif") return "image/gif";
  return undefined;
}

/** Bazı tarayıcılar (özellikle iOS) HEIC vb. için `type` boş bırakır. */
function isLikelyImageFile(f: File): boolean {
  if (f.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif|svg)$/i.test(f.name);
}

function PhotoUploadVisual() {
  return (
    <div
      className="relative mb-4 inline-flex shrink-0"
      aria-hidden
    >
      <div className="flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white shadow-sm">
        <svg
          className="h-11 w-11 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.35}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm3 0h.008v.008h-.008V8.25Z"
          />
        </svg>
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-[3px] ring-white">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.75}
          stroke="currentColor"
        >
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </div>
    </div>
  );
}

const EXPERTIZ_OPTIONS: { value: ExpertizDurum; label: string }[] = [
  { value: "orijinal", label: "Orijinal" },
  { value: "boyalı", label: "Boyalı" },
  { value: "lokal_boyalı", label: "Lokal boyalı" },
  { value: "değişen", label: "Değişen" },
];

function pickEngineFuelHp(row: Record<string, unknown>): {
  fuel?: string;
  hp?: string;
} {
  const fuel =
    (row.fuel_type as string) ??
    (row.fuel as string) ??
    (row.yakit as string) ??
    undefined;
  const hpRaw =
    row.horsepower ??
    row.horse_power ??
    row.engine_power ??
    row.power ??
    row.hp ??
    row.power_hp ??
    row.motor_gucu;
  const hp =
    hpRaw != null && hpRaw !== ""
      ? String(Math.trunc(Number(hpRaw)) || hpRaw)
      : undefined;
  return { fuel, hp };
}

export function CreateListingWizard({
  categories,
  userCountryId,
  editListingId = null,
  editListingNumber = null,
  initialGalleryUrls: initialGalleryUrlsProp,
  initialListingPayload = null,
}: Props) {
  const initialGalleryUrls = initialGalleryUrlsProp ?? [];
  const isEditMode = Boolean(editListingId);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* —— Adım 1 —— */
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [brandOther, setBrandOther] = useState(false);
  const [otherBrandText, setOtherBrandText] = useState("");
  const [brands, setBrands] = useState<IdNameRow[]>([]);
  const [brandId, setBrandId] = useState<string | null>(null);

  const [hierarchical, setHierarchical] = useState(false);
  const [parents, setParents] = useState<IdNameRow[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [children, setChildren] = useState<IdNameRow[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [flatModels, setFlatModels] = useState<IdNameRow[]>([]);

  const [modelOther, setModelOther] = useState(false);
  const [customModelText, setCustomModelText] = useState("");

  const [bodyStyles, setBodyStyles] = useState<IdNameRow[]>([]);
  const [bodyStyleId, setBodyStyleId] = useState<string | null>(null);
  const [bodyOther, setBodyOther] = useState(false);
  const [otherBodyText, setOtherBodyText] = useState("");

  const [engines, setEngines] = useState<IdNameRow[]>([]);
  const [engineId, setEngineId] = useState<string | null>(null);
  const [engineOther, setEngineOther] = useState(false);
  const [otherEngineText, setOtherEngineText] = useState("");

  const [packages, setPackages] = useState<IdNameRow[]>([]);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [packageOther, setPackageOther] = useState(false);
  const [otherPackageText, setOtherPackageText] = useState("");

  /* —— Adım 2 —— */
  const [files, setFiles] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [isFixedPrice, setIsFixedPrice] = useState(true);
  const [isNegotiable, setIsNegotiable] = useState(false);

  /* —— Adım 3 —— */
  const [cities, setCities] = useState<{ id: string; name: string | null }[]>(
    []
  );
  const [cityId, setCityId] = useState<string | null>(null);
  const [district, setDistrict] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMileage, setVehicleMileage] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmissionType, setTransmissionType] = useState("");
  const [engineCapacity, setEngineCapacity] = useState("");
  const [enginePower, setEnginePower] = useState("");
  const [color, setColor] = useState("");
  /** 3. adım kasa: boş = 1. adım; sabit etiket; __yaz__ = serbest metin */
  const [driveType, setDriveType] = useState("");
  const [hasExpertise, setHasExpertise] = useState(false);
  const [isDamaged, setIsDamaged] = useState(false);
  const [heavyDamageRecord, setHeavyDamageRecord] = useState(false);
  const [isTradeable, setIsTradeable] = useState(false);
  const [vehicleCondition, setVehicleCondition] = useState("");
  const [warranty, setWarranty] = useState<boolean | null>(null);
  const [plateNumber, setPlateNumber] = useState("");

  const [expertiz, setExpertiz] = useState<
    Partial<Record<PanelKey, ExpertizDurum | "">>
  >({});

  const editPrefilled = useRef(false);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categoryCode = selectedCategory?.code ?? null;
  const isVehicle = isVehicleCategoryCode(categoryCode);

  useEffect(() => {
    void (async () => {
      const rows = await fetchCities(supabase);
      setCities(rows.map((c) => ({ id: c.id, name: c.name })));
    })();
  }, [supabase]);

  useEffect(() => {
    if (
      !isEditMode ||
      !editListingId ||
      !initialListingPayload ||
      editPrefilled.current
    ) {
      return;
    }
    editPrefilled.current = true;
    const row = initialListingPayload;
    const cat = categories.find((c) => c.id === String(row.category_id ?? ""));
    const rowIsVehicle = isVehicleCategoryCode(cat?.code ?? null);

    setCategoryId(row.category_id ? String(row.category_id) : null);
    setTitle(String(row.title ?? ""));
    setUserDescription(String(row.description ?? ""));
    if (row.price != null && row.price !== "") {
      const p = Number(row.price);
      if (Number.isFinite(p))
        setPriceStr(formatPriceThousandsTr(String(Math.round(p))));
    }
    if (row.is_fixed_price === false) setIsFixedPrice(false);
    else setIsFixedPrice(true);
    setIsNegotiable(row.is_negotiable === true);
    setCityId(row.city_id ? String(row.city_id) : null);
    setDistrict(
      row.district != null && row.district !== ""
        ? String(row.district)
        : ""
    );
    const phoneRaw = String(row.contact_phone ?? "").replace(/\D/g, "");
    if (phoneRaw.length >= 10) {
      const digits =
        phoneRaw.length === 11 && phoneRaw.startsWith("0")
          ? phoneRaw.slice(1)
          : phoneRaw;
      setPhoneInput(digits.slice(0, 10));
    }

    if (rowIsVehicle) {
      setVehicleYear(
        row.vehicle_year != null ? String(row.vehicle_year) : ""
      );
      setVehicleMileage(
        row.vehicle_mileage != null && row.vehicle_mileage !== ""
          ? formatMileageThousandsTr(String(row.vehicle_mileage))
          : ""
      );
      setFuelType(
        row.fuel_type != null ? String(row.fuel_type) : ""
      );
      setTransmissionType(
        row.transmission_type != null ? String(row.transmission_type) : ""
      );
      setEngineCapacity(
        row.engine_capacity != null && row.engine_capacity !== ""
          ? String(row.engine_capacity).replace(".", ",")
          : ""
      );
      setEnginePower(
        row.engine_power != null && row.engine_power !== ""
          ? String(row.engine_power)
          : ""
      );
      setColor(row.color != null ? String(row.color) : "");
      setDriveType(row.drive_type != null ? String(row.drive_type) : "");
      setBodyOther(true);
      setOtherBodyText(
        row.body_type != null ? String(row.body_type) : ""
      );
      setHasExpertise(row.has_expertise === true);
      setIsDamaged(row.is_damaged === true);
      setIsTradeable(row.is_tradeable === true);
      const parsed = parseExpertizPanels(row.expertiz_panels);
      setExpertiz(parsed ?? {});
      const bid =
        row.vehicle_brand_id != null && String(row.vehicle_brand_id) !== ""
          ? String(row.vehicle_brand_id)
          : null;
      if (bid) {
        setBrandOther(false);
        setBrandId(bid);
      } else {
        setBrandOther(false);
        setBrandId(null);
      }
      setModelOther(true);
      setCustomModelText(
        row.vehicle_model != null ? String(row.vehicle_model) : ""
      );
      setParentId(null);
      setChildId(null);
    }
  }, [
    isEditMode,
    editListingId,
    initialListingPayload,
    categories,
  ]);

  useEffect(() => {
    if (!categoryId || !isVehicle) {
      setBrands([]);
      setBrandId(null);
      return;
    }
    void (async () => {
      const b = await fetchBrandsByCategory(supabase, categoryId);
      setBrands(b);
    })();
  }, [categoryId, isVehicle, supabase]);

  useEffect(() => {
    setParentId(null);
    setChildId(null);
    setChildren([]);
    setFlatModels([]);
    setHierarchical(false);
    setModelOther(false);
    setCustomModelText("");
    setBodyStyles([]);
    setBodyStyleId(null);
    setBodyOther(false);
    setOtherBodyText("");
    setEngines([]);
    setEngineId(null);
    setEngineOther(false);
    setOtherEngineText("");
    setPackages([]);
    setPackageId(null);
    setPackageOther(false);
    setOtherPackageText("");

    if (!brandId || brandOther) return;

    void (async () => {
      const h = await fetchBrandModelsHierarchy(supabase, brandId);
      setHierarchical(h.hierarchical);
      setParents(h.parents);
      if (!h.hierarchical) {
        setFlatModels(h.parents);
      }
    })();
  }, [brandId, brandOther, supabase]);

  useEffect(() => {
    setChildId(null);
    setChildren([]);
    if (!parentId || !hierarchical) return;
    void (async () => {
      const ch = await fetchChildBrandModels(supabase, parentId);
      setChildren(ch);
    })();
  }, [parentId, hierarchical, supabase]);

  const resolvedModelId = useMemo(() => {
    if (brandOther || modelOther) return null;
    if (!isVehicle || !brandId) return null;
    if (hierarchical) {
      if (children.length > 0) return childId;
      return parentId;
    }
    const sel = flatModels.find((m) => m.id === parentId);
    return parentId && flatModels.some((x) => x.id === parentId)
      ? parentId
      : null;
  }, [
    brandOther,
    modelOther,
    isVehicle,
    brandId,
    hierarchical,
    children.length,
    childId,
    parentId,
    flatModels,
  ]);

  /* Düz liste: model seçimi `parentId` alanında tutuluyor (dropdown). */
  const modelSelectId = hierarchical ? null : parentId;

  useEffect(() => {
    if (!resolvedModelId || modelOther || brandOther) {
      setBodyStyles([]);
      setBodyStyleId(null);
      return;
    }
    void (async () => {
      const bs = await fetchBodyStylesForModel(supabase, resolvedModelId);
      setBodyStyles(bs);
    })();
  }, [resolvedModelId, modelOther, brandOther, supabase]);

  useEffect(() => {
    if (!bodyStyleId || bodyOther) {
      setEngines([]);
      setEngineId(null);
      return;
    }
    void (async () => {
      const en = await fetchEnginesForBodyStyle(supabase, bodyStyleId);
      setEngines(en);
    })();
  }, [bodyStyleId, bodyOther, supabase]);

  useEffect(() => {
    if (!engineId || engineOther) {
      setPackages([]);
      setPackageId(null);
      return;
    }
    void (async () => {
      const pk = await fetchPackagesForEngine(supabase, engineId);
      setPackages(pk);
    })();
  }, [engineId, engineOther, supabase]);

  useEffect(() => {
    if (!engineId || engineOther) return;
    void (async () => {
      const row = await fetchBodyStyleEngineRow(supabase, engineId);
      if (!row) return;
      const { fuel, hp } = pickEngineFuelHp(row);
      if (fuel && !fuelType) setFuelType(fuel);
      if (hp && !enginePower) setEnginePower(hp);
    })();
  }, [engineId, engineOther, supabase, fuelType, enginePower]);

  const step1BodyStyleName = !bodyOther
    ? labelOf(bodyStyles, bodyStyleId)
    : null;

  const bodyTypeForListing = useMemo(
    () =>
      computeListingBodyTypeFinal({
        step3Choice: STEP3_BODY_USE_STEP1,
        step3YazText: "",
        step1StyleName: step1BodyStyleName,
        step1OtherBodyText: bodyOther ? otherBodyText : "",
      }),
    [step1BodyStyleName, bodyOther, otherBodyText]
  );

  const noModelsFromApi =
    isVehicle &&
    !!brandId &&
    !brandOther &&
    (hierarchical ? parents.length === 0 : flatModels.length === 0);

  const useCustomModelText =
    brandOther ||
    modelOther ||
    (isVehicle && !!brandId && !brandOther && noModelsFromApi);

  /** Kasa listesi boş → DB’den motor satırı yok; metin alanları kullanılır. */
  const noBodyStylesFromApi =
    isVehicle &&
    !!brandId &&
    !brandOther &&
    !!resolvedModelId &&
    !modelOther &&
    !useCustomModelText &&
    bodyStyles.length === 0;

  const modelNameForVehicleModel = useMemo(() => {
    if (useCustomModelText) return null;
    if (hierarchical) {
      if (children.length > 0)
        return labelOf(children, childId) ?? labelOf(parents, parentId);
      return labelOf(parents, parentId);
    }
    return labelOf(flatModels, modelSelectId);
  }, [
    useCustomModelText,
    hierarchical,
    children,
    childId,
    parents,
    parentId,
    flatModels,
    modelSelectId,
  ]);

  const engineForVehicleModel = useMemo(() => {
    if (!isVehicle) return null;
    if (bodyOther || noBodyStylesFromApi)
      return otherEngineText.trim() || null;
    if (bodyStyleId && !engineOther && engineId)
      return labelOf(engines, engineId);
    if (engineOther) return otherEngineText.trim() || null;
    return null;
  }, [
    isVehicle,
    bodyOther,
    noBodyStylesFromApi,
    otherEngineText,
    bodyStyleId,
    engineOther,
    engineId,
    engines,
  ]);

  const packageForVehicleModel = useMemo(() => {
    if (!isVehicle) return null;
    if (bodyOther || noBodyStylesFromApi || engineOther)
      return otherPackageText.trim() || null;
    if (
      bodyStyleId &&
      engineId &&
      !engineOther &&
      !packageOther &&
      packageId
    )
      return labelOf(packages, packageId);
    if (packageOther) return otherPackageText.trim() || null;
    return null;
  }, [
    isVehicle,
    bodyOther,
    noBodyStylesFromApi,
    engineOther,
    otherPackageText,
    bodyStyleId,
    engineId,
    packageOther,
    packageId,
    packages,
  ]);

  const vehicleModelCol = buildVehicleModelText({
    customModelMode: useCustomModelText,
    customModelText,
    modelName: modelNameForVehicleModel,
    engineName: engineForVehicleModel,
    packageName: packageForVehicleModel,
  });

  const validateStep1 = useCallback((): string | null => {
    if (!categoryId) return "Kategori seçin.";
    if (!isVehicle) return null;
    if (brandOther) {
      if (!otherBrandText.trim()) return "Diğer marka adını yazın.";
      if (!customModelText.trim()) return "Seri / model bilgisini yazın.";
      return null;
    }
    if (!brandId) return "Marka seçin.";
    if (noModelsFromApi) {
      if (!customModelText.trim())
        return "Seri / model (metin) zorunlu.";
      return null;
    }
    if (modelOther) {
      if (!customModelText.trim()) return "Seri / model (Diğer) metnini yazın.";
      return null;
    }
    if (hierarchical) {
      if (!parentId) return "Seri / model seçin.";
      if (children.length > 0 && !childId)
        return "Alt model seçin veya listeyi tamamlayın.";
    } else {
      if (!modelSelectId) return "Model seçin.";
    }
    return null;
  }, [
    categoryId,
    isVehicle,
    brandOther,
    otherBrandText,
    customModelText,
    brandId,
    noModelsFromApi,
    modelOther,
    hierarchical,
    parentId,
    children.length,
    childId,
    modelSelectId,
  ]);

  const validateStep2 = useCallback((): string | null => {
    const totalPhotos = initialGalleryUrls.length + files.length;
    if (totalPhotos < 2) return "En az 2 fotoğraf yükleyin.";
    if (coverIndex < 0 || coverIndex >= totalPhotos)
      return "Kapak fotoğrafı seçin.";
    const p = parsePriceTry(priceStr);
    if (p == null) return "Geçerli bir fiyat girin.";
    return null;
  }, [initialGalleryUrls.length, files.length, coverIndex, priceStr]);

  const validateStep3 = useCallback((): string | null => {
    if (!cityId) return "Şehir seçin.";
    const digits = normalizePhoneDigits(phoneInput);
    const ten = digits.length === 11 && digits.startsWith("0")
      ? digits.slice(1)
      : digits;
    if (!isValidTrMobile10(ten))
      return "Cep telefonu 10 hane olmalı ve 5 ile başlamalıdır.";
    if (isVehicle) {
      const km = parseMileageTry(vehicleMileage);
      if (km == null) return "Kilometre girin.";
      const y = parseInt(vehicleYear, 10);
      if (!Number.isFinite(y) || y < 1900 || y > new Date().getFullYear() + 1)
        return "Geçerli bir üretim yılı girin.";
    }
    return null;
  }, [cityId, phoneInput, isVehicle, vehicleMileage, vehicleYear]);

  const goNext = () => {
    setErr(null);
    if (step === 1) {
      const e = validateStep1();
      if (e) {
        setErr(e);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const e = validateStep2();
      if (e) {
        setErr(e);
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    setErr(null);
    if (step > 1) setStep((s) => s - 1);
  };

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list);
    const accepted = picked.filter(isLikelyImageFile);
    if (accepted.length === 0 && picked.length > 0) {
      setErr(
        "Seçilen dosyalar görsel olarak tanınmadı. JPG, PNG, WebP veya iPhone (HEIC) deneyin."
      );
      return;
    }
    setErr(null);
    const next = [...files, ...accepted];
    setFiles(next);
    if (coverIndex >= next.length) setCoverIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewFileAt = (j: number) => {
    const idxInCombined = initialGalleryUrls.length + j;
    setFiles((prev) => prev.filter((_, k) => k !== j));
    setCoverIndex((ci) => {
      if (ci === idxInCombined) return 0;
      if (ci > idxInCombined) return ci - 1;
      return ci;
    });
  };

  const thumbUrls = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );

  useEffect(() => {
    return () => {
      for (const u of thumbUrls) URL.revokeObjectURL(u);
    };
  }, [thumbUrls]);

  const submit = async () => {
    setErr(null);
    const e3 = validateStep3();
    if (e3) {
      setErr(e3);
      return;
    }
    const e2 = validateStep2();
    const e1 = validateStep1();
    if (e1 || e2) {
      setErr(e1 ?? e2 ?? "Eksik bilgi.");
      return;
    }

    const priceNum = parsePriceTry(priceStr);
    if (priceNum == null) {
      setErr("Fiyat geçersiz.");
      return;
    }

    const digits = normalizePhoneDigits(phoneInput);
    const ten =
      digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;

    const plakaUyruk = plateNumber.trim() || null;

    const descParts = composeListingDescription({
      userDescription,
      isVehicle,
      otherBrandNote: brandOther ? otherBrandText.trim() : null,
      seriModelNote:
        useCustomModelText
          ? customModelText.trim()
          : modelNameForVehicleModel,
      kasaTipiNote: bodyTypeForListing,
      motorNote: engineForVehicleModel,
      paketNote: packageForVehicleModel,
      fuelType: fuelType.trim() || null,
      transmissionType: transmissionType.trim() || null,
      driveType: driveType.trim() || null,
      vehicleCondition: vehicleCondition.trim() || null,
      warranty,
      heavyDamageRecorded: heavyDamageRecord,
      plakaUyruk,
    });

    const titleFinal = title.trim() || "İlan";
    const filter = ContentFilterService.validateListingContent(
      titleFinal,
      descParts
    );
    if (!filter.ok) {
      setErr(filter.message ?? "İçerik reddedildi.");
      return;
    }

    const expertJson = expertizPanelsToJson(expertiz);
    const isDamagedFinal = isDamaged || heavyDamageRecord;

    const base: Record<string, unknown> = {
      category_id: categoryId,
      title: titleFinal,
      description: descParts,
      price: priceNum,
      is_fixed_price: isFixedPrice,
      is_negotiable: isNegotiable,
      city_id: cityId,
      district: district.trim() || null,
      contact_phone: formatContactPhone(ten),
      ...moderationPayload(),
    };
    if (userCountryId) base.country_id = userCountryId;

    if (isVehicle) {
      base.vehicle_brand_id = brandOther ? null : brandId;
      base.vehicle_model = vehicleModelCol || customModelText.trim() || "—";
      base.vehicle_year = parseInt(vehicleYear, 10);
      base.vehicle_mileage = parseMileageTry(vehicleMileage);
      base.fuel_type = fuelType.trim() || null;
      base.transmission_type = transmissionType.trim() || null;
      const ec = engineCapacity.replace(",", ".").trim();
      base.engine_capacity = ec ? Number(ec) : null;
      const ep = enginePower.replace(/\D/g, "");
      base.engine_power = ep ? parseInt(ep, 10) : null;
      base.color = color.trim() || null;
      base.body_type = bodyTypeForListing;
      base.drive_type = driveType.trim() || null;
      base.has_expertise = hasExpertise;
      base.is_damaged = isDamagedFinal;
      base.is_tradeable = isTradeable;
      if (isEditMode) {
        base.expertiz_panels = expertJson ?? null;
      } else if (expertJson) {
        base.expertiz_panels = expertJson;
      }
    }

    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) {
        setErr("Oturum bulunamadı.");
        return;
      }
      const env = getSupabaseEnv();

      if (isEditMode && editListingId) {
        const { error: upErr } = await supabase
          .from("listings")
          .update(base)
          .eq("id", editListingId)
          .eq("user_id", uid);

        if (upErr) {
          setErr(upErr.message ?? "Güncelleme başarısız.");
          return;
        }

        if (files.length > 0) {
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
          const start = maxI + 1;
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const ext = extForFile(f);
            const path = `${editListingId}/${start + i}.${ext}`;
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
        }

        let coverUrl: string | undefined;
        let galleryUrlsForDb: string[];
        if (files.length > 0) {
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
          galleryUrlsForDb = [...initialGalleryUrls];
          coverUrl =
            initialGalleryUrls[coverIndex] ?? initialGalleryUrls[0];
        }

        if (!coverUrl) {
          setErr("Kapak görseli belirlenemedi.");
          return;
        }

        const { error: imgErr } = await supabase
          .from("listings")
          .update({ image_url: coverUrl, images: galleryUrlsForDb })
          .eq("id", editListingId)
          .eq("user_id", uid);
        if (imgErr) {
          setErr(`Kapak güncellenemedi: ${imgErr.message}`);
          return;
        }

        window.location.href = "/profil/ilanlarim";
        return;
      }

      base.user_id = uid;

      const { data: inserted, error: insErr } = await supabase
        .from("listings")
        .insert(base)
        .select("id")
        .single();

      if (insErr || !inserted?.id) {
        setErr(insErr?.message ?? "İlan kaydedilemedi.");
        return;
      }

      const listingId = inserted.id as string;

      const galleryUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = extForFile(f);
        const path = `${listingId}/${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listings-images")
          .upload(path, f, {
            upsert: true,
            contentType: mimeForUpload(f),
          });
        if (upErr) {
          setErr(`Görsel yüklenemedi: ${upErr.message}`);
          return;
        }
        galleryUrls.push(publicListingImageUrl(env, path));
      }

      const coverUrl = galleryUrls[coverIndex] ?? galleryUrls[0];

      const { error: upListingErr } = await supabase
        .from("listings")
        .update({ image_url: coverUrl, images: galleryUrls })
        .eq("id", listingId);

      if (upListingErr) {
        setErr(`Kapak güncellenemedi: ${upListingErr.message}`);
        return;
      }

      window.location.href = "/profil/ilanlarim";
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {isEditMode ? "İlanı düzenle" : "İlan ver"}
        </h1>
        {isEditMode && editListingNumber ? (
          <p className="mt-1 text-sm text-zinc-500">
            İlan no:{" "}
            <span className="font-semibold tabular-nums text-zinc-800">
              #{editListingNumber}
            </span>
          </p>
        ) : null}
        <p className="mt-1 text-sm text-zinc-600">
          Adım {step} / 3 —{" "}
          {step === 1
            ? "Kategori ve araç seçimi"
            : step === 2
              ? "Fotoğraf, başlık, açıklama, fiyat"
              : "Konum, iletişim ve araç detayları"}
        </p>
        <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          <li className={step >= 1 ? "font-semibold text-zinc-800" : ""}>
            1 Kategori
          </li>
          <li aria-hidden>→</li>
          <li className={step >= 2 ? "font-semibold text-zinc-800" : ""}>
            2 Fotoğraf
          </li>
          <li aria-hidden>→</li>
          <li className={step >= 3 ? "font-semibold text-zinc-800" : ""}>
            3 Detay
          </li>
        </ol>
        {step === 1 ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Fotoğraf yükleme bu sayfanın{" "}
            <strong className="font-semibold">2. adımında</strong>. Önce kategori
            ve araç bilgilerini doldurup <strong>İleri</strong> ile geçin.
          </p>
        ) : null}
      </div>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      {step === 1 ? (
        <section className="space-y-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Kategori ve araç
          </h2>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Kategori *
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setBrandOther(false);
                    setBrandId(null);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    categoryId === c.id
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  {c.name ?? c.code ?? c.id}
                </button>
              ))}
            </div>
          </div>

          {isVehicle ? (
            <>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Marka *
                </p>
                <select
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={brandOther ? OTHER : brandId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === OTHER) {
                      setBrandOther(true);
                      setBrandId(null);
                    } else {
                      setBrandOther(false);
                      setBrandId(v || null);
                    }
                  }}
                >
                  <option value="">Seçin</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name ?? b.code}
                    </option>
                  ))}
                  <option value={OTHER}>Diğer</option>
                </select>
                {brandOther ? (
                  <input
                    className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Marka adı"
                    value={otherBrandText}
                    onChange={(e) => setOtherBrandText(e.target.value)}
                  />
                ) : null}
              </div>

              {!brandOther && brandId ? (
                <>
                  {noModelsFromApi ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                        Seri / model (metin) *
                      </label>
                      <input
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={customModelText}
                        onChange={(e) => setCustomModelText(e.target.value)}
                      />
                    </div>
                  ) : hierarchical ? (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                          Seri / model *
                        </label>
                        <select
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                          value={modelOther ? OTHER : parentId ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === OTHER) {
                              setModelOther(true);
                              setParentId(null);
                            } else {
                              setModelOther(false);
                              setParentId(v || null);
                            }
                          }}
                        >
                          <option value="">Seçin</option>
                          {parents.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name ?? p.code}
                            </option>
                          ))}
                          <option value={OTHER}>Diğer</option>
                        </select>
                      </div>
                      {children.length > 0 && !modelOther ? (
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                            Alt model *
                          </label>
                          <select
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            value={childId ?? ""}
                            onChange={(e) => setChildId(e.target.value || null)}
                          >
                            <option value="">Seçin</option>
                            {children.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name ?? p.code}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                        Model *
                      </label>
                      <select
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={modelOther ? OTHER : parentId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === OTHER) {
                            setModelOther(true);
                            setParentId(null);
                          } else {
                            setModelOther(false);
                            setParentId(v || null);
                          }
                        }}
                      >
                        <option value="">Seçin</option>
                        {flatModels.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name ?? p.code}
                          </option>
                        ))}
                        <option value={OTHER}>Diğer</option>
                      </select>
                    </div>
                  )}
                  {modelOther || brandOther ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                        Seri / model (Diğer) *
                      </label>
                      <input
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={customModelText}
                        onChange={(e) => setCustomModelText(e.target.value)}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}

              {!brandOther &&
              brandId &&
              resolvedModelId &&
              !modelOther &&
              !useCustomModelText ? (
                <>
                  {bodyStyles.length > 0 ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                        Kasa tipi
                      </label>
                      <select
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={bodyOther ? OTHER : bodyStyleId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === OTHER) {
                            setBodyOther(true);
                            setBodyStyleId(null);
                          } else {
                            setBodyOther(false);
                            setBodyStyleId(v || null);
                          }
                        }}
                      >
                        <option value="">Seçin</option>
                        {bodyStyles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name ?? p.code ?? p.id}
                          </option>
                        ))}
                        <option value={OTHER}>Diğer</option>
                      </select>
                      {bodyOther ? (
                        <>
                          <input
                            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            placeholder="Diğer kasa tipi (metin)"
                            value={otherBodyText}
                            onChange={(e) => setOtherBodyText(e.target.value)}
                          />
                          <p className="mt-3 text-[11px] text-zinc-500">
                            Diğer kasada motor listesi yok; motor ve paketi metin
                            ile girin (vehicle_model birleşiminde kullanılır).
                          </p>
                          <div className="mt-2">
                            <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                              Motor (metin)
                            </label>
                            <input
                              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                              placeholder="Örn. 1.5 TSI"
                              value={otherEngineText}
                              onChange={(e) =>
                                setOtherEngineText(e.target.value)
                              }
                            />
                          </div>
                          <div className="mt-2">
                            <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                              Paket (metin, isteğe bağlı)
                            </label>
                            <input
                              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                              value={otherPackageText}
                              onChange={(e) =>
                                setOtherPackageText(e.target.value)
                              }
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-zinc-500">
                        Bu model için veritabanında kasa listesi yok. Kasa tipini{" "}
                        <strong>3. adımda</strong> sabit listeden veya &quot;Diğer
                        (Yaz)&quot; ile girebilirsiniz.
                      </p>
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                          Motor (metin)
                        </label>
                        <input
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                          placeholder="Örn. 1.5 TSI 150 HP"
                          value={otherEngineText}
                          onChange={(e) => setOtherEngineText(e.target.value)}
                        />
                      </div>
                      <div className="mt-2">
                        <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                          Paket (metin, isteğe bağlı)
                        </label>
                        <input
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                          value={otherPackageText}
                          onChange={(e) => setOtherPackageText(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {bodyStyleId && !bodyOther ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                        Motor
                      </label>
                      <select
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={engineOther ? OTHER : engineId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === OTHER) {
                            setEngineOther(true);
                            setEngineId(null);
                          } else {
                            setEngineOther(false);
                            setEngineId(v || null);
                          }
                        }}
                      >
                        <option value="">Seçin</option>
                        {engines.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name ?? p.code ?? p.id}
                          </option>
                        ))}
                        <option value={OTHER}>Diğer</option>
                      </select>
                      {engineOther ? (
                        <>
                          <input
                            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            placeholder="Motor (metin)"
                            value={otherEngineText}
                            onChange={(e) => setOtherEngineText(e.target.value)}
                          />
                          <div className="mt-2">
                            <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                              Paket (metin, isteğe bağlı)
                            </label>
                            <input
                              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                              placeholder="Liste yok veya diğer paket"
                              value={otherPackageText}
                              onChange={(e) =>
                                setOtherPackageText(e.target.value)
                              }
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {engineId && !engineOther ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
                        Paket
                      </label>
                      <select
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={packageOther ? OTHER : packageId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === OTHER) {
                            setPackageOther(true);
                            setPackageId(null);
                          } else {
                            setPackageOther(false);
                            setPackageId(v || null);
                          }
                        }}
                      >
                        <option value="">Seçin</option>
                        {packages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name ?? p.code ?? p.id}
                          </option>
                        ))}
                        <option value={OTHER}>Diğer</option>
                      </select>
                      {packageOther ? (
                        <input
                          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                          placeholder="Paket (metin)"
                          value={otherPackageText}
                          onChange={(e) => setOtherPackageText(e.target.value)}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Fotoğraf ve içerik
          </h2>
          <div>
            <p className="mb-2 block text-sm font-medium text-zinc-700">
              Fotoğraflar * (en az 2)
            </p>
            <label
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-zinc-50 px-4 py-10 text-center transition hover:border-emerald-400 hover:from-emerald-50 hover:to-zinc-50 sm:py-12"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPickFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="sr-only"
                onChange={(e) => onPickFiles(e.target.files)}
              />
              <PhotoUploadVisual />
              <span className="text-lg font-semibold text-zinc-900">
                Fotoğraf ekle
              </span>
              <span className="mt-1 text-sm font-medium text-emerald-800">
                En az 2 görsel — yeşil alana dokunun veya sürükleyin
              </span>
              <span className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-600">
                JPG, PNG, WebP ve iPhone (HEIC). Kapak için aşağıdan birini
                işaretleyin.
              </span>
              {isEditMode && initialGalleryUrls.length > 0 ? (
                <span className="mt-3 text-xs font-medium text-zinc-600">
                  {initialGalleryUrls.length} mevcut görsel korunur; yeni fotoğraf
                  ekleyebilirsiniz.
                </span>
              ) : null}
              {files.length > 0 ? (
                <span className="mt-3 text-xs font-medium text-emerald-700">
                  {files.length} yeni dosya — aşağıdan kapak işaretleyin
                </span>
              ) : null}
            </label>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Başka fotoğraf ekle
            </button>
            {initialGalleryUrls.length + files.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-zinc-800">
                  Önizleme —{" "}
                  <span className="font-normal text-zinc-600">
                    kapak için bir küçük resme tıklayın
                  </span>
                </p>
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {initialGalleryUrls.map((url, i) => (
                    <li key={`ex-${i}-${url.slice(-24)}`} className="relative list-none">
                      <button
                        type="button"
                        onClick={() => setCoverIndex(i)}
                        className={`relative w-full overflow-hidden rounded-xl border-2 bg-zinc-100 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                          coverIndex === i
                            ? "border-emerald-600 shadow-md ring-2 ring-emerald-400/50"
                            : "border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <span className="block aspect-[4/3] w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element -- harici / mevcut ilan URL */}
                          <img
                            src={url}
                            alt={`Mevcut görsel ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="block truncate px-2 py-1.5 text-[10px] text-zinc-600">
                          Mevcut
                        </span>
                        {coverIndex === i ? (
                          <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                            Kapak
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                  {files.map((f, j) => {
                    const i = initialGalleryUrls.length + j;
                    const src = thumbUrls[j];
                    return (
                      <li
                        key={`${f.lastModified}-${j}-${f.name}`}
                        className="relative list-none"
                      >
                        <button
                          type="button"
                          onClick={() => setCoverIndex(i)}
                          className={`relative w-full overflow-hidden rounded-xl border-2 bg-zinc-100 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                            coverIndex === i
                              ? "border-emerald-600 shadow-md ring-2 ring-emerald-400/50"
                              : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          {src ? (
                            <span className="block aspect-[4/3] w-full">
                              {/* eslint-disable-next-line @next/next/no-img-element -- blob: önizleme */}
                              <img
                                src={src}
                                alt={`Yeni görsel ${j + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </span>
                          ) : null}
                          <span className="block truncate px-2 py-1.5 text-[10px] text-zinc-600">
                            {f.name}
                          </span>
                          {coverIndex === i ? (
                            <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                              Kapak
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNewFileAt(j);
                          }}
                          className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-bold leading-none text-red-600 shadow-md hover:bg-red-50"
                          aria-label={`${f.name} kaldır`}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              İlan başlığı
            </label>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Boş bırakılırsa «İlan»"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Açıklama
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Fiyat (TRY) *
            </label>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm tabular-nums"
              inputMode="numeric"
              autoComplete="off"
              value={priceStr}
              onChange={(e) =>
                setPriceStr(formatPriceThousandsTr(e.target.value))
              }
              placeholder="örn. 850.000"
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFixedPrice}
                onChange={(e) => setIsFixedPrice(e.target.checked)}
              />
              Sabit fiyat
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
              />
              Pazarlık var
            </label>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Konum, iletişim ve detay
          </h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Şehir *
            </label>
            <select
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              İlçe
            </label>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Cep telefonu * (10 hane, 5 ile başlar)
            </label>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm tabular-nums"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="5xxxxxxxxx"
            />
          </div>

          {isVehicle ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Üretim yılı *
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Kilometre *
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm tabular-nums"
                    inputMode="numeric"
                    autoComplete="off"
                    value={vehicleMileage}
                    onChange={(e) =>
                      setVehicleMileage(
                        formatMileageThousandsTr(e.target.value)
                      )
                    }
                    placeholder="örn. 45.000"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Yakıt
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Vites
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={transmissionType}
                    onChange={(e) => setTransmissionType(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Motor hacmi (L)
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={engineCapacity}
                    onChange={(e) => setEngineCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Motor gücü (HP)
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={enginePower}
                    onChange={(e) => setEnginePower(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Renk
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Çekiş
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={driveType}
                  onChange={(e) => setDriveType(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Araç durumu
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={vehicleCondition}
                  onChange={(e) => setVehicleCondition(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Garanti
                </label>
                <select
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={
                    warranty === null ? "" : warranty ? "yes" : "no"
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setWarranty(v === "" ? null : v === "yes");
                  }}
                >
                  <option value="">Seçin</option>
                  <option value="yes">Var</option>
                  <option value="no">Yok</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasExpertise}
                    onChange={(e) => setHasExpertise(e.target.checked)}
                  />
                  Expertiz var
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isDamaged}
                    onChange={(e) => setIsDamaged(e.target.checked)}
                  />
                  Hasarlı
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={heavyDamageRecord}
                    onChange={(e) => setHeavyDamageRecord(e.target.checked)}
                  />
                  Ağır hasar kaydı
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isTradeable}
                    onChange={(e) => setIsTradeable(e.target.checked)}
                  />
                  Takaslı
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Plaka
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-zinc-800">
                  Kaporta ekspertiz (isteğe bağlı)
                </p>
                <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mx-auto max-h-72 w-full max-w-sm sm:max-h-80">
                    <ExpertizCarPreview
                      panels={expandExpertizPartial(expertiz)}
                      className="max-h-72 sm:max-h-80"
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-zinc-600">
                    Durum seçtikçe renkli parça katmanları şablona yansır.
                  </p>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                  {(Object.keys(PANEL_LABELS) as PanelKey[]).map((key) => (
                    <div
                      key={key}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="w-40 shrink-0 text-zinc-600">
                        {PANEL_LABELS[key]}
                      </span>
                      <select
                        className="min-w-[10rem] rounded border border-zinc-300 px-2 py-1 text-xs"
                        value={expertiz[key] ?? "orijinal"}
                        onChange={(e) => {
                          const v = e.target.value as ExpertizDurum;
                          setExpertiz((prev) => ({
                            ...prev,
                            [key]: v,
                          }));
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
            </>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Geri
            </button>
          ) : null}
          <Link
            href="/profil/ilanlarim"
            className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:underline"
          >
            Vazgeç
          </Link>
        </div>
        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            İleri
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy
              ? "Kaydediliyor…"
              : isEditMode
                ? "Değişiklikleri kaydet"
                : "İlanı yayınla"}
          </button>
        )}
      </div>
    </div>
  );
}
