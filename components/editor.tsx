"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { FaInstagram } from "react-icons/fa";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo,
  RemoveFormatting,
} from "lucide-react";
import { uploadBlogImage } from "@/lib/image-upload";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const Editor: React.FC<EditorProps> = ({ value, onChange, placeholder }) => {
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: { class: "rounded-xl max-w-full h-auto" },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-orange-600 underline underline-offset-2",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-lg dark:prose-invert max-w-none min-h-full p-5 outline-none focus:outline-none prose-img:rounded-xl prose-img:max-w-full",
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        // Handle pasted image files (screenshots, copied images)
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            void insertUploadedImage(file);
            return true;
          }
        }

        // Handle pasted plain text that looks like an image URL
        const text = event.clipboardData?.getData("text/plain")?.trim();
        if (text && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(text)) {
          event.preventDefault();
          editor?.chain().focus().setImage({ src: text }).run();
          return true;
        }

        return false;
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        const imageFile = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!imageFile) return false;

        event.preventDefault();
        void insertUploadedImage(imageFile);
        return true;
      },
    },
  });

  const insertUploadedImage = useCallback(async (file: File) => {
    if (!editor) return;
    try {
      setIsUploadingImage(true);
      const result = await uploadBlogImage(file, { folder: "blog-content-images", targetKB: 200 });
      editor.chain().focus().setImage({ src: result.url }).run();
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (src) editor?.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  }, [editor]);

  // Sync external value changes (e.g. draft restore, editing existing blog)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const insertImage = useCallback(() => {
    const url = imageUrl.trim();
    if (!url || !editor) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl("");
    setShowImageModal(false);
  }, [editor, imageUrl]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter URL:");
    if (!url) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const handleInsertInstagram = () => {
    if (!instagramUrl.trim() || !editor) return;
    const isValid = /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i.test(instagramUrl.trim());
    if (!isValid) {
      alert("Please enter a valid Instagram post, reel, or IGTV URL.");
      return;
    }
    const marker = `[instagram:${instagramUrl.trim()}]`;
    editor.chain().focus().insertContent(`<p>${marker}</p>`).run();
    setInstagramUrl("");
    setShowInstagramModal(false);
  };

  if (!editor) {
    return <div className="h-[480px] w-full bg-muted animate-pulse rounded-2xl" />;
  }

  return (
    <div className="tiptap-editor-wrapper">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 rounded-t-2xl border border-b-0 border-black/10 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-xl">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarBtn>

        <ToolbarSep />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough className="w-4 h-4" />
        </ToolbarBtn>

        <ToolbarSep />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote className="w-4 h-4" />
        </ToolbarBtn>

        <ToolbarSep />

        <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => setShowImageModal(true)} title="Insert Image">
          <ImageIcon className="w-4 h-4" />
        </ToolbarBtn>

        <ToolbarSep />

        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <Undo className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <Redo className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarBtn>
      </div>

      {/* Editor body */}
      <div className="h-[480px] overflow-y-auto overscroll-contain border border-black/10 dark:border-white/10 rounded-b-2xl bg-white/50 dark:bg-black/50">
        <EditorContent editor={editor} />
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowInstagramModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white
            hover:from-purple-600 hover:via-pink-600 hover:to-orange-500
            shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30
            hover:scale-[1.02] active:scale-[0.98]"
        >
          <FaInstagram className="w-4 h-4" />
          Insert Instagram
        </button>
        <span className="text-xs text-muted-foreground">Embed posts, reels & IGTV</span>
      </div>

      {/* Image URL modal */}
      {showImageModal && (
        <ModalOverlay onClose={() => setShowImageModal(false)}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <ImageIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Insert Image</h3>
              <p className="text-xs text-muted-foreground">Paste an image URL below</p>
            </div>
          </div>

          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full h-12 px-4 rounded-xl text-sm bg-white/60 dark:bg-black/40
              border border-black/10 dark:border-white/10
              focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500
              placeholder:text-muted-foreground/50 transition-all"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertImage(); } }}
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            Supports JPG, PNG, GIF, WebP, SVG, and other image formats.
          </p>
          <label
            className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
              isUploadingImage
                ? "border-orange-300 bg-orange-500/10 text-orange-600"
                : "cursor-pointer border-black/10 bg-black/5 text-foreground hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {isUploadingImage ? "Uploading & compressing..." : "Upload local image (auto-compress)"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploadingImage}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await insertUploadedImage(file);
                e.currentTarget.value = "";
              }}
            />
          </label>

          {imageUrl && /^https?:\/\/.+/i.test(imageUrl) && (
            <div className="mt-4 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Preview" className="max-h-40 w-full object-contain" />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={() => { setImageUrl(""); setShowImageModal(false); }}
              className="h-10 px-5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={insertImage}
              disabled={!imageUrl.trim()}
              className="h-10 px-6 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Insert Image
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Instagram modal */}
      {showInstagramModal && (
        <ModalOverlay onClose={() => setShowInstagramModal(false)}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/25">
              <FaInstagram className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Embed Instagram Post</h3>
              <p className="text-xs text-muted-foreground">Paste a public Instagram URL below</p>
            </div>
          </div>

          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/ABC123..."
            className="w-full h-12 px-4 rounded-xl text-sm bg-white/60 dark:bg-black/40
              border border-black/10 dark:border-white/10
              focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500
              placeholder:text-muted-foreground/50 transition-all"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInsertInstagram(); } }}
          />
          <p className="text-[11px] text-muted-foreground mt-2">Supports posts, reels, and IGTV. Requires a public post URL.</p>

          {instagramUrl && /instagram\.com\/(p|reel|tv)\/[\w-]+/.test(instagramUrl) && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Valid Instagram URL detected</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={() => { setInstagramUrl(""); setShowInstagramModal(false); }}
              className="h-10 px-5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsertInstagram}
              disabled={!instagramUrl.trim()}
              className="h-10 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 shadow-lg shadow-pink-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Insert Embed
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Editor styles */}
      <style>{`
        .tiptap-editor-wrapper .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgb(163 163 163);
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor-wrapper .tiptap:focus-visible {
          outline: none;
        }
        .tiptap-editor-wrapper .tiptap {
          min-height: 100%;
        }
        .tiptap-editor-wrapper [contenteditable="true"] {
          scroll-margin-block: 1rem;
        }
        .tiptap-editor-wrapper .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1rem 0;
        }
        .tiptap-editor-wrapper .tiptap img.ProseMirror-selectednode {
          outline: 3px solid rgb(249 115 22);
          outline-offset: 2px;
          border-radius: 0.75rem;
        }
      `}</style>
    </div>
  );
};

/* ─── Reusable sub-components ─────────────────────────────────────────────── */

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all text-sm
        ${active ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 mx-1 bg-black/10 dark:bg-white/10" />;
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-[1.5rem] overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-2xl shadow-black/20">
        <div className="h-1.5 bg-gradient-to-r from-orange-400 to-orange-600" />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default Editor;
