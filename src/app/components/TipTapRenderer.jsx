'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Node, mergeAttributes } from '@tiptap/core';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';

// Custom Video Extension (same as in MantineTiptapEditor)
const CustomVideoExtension = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      loop: { default: false },
      autoplay: { default: false },
      width: { default: '100%' },
      height: { default: 'auto' },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'video',
        getAttrs: element => ({
          src: element.getAttribute('src'),
          controls: element.hasAttribute('controls'),
          loop: element.hasAttribute('loop'),
          autoplay: element.hasAttribute('autoplay'),
          width: element.getAttribute('width'),
          height: element.getAttribute('height'),
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes)];
  },
});

export default function TipTapRenderer({ content }) {
  const editor = useEditor({
    content,
    editable: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: true }),
      Link.configure({ openOnClick: true, autolink: true }),
      CustomVideoExtension,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none text-gray-800',
      },
    },
    injectCSS: false,
    immediatelyRender: false, // Prevent hydration issues
  });
  console.log(content);
  if (!editor) return null;

  return (
    <div className="prose max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}