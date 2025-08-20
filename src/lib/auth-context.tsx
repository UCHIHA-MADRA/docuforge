"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
// Define a User interface matching your user object structure
export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  // Add other fields as needed
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: typeof signIn;
  signOut: typeof signOut;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced user fetching with retry logic and error handling
  const fetchUser = useCallback(async (retryAttempt = 0): Promise<void> => {
    try {
      setError(null);
      
      // Edge Case 1: Check if session exists
      if (!session?.user?.email) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Edge Case 2: Network timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("/api/users/me", {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      clearTimeout(timeoutId);

      // Edge Case 3: Handle different HTTP status codes
      if (response.status === 401) {
        // Unauthorized - session expired
        setError("Session expired. Please sign in again.");
        setUser(null);
        setLoading(false);
        return;
      }

      if (response.status === 403) {
        // Forbidden - user access denied
        setError("Access denied. Your account may be suspended.");
        setUser(null);
        setLoading(false);
        return;
      }

      if (response.status === 404) {
        // User not found - account may have been deleted
        setError("User account not found. Please contact support.");
        setUser(null);
        setLoading(false);
        return;
      }

      if (response.status === 429) {
        // Rate limited
        setError("Too many requests. Please wait a moment and try again.");
        setUser(null);
        setLoading(false);
        return;
      }

      if (response.status === 500) {
        // Server error
        throw new Error("Server error occurred while fetching user data");
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Edge Case 4: Validate response data structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format from server");
      }

      if (!data.user || typeof data.user !== "object") {
        throw new Error("User data is missing or invalid");
      }

      // Edge Case 5: Validate required user fields
      const requiredFields = ["id", "email"];
      for (const field of requiredFields) {
        if (!data.user[field]) {
          throw new Error(`User data missing required field: ${field}`);
        }
      }

      setUser(data.user);
      setRetryCount(0); // Reset retry count on success
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user:", error);

      // Edge Case 6: Handle specific error types
      let errorMessage = "Failed to fetch user data";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timeout. Please check your connection.";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (error.message.includes("Server error")) {
          errorMessage = "Server temporarily unavailable. Please try again later.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);

      // Edge Case 7: Retry logic for transient errors
      if (retryAttempt < MAX_RETRIES && 
          (errorMessage.includes("Network error") || 
           errorMessage.includes("Server error") ||
           errorMessage.includes("timeout"))) {
        
        setRetryCount(retryAttempt + 1);
        
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, retryAttempt);
        
        setTimeout(() => {
          fetchUser(retryAttempt + 1);
        }, delay);
        
        return;
      }

      // Edge Case 8: Final failure - set user to null but don't keep loading
      setUser(null);
      setLoading(false);
    }
  }, [session]);

  // Refresh user data manually
  const refreshUser = useCallback(async (): Promise<void> => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  // Clear error messages
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "unauthenticated") {
      setUser(null);
      setLoading(false);
      setError(null);
      setRetryCount(0);
      return;
    }

    if (status === "authenticated" && session?.user) {
      fetchUser();
    }
  }, [session, status, fetchUser]);

  // Edge Case 9: Handle session changes
  useEffect(() => {
    if (session?.user?.email !== user?.email) {
      // User changed, refresh data
      if (session?.user) {
        fetchUser();
      }
    }
  }, [session?.user?.email, user?.email, fetchUser]);

  // Edge Case 10: Auto-refresh user data periodically (every 5 minutes)
  useEffect(() => {
    if (user && status === "authenticated") {
      const interval = setInterval(() => {
        fetchUser();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [user, status, fetchUser]);

  // Edge Case 11: Handle window focus to refresh stale data
  useEffect(() => {
    const handleFocus = () => {
      if (user && status === "authenticated") {
        // Refresh user data when window regains focus
        fetchUser();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, status, fetchUser]);

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
