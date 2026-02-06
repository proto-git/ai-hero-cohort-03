import { Extension, type Editor, type Range } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  ImageIcon,
  Minus,
} from "lucide-react";
import { createRoot } from "react-dom/client";

interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  command: (editor: Editor, range: Range) => void;
}

const slashCommandItems: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Unordered list of items",
    icon: List,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Ordered list of items",
    icon: ListOrdered,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Blockquote",
    description: "Highlight a quote",
    icon: Quote,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Insert a code snippet",
    icon: Code,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Image",
    description: "Insert an image from URL",
    icon: ImageIcon,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt("Enter image URL:");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    title: "Horizontal Rule",
    description: "Insert a divider line",
    icon: Minus,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

function SlashCommandMenu({
  items,
  selectedIndex,
  onSelect,
}: {
  items: SlashCommandItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="slash-command-menu">
      {items.length > 0 ? (
        items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              className={`slash-command-item ${index === selectedIndex ? "is-selected" : ""}`}
              onClick={() => onSelect(index)}
            >
              <div className="slash-command-icon">
                <Icon className="size-4" />
              </div>
              <div className="slash-command-text">
                <span className="slash-command-title">{item.title}</span>
                <span className="slash-command-description">
                  {item.description}
                </span>
              </div>
            </button>
          );
        })
      ) : (
        <div className="slash-command-empty">No results</div>
      )}
    </div>
  );
}

const suggestion: Omit<SuggestionOptions<SlashCommandItem>, "editor"> = {
  char: "/",
  allowedPrefixes: null,
  startOfLine: true,

  items({ query }) {
    return slashCommandItems.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
  },

  render() {
    let popup: HTMLElement | null = null;
    let root: ReturnType<typeof createRoot> | null = null;
    let selectedIndex = 0;
    let currentItems: SlashCommandItem[] = [];
    let currentCommand: ((props: SlashCommandItem) => void) | null = null;

    function updateMenu() {
      if (!root) return;
      root.render(
        <SlashCommandMenu
          items={currentItems}
          selectedIndex={selectedIndex}
          onSelect={(index) => {
            const item = currentItems[index];
            if (item && currentCommand) {
              currentCommand(item);
            }
          }}
        />
      );
    }

    return {
      onStart(props) {
        popup = document.createElement("div");
        popup.classList.add("slash-command-popup");
        root = createRoot(popup);

        currentItems = props.items;
        currentCommand = props.command;
        selectedIndex = 0;
        updateMenu();

        document.body.appendChild(popup);

        const rect = props.clientRect?.();
        if (rect) {
          popup.style.position = "fixed";
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 4}px`;
          popup.style.zIndex = "50";
        }
      },

      onUpdate(props) {
        currentItems = props.items;
        currentCommand = props.command;
        selectedIndex = 0;
        updateMenu();

        const rect = props.clientRect?.();
        if (rect && popup) {
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 4}px`;
        }
      },

      onKeyDown(props) {
        if (props.event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % currentItems.length;
          updateMenu();
          return true;
        }
        if (props.event.key === "ArrowUp") {
          selectedIndex =
            (selectedIndex - 1 + currentItems.length) % currentItems.length;
          updateMenu();
          return true;
        }
        if (props.event.key === "Enter") {
          const item = currentItems[selectedIndex];
          if (item && currentCommand) {
            currentCommand(item);
          }
          return true;
        }
        if (props.event.key === "Escape") {
          return true;
        }
        return false;
      },

      onExit() {
        if (root) {
          root.unmount();
          root = null;
        }
        if (popup) {
          popup.remove();
          popup = null;
        }
        currentCommand = null;
      },
    };
  },
};

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...suggestion,
        command: ({ editor, range, props }) => {
          props.command(editor, range);
        },
      }),
    ];
  },
});
