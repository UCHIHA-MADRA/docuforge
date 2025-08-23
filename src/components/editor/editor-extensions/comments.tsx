"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export interface Comment {
  id: string;
  text: string;
  from: number;
  to: number;
  userId: string;
  userName: string;
  createdAt: Date;
  resolved?: boolean;
}

interface CommentsOptions {
  HTMLAttributes?:
  Record<string, string | number | boolean | null>;
  onCommentClick?: (commentId: string) => void;
  getComments?: () => Comment[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comments: {
      /**
       * Add a comment to the current selection
       */
      addComment: (comment: Omit<Comment, 'from' | 'to'>) => ReturnType;
      /**
       * Remove a comment by ID
       */
      removeComment: (commentId: string) => ReturnType;
      /**
       * Toggle a comment's resolved status
       */
      toggleCommentResolved: (commentId: string) => ReturnType;
    };
  }
}

const Comments = Extension.create<CommentsOptions>({
  name: 'comments',

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentClick: () => {},
      getComments: () => [],
    };
  },

  addCommands() {
    return {
      addComment:
        (comment) => ({ tr, dispatch }) => {
          const { from, to } = tr.selection;
          
          if (dispatch) {
            tr.setMeta('comments', {
              type: 'add',
              comment: {
                ...comment,
                from,
                to,
              },
            });
          }
          
          return true;
        },
      
      removeComment:
        (commentId) => ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta('comments', {
              type: 'remove',
              commentId,
            });
          }
          
          return true;
        },
      
      toggleCommentResolved:
        (commentId) => ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta('comments', {
              type: 'toggle-resolved',
              commentId,
            });
          }
          
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { onCommentClick, getComments } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('comments'),
        
        state: {
          init() {
            return DecorationSet.empty;
          },
          
          apply(tr, oldState) {
            const comments = getComments?.() ?? [];
            
            // Handle metadata updates
            const meta = tr.getMeta('comments');
            if (meta) {
              // Handle comment actions here
              // This would typically update your comment store
              // which would then be reflected in getComments()
            }
            
            // Create decorations for all comments
            const decorations: Decoration[] = [];
            
            comments.forEach(comment => {
              if (!comment.resolved) {
                const decoration = Decoration.inline(comment.from, comment.to, {
                  class: 'comment-highlight',
                  'data-comment-id': comment.id,
                });
                
                decorations.push(decoration);
              }
            });
            
            return DecorationSet.create(tr.doc, decorations);
          },
        },
        
        props: {
          decorations(state) {
            return this.getState(state);
          },
          
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const commentId = target.getAttribute('data-comment-id');
            
            if (commentId && onCommentClick) {
              onCommentClick(commentId);
              return true;
            }
            
            return false;
          },
        },
      }),
    ];
  },
});

export default Comments;

// Styles for comment highlights are in src/styles/editor.css