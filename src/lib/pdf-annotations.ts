import { z } from "zod";

// Annotation types and interfaces
export type AnnotationType =
  | "highlight"
  | "comment"
  | "stamp"
  | "drawing"
  | "text"
  | "link";

export type AnnotationColor = {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a?: number; // 0-1, alpha/opacity
};

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  pageIndex: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID
  color: AnnotationColor;
  opacity: number; // 0-1
  isVisible: boolean;
  isLocked: boolean;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: "highlight";
  rectangles: Rectangle[]; // Multiple rectangles for text spanning multiple lines
  selectedText: string;
  blendMode: "multiply" | "normal" | "screen";
}

export interface CommentAnnotation extends BaseAnnotation {
  type: "comment";
  position: Point;
  content: string;
  replies: CommentReply[];
  isResolved: boolean;
  iconType: "note" | "comment" | "key" | "help" | "insert" | "paragraph";
  size: { width: number; height: number };
}

export interface CommentReply {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  isEdited: boolean;
}

export interface StampAnnotation extends BaseAnnotation {
  type: "stamp";
  position: Point;
  size: { width: number; height: number };
  stampType:
    | "approved"
    | "rejected"
    | "draft"
    | "confidential"
    | "urgent"
    | "custom";
  text?: string; // For custom stamps
  rotation: number; // degrees
  imageData?: string; // Base64 encoded image for custom stamps
}

export interface DrawingAnnotation extends BaseAnnotation {
  type: "drawing";
  paths: DrawingPath[];
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
}

export interface DrawingPath {
  points: Point[];
  pressure?: number[]; // For pressure-sensitive drawing
}

export interface TextAnnotation extends BaseAnnotation {
  type: "text";
  position: Point;
  content: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: "normal" | "italic" | "bold" | "bold-italic";
  alignment: "left" | "center" | "right";
  rotation: number;
  backgroundColor?: AnnotationColor;
  borderColor?: AnnotationColor;
  borderWidth: number;
}

export interface LinkAnnotation extends BaseAnnotation {
  type: "link";
  rectangle: Rectangle;
  url: string;
  displayText?: string;
  linkType: "url" | "email" | "page" | "file";
  targetPage?: number; // For page links
  targetFile?: string; // For file links
}

export type Annotation =
  | HighlightAnnotation
  | CommentAnnotation
  | StampAnnotation
  | DrawingAnnotation
  | TextAnnotation
  | LinkAnnotation;

// Annotation layer for managing annotations on a page
export interface AnnotationLayer {
  pageIndex: number;
  annotations: Annotation[];
  isVisible: boolean;
  isLocked: boolean;
}

// Annotation history for undo/redo
export interface AnnotationOperation {
  type: "add" | "edit" | "delete" | "move" | "resize";
  annotationId: string;
  beforeState?: Partial<Annotation>;
  afterState?: Partial<Annotation>;
  timestamp: Date;
}

// Validation schemas
export const AnnotationColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1).optional(),
});

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const RectangleSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const BaseAnnotationSchema = z.object({
  id: z.string(),
  type: z.enum(["highlight", "comment", "stamp", "drawing", "text", "link"]),
  pageIndex: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  color: AnnotationColorSchema,
  opacity: z.number().min(0).max(1),
  isVisible: z.boolean(),
  isLocked: z.boolean(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])).optional(),
});

// PDF Annotation Manager Class
export class PDFAnnotationManager {
  private annotations: Map<string, Annotation> = new Map();
  private layers: Map<number, AnnotationLayer> = new Map();
  private history: AnnotationOperation[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 100;
  private listeners: Map<string, Array<(data?: unknown) => void>> = new Map();

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    this.listeners.set("annotationAdded", []);
    this.listeners.set("annotationUpdated", []);
    this.listeners.set("annotationDeleted", []);
    this.listeners.set("annotationSelected", []);
    this.listeners.set("layerChanged", []);
  }

  // Event management
  on(event: string, callback: (data?: unknown) => void) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
  }

  off(event: string, callback: (data?: unknown) => void) {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data?: unknown) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((callback) => callback(data));
  }

  // Layer management
  createLayer(pageIndex: number): AnnotationLayer {
    const layer: AnnotationLayer = {
      pageIndex,
      annotations: [],
      isVisible: true,
      isLocked: false,
    };
    this.layers.set(pageIndex, layer);
    this.emit("layerChanged", { pageIndex, layer });
    return layer;
  }

  getLayer(pageIndex: number): AnnotationLayer | null {
    return this.layers.get(pageIndex) || null;
  }

  getAllLayers(): AnnotationLayer[] {
    return Array.from(this.layers.values());
  }

  setLayerVisibility(pageIndex: number, isVisible: boolean): boolean {
    const layer = this.layers.get(pageIndex);
    if (layer) {
      layer.isVisible = isVisible;
      this.emit("layerChanged", { pageIndex, layer });
      return true;
    }
    return false;
  }

  setLayerLocked(pageIndex: number, isLocked: boolean): boolean {
    const layer = this.layers.get(pageIndex);
    if (layer) {
      layer.isLocked = isLocked;
      this.emit("layerChanged", { pageIndex, layer });
      return true;
    }
    return false;
  }

  // Annotation CRUD operations
  addAnnotation(
    annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt">
  ): string {
    const id = this.generateId();
    const now = new Date();

    const fullAnnotation: Annotation = {
      ...annotation,
      id,
      createdAt: now,
      updatedAt: now,
    } as Annotation;

    this.annotations.set(id, fullAnnotation);

    // Add to layer
    let layer = this.layers.get(annotation.pageIndex);
    if (!layer) {
      layer = this.createLayer(annotation.pageIndex);
    }
    layer.annotations.push(fullAnnotation);

    // Add to history
    this.addToHistory({
      type: "add",
      annotationId: id,
      afterState: fullAnnotation,
      timestamp: now,
    });

    this.emit("annotationAdded", fullAnnotation);
    return id;
  }

  getAnnotation(id: string): Annotation | null {
    return this.annotations.get(id) || null;
  }

  getAllAnnotations(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  updateAnnotation(id: string, updates: Partial<Annotation>): boolean {
    const annotation = this.annotations.get(id);
    if (!annotation || annotation.isLocked) {
      return false;
    }

    const beforeState = { ...annotation };
    const updatedAnnotation = {
      ...annotation,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    } as Annotation;

    this.annotations.set(id, updatedAnnotation);

    // Update in layer
    const layer = this.layers.get(annotation.pageIndex);
    if (layer) {
      const index = layer.annotations.findIndex((a) => a.id === id);
      if (index > -1) {
        layer.annotations[index] = updatedAnnotation;
      }
    }

    // Add to history
    this.addToHistory({
      type: "edit",
      annotationId: id,
      beforeState,
      afterState: updatedAnnotation,
      timestamp: new Date(),
    });

    this.emit("annotationUpdated", updatedAnnotation);
    return true;
  }

  deleteAnnotation(id: string): boolean {
    const annotation = this.annotations.get(id);
    if (!annotation || annotation.isLocked) {
      return false;
    }

    this.annotations.delete(id);

    // Remove from layer
    const layer = this.layers.get(annotation.pageIndex);
    if (layer) {
      const index = layer.annotations.findIndex((a) => a.id === id);
      if (index > -1) {
        layer.annotations.splice(index, 1);
      }
    }

    // Add to history
    this.addToHistory({
      type: "delete",
      annotationId: id,
      beforeState: annotation,
      timestamp: new Date(),
    });

    this.emit("annotationDeleted", { id, annotation });
    return true;
  }

  // Specialized annotation creators
  createHighlight(
    pageIndex: number,
    rectangles: Rectangle[],
    selectedText: string,
    color: AnnotationColor = { r: 1, g: 1, b: 0, a: 0.3 },
    createdBy: string
  ): string {
    return this.addAnnotation({
      type: "highlight",
      pageIndex,
      rectangles,
      selectedText,
      blendMode: "multiply",
      color,
      opacity: color.a || 0.3,
      isVisible: true,
      isLocked: false,
      createdBy,
    } as Omit<HighlightAnnotation, "id" | "createdAt" | "updatedAt">);
  }

  createComment(
    pageIndex: number,
    position: Point,
    content: string,
    createdBy: string,
    iconType: CommentAnnotation["iconType"] = "note"
  ): string {
    return this.addAnnotation({
      type: "comment",
      pageIndex,
      position,
      content,
      replies: [],
      isResolved: false,
      iconType,
      size: { width: 20, height: 20 },
      color: { r: 1, g: 1, b: 0 },
      opacity: 1,
      isVisible: true,
      isLocked: false,
      createdBy,
    } as Omit<CommentAnnotation, "id" | "createdAt" | "updatedAt">);
  }

  createStamp(
    pageIndex: number,
    position: Point,
    stampType: StampAnnotation["stampType"],
    createdBy: string,
    customText?: string,
    customImage?: string
  ): string {
    return this.addAnnotation({
      type: "stamp",
      pageIndex,
      position,
      size: { width: 100, height: 50 },
      stampType,
      text: customText,
      rotation: 0,
      imageData: customImage,
      color: this.getStampColor(stampType),
      opacity: 1,
      isVisible: true,
      isLocked: false,
      createdBy,
    } as Omit<StampAnnotation, "id" | "createdAt" | "updatedAt">);
  }

  createDrawing(
    pageIndex: number,
    paths: DrawingPath[],
    color: AnnotationColor,
    strokeWidth: number,
    createdBy: string
  ): string {
    return this.addAnnotation({
      type: "drawing",
      pageIndex,
      paths,
      strokeWidth,
      strokeStyle: "solid",
      color,
      opacity: 1,
      isVisible: true,
      isLocked: false,
      createdBy,
    } as Omit<DrawingAnnotation, "id" | "createdAt" | "updatedAt">);
  }

  createText(
    pageIndex: number,
    position: Point,
    content: string,
    fontSize: number,
    fontFamily: string,
    fontStyle: TextAnnotation["fontStyle"],
    alignment: TextAnnotation["alignment"],
    rotation: number,
    createdBy: string,
    backgroundColor?: AnnotationColor,
    borderColor?: AnnotationColor,
    borderWidth?: number
  ): string {
    return this.addAnnotation({
      type: "text",
      pageIndex,
      position,
      content,
      fontSize,
      fontFamily,
      fontStyle,
      alignment,
      rotation,
      backgroundColor,
      borderColor,
      borderWidth,
      color: { r: 0, g: 0, b: 0 }, // Default to black text
      opacity: 1,
      isVisible: true,
      isLocked: false,
      createdBy,
    } as Omit<TextAnnotation, "id" | "createdAt" | "updatedAt">);
  }

  createLink(
    pageIndex: number,
    rectangle: Rectangle,
    url: string,
    linkType: LinkAnnotation["linkType"],
    createdBy: string,
    displayText?: string,
    targetPage?: number,
    targetFile?: string
  ): string {
    return this.addAnnotation({
      type: "link",
      pageIndex,
      rectangle,
      url,
      displayText,
      linkType,
      targetPage,
      targetFile,
      color: { r: 0, g: 0, b: 1 }, // Default to blue link
      opacity: 1,
      isVisible: true,
      isLocked: false,
      createdBy,
    } as Omit<LinkAnnotation, "id" | "createdAt" | "updatedAt">);
  }

  // Comment management
  addCommentReply(
    annotationId: string,
    content: string,
    createdBy: string
  ): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation || annotation.type !== "comment") {
      return false;
    }

    const reply: CommentReply = {
      id: this.generateId(),
      content,
      createdAt: new Date(),
      createdBy,
      isEdited: false,
    };

    (annotation as CommentAnnotation).replies.push(reply);
    annotation.updatedAt = new Date();

    this.emit("annotationUpdated", annotation);
    return true;
  }

  resolveComment(annotationId: string): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation || annotation.type !== "comment") {
      return false;
    }

    (annotation as CommentAnnotation).isResolved = true;
    annotation.updatedAt = new Date();

    this.emit("annotationUpdated", annotation);
    return true;
  }

  // Search and filter
  searchAnnotations(query: string): Annotation[] {
    const results: Annotation[] = [];
    const lowerQuery = query.toLowerCase();

    for (const annotation of this.annotations.values()) {
      let matches = false;

      switch (annotation.type) {
        case "highlight":
          matches = (annotation as HighlightAnnotation).selectedText
            .toLowerCase()
            .includes(lowerQuery);
          break;
        case "comment":
          const comment = annotation as CommentAnnotation;
          matches =
            comment.content.toLowerCase().includes(lowerQuery) ||
            comment.replies.some((reply) =>
              reply.content.toLowerCase().includes(lowerQuery)
            );
          break;
        case "text":
          matches = (annotation as TextAnnotation).content
            .toLowerCase()
            .includes(lowerQuery);
          break;
        case "stamp":
          matches =
            (annotation as StampAnnotation).text
              ?.toLowerCase()
              .includes(lowerQuery) || false;
          break;
      }

      if (matches) {
        results.push(annotation);
      }
    }

    return results;
  }

  getAnnotationsByPage(pageIndex: number): Annotation[] {
    const layer = this.layers.get(pageIndex);
    return layer ? layer.annotations.filter((a) => a.isVisible) : [];
  }

  getAnnotationsByType(type: AnnotationType): Annotation[] {
    return Array.from(this.annotations.values()).filter((a) => a.type === type);
  }

  getAnnotationsByUser(userId: string): Annotation[] {
    return Array.from(this.annotations.values()).filter(
      (a) => a.createdBy === userId
    );
  }

  // History management
  private addToHistory(operation: AnnotationOperation) {
    // Remove any operations after current index (for redo)
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new operation
    this.history.push(operation);
    this.historyIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const operation = this.history[this.historyIndex];
    this.historyIndex--;

    // Reverse the operation
    switch (operation.type) {
      case "add":
        if (operation.afterState) {
          this.deleteAnnotation(operation.annotationId);
        }
        break;
      case "delete":
        if (operation.beforeState) {
          this.addAnnotation(
            operation.beforeState as Omit<
              Annotation,
              "id" | "createdAt" | "updatedAt"
            >
          );
        }
        break;
      case "edit":
        if (operation.beforeState) {
          this.updateAnnotation(operation.annotationId, operation.beforeState);
        }
        break;
    }

    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.historyIndex++;
    const operation = this.history[this.historyIndex];

    // Reapply the operation
    switch (operation.type) {
      case "add":
        if (operation.afterState) {
          this.addAnnotation(
            operation.afterState as Omit<
              Annotation,
              "id" | "createdAt" | "updatedAt"
            >
          );
        }
        break;
      case "delete":
        this.deleteAnnotation(operation.annotationId);
        break;
      case "edit":
        if (operation.afterState) {
          this.updateAnnotation(operation.annotationId, operation.afterState);
        }
        break;
    }

    return true;
  }

  // Export/Import
  exportAnnotations(): string {
    const data = {
      annotations: Array.from(this.annotations.values()),
      layers: Array.from(this.layers.values()),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  importAnnotations(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      // Clear existing data
      this.annotations.clear();
      this.layers.clear();
      this.history = [];
      this.historyIndex = -1;

      // Import annotations
      if (data.annotations && Array.isArray(data.annotations)) {
        for (const annotation of data.annotations) {
          // Convert date strings back to Date objects
          annotation.createdAt = new Date(annotation.createdAt);
          annotation.updatedAt = new Date(annotation.updatedAt);

          this.annotations.set(annotation.id, annotation);
        }
      }

      // Import layers
      if (data.layers && Array.isArray(data.layers)) {
        for (const layer of data.layers) {
          this.layers.set(layer.pageIndex, layer);
        }
      }

      return true;
    } catch (error) {
      console.error("Failed to import annotations:", error);
      return false;
    }
  }

  // Utility methods
  private generateId(): string {
    return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStampColor(
    stampType: StampAnnotation["stampType"]
  ): AnnotationColor {
    switch (stampType) {
      case "approved":
        return { r: 0, g: 0.8, b: 0 };
      case "rejected":
        return { r: 0.8, g: 0, b: 0 };
      case "draft":
        return { r: 0, g: 0, b: 0.8 };
      case "confidential":
        return { r: 0.8, g: 0, b: 0.8 };
      case "urgent":
        return { r: 1, g: 0.5, b: 0 };
      default:
        return { r: 0, g: 0, b: 0 };
    }
  }

  // Statistics
  getStatistics() {
    const stats = {
      total: this.annotations.size,
      byType: {} as Record<AnnotationType, number>,
      byPage: {} as Record<number, number>,
      resolved: 0,
      unresolved: 0,
    };

    for (const annotation of this.annotations.values()) {
      // Count by type
      stats.byType[annotation.type] = (stats.byType[annotation.type] || 0) + 1;

      // Count by page
      stats.byPage[annotation.pageIndex] =
        (stats.byPage[annotation.pageIndex] || 0) + 1;

      // Count resolved/unresolved comments
      if (annotation.type === "comment") {
        if ((annotation as CommentAnnotation).isResolved) {
          stats.resolved++;
        } else {
          stats.unresolved++;
        }
      }
    }

    return stats;
  }

  // Cleanup
  destroy() {
    this.annotations.clear();
    this.layers.clear();
    this.history = [];
    this.historyIndex = -1;
    this.listeners.clear();
  }
}

// Default annotation manager instance
export const annotationManager = new PDFAnnotationManager();

// Utility functions
export function createAnnotationManager(): PDFAnnotationManager {
  return new PDFAnnotationManager();
}

export function validateAnnotation(annotation: unknown): annotation is Annotation {
  try {
    BaseAnnotationSchema.parse(annotation);
    return true;
  } catch {
    return false;
  }
}

export function getDefaultAnnotationColor(
  type: AnnotationType
): AnnotationColor {
  switch (type) {
    case "highlight":
      return { r: 1, g: 1, b: 0, a: 0.3 };
    case "comment":
      return { r: 1, g: 1, b: 0 };
    case "stamp":
      return { r: 0.8, g: 0, b: 0 };
    case "drawing":
      return { r: 0, g: 0, b: 0 };
    case "text":
      return { r: 0, g: 0, b: 0 };
    case "link":
      return { r: 0, g: 0, b: 1 };
    default:
      return { r: 0, g: 0, b: 0 };
  }
}
