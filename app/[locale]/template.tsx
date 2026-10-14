// template은 라우트가 바뀔 때마다 새로 마운트돼서 페이지 진입 애니메이션이 매번 걸린다.
export default function LocaleTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
