import Link from "next/link";
import type { ReactNode } from "react";
import type { SeoHubPage } from "@/lib/seo-hubs";

export function SeoHubContent({
  hub,
  children,
}: {
  hub: SeoHubPage;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800 hover:underline">
          Ana Sayfa
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-800">{hub.h1}</span>
      </nav>

      <header className="mt-4 max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
          {hub.h1}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
          {hub.intro}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={hub.ctaPrimary.href}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-[#ffcc00] hover:bg-zinc-800"
          >
            {hub.ctaPrimary.label}
          </Link>
          <Link
            href={hub.ctaSecondary.href}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {hub.ctaSecondary.label}
          </Link>
        </div>
      </header>

      {children ? <div className="mt-8">{children}</div> : null}

      <div className="mt-10 grid gap-6 max-w-3xl sm:gap-8">
        {hub.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">
              {section.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <aside className="mt-10 border-t border-zinc-200 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          İlgili sayfalar
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {hub.related.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:border-zinc-300"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
