import { Extension, Node, RawCommands, mergeAttributes } from "@tiptap/core";

export const MediaBlock = Node.create({
  name: "mediaBlock",

  group: "block",

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      kind: {
        default: "image", // image | video | embed | gallery
      },

      src: {
        default: "",
      },

      poster: {
        default: null,
      },

      caption: {
        default: null,
      },

      provider: {
        default: "local",
      },

      controls: {
        default: true,
      },

      autoplay: {
        default: false,
      },

      loop: {
        default: false,
      },

      alt: {
        default: null,
      },

      width: {
        default: "100%",
      },

      height: {
        default: "auto",
      },

      items: {
        default: null, // gallery array
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-media]",
        getAttrs: (node) => {
          if (typeof node === "string") return false;
          const kind = node.getAttribute("data-media");
          const img = node.querySelector("img");
          const video = node.querySelector("video");
          const iframe = node.querySelector("iframe");
          const figcaption = node.querySelector("figcaption");
          const caption = figcaption?.textContent || null;

          if (kind === "image" && img) {
            return {
              kind,
              src: img.getAttribute("src"),
              alt: img.getAttribute("alt"),
              caption,
            };
          }
          if (kind === "video" && video) {
            return {
              kind,
              src: video.getAttribute("src"),
              poster: video.getAttribute("poster"),
              controls: video.hasAttribute("controls"),
              autoplay: video.hasAttribute("autoplay"),
              loop: video.hasAttribute("loop"),
              caption,
            };
          }
          if (kind === "embed" && iframe) {
            return { kind, src: iframe.getAttribute("src"), caption };
          }
          // Handle gallery as needed
          return { kind };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { kind, src, poster, caption, controls, autoplay, loop, alt, items } =
      HTMLAttributes;

    if (kind === "image") {
      return [
        "figure",
        { "data-media": "image" },
        ["img", { src, alt }],
        caption ? ["figcaption", {}, caption] : null,
      ];
    }

    if (kind === "video") {
      return [
        "figure",
        { "data-media": "video" },
        [
          "video",
          mergeAttributes({
            src,
            poster,
            controls,
            autoplay,
            loop,
            style: "width:100%;height:auto;display:block;",
          }),
        ],
        caption ? ["figcaption", {}, caption] : null,
      ];
    }

    if (kind === "embed") {
      return [
        "figure",
        { "data-media": "embed" },
        [
          "iframe",
          mergeAttributes({
            src,
            frameborder: "0",
            allowfullscreen: "true",
            sandbox: "allow-scripts allow-same-origin allow-presentation",
          }),
        ],
        caption ? ["figcaption", {}, caption] : null,
      ];
    }

    if (kind === "gallery") {
      return [
        "figure",
        { "data-media": "gallery" },
        [
          "div",
          { class: "gallery-grid" },
          ...(items || []).map((img: any) => ["img", { src: img.src }]),
        ],
        caption ? ["figcaption", {}, caption] : null,
      ];
    }

    return ["figure", { "data-media": "unknown" }];
  },

  addCommands() {
    return {
      insertImage:
        (attrs: { src: string; alt?: string; caption?: string }) =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              kind: "image",
              ...attrs,
            },
          }),

      insertVideo:
        (attrs: {
          src: string | null;
          poster?: string;
          caption?: string;
          controls?: boolean;
          autoplay?: boolean;
          loop?: boolean;
        }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              kind: "video",
              controls: true,
              ...attrs,
            },
          }),

      insertEmbed:
        (attrs: { src: string; caption?: string; provider?: string }) =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              kind: "embed",
              ...attrs,
            },
          }),

      insertGallery:
        (items: { src: string }[]) =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              kind: "gallery",
              items,
            },
          }),
    };
  },
});

export const Highlight = Extension.create({
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
      setTextHighlight:
        (color: string) =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", {
              backgroundColor: color,
            })
            .run();
        },
      unsetTextHighlight:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { backgroundColor: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

export const FontSize = Extension.create({
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
