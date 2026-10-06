-- Bir e-Devlet (eids_kullanici_kodu) yalnızca bir uygulama hesabına bağlanır.

BEGIN;

-- Çakışan bağları temizle: aynı kodda en eski verified_at kalsın.
WITH ranked AS (
  SELECT
    id,
    eids_kullanici_kodu,
    ROW_NUMBER() OVER (
      PARTITION BY eids_kullanici_kodu
      ORDER BY eids_verified_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.profiles
  WHERE eids_kullanici_kodu IS NOT NULL
)
UPDATE public.profiles p
SET
  eids_kullanici_kodu = NULL,
  eids_ad = NULL,
  eids_soyad = NULL,
  eids_verified_at = NULL
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_eids_kullanici_kodu_uidx
  ON public.profiles (eids_kullanici_kodu)
  WHERE eids_kullanici_kodu IS NOT NULL;

COMMENT ON COLUMN public.profiles.eids_kullanici_kodu IS
  'EİDS GetKullaniciKodu — uygulama genelinde tekil; bir e-Devlet bir hesaba bağlanır.';

COMMIT;
