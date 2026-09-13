'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  ImageIcon,
  Link as LinkIcon,
  Unlink,
  Highlighter,
  Undo,
  Redo,
  Minus,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.url) return String(data.url);
  return null;
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!editor) return null;

  const addLink = () => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Ссылка (https://…)', prev);
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = /^(https?:\/\/|\/|#|mailto:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    editor.chain().focus().setLink({ href }).run();
  };

  return (
    <div className="yp-rte-bar">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`editor-btn ${editor.isActive('bold') ? 'active' : ''}`} title="Жирный (Ctrl+B)">
        <Bold size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`editor-btn ${editor.isActive('italic') ? 'active' : ''}`} title="Курсив">
        <Italic size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`editor-btn ${editor.isActive('underline') ? 'active' : ''}`} title="Подчёркнутый">
        <UnderlineIcon size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`editor-btn ${editor.isActive('strike') ? 'active' : ''}`} title="Зачёркнутый">
        <Strikethrough size={16} />
      </button>
      <span className="yp-rte-div" />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`editor-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`} title="Заголовок 1">
        <Heading1 size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`editor-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`} title="Заголовок 2">
        <Heading2 size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`editor-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`} title="Заголовок 3">
        <Heading3 size={16} />
      </button>
      <span className="yp-rte-div" />
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`editor-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`} title="По левому краю">
        <AlignLeft size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`editor-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`} title="По центру">
        <AlignCenter size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`editor-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`} title="По правому краю">
        <AlignRight size={16} />
      </button>
      <span className="yp-rte-div" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`editor-btn ${editor.isActive('bulletList') ? 'active' : ''}`} title="Список">
        <List size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`editor-btn ${editor.isActive('orderedList') ? 'active' : ''}`} title="Нумерация">
        <ListOrdered size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`editor-btn ${editor.isActive('blockquote') ? 'active' : ''}`} title="Цитата">
        <Quote size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="editor-btn" title="Разделитель">
        <Minus size={16} />
      </button>
      <span className="yp-rte-div" />
      <button type="button" onClick={() => fileInputRef.current?.click()} className="editor-btn" title="Картинка">
        <ImageIcon size={16} />
      </button>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const url = await uploadImage(file);
          if (url) editor.chain().focus().setImage({ src: url }).run();
          else window.alert('Не удалось загрузить фото');
        }}
      />
      <button type="button" onClick={addLink} className={`editor-btn ${editor.isActive('link') ? 'active' : ''}`} title="Ссылка">
        <LinkIcon size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className="editor-btn" title="Убрать ссылку" disabled={!editor.isActive('link')}>
        <Unlink size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={`editor-btn ${editor.isActive('highlight') ? 'active' : ''}`} title="Маркер">
        <Highlighter size={16} />
      </button>
      <label className="editor-btn yp-rte-color" title="Цвет текста">
        <input
          type="color"
          value={editor.getAttributes('textStyle').color || '#0f172a'}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>
      <span className="yp-rte-grow" />
      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} className="editor-btn" title="Отменить">
        <Undo size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} className="editor-btn" title="Повторить">
        <Redo size={16} />
      </button>
    </div>
  );
}

export default function RichTextEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const [chars, setChars] = useState(0);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Highlight,
      TextStyle,
      Color,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'yp-rte-doc',
        'data-placeholder': 'Начните текст страницы… Можно вставить картинку из буфера.',
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const image = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (!image) return false;
        void uploadImage(image).then((url) => {
          if (url) editorRef.current?.chain().focus().setImage({ src: url }).run();
        });
        return true;
      },
    },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
      setChars(ed.getText().trim().length);
    },
    onUpdate: ({ editor: ed }) => {
      editorRef.current = ed;
      onChange(ed.getHTML());
      setChars(ed.getText().trim().length);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
      setChars(editor.getText().trim().length);
    }
  }, [content, editor]);

  return (
    <div className="yp-rte">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      <div className="yp-rte-status">
        <span>{chars} символов</span>
        <span>Ctrl+B · Ctrl+Z · картинка из буфера</span>
      </div>
    </div>
  );
}
