import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-7xl font-bold text-gray-100 mb-4">404</div>
      <h1 className="text-2xl font-bold text-(--brand) mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8 text-sm">The page you are looking for does not exist or has been moved.</p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-(--brand) text-white text-sm font-semibold rounded hover:bg-[#0d2a5a] transition"
      >
        Return to Home
      </Link>
    </div>
  );
}

