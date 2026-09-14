type HeroProps = {
  heading: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function Hero({ heading, subheading, ctaLabel, ctaHref }: HeroProps) {
  return (
    <section className="flex flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-4xl font-bold sm:text-5xl">{heading}</h1>
      {subheading && <p className="max-w-2xl text-lg text-gray-600">{subheading}</p>}
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          className="mt-4 rounded-full bg-black px-6 py-3 text-white transition hover:bg-gray-800"
        >
          {ctaLabel}
        </a>
      )}
    </section>
  );
}
