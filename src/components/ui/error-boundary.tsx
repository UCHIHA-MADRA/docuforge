import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription } from "./alert";
import { Button } from "./button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Something went wrong</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    An unexpected error occurred. Please try again.
                  </p>
                </div>
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium">
                      Error details
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                <Button onClick={this.handleRetry} size="sm" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
