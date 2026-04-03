"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { FaInstagram } from 'react-icons/fa';

/**
 * Dynamically import ReactQuill to avoid SSR issues.
 * Quill only works in the browser.
 */
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-2xl" />,
});

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const Editor: React.FC<EditorProps> = ({ value, onChange, placeholder }) => {
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState('');

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'clean'],
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list',
    'link', 'image'
  ];

  /**
   * Insert Instagram marker into the editor content.
   * This is currently a simple marker parsed on the frontend.
   */
  const handleInsertInstagram = () => {
    if (!instagramUrl.trim()) return;

    // Validate Instagram URL pattern
    const isValid = /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i.test(instagramUrl.trim());
    if (!isValid) {
      alert('Please enter a valid Instagram post, reel, or IGTV URL.');
      return;
    }

    const marker = `[instagram:${instagramUrl.trim()}]`;
    // Insert the marker - we ideally want cursor position, 
    // but for now appending works with existing state.
    const newValue = value + `<p>${marker}</p>`;
    onChange(newValue);
    setInstagramUrl('');
    setShowInstagramModal(false);
  };

  return (
    <div className="quill-editor-wrapper relative">
      {/* 
        Using standard Tailwind for editor overrides instead of styled-jsx 
        to avoid potential SSR token issues reported on /admin.
      */}
      <style>{`
        .quill-editor-wrapper .ql-toolbar {
          border-top-left-radius: 1rem;
          border-top-right-radius: 1rem;
          border-color: rgba(0, 0, 0, 0.1) !important;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }
        .quill-editor-wrapper .ql-container {
          border-bottom-left-radius: 1rem;
          border-bottom-right-radius: 1rem;
          border-color: rgba(0, 0, 0, 0.1) !important;
          min-height: 300px;
          font-size: 1rem;
        }
        .quill-editor-wrapper .ql-editor {
          min-height: 300px;
        }
        .dark .quill-editor-wrapper .ql-toolbar {
          border-color: rgba(255, 255, 255, 0.1) !important;
          background: rgba(0, 0, 0, 0.2);
        }
        .dark .quill-editor-wrapper .ql-container {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>

      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-2xl overflow-hidden"
      />

      {/* Insert Instagram Button */}
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

      {/* Modal */}
      {showInstagramModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInstagramModal(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 p-0 rounded-[1.5rem] overflow-hidden
            bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl
            border border-white/30 dark:border-white/10
            shadow-2xl shadow-black/20">

            <div className="h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400" />

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/25">
                  <FaInstagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Embed Instagram Post</h3>
                  <p className="text-xs text-muted-foreground">Paste a public Instagram URL below</p>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/ABC123..."
                  className="w-full h-12 px-4 rounded-xl text-sm
                    bg-white/60 dark:bg-black/40
                    border border-black/10 dark:border-white/10
                    focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500
                    placeholder:text-muted-foreground/50
                    transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertInstagram();
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Supports posts, reels, and IGTV. Requires a public post URL.
                </p>
              </div>

              {instagramUrl && /instagram\.com\/(p|reel|tv)\/[\w-]+/.test(instagramUrl) && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Valid Instagram URL detected</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInstagramUrl('');
                    setShowInstagramModal(false);
                  }}
                  className="h-10 px-5 rounded-xl text-sm font-semibold
                    text-muted-foreground hover:text-foreground
                    bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10
                    transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertInstagram}
                  disabled={!instagramUrl.trim()}
                  className="h-10 px-6 rounded-xl text-sm font-bold text-white
                    bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400
                    hover:from-purple-600 hover:via-pink-600 hover:to-orange-500
                    shadow-lg shadow-pink-500/20
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Insert Embed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
