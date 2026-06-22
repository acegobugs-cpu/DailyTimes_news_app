"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Node, mergeAttributes, Extension } from "@tiptap/core";
import { MantineProvider } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { IconPhoto, IconVideo, IconLink } from "@tabler/icons-react";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import MediaBlock from "./mediaBlock";
import "@mantine/tiptap/styles.css";

// Types
interface CustomImageAttributes {
  src: string | null;
  alt: string | null;
  title: string | null;
  width: string;
  height: string;
  source: string;
}

interface CustomVideoAttributes {
  src: string | null;
  controls: boolean;
  loop: boolean;
  autoplay: boolean;
  width: string;
  height: string;
  source: string;
}

interface EmbedVideoAttributes {
  src: string | null;
  width: string;
  height: string;
  source: string;
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  h4: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  alignJustify: boolean;
  highlight: boolean;
  color: string | null;
}

interface MantineTiptapEditorProps {
  onChange?: (content: any) => void;
  initialValue?: any;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      insertVideo: (attributes: CustomVideoAttributes) => ReturnType;
    };
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embedVideo: {
      insertEmbedVideo: (attributes: EmbedVideoAttributes) => ReturnType;
    };
  }
}

// Custom Image Extension (as block-level node)
const CustomImageExtension = Node.create({
  name: "image",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: "100%" },
      height: { default: "auto" },
      source: { default: "external" }, // 'local' or 'external'
    };
  },
  parseHTML() {
    return [
      {
        tag: "img",
        getAttrs: (element: HTMLElement) => ({
          src: element.getAttribute("src"),
          alt: element.getAttribute("alt"),
          title: element.getAttribute("title"),
          source: element.getAttribute("source") || "external",
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const src =
      HTMLAttributes.source === "local"
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${HTMLAttributes.src}`
        : HTMLAttributes.src;
    return ["img", mergeAttributes({ ...HTMLAttributes, src })];
  },
});

// Custom Video Extension
const CustomVideoExtension = Node.create({
  name: "video",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      loop: { default: false },
      autoplay: { default: false },
      width: { default: "100%" },
      height: { default: "auto" },
      source: { default: "external" }, // 'local' or 'external'
    };
  },
  parseHTML() {
    return [
      {
        tag: "video",
        getAttrs: (element: HTMLElement) => ({
          src: element.getAttribute("src"),
          controls: element.hasAttribute("controls"),
          loop: element.hasAttribute("loop"),
          autoplay: element.hasAttribute("autoplay"),
          width: element.getAttribute("width"),
          height: element.getAttribute("height"),
          source: element.getAttribute("source") || "external",
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const src =
      HTMLAttributes.source === "local"
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${HTMLAttributes.src}`
        : HTMLAttributes.src;
    return ["video", mergeAttributes({ ...HTMLAttributes, src })];
  },
  addCommands() {
    return {
      insertVideo:
        (attrs: CustomVideoAttributes) =>
        ({ commands }: any) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});

// Embed Video Extension
const EmbedVideoExtension = Node.create({
  name: "embedVideo",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null }, // Embed URL (e.g., YouTube/Vimeo)
      width: { default: "100%" },
      height: { default: "auto" },
      source: { default: "embed" }, // Fixed to 'embed'
    };
  },
  parseHTML() {
    return [
      {
        tag: "iframe",
        getAttrs: (element: HTMLElement) => ({
          src: element.getAttribute("src"),
          width: element.getAttribute("width"),
          height: element.getAttribute("height"),
          source: "embed",
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes({
        frameborder: "0",
        allowfullscreen: "true",
        ...HTMLAttributes,
      }),
    ];
  },
  addCommands() {
    return {
      insertEmbedVideo:
        (attrs: EmbedVideoAttributes) =>
        ({ commands }: any) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});

// Debounce function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

function MantineTiptapEditor({
  onChange,
  initialValue = {},
}: MantineTiptapEditorProps) {
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    strike: false,
    code: false,
    h1: false,
    h2: false,
    h3: false,
    h4: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    codeBlock: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    highlight: false,
    color: null,
  });

  const [mediaData, setMediaData] = useState({
    mediaType: "image" as "image" | "video" | "embed",
    source: "external" as "external" | "local",
    url: "",
  });

  const lastContent = useRef<any>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true, autolink: true }),
      CustomImageExtension,
      CustomVideoExtension,
      EmbedVideoExtension,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialValue,
    immediatelyRender: false,
  });

  // Track active formatting and trigger onChange
  useEffect(() => {
    if (!editor) return;

    const update = debounce(() => {
      const currentContent = editor.getJSON();
      if (
        JSON.stringify(currentContent) !== JSON.stringify(lastContent.current)
      ) {
        onChange?.(currentContent);
        lastContent.current = currentContent;
      }

      setActiveFormats({
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        strike: editor.isActive("strike"),
        code: editor.isActive("code"),
        h1: editor.isActive("heading", { level: 1 }),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        h4: editor.isActive("heading", { level: 4 }),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        blockquote: editor.isActive("blockquote"),
        codeBlock: editor.isActive("codeBlock"),
        alignLeft: editor.isActive({ textAlign: "left" }),
        alignCenter: editor.isActive({ textAlign: "center" }),
        alignRight: editor.isActive({ textAlign: "right" }),
        alignJustify: editor.isActive({ textAlign: "justify" }),
        highlight: editor.isActive("highlight"),
        color: editor.getAttributes("textStyle")?.color || null,
      });
    }, 300);

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    update();

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor, onChange]);

  // Handle media insertion
  const handleMediaInsert = useCallback(() => {
    if (!editor || !mediaData.url) return;

    if (mediaData.mediaType === "image") {
      editor
        .chain()
        .focus()
        .setImage({
          src: mediaData.url,
          source: mediaData.source,
        } as any)
        .run();
    } else if (mediaData.mediaType === "video") {
      editor
        .chain()
        .focus()
        .insertVideo({
          src: mediaData.url,
          source: mediaData.source,
        } as CustomVideoAttributes)
        .run();
    } else if (mediaData.mediaType === "embed") {
      editor
        .chain()
        .focus()
        .insertEmbedVideo({
          src: mediaData.url,
          source: "embed",
        } as EmbedVideoAttributes)
        .run();
    }

    // Reset after insert
    setMediaData({ mediaType: "image", source: "external", url: "" });
  }, [editor, mediaData]);

  if (!editor) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <div className="rounded-lg shadow-md border min-h-[400px] flex items-center justify-center">
          <p className="text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  const controlStyle = (isActive: boolean) => ({
    backgroundColor: isActive ? "rgba(255, 215, 0, 0.2)" : "transparent",
    borderRadius: "6px",
    transition: "all 0.2s ease-in-out",
  });

  const colorPickerStyle = (color: string | null) => ({
    border: color ? `2px solid ${color}` : "2px solid transparent",
    borderRadius: "6px",
  });

  return (
    <MantineProvider>
      <div className="w-full max-w-6xl mx-auto p-4 font-sans">
        <RichTextEditor editor={editor} className="rounded-lg shadow-md">
          <RichTextEditor.Toolbar
            className="border-b border-gray-300 sticky top-0 z-10 p-2 rounded-t-lg"
            style={{ background: "#270053ff" }}
          >
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold
                onClick={() => editor.chain().focus().toggleBold().run()}
                style={controlStyle(activeFormats.bold)}
              />
              <RichTextEditor.Italic
                onClick={() => editor.chain().focus().toggleItalic().run()}
                style={controlStyle(activeFormats.italic)}
              />
              <RichTextEditor.Strikethrough
                onClick={() => editor.chain().focus().toggleStrike().run()}
                style={controlStyle(activeFormats.strike)}
              />
              <RichTextEditor.Code
                onClick={() => editor.chain().focus().toggleCode().run()}
                style={controlStyle(activeFormats.code)}
              />
              <RichTextEditor.Highlight
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                style={{
                  background: activeFormats.highlight
                    ? "#FFD700"
                    : "transparent",
                  boxShadow: activeFormats.highlight
                    ? "0 0 8px #FFD700, 0 0 16px #FFD700"
                    : "none",
                  borderRadius: "6px",
                  transition: "all 0.2s ease-in-out",
                }}
              />
              <RichTextEditor.ColorPicker
                colors={[
                  "#25262B",
                  "#868E96",
                  "#FA5252",
                  "#E64980",
                  "#BE4BDB",
                  "#7950F2",
                  "#4C6EF5",
                  "#228BE6",
                  "#15AABF",
                  "#12B886",
                  "#40C057",
                  "#82C91E",
                  "#FAB005",
                  "#FD7E14",
                ]}
                style={colorPickerStyle(activeFormats.color)}
              />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H1
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                style={controlStyle(activeFormats.h1)}
              />
              <RichTextEditor.H2
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                style={controlStyle(activeFormats.h2)}
              />
              <RichTextEditor.H3
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                style={controlStyle(activeFormats.h3)}
              />
              <RichTextEditor.H4
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 4 }).run()
                }
                style={controlStyle(activeFormats.h4)}
              />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                style={controlStyle(activeFormats.bulletList)}
              />
              <RichTextEditor.OrderedList
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                style={controlStyle(activeFormats.orderedList)}
              />
              <RichTextEditor.Blockquote
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                style={controlStyle(activeFormats.blockquote)}
              />
              <RichTextEditor.CodeBlock
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                style={controlStyle(activeFormats.codeBlock)}
              />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.AlignLeft
                onClick={() =>
                  editor.chain().focus().setTextAlign("left").run()
                }
                style={controlStyle(activeFormats.alignLeft)}
              />
              <RichTextEditor.AlignCenter
                onClick={() =>
                  editor.chain().focus().setTextAlign("center").run()
                }
                style={controlStyle(activeFormats.alignCenter)}
              />
              <RichTextEditor.AlignRight
                onClick={() =>
                  editor.chain().focus().setTextAlign("right").run()
                }
                style={controlStyle(activeFormats.alignRight)}
              />
              <RichTextEditor.AlignJustify
                onClick={() =>
                  editor.chain().focus().setTextAlign("justify").run()
                }
                style={controlStyle(activeFormats.alignJustify)}
              />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link />
              <RichTextEditor.Unlink />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <MediaBlock
                data={mediaData}
                // onChange={(updated) => {
                //   setMediaData(updated);
                //   if (updated.url) {
                //     // Update mediaData and trigger insertion
                //     setMediaData(updated);
                //     setTimeout(handleMediaInsert, 100);
                //   }
                // }}
                onChange={() => {}}
              />
              <RichTextEditor.Control onClick={handleMediaInsert}>
                {mediaData.mediaType === "image" ? (
                  <IconPhoto stroke={1.5} size="1.5rem" />
                ) : mediaData.mediaType === "embed" ? (
                  <IconLink stroke={1.5} size="1.5rem" />
                ) : (
                  <IconVideo stroke={1.5} size="1.5rem" />
                )}
              </RichTextEditor.Control>
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>

          <RichTextEditor.Content className="min-h-[400px] p-4" />
        </RichTextEditor>
      </div>
    </MantineProvider>
  );
}

export default MantineTiptapEditor;
