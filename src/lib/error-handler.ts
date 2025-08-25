import { toast } from "sonner";

export interface AppError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  userId?: string;
  context?: Record<string, any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log an error with proper categorization
   */
  handleError(
    error: Error | string | unknown,
    context?: {
      userId?: string;
      action?: string;
      component?: string;
      additionalData?: Record<string, any>;
    }
  ): AppError {
    const appError: AppError = {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      details: this.getErrorDetails(error),
      timestamp: new Date(),
      userId: context?.userId,
      context: {
        action: context?.action,
        component: context?.component,
        ...context?.additionalData,
      },
    };

    this.logError(appError);
    this.showUserFriendlyError(appError);

    return appError;
  }

  /**
   * Handle API errors specifically
   */
  handleApiError(
    response: Response,
    context?: {
      userId?: string;
      endpoint?: string;
      method?: string;
    }
  ): AppError {
    const error = new Error(
      `API Error: ${response.status} ${response.statusText}`
    );

    return this.handleError(error, {
      userId: context?.userId,
      action: `${context?.method || "GET"} ${context?.endpoint || "unknown"}`,
      component: "API",
      additionalData: {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      },
    });
  }

  /**
   * Handle network errors
   */
  handleNetworkError(
    error: Error,
    context?: {
      userId?: string;
      url?: string;
      method?: string;
    }
  ): AppError {
    return this.handleError(error, {
      userId: context?.userId,
      action: `${context?.method || "GET"} ${context?.url || "unknown"}`,
      component: "Network",
      additionalData: {
        url: context?.url,
        method: context?.method,
      },
    });
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    field: string,
    message: string,
    context?: {
      userId?: string;
      form?: string;
    }
  ): AppError {
    const error = new Error(`Validation Error: ${field} - ${message}`);

    return this.handleError(error, {
      userId: context?.userId,
      action: `Validate ${field}`,
      component: context?.form || "Form",
      additionalData: {
        field,
        message,
        form: context?.form,
      },
    });
  }

  /**
   * Handle file upload errors
   */
  handleFileError(
    error: Error | string,
    fileName?: string,
    context?: {
      userId?: string;
      fileSize?: number;
      fileType?: string;
    }
  ): AppError {
    return this.handleError(error, {
      userId: context?.userId,
      action: `Upload ${fileName || "file"}`,
      component: "FileUpload",
      additionalData: {
        fileName,
        fileSize: context?.fileSize,
        fileType: context?.fileType,
      },
    });
  }

  /**
   * Get error code based on error type
   */
  private getErrorCode(error: Error | string | unknown): string {
    if (typeof error === "string") {
      return "UNKNOWN_ERROR";
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return "REQUEST_CANCELLED";
      }
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return "NETWORK_ERROR";
      }
      if (error.message.includes("validation")) {
        return "VALIDATION_ERROR";
      }
      if (error.message.includes("permission")) {
        return "PERMISSION_ERROR";
      }
      if (error.message.includes("not found")) {
        return "NOT_FOUND";
      }
      if (error.message.includes("timeout")) {
        return "TIMEOUT_ERROR";
      }
    }

    return "UNKNOWN_ERROR";
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: Error | string | unknown): string {
    if (typeof error === "string") {
      return error;
    }

    if (error instanceof Error) {
      // Handle specific error types
      if (error.name === "AbortError") {
        return "Request was cancelled";
      }
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return "Network connection error. Please check your internet connection.";
      }
      if (error.message.includes("validation")) {
        return "Please check your input and try again.";
      }
      if (error.message.includes("permission")) {
        return "You don't have permission to perform this action.";
      }
      if (error.message.includes("not found")) {
        return "The requested resource was not found.";
      }
      if (error.message.includes("timeout")) {
        return "Request timed out. Please try again.";
      }
      if (error.message.includes("413")) {
        return "File is too large. Please choose a smaller file.";
      }
      if (error.message.includes("415")) {
        return "File type not supported. Please choose a different file.";
      }

      return error.message || "An unexpected error occurred.";
    }

    return "An unexpected error occurred.";
  }

  /**
   * Get detailed error information for debugging
   */
  private getErrorDetails(error: Error | string | unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  /**
   * Log error to internal storage
   */
  private logError(error: AppError): void {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("App Error:", error);
    }
  }

  /**
   * Show user-friendly error notification
   */
  private showUserFriendlyError(error: AppError): void {
    // Don't show notifications for certain error types
    if (["REQUEST_CANCELLED"].includes(error.code)) {
      return;
    }

    // Show toast notification
    toast.error(error.message);
  }

  /**
   * Get error log for debugging
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log for debugging
   */
  exportErrorLog(): string {
    return JSON.stringify(this.errorLog, null, 2);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (error: Error | string | unknown, context?: any) =>
  errorHandler.handleError(error, context);

export const handleApiError = (response: Response, context?: any) =>
  errorHandler.handleApiError(response, context);

export const handleNetworkError = (error: Error, context?: any) =>
  errorHandler.handleNetworkError(error, context);

export const handleValidationError = (
  field: string,
  message: string,
  context?: any
) => errorHandler.handleValidationError(field, message, context);

export const handleFileError = (
  error: Error | string,
  fileName?: string,
  context?: any
) => errorHandler.handleFileError(error, fileName, context);
