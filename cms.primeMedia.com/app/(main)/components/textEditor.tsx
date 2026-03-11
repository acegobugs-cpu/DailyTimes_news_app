"use client";

import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Editor, Extension } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderLineIcon,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Highlighter,
  Images,
  Link as LinkIcon,
  TextAlignStart,
  TextAlignEnd,
  TextAlignCenter,
  TextAlignJustify,
  UnderlineIcon,
} from "lucide-react";
import { apiClient } from "@/app/lib/api";

interface EditorProps {
  onChange?: (content: any) => void;
  initialValue?: any;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textHighlight: {
      setTextHighlight: (color: string) => ReturnType;
      unsetTextHighlight: () => ReturnType;
    };
  }
}

export default function TextEditor({
  onChange,
  initialValue = {},
}: EditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const headingRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const [pendingFontSize, setPendingFontSize] = useState<number>(16); // temporary input
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showImageWindow, setShowImageWindow] = useState(false);
  const presetHighlights = [
    "#fff59d", // Yellow
    "#ffcc80", // Orange
    "#80deea", // Cyan
    "#a5d6a7", // Green
    "#f48fb1", // Pink
    "#b39ddb", // Purple
    "#ffffff", // White (reset)
  ];

  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);

  const presetSizes = [8, 10, 12, 14, 16, 18, 24, 32, 48, 60, 72, 96];
  const alignOptions = [
    { value: "left", label: "Left", icon: TextAlignStart },
    { value: "center", label: "Center", icon: TextAlignCenter },
    { value: "right", label: "Right", icon: TextAlignEnd },
    { value: "justify", label: "Justify", icon: TextAlignJustify },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        colorRef.current &&
        !colorRef.current.contains(event.target as Node)
      ) {
        setShowColorPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const Highlight = Extension.create({
    name: "highlight",
    addGlobalAttributes() {
      return [
        {
          types: ["textStyle"],
          attributes: {
            backgroundColor: {
              default: null,
              parseHTML: (el) => el.style.backgroundColor || null,
              renderHTML: (attrs) =>
                attrs.backgroundColor
                  ? { style: `background-color: ${attrs.backgroundColor}` }
                  : {},
            },
          },
        },
      ];
    },
    addCommands() {
      return {
        setTextHighlight: (color: string) => (chain: any) => {
          // if (!attributes?.color) return false;
          return chain()
            .setMark("textStyle", {
              backgroundColor: color,
            })
            .run();
        },
        unsetTextHighlight: () => (chain: any) => {
          return chain()
            .setMark("textStyle", { backgroundColor: null })
            .removeEmptyTextStyle()
            .run();
        },
      };
    },
  });

  const FontSize = Extension.create({
    name: "fontSize",

    addOptions() {
      return {
        types: ["textStyle"],
      };
    },

    addGlobalAttributes() {
      return [
        {
          types: this.options.types,
          attributes: {
            fontSize: {
              default: null,
              parseHTML: (element) =>
                element.style.fontSize.replace("px", "") || null,
              renderHTML: (attributes) => {
                if (!attributes.fontSize) {
                  return {};
                }
                return { style: `font-size: ${attributes.fontSize}px` };
              },
            },
          },
        },
      ];
    },

    addCommands() {
      return {
        setFontSize:
          (size: string) =>
          ({ chain }) => {
            return chain().setMark("textStyle", { fontSize: size }).run();
          },
        unsetFontSize:
          () =>
          ({ chain }) => {
            return chain()
              .setMark("textStyle", { fontSize: null })
              .removeEmptyTextStyle()
              .run();
          },
      };
    },
  });
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { HTMLAttributes: { class: "list-disc ml-5" } },
        orderedList: { HTMLAttributes: { class: "list-decimal ml-5" } },
      }),
      Placeholder.configure({
        placeholder: "Start typing like in Google Docs...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:pointer-events-none",
      }),
      Color.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontFamily,
      FontSize,
      Image,
      Highlight,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: initialValue || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none focus:outline-none min-h-[200px] px-8 py-6",
      },
    },
  });
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const size = editor.getAttributes("textStyle").fontSize || "16";
      setFontSize(size);
      setPendingFontSize(size);
    };

    editor.on("selectionUpdate", update);
    return () => {
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  const currentColor = editor?.getAttributes("textStyle").color || "#000000";
  const getCurrentBlockLabel = () => {
    if (editor?.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor?.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor?.isActive("heading", { level: 3 })) return "Heading 3";
    return "Normal text";
  };

  const setSize = (size: number) => {
    editor?.chain().focus().setFontSize(String(size)).run();
  };

  if (!editor) return null;

  return (
    <>
      <div className="text-black">
        <div className="flex items-center justify-between border rounded px-6 py-2 mx-6 bg-gray-50">
          <div className="border-l border-r p-auto">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              <Redo size={18} />
            </button>
          </div>

          {/* TEXT TOPOLOGY-------TEXT FONT------TEXT SIZE*/}

          <div className="flex items-center justify-between border-l border-r p-auto">
            <div className="relative" ref={headingRef}>
              {/* Trigger */}
              <button
                onClick={() => setShowHeadingMenu((prev) => !prev)}
                className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-100 min-w-[130px] text-left"
              >
                {getCurrentBlockLabel()}
              </button>

              {/* Dropdown */}
              {showHeadingMenu && (
                <div className="absolute top-full left-0 mt-2 bg-white border rounded shadow-lg z-50 w-48">
                  <button
                    onClick={() => {
                      editor.chain().focus().setParagraph().run();
                      setShowHeadingMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                      editor.isActive("paragraph") ? "bg-gray-100" : ""
                    }`}
                  >
                    Normal text
                  </button>

                  <button
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 1 }).run();
                      setShowHeadingMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 font-bold text-lg ${
                      editor.isActive("heading", { level: 1 })
                        ? "bg-gray-100"
                        : ""
                    }`}
                  >
                    Heading 1
                  </button>

                  <button
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 2 }).run();
                      setShowHeadingMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 font-semibold text-base ${
                      editor.isActive("heading", { level: 2 })
                        ? "bg-gray-100"
                        : ""
                    }`}
                  >
                    Heading 2
                  </button>

                  <button
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 3 }).run();
                      setShowHeadingMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 font-medium ${
                      editor.isActive("heading", { level: 3 })
                        ? "bg-gray-100"
                        : ""
                    }`}
                  >
                    Heading 3
                  </button>
                </div>
              )}
            </div>
            <div>
              <select
                value={
                  editor.getAttributes("textStyle").fontFamily || "sans-serif"
                }
                onChange={(e) =>
                  editor.chain().focus().setFontFamily(e.target.value).run()
                }
                className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-100"
              >
                <option value="sans-serif">Sans Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="'Georgia', serif">Georgia</option>
                <option value="'Times New Roman', serif">
                  Times New Roman
                </option>
                <option value="'Courier New', monospace">Courier New</option>
              </select>
            </div>

            <div className="relative flex items-center border rounded bg-white">
              {showFontSizeDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded shadow-lg z-50 p-2">
                  {/* Preset sizes */}
                  <div className="grid grid-cols-3 gap-2">
                    {presetSizes.map((size) => (
                      <button
                        key={size}
                        className={`px-2 py-1 rounded hover:bg-gray-100 ${
                          fontSize === size ? "bg-gray-200" : ""
                        }`}
                        onClick={() => {
                          setSize(size);
                          setFontSize(size);
                          setPendingFontSize(size);
                          setShowFontSizeDropdown(false);
                        }}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Input */}
              <input
                type="number"
                value={pendingFontSize}
                onChange={(e) => setPendingFontSize(Number(e.target.value))}
                // onClick={(e) => setShowFontSizeDropdown((prev) => !prev)}   drop down to be added!!!!!!
                onBlur={() => {
                  let value = Number(pendingFontSize);
                  if (isNaN(value) || value < 8) value = 8;
                  if (value > 96) value = 96;
                  editor.chain().focus().setFontSize(String(value)).run();
                  setFontSize(value);
                  setPendingFontSize(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-16 text-center border rounded px-1 py-0.5"
                min={8}
                max={96}
              />
            </div>
          </div>

          {/*TEXT BOLD-------TEXT UNDERLINED-------TEXT COLORED------TEXT HIGLIGHTED*/}

          <div className="flex border-l border-r px-auto">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive("bold") ? "bg-gray-200" : ""}`}
            >
              <Bold size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive("italic") ? "bg-gray-200" : ""}`}
            >
              <Italic size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive("underline") ? "bg-gray-200" : ""}`}
            >
              <UnderlineIcon size={18} />
            </button>
            <div className="relative" ref={colorRef}>
              {/* Trigger button */}
              <button
                onClick={() => setShowColorPicker((prev) => !prev)}
                className="flex items-center flex-col p-1.5 rounded hover:bg-gray-200"
                title="Text color"
              >
                <span className="text-sm">A</span>
                <span
                  className="w-6 h-1 rounded"
                  style={{ backgroundColor: currentColor }}
                />
              </button>

              {/* Dropdown */}
              {showColorPicker && (
                <div className="absolute top-full mt-2 left-0 bg-white border rounded shadow-lg p-3 z-50 w-52">
                  {/* Native color picker */}
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                      editor.chain().focus().setColor(e.target.value).run();
                    }}
                    className="w-full h-10 cursor-pointer border-none"
                  />

                  {/* Preset palette (optional like Google Docs) */}
                  <div className="grid grid-cols-6 gap-2 mt-3">
                    {[
                      "#000000",
                      "#dc2626",
                      "#16a34a",
                      "#2563eb",
                      "#ca8a04",
                      "#9333ea",
                      "#ea580c",
                      "#0d9488",
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          editor.chain().focus().setColor(color).run();
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded border hover:scale-110 transition"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Reset */}
                  <button
                    onClick={() => {
                      editor.chain().focus().unsetColor().run();
                      setShowColorPicker(false);
                    }}
                    className="mt-3 w-full text-sm px-2 py-1 hover:bg-gray-100 rounded"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <div className="">
                <button
                  onClick={() => setShowHighlightDropdown((prev) => !prev)}
                  className="p-1.5 rounded hover:bg-gray-200"
                >
                  <Highlighter />
                </button>

                {showHighlightDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg p-2 z-50 grid grid-cols-4 gap-2 w-52">
                    {presetHighlights.map((bg) => (
                      <button
                        key={bg}
                        style={{ backgroundColor: bg }}
                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition"
                        onClick={() => {
                          if (bg === "#ffffff") {
                            editor.chain().focus().unsetTextHighlight().run();
                          } else {
                            editor.chain().focus().setTextHighlight(bg).run();
                          }
                          setShowHighlightDropdown(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive("blockquote") ? "bg-gray-200" : ""}`}
              title="Quote"
            >
              <Quote />
            </button>
            <button
              onClick={() => {
                const url = window.prompt("Enter link URL:");
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              className="p-1.5 hover:bg-gray-200 rounded"
              title="Insert link"
            >
              <LinkIcon />
            </button>
            <button
              onClick={() => setShowImageWindow(true)}
              className="p-1.5 hover:bg-gray-200 rounded"
              title="Insert image"
            >
              <Images />
            </button>
          </div>

          <div className="flex justify-between items-center">
            <div className="relative">
              {/* Trigger button */}
              <button
                onClick={() => setShowAlignDropdown((prev) => !prev)}
                className="flex items-center p-1.5 rounded hover:bg-gray-200"
              >
                {(() => {
                  const Icon = alignOptions.find(
                    (opt) =>
                      opt.value ===
                      (editor.getAttributes("paragraph").textAlign || "left"),
                  )?.icon;
                  return Icon ? <Icon /> : null;
                })()}
              </button>

              {/* Dropdown menu */}
              {showAlignDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-50">
                  {alignOptions.map((opt) => {
                    const Icon = opt.icon;
                    const currentAlign =
                      editor.getAttributes("paragraph").textAlign || "left";
                    return (
                      <button
                        key={opt.value}
                        className={`flex items-center gap-2 px-3 py-1 w-full text-left hover:bg-gray-100 ${
                          currentAlign === opt.value ? "bg-gray-200" : ""
                        }`}
                        onClick={() => {
                          editor.chain().focus().setTextAlign(opt.value).run();
                          setShowAlignDropdown(false);
                        }}
                      >
                        <Icon size={16} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive("bulletList") ? "bg-gray-200" : ""}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive("orderedList") ? "bg-gray-200" : ""}`}
            >
              <ListOrdered size={18} />
            </button>
          </div>
          {/* <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive("codeBlock") ? "bg-gray-200" : ""}`}
          title="Code block"
        >
          code
        </button> */}
        </div>

        <div className="w-full p-10">
          <EditorContent
            className="border border-dashed h-auto p-12 bg-white"
            editor={editor}
          />
        </div>

        <BubbleMenu editor={editor}>
          <div className="flex bg-black text-white rounded shadow-lg p-1 gap-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 hover:bg-gray-800 rounded ${editor.isActive("bold") ? "bg-gray-800" : ""}`}
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 hover:bg-gray-800 rounded ${editor.isActive("italic") ? "bg-gray-800" : ""}`}
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 hover:bg-gray-800 rounded ${editor.isActive("underline") ? "bg-gray-800" : ""}`}
            >
              <UnderLineIcon size={16} />
            </button>
          </div>
        </BubbleMenu>

        <FloatingMenu editor={editor}>
          <div className="flex bg-black text-white rounded shadow-lg p-1 gap-1">
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className="p-2 hover:bg-gray-800 rounded"
            >
              H1
            </button>
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className="p-2 hover:bg-gray-800 rounded"
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className="p-2 hover:bg-gray-800 rounded"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className="p-2 hover:bg-gray-800 rounded"
            >
              <ListOrdered size={16} />
            </button>
          </div>
        </FloatingMenu>
      </div>
      {showImageWindow && (
        <ImageWindow
          editor={editor}
          onClose={() => setShowImageWindow(false)}
        />
      )}
    </>
  );
}

interface ImgWindow {
  editor: Editor;
  onClose: any;
}

export function ImageWindow({ editor, onClose }: ImgWindow) {
  const [url, setUrl] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUploadedFiles = async () => {
      try {
        const mediaFiles = await apiClient.getMedia();
        setMedia(mediaFiles.files.map((file) => file));
      } catch (error) {
        console.error("Failed to fetch uploaded files:", error);
        setMedia([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUploadedFiles();
  }, []);

  const insertImage = (src: string) => {
    editor.chain().focus().setImage({ src }).run();
    onClose();
  };

  const uploadImage = async (file: File) => {
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }

      const data = await res.json();
      if (!data.url) {
        throw new Error("No URL returned from upload");
      }
      insertImage(data.url);
    } catch (error) {
      console.error("Image upload failed:", error);
      // Consider adding user-facing error feedback here
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center text-main justify-center z-50">
      <div className="bg-white h-full w-3/4 rounded-lg shadow-lg p-4">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">Insert Image</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* URL INPUT */}
        <div className="mb-4">
          <label className="text-sm font-medium">Image URL</label>
          <div className="flex gap-2 mt-1">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="border rounded px-2 py-1 flex-1"
              placeholder="https://example.com/image.jpg"
            />
            <button
              onClick={() => {
                if (url.trim()) {
                  insertImage(url.trim());
                }
              }}
              disabled={!url.trim()}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Insert
            </button>
          </div>
        </div>

        {/* UPLOAD */}
        <div className="mb-4">
          <label className="text-sm font-medium">Upload</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImage(file);
            }}
          />
        </div>

        {/* MEDIA LIBRARY */}
        <div>
          <label className="text-sm font-medium">Media Library</label>

          <div className="grid grid-cols-6 gap-2 mt-2 max-h-[250px] overflow-y-auto">
            {!loading &&
              media.map((img: any, idx) => (
                <img
                  key={idx}
                  src={img}
                  loading="lazy"
                  className="cursor-pointer rounded hover:opacity-80"
                  onClick={() => insertImage(img)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
