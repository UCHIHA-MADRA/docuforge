import { handleApiError, handleNetworkError } from "./error-handler";

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApiRequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  cache?: "default" | "no-cache" | "reload" | "force-cache" | "only-if-cached";
  signal?: AbortSignal;
}

export interface ApiError {
  status: number;
  statusText: string;
  message: string;
  data?: any;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private pendingRequests: Map<string, Promise<any>>;

  constructor(baseURL: string = "/api", defaultTimeout: number = 30000) {
    this.baseURL = baseURL;
    this.defaultTimeout = defaultTimeout;
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Make an API request with proper error handling and caching
   */
  async request<T = any>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = this.defaultTimeout,
      cache = "default",
      signal,
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = this.getCacheKey(url, method, body);

    // Check cache for GET requests
    if (method === "GET" && cache !== "no-cache") {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check for pending requests to avoid duplicates
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create request promise
    const requestPromise = this.executeRequest<T>(url, {
      method,
      headers,
      body,
      timeout,
      cache,
      signal,
    });

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;

      // Cache successful GET responses
      if (method === "GET" && response.success) {
        this.cacheResponse(cacheKey, response);
      }

      return response;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(
    url: string,
    config: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const { method, headers, body, timeout, signal } = config;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine signals if both provided
    const finalSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    try {
      const requestHeaders = {
        "Content-Type": "application/json",
        ...headers,
      };

      // Remove Content-Type for FormData
      if (body instanceof FormData) {
        delete (requestHeaders as any)["Content-Type"];
      }

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body instanceof FormData ? body : JSON.stringify(body),
        signal: finalSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw this.createApiError(response, errorData);
      }

      const data = await this.parseResponse<T>(response);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleRequestError(error, url, method || "GET");
    }
  }

  /**
   * Parse successful response
   */
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await response.json();
      return {
        data: data.data || data,
        success: data.success !== false,
        message: data.message,
        error: data.error,
      };
    }

    if (contentType?.includes("text/")) {
      const text = await response.text();
      return {
        data: text as T,
        success: true,
      };
    }

    // Handle blob responses (e.g., file downloads)
    if (
      contentType?.includes("application/octet-stream") ||
      contentType?.includes("application/pdf") ||
      contentType?.includes("image/")
    ) {
      const blob = await response.blob();
      return {
        data: blob as T,
        success: true,
      };
    }

    return {
      data: null as T,
      success: true,
    };
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch {
      return null;
    }
  }

  /**
   * Create API error object
   */
  private createApiError(response: Response, data: any): ApiError {
    return {
      status: response.status,
      statusText: response.statusText,
      message: data?.message || data?.error || response.statusText,
      data,
    };
  }

  /**
   * Handle request errors
   */
  private handleRequestError(
    error: any,
    url: string,
    method: string
  ): ApiError {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          status: 408,
          statusText: "Request Timeout",
          message: "Request timed out. Please try again.",
        };
      }

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return {
          status: 0,
          statusText: "Network Error",
          message:
            "Network connection error. Please check your internet connection.",
        };
      }
    }

    // If it's already an ApiError, return it
    if (error.status) {
      return error;
    }

    return {
      status: 500,
      statusText: "Internal Error",
      message: error.message || "An unexpected error occurred.",
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(url: string, method: string, body?: any): string {
    const bodyString = body ? JSON.stringify(body) : "";
    return `${method}:${url}:${bodyString}`;
  }

  /**
   * Get cached response
   */
  private getCachedResponse(cacheKey: string): ApiResponse | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache response
   */
  private cacheResponse(
    cacheKey: string,
    response: ApiResponse,
    ttl: number = 5 * 60 * 1000
  ): void {
    this.cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up old cache entries
    this.cleanupCache();
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    config?: Omit<ApiRequestConfig, "method">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: Omit<ApiRequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "POST", body: data });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    config?: Omit<ApiRequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "PUT", body: data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    config?: Omit<ApiRequestConfig, "method">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    config?: Omit<ApiRequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PATCH",
      body: data,
    });
  }

  /**
   * Upload file
   */
  async uploadFile<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    config?: Omit<ApiRequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append("file", file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
    }

    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: formData,
    });
  }

  /**
   * Download file
   */
  async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const response = await this.request<Blob>(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/octet-stream",
      },
    });

    if (response.success && response.data instanceof Blob) {
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export convenience functions
export const api = {
  get: <T = any>(endpoint: string, config?: any) =>
    apiClient.get<T>(endpoint, config),
  post: <T = any>(endpoint: string, data?: any, config?: any) =>
    apiClient.post<T>(endpoint, data, config),
  put: <T = any>(endpoint: string, data?: any, config?: any) =>
    apiClient.put<T>(endpoint, data, config),
  delete: <T = any>(endpoint: string, config?: any) =>
    apiClient.delete<T>(endpoint, config),
  patch: <T = any>(endpoint: string, data?: any, config?: any) =>
    apiClient.patch<T>(endpoint, data, config),
  uploadFile: <T = any>(
    endpoint: string,
    file: File,
    additionalData?: any,
    config?: any
  ) => apiClient.uploadFile<T>(endpoint, file, additionalData, config),
  downloadFile: (endpoint: string, filename?: string) =>
    apiClient.downloadFile(endpoint, filename),
  clearCache: () => apiClient.clearCache(),
};
