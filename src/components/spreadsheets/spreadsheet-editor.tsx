"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useToast, ToastProvider } from "@/components/ui/toast";

// Spreadsheet Types and Interfaces
interface SpreadsheetData {
  rows: {
    cells: {
      text?: string;
      value?: number;
      style?: Record<string, unknown>;
    }[];
  }[];
}

interface SpreadsheetEditorProps {
  documentId: string;
  initialData?: SpreadsheetData;
  readonly?: boolean;
  onSave?: (data: SpreadsheetData) => void;
  onError?: (error: Error) => void;
  autoSaveInterval?: number;
  maxRows?: number;
  maxCols?: number;
}

interface SpreadsheetInstance {
  loadData: (data: SpreadsheetData) => void;
  getData: () => SpreadsheetData;
  change: (callback: (data: SpreadsheetData) => void) => void;
  resize?: () => void;
  destroy?: () => void;
  dispose?: () => void;
}

// Type definition for the x-data-spreadsheet constructor
interface SpreadsheetConstructor {
  new (
    container: HTMLElement,
    options?: SpreadsheetOptions
  ): SpreadsheetInstance;
}

interface SpreadsheetOptions {
  mode?: "read" | "edit";
  showToolbar?: boolean;
  showGrid?: boolean;
  showContextmenu?: boolean;
  view?: {
    height: () => number;
    width: () => number;
  };
  row?: {
    len: number;
    height: number;
  };
  col?: {
    len: number;
    width: number;
    indexWidth: number;
    minWidth: number;
  };
  style?: {
    bgcolor?: string;
    align?: "left" | "center" | "right";
    valign?: "top" | "middle" | "bottom";
    textwrap?: boolean;
    strike?: boolean;
    underline?: boolean;
    color?: string;
  };
}

// Dynamic import for better bundle splitting
const loadSpreadsheet = async () => {
  try {
    const { default: Spreadsheet } = await import("x-data-spreadsheet");
    return Spreadsheet;
  } catch (error) {
    console.error("Failed to load spreadsheet library:", error);
    throw new Error(
      "Failed to load spreadsheet component. Please ensure x-data-spreadsheet is installed."
    );
  }
};

// Main SpreadsheetEditor Component
function SpreadsheetEditorComponent({
  documentId,
  initialData,
  readonly = false,
  onSave,
  onError,
  autoSaveInterval = 2000,
  maxRows = 1000,
  maxCols = 100,
}: SpreadsheetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spreadsheetRef = useRef<SpreadsheetInstance | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const { addToast } = useToast();

  // Validation function
  const validateSpreadsheetData = (data: SpreadsheetData): boolean => {
    if (!data || !Array.isArray(data.rows)) {
      throw new Error("Invalid spreadsheet data format");
    }

    if (data.rows.length > maxRows) {
      throw new Error(`Too many rows. Maximum allowed: ${maxRows}`);
    }

    for (const row of data.rows) {
      if (!Array.isArray(row.cells)) {
        throw new Error("Invalid row format");
      }
      if (row.cells.length > maxCols) {
        throw new Error(`Too many columns. Maximum allowed: ${maxCols}`);
      }
    }

    return true;
  };

  const handleSave = useCallback(
    async (data?: SpreadsheetData) => {
      if (!spreadsheetRef.current || readonly) return;

      try {
        setSaveStatus("saving");
        const currentData = data || spreadsheetRef.current.getData();

        // Validate data
        validateSpreadsheetData(currentData);

        // Save to API
        const response = await fetch(`/api/documents/${documentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "spreadsheet",
            data: currentData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Save failed with status ${response.status}`
          );
        }

        setLastSaved(new Date());
        setSaveStatus("saved");
        onSave?.(currentData);

        addToast({
          type: "success",
          title: "Saved successfully",
          description: "Your spreadsheet has been saved.",
          duration: 3000,
        });

        // Reset status after 2 seconds
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Save error:", error);
        setSaveStatus("error");
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Could not save spreadsheet. Please try again.";

        onError?.(error instanceof Error ? error : new Error(errorMessage));

        addToast({
          type: "error",
          title: "Save failed",
          description: errorMessage,
          duration: 5000,
        });

        // Reset status after 3 seconds
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    },
    [readonly, onSave, onError, documentId, addToast, maxRows, maxCols]
  );

  const initializeSpreadsheet = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const Spreadsheet = await loadSpreadsheet();

      // Clear any existing content
      containerRef.current.innerHTML = "";

      const options: SpreadsheetOptions = {
        mode: readonly ? "read" : "edit",
        showToolbar: !readonly,
        showGrid: true,
        showContextmenu: !readonly,
        view: {
          height: () => Math.max(600, window.innerHeight - 250),
          width: () => Math.max(800, window.innerWidth - 120),
        },
        row: {
          len: maxRows,
          height: 25,
        },
        col: {
          len: maxCols,
          width: 100,
          indexWidth: 60,
          minWidth: 60,
        },
        style: {
          bgcolor: "#ffffff",
          align: "left",
          valign: "middle",
          textwrap: false,
          strike: false,
          underline: false,
          color: "#000000",
        },
      };

      // Create spreadsheet instance
      const SpreadsheetClass = Spreadsheet as unknown as SpreadsheetConstructor;
      spreadsheetRef.current = new SpreadsheetClass(
        containerRef.current,
        options
      );

      // Load initial data
      if (initialData) {
        try {
          validateSpreadsheetData(initialData);
          spreadsheetRef.current.loadData(initialData);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Invalid initial data";
          addToast({
            type: "warning",
            title: "Data validation warning",
            description: errorMessage,
          });
        }
      }

      // Auto-save on changes (debounced) - only if not readonly
      if (!readonly) {
        spreadsheetRef.current.change((data: SpreadsheetData) => {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            handleSave(data);
          }, autoSaveInterval);
        });
      }

      setIsLoading(false);

      addToast({
        type: "success",
        title: "Spreadsheet loaded",
        description: readonly
          ? "Opened in read-only mode"
          : "Ready for editing",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to initialize spreadsheet:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load spreadsheet. Please refresh the page.";
      setError(errorMessage);
      setIsLoading(false);

      onError?.(error instanceof Error ? error : new Error(errorMessage));

      addToast({
        type: "error",
        title: "Failed to load spreadsheet",
        description: errorMessage,
        duration: 0, // Don't auto-dismiss errors
      });
    }
  }, [
    readonly,
    initialData,
    handleSave,
    autoSaveInterval,
    maxRows,
    maxCols,
    addToast,
    onError,
  ]);

  useEffect(() => {
    initializeSpreadsheet();

    // Handle window resize
    const handleResize = () => {
      if (
        spreadsheetRef.current &&
        typeof spreadsheetRef.current.resize === "function"
      ) {
        spreadsheetRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (spreadsheetRef.current) {
        try {
          if (typeof spreadsheetRef.current.destroy === "function") {
            spreadsheetRef.current.destroy();
          }
          if (typeof spreadsheetRef.current.dispose === "function") {
            spreadsheetRef.current.dispose();
          }
        } catch (error) {
          console.warn("Error destroying spreadsheet:", error);
        }
      }
    };
  }, [initializeSpreadsheet]);

  const handleExport = async (format: "xlsx" | "csv") => {
    if (!spreadsheetRef.current) {
      addToast({
        type: "error",
        title: "Export failed",
        description: "Spreadsheet not initialized",
      });
      return;
    }

    try {
      const data = spreadsheetRef.current.getData();
      validateSpreadsheetData(data);

      const response = await fetch("/api/processing/spreadsheet/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, format }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Export failed with status ${response.status}`
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spreadsheet-${documentId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      addToast({
        type: "success",
        title: "Export successful",
        description: `Spreadsheet exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Could not export spreadsheet.";

      addToast({
        type: "error",
        title: "Export failed",
        description: errorMessage,
      });
    }
  };

  const handleManualSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await handleSave();
  };

  const getSaveButtonText = () => {
    switch (saveStatus) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved ✓";
      case "error":
        return "Save Failed";
      default:
        return "Save Now";
    }
  };

  const getSaveButtonVariant = () => {
    switch (saveStatus) {
      case "saving":
        return "secondary";
      case "saved":
        return "default";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-destructive mb-4">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
          <p className="font-medium">Error Loading Spreadsheet</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button onClick={initializeSpreadsheet} variant="outline">
          Retry
        </Button>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full mx-auto mb-4" />
        <p>Loading spreadsheet...</p>
        <p className="text-sm text-muted-foreground mt-1">
          This may take a moment...
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!readonly && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleManualSave}
              variant={getSaveButtonVariant() as "default" | "secondary" | "destructive" | "outline"}
              size="sm"
              disabled={saveStatus === "saving"}
            >
              {getSaveButtonText()}
            </Button>
            <Button
              onClick={() => handleExport("xlsx")}
              variant="outline"
              size="sm"
            >
              Export Excel
            </Button>
            <Button
              onClick={() => handleExport("csv")}
              variant="outline"
              size="sm"
            >
              Export CSV
            </Button>
          </div>
          {lastSaved && (
            <p className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      <Card className="overflow-hidden">
        <div
          ref={containerRef}
          className="spreadsheet-container w-full"
          style={{
            minHeight: "600px",
            maxHeight: "calc(100vh - 250px)",
          }}
        />
      </Card>
    </div>
  );
}

// Export wrapped component with ToastProvider
export function SpreadsheetEditor(props: SpreadsheetEditorProps) {
  return (
    <ToastProvider>
      <SpreadsheetEditorComponent {...props} />
    </ToastProvider>
  );
}
