export default function AraLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4 sm:px-6">
      <div className="h-12 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-100"
          />
        ))}
      </div>
    </div>
  );
}
