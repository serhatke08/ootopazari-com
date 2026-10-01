/** Hafif placeholder — tam iskelet sayfayı kaydırıyordu */
export default function MesajlarLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6" aria-hidden>
      <div className="h-4 w-28 rounded bg-zinc-100" />
      <div className="mt-4 space-y-2">
        <div className="h-14 rounded-xl bg-zinc-100/80" />
        <div className="h-14 rounded-xl bg-zinc-100/60" />
      </div>
    </div>
  );
}
