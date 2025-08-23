"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

// Toast Types and Interfaces
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastOptions {
  description?: string;
  duration?: number;
}

// Toast Context
const ToastContext = React.createContext<{
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
}>({
  addToast: () => {},
  removeToast: () => {},
});

// Custom Toast Hook
export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

// Individual Toast Component
const Toast = ({ 
  toast, 
  onRemove 
}: { 
  toast: ToastData; 
  onRemove: (id: string) => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300); // Wait for animation
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case "success":
        return "border-l-green-500";
      case "error":
        return "border-l-red-500";
      case "warning":
        return "border-l-yellow-500";
      case "info":
        return "border-l-blue-500";
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-md w-full bg-white border-l-4 rounded-lg shadow-lg
        transition-all duration-300 transform
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
        ${getBorderColor()}
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {toast.title}
            </h3>
            {toast.description && (
              <p className="mt-1 text-sm text-gray-500">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Provider Component
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast, index) => (
          <div 
            key={toast.id} 
            style={{ 
              top: `${1 + index * 5}rem` // Stack toasts with offset
            }}
          >
            <Toast toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Toast utility functions with proper context access
export const createToastHelpers = () => {
  let addToast: (toast: Omit<ToastData, "id">) => void;
  if (globalToastContext) {
    addToast = globalToastContext.addToast;
  } else {
    addToast = () => {
      console.warn("Toast context not available. Make sure ToastProvider is mounted.");
    };
  }

  return {
    success: (title: string, options?: ToastOptions) => {
      addToast({ type: "success", title, ...options });
    },
    error: (title: string, options?: ToastOptions) => {
      addToast({ type: "error", title, ...options });
    },
    warning: (title: string, options?: ToastOptions) => {
      addToast({ type: "warning", title, ...options });
    },
    info: (title: string, options?: ToastOptions) => {
      addToast({ type: "info", title, ...options });
    },
  };
};

// Alternative approach: Direct toast functions (for use outside of React components)
let globalToastContext: {
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
} | null = null;

// Internal function to set global context
export const setGlobalToastContext = (context: {
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
}) => {
  globalToastContext = context;
};

// Global toast functions (for use outside React components)
export const toast = {
  success: (title: string, options?: ToastOptions) => {
    if (globalToastContext) {
      globalToastContext.addToast({ type: "success", title, ...options });
    } else {
      console.warn("Toast context not available. Make sure ToastProvider is mounted.");
    }
  },
  error: (title: string, options?: ToastOptions) => {
    if (globalToastContext) {
      globalToastContext.addToast({ type: "error", title, ...options });
    } else {
      console.warn("Toast context not available. Make sure ToastProvider is mounted.");
    }
  },
  warning: (title: string, options?: ToastOptions) => {
    if (globalToastContext) {
      globalToastContext.addToast({ type: "warning", title, ...options });
    } else {
      console.warn("Toast context not available. Make sure ToastProvider is mounted.");
    }
  },
  info: (title: string, options?: ToastOptions) => {
    if (globalToastContext) {
      globalToastContext.addToast({ type: "info", title, ...options });
    } else {
      console.warn("Toast context not available. Make sure ToastProvider is mounted.");
    }
  },
};

// Enhanced ToastProvider that sets global context
export const ToastProviderWithGlobalContext = ({ 
  children 
}: { 
  children: React.ReactNode;
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Set global context on mount
  useEffect(() => {
    setGlobalToastContext({ addToast, removeToast });
    return () => setGlobalToastContext({ 
      addToast: () => {}, 
      removeToast: () => {} 
    });
  }, [addToast, removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast, index) => (
          <div 
            key={toast.id} 
            style={{ 
              top: `${1 + index * 5}rem`,
              position: 'fixed',
              right: '1rem',
              zIndex: 50
            }}
          >
            <Toast toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};