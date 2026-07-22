"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      autoplay: { default: false },
      loop: { default: false },
      muted: { default: false },
      playsinline: { default: true },
      width: { default: null },
      height: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes)];
  },
});

export default function TiptapEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false }),
      TableKit.configure({ table: { resizable: true } }),
      Video,
      Placeholder.configure({
        placeholder: placeholder ?? "본문을 입력하세요…",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "tiptap-prose min-h-[260px] w-full px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Reflect external value changes (e.g. switching language tabs)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return (
    <div className="border border-gray-300 rounded-md bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!editor) {
    return (
      <div className="border-b border-gray-200 px-2 py-1.5 text-xs text-gray-400">
        에디터 로딩 중…
      </div>
    );
  }

  const btn = (active: boolean) =>
    `px-2 py-1 text-xs rounded border ${
      active
        ? "bg-(--brand) text-white border-(--brand)"
        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
    }`;

  function promptLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  async function uploadAndInsert(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        url?: string;
        kind?: "image" | "video";
        error?: string;
      };
      if (!res.ok || !json.ok || !json.url) {
        window.alert(json.error ?? "업로드에 실패했습니다.");
        return;
      }
      if (json.kind === "video") {
        editor!
          .chain()
          .focus()
          .insertContent({
            type: "video",
            attrs: { src: json.url, controls: true, playsinline: true },
          })
          .run();
      } else {
        editor!.chain().focus().setImage({ src: json.url }).run();
      }
    } catch {
      window.alert("네트워크 오류로 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function promptImageUrl() {
    const url = window.prompt("이미지 URL", "https://");
    if (!url) return;
    editor!.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 px-2 py-1.5">
      <button
        type="button"
        className={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>
      <button
        type="button"
        className={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </button>
      <button
        type="button"
        className={btn(editor.isActive("strike"))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        S
      </button>
      <span className="w-px bg-gray-200 mx-1" />
      <button
        type="button"
        className={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        H2
      </button>
      <button
        type="button"
        className={btn(editor.isActive("heading", { level: 3 }))}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        H3
      </button>
      <span className="w-px bg-gray-200 mx-1" />
      <button
        type="button"
        className={btn(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </button>
      <button
        type="button"
        className={btn(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </button>
      <button
        type="button"
        className={btn(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        " "
      </button>
      <span className="w-px bg-gray-200 mx-1" />
      <button
        type="button"
        className={btn(editor.isActive("link"))}
        onClick={promptLink}
      >
        🔗
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/ogg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void uploadAndInsert(f);
        }}
      />
      <button
        type="button"
        className={btn(false)}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="이미지 또는 영상(mp4) 업로드"
      >
        {uploading ? "⏳" : "📎 업로드"}
      </button>
      <button
        type="button"
        className={btn(false)}
        onClick={promptImageUrl}
        title="이미지 URL 삽입"
      >
        🖼 URL
      </button>
      <span className="w-px bg-gray-200 mx-1" />
      <button
        type="button"
        className={btn(editor.isActive("table"))}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        title="표 삽입 (3x3)"
      >
        ▦ 표
      </button>
      {editor.isActive("table") && (
        <>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="아래에 행 추가"
          >
            +행
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="오른쪽에 열 추가"
          >
            +열
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="행 삭제"
          >
            −행
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="열 삭제"
          >
            −열
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="표 삭제"
          >
            표삭제
          </button>
        </>
      )}
      <span className="w-px bg-gray-200 mx-1" />
      <button
        type="button"
        className={btn(false)}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        ↶
      </button>
      <button
        type="button"
        className={btn(false)}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        ↷
      </button>
    </div>
  );
}
