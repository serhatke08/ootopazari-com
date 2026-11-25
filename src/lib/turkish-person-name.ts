export function turkishPersonName(first?: string | null, last?: string | null) {
  return [first, last]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLocaleLowerCase("tr-TR");
      return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
    })
    .join(" ");
}
