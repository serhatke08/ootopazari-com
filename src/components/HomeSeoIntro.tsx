import {
  SITE_DISPLAY_NAME,
  SITE_HOME_INTRO,
  SITE_HOME_TITLE_SUFFIX,
} from "@/lib/seo-brand";

/** Ana sayfada Google için görünür H1 + oto pazarı / araba anahtar kelimeleri. */
export function HomeSeoIntro() {
  return (
    <section
      className="border-b border-zinc-200 bg-white"
      aria-label="Oto Pazarı tanıtım"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6">
        <h1 className="text-base font-bold leading-snug text-zinc-900 sm:text-lg">
          <span className="text-amber-600">{SITE_DISPLAY_NAME}</span>
          {" "}
          <span className="font-semibold text-zinc-800">
            — {SITE_HOME_TITLE_SUFFIX}
          </span>
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
          {SITE_HOME_INTRO}
        </p>
      </div>
    </section>
  );
}
