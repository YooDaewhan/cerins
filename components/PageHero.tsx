import { getDefaultHeroImage } from "@/src/lib/mockRepository";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  image?: string | null;
}

export default async function PageHero({ title, subtitle, breadcrumb, image }: PageHeroProps) {
  const bg = image && image.length > 0 ? image : await getDefaultHeroImage();

  return (
    <div
      className="relative flex items-center"
      style={{ height: "20vh", minHeight: "140px" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bg}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-(--brand)/95 via-(--brand)/60 to-(--brand)/15" />
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-(--brand)" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {breadcrumb && (
          <p className="text-xs text-(--brand) tracking-widest uppercase font-bold mb-2 flex items-center gap-2">
            <span className="w-5 h-0.5 bg-(--brand) inline-block" />
            {breadcrumb}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-300 text-sm mt-2">{subtitle}</p>}
      </div>
    </div>
  );
}
