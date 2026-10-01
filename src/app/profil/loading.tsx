/** Sekme geçişinde layout kaymasın — sadece hafif içerik placeholder */
export default function ProfilLoading() {
  return (
    <div className="mt-8 space-y-3" aria-hidden>
      <div className="h-4 w-40 rounded bg-zinc-100" />
      <div className="h-24 rounded-xl bg-zinc-100/80" />
    </div>
  );
}
