// 본문 오른쪽 컬럼에 붙는 사진. URL 이 없으면 아무것도 그리지 않는다.
export default function SidePhoto({ url, alt }: { url?: string | null; alt?: string }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt ?? ""}
      className="w-full lg:w-72 xl:w-80 flex-shrink-0 rounded-lg object-cover"
    />
  );
}
