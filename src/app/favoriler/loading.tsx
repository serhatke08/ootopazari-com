/** Hafif placeholder — tam iskelet sayfayı kaydırıyordu */
export default function FavorilerLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6" aria-hidden>
      <div className="h-4 w-32 rounded bg-zinc-100" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] rounded-xl bg-zinc-100/70" />
        ))}
      </div>
    </div>
  );
}
