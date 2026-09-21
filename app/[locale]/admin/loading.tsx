// 관리자 라우트는 전부 force-dynamic이라 클릭 후 서버 응답까지 화면이 멈춘 듯 보인다.
// loading.tsx가 있으면 클릭 즉시 전환되고 이 자리만 채워진다.
export default function AdminLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-40 rounded bg-gray-200" />
      <div className="h-24 rounded-xl bg-gray-200" />
      <div className="h-24 rounded-xl bg-gray-100" />
    </div>
  );
}
