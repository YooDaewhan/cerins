"use client";

// 요청 상세 화면 공용 파일 첨부 필드.
// 별도 "파일 업로드" 버튼을 두지 않고, 부모의 메인 액션 버튼이 flush() 를 먼저 호출해
// 선택된 파일을 업로드한 뒤 전이(transition)를 실행하도록 한다.
// (파일 선택 → 액션 버튼 한 번으로 업로드 + 처리가 끝난다.)

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface UploadFieldItem {
  /** FormData 필드명. 예) files_MANUAL, doc_12 */
  name: string;
  label: string;
  accept?: string;
  /** 여러 파일 허용 여부(기본 true) */
  multiple?: boolean;
  /** 라벨에 * 표시 */
  required?: boolean;
}

export interface UploadFieldsHandle {
  /**
   * 선택된 파일을 /files 로 업로드한다.
   * - 성공했거나 올릴 파일이 없으면 true
   * - 업로드 중 오류가 나면 false (호출부는 이후 액션을 중단해야 함)
   */
  flush: () => Promise<boolean>;
}

interface Props {
  requestId: number;
  items: UploadFieldItem[];
  onError: (v: string | null) => void;
  /** 선택 파일 개수가 바뀔 때 호출(버튼 활성/비활성 제어용) */
  onCountChange?: (total: number) => void;
}

export const UploadFields = forwardRef<UploadFieldsHandle, Props>(
  function UploadFields({ requestId, items, onError, onCountChange }, ref) {
    const formRef = useRef<HTMLFormElement>(null);
    const [total, setTotal] = useState(0);

    function recount() {
      const form = formRef.current;
      if (!form) return;
      let n = 0;
      for (const el of form.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
        n += el.files?.length ?? 0;
      }
      setTotal(n);
      onCountChange?.(n);
    }

    useImperativeHandle(ref, () => ({
      flush: async () => {
        const form = formRef.current;
        if (!form) return true;
        const fd = new FormData(form);
        let any = false;
        for (const v of fd.values()) {
          if (v instanceof File && v.size > 0) {
            any = true;
            break;
          }
        }
        if (!any) return true; // 올릴 파일 없음 → 오류 아님
        onError(null);
        try {
          const res = await fetch(`/api/requests/${requestId}/files`, {
            method: "POST",
            body: fd,
          });
          const d = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !d.ok) {
            onError(d.error ?? "파일 업로드에 실패했습니다.");
            return false;
          }
          return true;
        } catch {
          onError("네트워크 오류가 발생했습니다.");
          return false;
        }
      },
    }));

    return (
      <form
        ref={formRef}
        onSubmit={(e) => e.preventDefault()}
        className="rounded-md border border-gray-200 p-3 space-y-2"
      >
        {items.map((it) => (
          <div key={it.name} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 w-44 flex-shrink-0">
              {it.label}
              {it.required && <span className="text-red-500">*</span>}
            </span>
            <input
              type="file"
              name={it.name}
              accept={it.accept}
              multiple={it.multiple ?? true}
              onChange={recount}
              className="text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-gray-200"
            />
          </div>
        ))}
        {total > 0 && (
          <p className="text-[11px] text-gray-400">
            {total}개 선택됨 · 아래 버튼을 누르면 함께 업로드됩니다.
          </p>
        )}
      </form>
    );
  },
);
