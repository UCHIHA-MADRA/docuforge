"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import Mention from "@tiptap/extension-mention";
import { Editor } from "@tiptap/react";
import Image from "next/image";

// Types
interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface MentionNodeAttrs {
  id: string;
  label: string;
}

interface SuggestionProps<T = unknown, A = MentionNodeAttrs> {
  editor: Editor;
  range: Range;
  query: string;
  text: string;
  items: T[];
  command: (props: A) => void;
  decorationNode: Element | null;
  clientRect?: (() => DOMRect | null) | null;
  event?: KeyboardEvent;
}

interface MentionSuggestionProps {
  items: User[];
  command: (props: { id: string; label: string }) => void;
  selectedIndex?: number;
}

interface MentionSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
  selectItem: (index: number) => void;
}

// Mention Suggestion List Component
const MentionSuggestionList = forwardRef<
  MentionSuggestionListRef,
  MentionSuggestionProps
>(({ items, command, selectedIndex = 0 }, ref) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.name });
      }
    },
    [items, command]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setCurrentIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        selectItem(currentIndex);
        return true;
      }

      return false;
    },
    selectItem,
  }));

  return (
    <div className="mention-suggestion-list bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto p-1">
      {items.length ? (
        items.map((item, index) => (
          <button
            key={item.id}
            className={`mention-suggestion-item w-full flex items-center gap-3 p-2 text-left rounded hover:bg-gray-100 ${
              index === currentIndex ? "bg-blue-50 text-blue-600" : ""
            }`}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setCurrentIndex(index)}
          >
            {item.avatar ? (
              <Image
                src={item.avatar}
                alt={item.name}
                width={24}
                height={24}
                className="mention-suggestion-avatar rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                {item.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium">{item.name}</span>
          </button>
        ))
      ) : (
        <div className="mention-suggestion-no-results p-3 text-sm text-gray-500 text-center">
          No users found
        </div>
      )}
    </div>
  );
});

MentionSuggestionList.displayName = "MentionSuggestionList";

// Mention Extension
export const createMentionExtension = (users: User[]) => {
  return Mention.configure({
    HTMLAttributes: {
      class:
        "mention bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm font-medium",
    },
    suggestion: {
      items: ({ query }: { query: string }) => {
        return users
          .filter((user) =>
            user.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10);
      },
      render: () => {
        let component: ReactRenderer<MentionSuggestionListRef>;
        let popup: TippyInstance[] = [];
        let currentIndex = 0;

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionSuggestionList, {
              props: {
                ...props,
                selectedIndex: currentIndex,
              },
              editor: props.editor,
            });

            if (!props.clientRect) return;

            popup = [
              tippy(document.body, {
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(),
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "light-border",
                maxWidth: 300,
              }),
            ];
          },

          onUpdate: (props) => {
            component.updateProps({
              ...props,
              selectedIndex: currentIndex,
            });

            if (!props.clientRect || !popup[0]) return;

            popup[0].setProps({
              getReferenceClientRect: () =>
                props.clientRect?.() ?? new DOMRect(),
            });
          },

          onKeyDown: (props) => {
            if (!props.event || !component.ref) return false;

            if (props.event.key === "Escape") {
              popup[0]?.hide();
              return true;
            }

            const handled = component.ref.onKeyDown({ event: props.event });

            if (handled) {
              if (props.event.key === "ArrowUp") {
                currentIndex = Math.max(0, currentIndex - 1);
              } else if (props.event.key === "ArrowDown") {
                currentIndex = Math.min(
                  users.length - 1,
                  currentIndex + 1
                );
              }
            }

            return handled;
          },

          onExit: () => {
            popup[0]?.destroy();
            component.destroy();
            currentIndex = 0;
          },
        };
      },
    },
  });
};

// Utilities
export const getMentionedUsers = (content: string): string[] => {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]);
  }

  return mentions;
};

export const formatMentionText = (user: User): string => {
  return `@[${user.name}](${user.id})`;
};

// Export styles if needed
export const mentionStyles = `

/* Mention styles */
.mention {
  background-color: #dbeafe;
  color: #1d4ed8;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}
.mention:hover {
  background-color: #bfdbfe;
}

/* Suggestion list styles */
.mention-suggestion-list {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  max-height: 240px;
  overflow: auto;
  padding: 4px;
  z-index: 1000;
}
.mention-suggestion-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;
}
.mention-suggestion-item:hover,
.mention-suggestion-item.selected {
  background-color: #f3f4f6;
}
.mention-suggestion-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}
.mention-suggestion-no-results {
  padding: 12px;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

/* Tippy theme override */
.tippy-box[data-theme~='light-border'] {
  background-color: white;
  border: 1px solid #e5e7eb;
  color: #374151;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
.tippy-box[data-theme~='light-border'] .tippy-arrow {
  color: white;
}
`;
