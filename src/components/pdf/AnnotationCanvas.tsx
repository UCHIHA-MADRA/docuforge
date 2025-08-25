"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Annotation,
  AnnotationType,
  AnnotationColor,
  HighlightAnnotation,
  CommentAnnotation,
  StampAnnotation,
  DrawingAnnotation,
  TextAnnotation,
  LinkAnnotation,
  Point,
  Rectangle,
  DrawingPath,
  PDFAnnotationManager,
} from "@/lib/pdf-annotations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnnotationCanvasProps {
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
  annotationManager: PDFAnnotationManager;
  selectedTool: AnnotationType | null;
  currentColor: AnnotationColor;
  currentOpacity: number;
  currentStrokeWidth: number;
  isVisible: boolean;
  userId: string;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onAnnotationCreate?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  className?: string;
}

interface SelectionState {
  isSelecting: boolean;
  startPoint: Point;
  endPoint: Point;
  selectedText?: string;
  rectangles?: Rectangle[];
}

interface DrawingState {
  isDrawing: boolean;
  currentPath: Point[];
  allPaths: DrawingPath[];
}

interface DragState {
  isDragging: boolean;
  draggedAnnotation: Annotation | null;
  dragOffset: Point;
}

export function AnnotationCanvas({
  pageIndex,
  width,
  height,
  scale,
  annotationManager,
  selectedTool,
  currentColor,
  currentOpacity,
  currentStrokeWidth,
  isVisible,
  userId,
  onAnnotationSelect,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  className = "",
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    isSelecting: false,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 0, y: 0 },
  });
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPath: [],
    allPaths: [],
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedAnnotation: null,
    dragOffset: { x: 0, y: 0 },
  });

  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [dialogPosition, setDialogPosition] = useState<Point>({ x: 0, y: 0 });
  interface DialogData {
    content?: string;
    iconType?: string;
    fontSize?: number;
    fontFamily?: string;
    url?: string;
    displayText?: string;
    linkType?: string;
  }

  const [dialogData, setDialogData] = useState<DialogData>({});

  // Get annotations for current page
  const pageAnnotations = useMemo(() => {
    return annotationManager.getAnnotationsByPage(pageIndex);
  }, [annotationManager, pageIndex]);

  // Drawing functions
  const drawHighlight = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: HighlightAnnotation) => {
      ctx.fillStyle = `rgba(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255}, ${annotation.opacity})`;
      ctx.globalCompositeOperation =
        annotation.blendMode as GlobalCompositeOperation;

      annotation.rectangles.forEach((rect) => {
        ctx.fillRect(
          rect.x * scale,
          rect.y * scale,
          rect.width * scale,
          rect.height * scale
        );
      });

      ctx.globalCompositeOperation = "source-over";
    },
    [scale]
  );

  const drawComment = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: CommentAnnotation) => {
      const x = annotation.position.x * scale;
      const y = annotation.position.y * scale;
      const size = 20 * scale;

      // Draw comment icon background
      ctx.fillStyle = `rgb(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255})`;
      ctx.fillRect(x, y, size, size);

      // Draw icon border
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, size, size);

      // Draw icon symbol
      ctx.fillStyle = "#fff";
      ctx.font = `${12 * scale}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💬", x + size / 2, y + size / 2);

      // Draw unresolved indicator
      if (!annotation.isResolved) {
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(x + size - 4, y + 4, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    },
    [scale]
  );

  const drawStamp = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: StampAnnotation) => {
      const x = annotation.position.x * scale;
      const y = annotation.position.y * scale;
      const width = annotation.size.width * scale;
      const height = annotation.size.height * scale;

      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((annotation.rotation * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);

      // Draw stamp background
      ctx.fillStyle = `rgba(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255}, 0.1)`;
      ctx.fillRect(0, 0, width, height);

      // Draw stamp border
      ctx.strokeStyle = `rgb(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);

      // Draw stamp text
      ctx.fillStyle = `rgb(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255})`;
      ctx.font = `bold ${14 * scale}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = annotation.text || annotation.stampType.toUpperCase();
      ctx.fillText(text, width / 2, height / 2);

      ctx.restore();
    },
    [scale]
  );

  const drawDrawing = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: DrawingAnnotation) => {
      ctx.strokeStyle = `rgb(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255})`;
      ctx.lineWidth = annotation.strokeWidth * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (annotation.strokeStyle === "dashed") {
        ctx.setLineDash([5 * scale, 5 * scale]);
      } else if (annotation.strokeStyle === "dotted") {
        ctx.setLineDash([2 * scale, 3 * scale]);
      }

      annotation.paths.forEach((path) => {
        if (path.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(path.points[0].x * scale, path.points[0].y * scale);

        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x * scale, path.points[i].y * scale);
        }

        ctx.stroke();
      });

      ctx.setLineDash([]);
    },
    [scale]
  );

  const drawText = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: TextAnnotation) => {
      const x = annotation.position.x * scale;
      const y = annotation.position.y * scale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((annotation.rotation * Math.PI) / 180);

      // Draw background if specified
      if (annotation.backgroundColor) {
        ctx.fillStyle = `rgba(${annotation.backgroundColor.r * 255}, ${
          annotation.backgroundColor.g * 255
        }, ${annotation.backgroundColor.b * 255}, ${annotation.opacity})`;
        const metrics = ctx.measureText(annotation.content);
        ctx.fillRect(
          0,
          -annotation.fontSize * scale,
          metrics.width,
          annotation.fontSize * scale
        );
      }

      // Draw border if specified
      if (annotation.borderColor && annotation.borderWidth > 0) {
        ctx.strokeStyle = `rgb(${annotation.borderColor.r * 255}, ${
          annotation.borderColor.g * 255
        }, ${annotation.borderColor.b * 255})`;
        ctx.lineWidth = annotation.borderWidth * scale;
        const metrics = ctx.measureText(annotation.content);
        ctx.strokeRect(
          0,
          -annotation.fontSize * scale,
          metrics.width,
          annotation.fontSize * scale
        );
      }

      // Draw text
      ctx.fillStyle = `rgb(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255})`;
      ctx.font = `${annotation.fontStyle} ${annotation.fontSize * scale}px ${
        annotation.fontFamily
      }`;
      ctx.textAlign = annotation.alignment as CanvasTextAlign;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(annotation.content, 0, 0);

      ctx.restore();
    },
    [scale]
  );

  const drawLink = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: LinkAnnotation) => {
      const rect = annotation.rectangle;
      const x = rect.x * scale;
      const y = rect.y * scale;
      const width = rect.width * scale;
      const height = rect.height * scale;

      // Draw link background
      ctx.fillStyle = `rgba(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255}, 0.1)`;
      ctx.fillRect(x, y, width, height);

      // Draw link border
      ctx.strokeStyle = `rgb(${annotation.color.r * 255}, ${
        annotation.color.g * 255
      }, ${annotation.color.b * 255})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    },
    [scale]
  );

  const drawSelectionBorder = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
      ctx.strokeStyle = "#007bff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      let bounds: Rectangle;
      switch (annotation.type) {
        case "highlight":
          const highlight = annotation as HighlightAnnotation;
          if (highlight.rectangles.length > 0) {
            const firstRect = highlight.rectangles[0];
            const lastRect =
              highlight.rectangles[highlight.rectangles.length - 1];
            bounds = {
              x: Math.min(firstRect.x, lastRect.x),
              y: Math.min(firstRect.y, lastRect.y),
              width:
                Math.max(
                  firstRect.x + firstRect.width,
                  lastRect.x + lastRect.width
                ) - Math.min(firstRect.x, lastRect.x),
              height:
                Math.max(
                  firstRect.y + firstRect.height,
                  lastRect.y + lastRect.height
                ) - Math.min(firstRect.y, lastRect.y),
            };
          } else {
            return;
          }
          break;
        case "comment":
          const comment = annotation as CommentAnnotation;
          bounds = {
            x: comment.position.x,
            y: comment.position.y,
            width: comment.size.width,
            height: comment.size.height,
          };
          break;
        case "stamp":
          const stamp = annotation as StampAnnotation;
          bounds = {
            x: stamp.position.x,
            y: stamp.position.y,
            width: stamp.size.width,
            height: stamp.size.height,
          };
          break;
        case "text":
          const text = annotation as TextAnnotation;
          // Estimate text bounds (simplified)
          bounds = {
            x: text.position.x,
            y: text.position.y - text.fontSize,
            width: text.content.length * text.fontSize * 0.6,
            height: text.fontSize,
          };
          break;
        case "link":
          bounds = (annotation as LinkAnnotation).rectangle;
          break;
        default:
          return;
      }

      ctx.strokeRect(
        bounds.x * scale - 5,
        bounds.y * scale - 5,
        bounds.width * scale + 10,
        bounds.height * scale + 10
      );
      ctx.setLineDash([]);
    },
    [scale]
  );

  const drawSelectionRectangle = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const startX = Math.min(
        selectionState.startPoint.x,
        selectionState.endPoint.x
      );
      const startY = Math.min(
        selectionState.startPoint.y,
        selectionState.endPoint.y
      );
      const width = Math.abs(
        selectionState.endPoint.x - selectionState.startPoint.x
      );
      const height = Math.abs(
        selectionState.endPoint.y - selectionState.startPoint.y
      );

      ctx.strokeStyle = "#007bff";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(startX, startY, width, height);
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(0, 123, 255, 0.1)";
      ctx.fillRect(startX, startY, width, height);
    },
    [selectionState]
  );

  const drawCurrentPath = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (drawingState.currentPath.length < 2) return;

      ctx.strokeStyle = `rgb(${currentColor.r * 255}, ${
        currentColor.g * 255
      }, ${currentColor.b * 255})`;
      ctx.lineWidth = currentStrokeWidth * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = currentOpacity;

      ctx.beginPath();
      ctx.moveTo(drawingState.currentPath[0].x, drawingState.currentPath[0].y);

      for (let i = 1; i < drawingState.currentPath.length; i++) {
        ctx.lineTo(
          drawingState.currentPath[i].x,
          drawingState.currentPath[i].y
        );
      }

      ctx.stroke();
    },
    [
      drawingState.currentPath,
      currentColor,
      currentStrokeWidth,
      currentOpacity,
      scale,
    ]
  );

  // Canvas drawing functions
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each annotation
    pageAnnotations.forEach((annotation) => {
      if (!annotation.isVisible) return;

      ctx.save();
      ctx.globalAlpha = annotation.opacity;

      switch (annotation.type) {
        case "highlight":
          drawHighlight(ctx, annotation as HighlightAnnotation);
          break;
        case "comment":
          drawComment(ctx, annotation as CommentAnnotation);
          break;
        case "stamp":
          drawStamp(ctx, annotation as StampAnnotation);
          break;
        case "drawing":
          drawDrawing(ctx, annotation as DrawingAnnotation);
          break;
        case "text":
          drawText(ctx, annotation as TextAnnotation);
          break;
        case "link":
          drawLink(ctx, annotation as LinkAnnotation);
          break;
      }

      // Draw selection border if selected
      if (selectedAnnotation?.id === annotation.id) {
        drawSelectionBorder(ctx, annotation);
      }

      ctx.restore();
    });

    // Draw current selection
    if (selectionState.isSelecting && selectedTool === "highlight") {
      drawSelectionRectangle(ctx);
    }

    // Draw current drawing path
    if (drawingState.isDrawing && selectedTool === "drawing") {
      drawCurrentPath(ctx);
    }
  }, [
    pageAnnotations,
    selectedAnnotation,
    selectionState,
    drawingState,
    selectedTool,
    isVisible,
    drawHighlight,
    drawComment,
    drawStamp,
    drawDrawing,
    drawText,
    drawLink,
    drawSelectionBorder,
    drawSelectionRectangle,
    drawCurrentPath,
  ]);

  // Event handlers
  const getCanvasPoint = (event: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const getAnnotationAt = (point: Point): Annotation | null => {
    // Check annotations in reverse order (top to bottom)
    for (let i = pageAnnotations.length - 1; i >= 0; i--) {
      const annotation = pageAnnotations[i];
      if (isPointInAnnotation(point, annotation)) {
        return annotation;
      }
    }
    return null;
  };

  const isPointInAnnotation = (
    point: Point,
    annotation: Annotation
  ): boolean => {
    switch (annotation.type) {
      case "highlight":
        const highlight = annotation as HighlightAnnotation;
        return highlight.rectangles.some(
          (rect) =>
            point.x >= rect.x * scale &&
            point.x <= (rect.x + rect.width) * scale &&
            point.y >= rect.y * scale &&
            point.y <= (rect.y + rect.height) * scale
        );
      case "comment":
        const comment = annotation as CommentAnnotation;
        return (
          point.x >= comment.position.x * scale &&
          point.x <= (comment.position.x + comment.size.width) * scale &&
          point.y >= comment.position.y * scale &&
          point.y <= (comment.position.y + comment.size.height) * scale
        );
      case "stamp":
        const stamp = annotation as StampAnnotation;
        return (
          point.x >= stamp.position.x * scale &&
          point.x <= (stamp.position.x + stamp.size.width) * scale &&
          point.y >= stamp.position.y * scale &&
          point.y <= (stamp.position.y + stamp.size.height) * scale
        );
      case "text":
        const text = annotation as TextAnnotation;
        const textWidth = text.content.length * text.fontSize * 0.6; // Estimate
        return (
          point.x >= text.position.x * scale &&
          point.x <= (text.position.x + textWidth) * scale &&
          point.y >= (text.position.y - text.fontSize) * scale &&
          point.y <= text.position.y * scale
        );
      case "link":
        const link = annotation as LinkAnnotation;
        return (
          point.x >= link.rectangle.x * scale &&
          point.x <= (link.rectangle.x + link.rectangle.width) * scale &&
          point.y >= link.rectangle.y * scale &&
          point.y <= (link.rectangle.y + link.rectangle.height) * scale
        );
      default:
        return false;
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    const point = getCanvasPoint(event);
    const clickedAnnotation = getAnnotationAt(point);

    if (clickedAnnotation) {
      // Select annotation
      setSelectedAnnotation(clickedAnnotation);
      onAnnotationSelect?.(clickedAnnotation);

      // Start dragging if not locked
      if (!clickedAnnotation.isLocked) {
        // Get position based on annotation type
        let position = { x: 0, y: 0 };

        if ("position" in clickedAnnotation) {
          position = (clickedAnnotation as { position: Point }).position;
        }

        setDragState({
          isDragging: true,
          draggedAnnotation: clickedAnnotation,
          dragOffset: {
            x: point.x - position.x * scale,
            y: point.y - position.y * scale,
          },
        });
      }
      return;
    }

    // Clear selection if clicking empty area
    setSelectedAnnotation(null);
    onAnnotationSelect?.(null);

    // Handle tool-specific actions
    switch (selectedTool) {
      case "highlight":
        setSelectionState({
          isSelecting: true,
          startPoint: point,
          endPoint: point,
        });
        break;
      case "drawing":
        setDrawingState({
          isDrawing: true,
          currentPath: [point],
          allPaths: [],
        });
        break;
      case "comment":
        setDialogPosition({ x: point.x / scale, y: point.y / scale });
        setDialogData({ content: "", iconType: "note" });
        setShowCommentDialog(true);
        break;
      case "stamp":
        // Create stamp immediately
        const stampId = annotationManager.createStamp(
          pageIndex,
          { x: point.x / scale, y: point.y / scale },
          "approved",
          userId
        );
        const newStamp = annotationManager.getAnnotation(stampId);
        if (newStamp) {
          onAnnotationCreate?.(newStamp);
        }
        break;
      case "text":
        setDialogPosition({ x: point.x / scale, y: point.y / scale });
        setDialogData({ content: "", fontSize: 14, fontFamily: "Arial" });
        setShowTextDialog(true);
        break;
      case "link":
        setDialogPosition({ x: point.x / scale, y: point.y / scale });
        setDialogData({ url: "", displayText: "", linkType: "url" });
        setShowLinkDialog(true);
        break;
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    const point = getCanvasPoint(event);

    if (dragState.isDragging && dragState.draggedAnnotation) {
      // Update annotation position
      const newPosition = {
        x: (point.x - dragState.dragOffset.x) / scale,
        y: (point.y - dragState.dragOffset.y) / scale,
      };

      // Create proper update object based on annotation type
      const updateData: Partial<Annotation> = {};
      if (
        dragState.draggedAnnotation.type === "comment" ||
        dragState.draggedAnnotation.type === "stamp" ||
        dragState.draggedAnnotation.type === "text"
      ) {
        (updateData as { position: Point }).position = newPosition;
      }

      annotationManager.updateAnnotation(
        dragState.draggedAnnotation.id,
        updateData
      );

      return;
    }

    if (selectionState.isSelecting) {
      setSelectionState((prev) => ({
        ...prev,
        endPoint: point,
      }));
    }

    if (drawingState.isDrawing) {
      setDrawingState((prev) => ({
        ...prev,
        currentPath: [...prev.currentPath, point],
      }));
    }
  };

  const handleMouseUp = () => {
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        draggedAnnotation: null,
        dragOffset: { x: 0, y: 0 },
      });
      return;
    }

    if (selectionState.isSelecting && selectedTool === "highlight") {
      const startX =
        Math.min(selectionState.startPoint.x, selectionState.endPoint.x) /
        scale;
      const startY =
        Math.min(selectionState.startPoint.y, selectionState.endPoint.y) /
        scale;
      const width =
        Math.abs(selectionState.endPoint.x - selectionState.startPoint.x) /
        scale;
      const height =
        Math.abs(selectionState.endPoint.y - selectionState.startPoint.y) /
        scale;

      if (width > 5 && height > 5) {
        const rectangles: Rectangle[] = [
          { x: startX, y: startY, width, height },
        ];
        const highlightId = annotationManager.createHighlight(
          pageIndex,
          rectangles,
          "Selected text", // TODO: Extract actual text
          currentColor,
          userId
        );

        const newHighlight = annotationManager.getAnnotation(highlightId);
        if (newHighlight) {
          onAnnotationCreate?.(newHighlight);
        }
      }

      setSelectionState({
        isSelecting: false,
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 0, y: 0 },
      });
    }

    if (drawingState.isDrawing && selectedTool === "drawing") {
      if (drawingState.currentPath.length > 1) {
        const paths: DrawingPath[] = [
          {
            points: drawingState.currentPath.map((p) => ({
              x: p.x / scale,
              y: p.y / scale,
            })),
          },
        ];

        const drawingId = annotationManager.createDrawing(
          pageIndex,
          paths,
          currentColor,
          currentStrokeWidth,
          userId
        );

        const newDrawing = annotationManager.getAnnotation(drawingId);
        if (newDrawing) {
          onAnnotationCreate?.(newDrawing);
        }
      }

      setDrawingState({
        isDrawing: false,
        currentPath: [],
        allPaths: [],
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Delete" && selectedAnnotation) {
      annotationManager.deleteAnnotation(selectedAnnotation.id);
      onAnnotationDelete?.(selectedAnnotation.id);
      setSelectedAnnotation(null);
    }
  };

  // Dialog handlers
  const handleCommentCreate = () => {
    if (dialogData.content?.trim()) {
      const commentId = annotationManager.createComment(
        pageIndex,
        dialogPosition,
        dialogData.content,
        userId,
        dialogData.iconType as
          | "comment"
          | "note"
          | "key"
          | "help"
          | "insert"
          | "paragraph"
      );

      const newComment = annotationManager.getAnnotation(commentId);
      if (newComment) {
        onAnnotationCreate?.(newComment);
      }
    }
    setShowCommentDialog(false);
    setDialogData({});
  };

  const handleTextCreate = () => {
    if (dialogData.content?.trim()) {
      const textAnnotation: Omit<
        TextAnnotation,
        "id" | "createdAt" | "updatedAt"
      > = {
        type: "text",
        pageIndex,
        position: { x: dialogPosition.x, y: dialogPosition.y },
        content: dialogData.content,
        fontSize: dialogData.fontSize || 14,
        fontFamily: dialogData.fontFamily || "Arial",
        fontStyle: "normal",
        alignment: "left",
        rotation: 0,
        borderWidth: 0,
        color: currentColor,
        opacity: currentOpacity,
        isVisible: true,
        isLocked: false,
        createdBy: userId,
      };

      const textId = annotationManager.addAnnotation(textAnnotation);
      const newText = annotationManager.getAnnotation(textId);
      if (newText) {
        onAnnotationCreate?.(newText);
      }
    }
    setShowTextDialog(false);
    setDialogData({});
  };

  const handleLinkCreate = () => {
    if (dialogData.url?.trim()) {
      const linkAnnotation: Omit<
        LinkAnnotation,
        "id" | "createdAt" | "updatedAt"
      > = {
        type: "link",
        pageIndex,
        rectangle: {
          x: dialogPosition.x,
          y: dialogPosition.y,
          width: 100,
          height: 20,
        },
        url: dialogData.url,
        displayText: dialogData.displayText,
        linkType: (dialogData.linkType as "url" | "email" | "page" | "file") || "url",
        color: currentColor,
        opacity: currentOpacity,
        isVisible: true,
        isLocked: false,
        createdBy: userId,
      };

      const linkId = annotationManager.addAnnotation(linkAnnotation);
      const newLink = annotationManager.getAnnotation(linkId);
      if (newLink) {
        onAnnotationCreate?.(newLink);
      }
    }
    setShowLinkDialog(false);
    setDialogData({});
  };

  // Effects
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      drawAnnotations();
    }
  }, [width, height, drawAnnotations]);

  useEffect(() => {
    // Listen for annotation changes
    const handleAnnotationUpdate = () => {
      drawAnnotations();
    };

    annotationManager.on("annotationAdded", handleAnnotationUpdate);
    annotationManager.on("annotationUpdated", handleAnnotationUpdate);
    annotationManager.on("annotationDeleted", handleAnnotationUpdate);

    return () => {
      annotationManager.off("annotationAdded", handleAnnotationUpdate);
      annotationManager.off("annotationUpdated", handleAnnotationUpdate);
      annotationManager.off("annotationDeleted", handleAnnotationUpdate);
    };
  }, [annotationManager, drawAnnotations]);

  return (
    <>
      <div className={`relative ${className}`}>
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ zIndex: 10 }}
        />
        <div
          ref={overlayRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair"
          style={{ zIndex: 20 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        />
      </div>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment-content">Comment</Label>
              <Textarea
                id="comment-content"
                value={dialogData.content || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDialogData((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder="Enter your comment..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="comment-icon">Icon Type</Label>
              <Select
                value={dialogData.iconType || "note"}
                onValueChange={(value: string) =>
                  setDialogData((prev) => ({ ...prev, iconType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="key">Key Point</SelectItem>
                  <SelectItem value="help">Help</SelectItem>
                  <SelectItem value="insert">Insert</SelectItem>
                  <SelectItem value="paragraph">Paragraph</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCommentDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCommentCreate}>Add Comment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Text Dialog */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-content">Text</Label>
              <Input
                id="text-content"
                value={dialogData.content || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDialogData((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder="Enter text..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="font-size">Font Size</Label>
                <Input
                  id="font-size"
                  type="number"
                  value={dialogData.fontSize || 14}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDialogData((prev) => ({
                      ...prev,
                      fontSize: parseInt(e.target.value),
                    }))
                  }
                  min={8}
                  max={72}
                />
              </div>
              <div>
                <Label htmlFor="font-family">Font Family</Label>
                <Select
                  value={dialogData.fontFamily || "Arial"}
                  onValueChange={(value: string) =>
                    setDialogData((prev) => ({ ...prev, fontFamily: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">
                      Times New Roman
                    </SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTextDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTextCreate}>Add Text</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={dialogData.url || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDialogData((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="link-text">Display Text (optional)</Label>
              <Input
                id="link-text"
                value={dialogData.displayText || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDialogData((prev) => ({
                    ...prev,
                    displayText: e.target.value,
                  }))
                }
                placeholder="Link text"
              />
            </div>
            <div>
              <Label htmlFor="link-type">Link Type</Label>
              <Select
                value={dialogData.linkType || "url"}
                onValueChange={(value: string) =>
                  setDialogData((prev) => ({ ...prev, linkType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="page">Page</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkCreate}>Add Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AnnotationCanvas;
