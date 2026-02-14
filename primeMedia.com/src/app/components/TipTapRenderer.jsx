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

// Custom Image Extension
// Custom Image Extension (as block-level node)
const CustomImageExtension = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: '100%' },
      height: { default: 'auto' },
      source: { default: 'external' }, // 'local' or 'external'
    };
  },
  parseHTML() {
    return [
      {
        tag: 'img',
        getAttrs: element => ({
          src: element.getAttribute('src'),
          alt: element.getAttribute('alt'),
          title: element.getAttribute('title'),
          source: element.getAttribute('source') || 'external',
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.source === 'local' 
      ? `${process.env.NEXT_PUBLIC_API_URL}${HTMLAttributes.src}` 
      : HTMLAttributes.src;
    return ['img', mergeAttributes({ ...HTMLAttributes, src })];
  },
});

// Custom Video Extension
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
      source: { default: 'external' }, // 'local' or 'external'
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
          source: element.getAttribute('source') || 'external',
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.source === 'local' 
      ? `${process.env.NEXT_PUBLIC_API_URL}${HTMLAttributes.src}` 
      : HTMLAttributes.src;
    return ['video', mergeAttributes({ ...HTMLAttributes, src })];
  },
  addCommands() {
    return {
      insertVideo:
        attrs =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});

// Embed Video Extension
const EmbedVideoExtension = Node.create({
  name: 'embedVideo',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null }, // Embed URL (e.g., YouTube/Vimeo)
      width: { default: '100%' },
      height: { default: 'auto' },
      source: { default: 'embed' }, // Fixed to 'embed'
    };
  },
  parseHTML() {
    return [
      {
        tag: 'iframe',
        getAttrs: element => ({
          src: element.getAttribute('src'),
          width: element.getAttribute('width'),
          height: element.getAttribute('height'),
          source: 'embed',
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes({ frameborder: '0', allowfullscreen: true, ...HTMLAttributes })];
  },
  addCommands() {
    return {
      insertEmbedVideo:
        attrs =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});

export default function TipTapRenderer({ content }) {
  const editor = useEditor({
    content,
    editable: false,
    extensions: [
      StarterKit,
      CustomImageExtension.configure({ inline: true, allowBase64: true }),
      Link.configure({ openOnClick: true, autolink: true }),
      CustomVideoExtension,
      EmbedVideoExtension,
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
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="prose max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}