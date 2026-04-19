export function isHeicLikeUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  const s = String(src).toLowerCase();
  return (
    /\.hei(c|f)(?:$|[?#])/i.test(s) ||
    /format=hei(c|f)/i.test(s) ||
    /contenttype=image%2Fhei(c|f)/i.test(s) ||
    /content-type=image\/hei(c|f)/i.test(s)
  );
}
