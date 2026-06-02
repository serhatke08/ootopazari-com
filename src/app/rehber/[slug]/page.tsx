import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAllSeoGuideSlugs,
  getSeoGuideBySlug,
} from "@/lib/seo-guides";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllSeoGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getSeoGuideBySlug(slug);
  if (!guide) return { title: "Rehber bulunamadı" };

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/rehber/${slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `/rehber/${slug}`,
      type: "article",
    },
  };
}

export default async function RehberArticlePage({ params }: Props) {
  const { slug } = await params;
  const guide = getSeoGuideBySlug(slug);
  if (!guide) notFound();

  return (
    <article className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-10 sm:px-6 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800 hover:underline">
          Ana Sayfa
        </Link>
        <span className="mx-2">/</span>
        <Link href="/rehber" className="hover:text-zinc-800 hover:underline">
          Rehber
        </Link>
      </nav>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
        {guide.title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
        {guide.description}
      </p>
      <div className="prose prose-zinc mt-8 max-w-2xl space-y-4 text-sm leading-relaxed text-zinc-700 sm:text-base">
        {guide.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-[#ffcc00] hover:bg-zinc-800"
        >
          İlanları incele
        </Link>
        <Link
          href="/ilan-ver"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Ücretsiz ilan ver
        </Link>
      </div>
    </article>
  );
}
