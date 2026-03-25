"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

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
    'list', 'bullet',
    'link', 'image'
  ];

  return (
    <div className="quill-editor-wrapper">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-2xl overflow-hidden"
      />
      <style jsx global>{`
        .quill-editor-wrapper .ql-toolbar {
          border-top-left-radius: 1rem;
          border-top-right-radius: 1rem;
          border-color: rgba(255, 255, 255, 0.4) !important;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }
        .quill-editor-wrapper .ql-container {
          border-bottom-left-radius: 1rem;
          border-bottom-right-radius: 1rem;
          border-color: rgba(255, 255, 255, 0.4) !important;
          min-h: 300px;
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
    </div>
  );
};

export default Editor;
