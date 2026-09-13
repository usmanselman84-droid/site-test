'use client';

import { useState } from 'react';
import RichTextEditor from './RichTextEditor';

export default function RichTextInput({ name, defaultValue = '' }: { name: string; defaultValue?: string }) {
  const [content, setContent] = useState(defaultValue);

  return (
    <div className="yp-rte-field">
      <label className="yp-rte-label">Текст</label>
      <input type="hidden" name={name} value={content} />
      <RichTextEditor content={content} onChange={setContent} />
    </div>
  );
}
