export function MissingEnv() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-medium">Supabase bağlantısı yok veya anahtar geçersiz.</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-amber-900/95">
        <li>
          Proje kökünde{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
            .env.local
          </code>{" "}
          dosyası olsun (sadece{" "}
          <code className="font-mono text-xs">.env.local.example</code>{" "}
          yetmez).
        </li>
        <li>
          <strong>Supabase Dashboard</strong> → Project Settings →{" "}
          <strong>API</strong>:{" "}
          <code className="text-xs">Project URL</code> →{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
            NEXT_PUBLIC_SUPABASE_URL
          </code>
        </li>
        <li>
          Aynı sayfada{" "}
          <strong>anon public</strong> anahtarını kopyalayın ({" "}
          <em>service_role</em> değil). Değişken:{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
        </li>
        <li>
          Satırda tırnak kullanmayın; başta/sonda boşluk olmasın. Örnek:{" "}
          <code className="break-all font-mono text-[11px]">
            NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
          </code>
        </li>
        <li>
          Kaydettikten sonra{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
            npm run dev
          </code>{" "}
          sürecini durdurup yeniden başlatın.
        </li>
      </ol>
      <p className="mt-3 text-xs text-amber-900/85">
        Konsolda <strong>Invalid API key</strong> görüyorsanız: anahtar yanlış,
        süresi dolmuş veya URL ile key <strong>farklı projelerden</strong>{" "}
        kopyalanmış demektir — ikisini de aynı projeden yenileyin.
      </p>
    </div>
  );
}
