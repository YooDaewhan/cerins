interface PageHeroProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  image?: string;
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1400&q=80&auto=format&fit=crop";

export default function PageHero({ title, subtitle, breadcrumb, image }: PageHeroProps) {
  const bg = image || DEFAULT_IMAGE;

  return (
    <div
      className="relative flex items-center"
      style={{ height: "28vh", minHeight: "200px" }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bg}')` }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand)]/90 via-[var(--brand)]/75 to-[var(--brand)]/50" />
      {/* Left red accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand)]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {breadcrumb && (
          <p className="text-xs text-[var(--brand)] tracking-widest uppercase font-bold mb-2 flex items-center gap-2">
            <span className="w-5 h-0.5 bg-[var(--brand)] inline-block" />
            {breadcrumb}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-300 text-sm mt-2">{subtitle}</p>}
      </div>
    </div>
  );
}
