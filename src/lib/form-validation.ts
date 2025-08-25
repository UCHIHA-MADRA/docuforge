import React from "react";
import { z } from "zod";
import { handleValidationError } from "./error-handler";

// Common validation schemas
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email is too long");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  );

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name is too long")
  .regex(
    /^[a-zA-Z\s\-']+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes"
  );

export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[\+]?[1-9][\d]{0,15}$/.test(val.replace(/\s/g, "")),
    {
      message: "Please enter a valid phone number",
    }
  );

export const urlSchema = z
  .string()
  .url("Please enter a valid URL")
  .optional()
  .or(z.literal(""));

export const fileSchema = z.object({
  name: z.string().min(1, "File name is required"),
  size: z.number().min(1, "File size must be greater than 0"),
  type: z.string().min(1, "File type is required"),
});

// File validation helpers
export const validateFileSize = (
  file: File,
  maxSize: number
): string | null => {
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return `File size must be less than ${maxSizeMB}MB`;
  }
  return null;
};

export const validateFileType = (
  file: File,
  allowedTypes: string[]
): string | null => {
  if (!allowedTypes.includes(file.type)) {
    return `File type ${
      file.type
    } is not supported. Allowed types: ${allowedTypes.join(", ")}`;
  }
  return null;
};

export const validateImageDimensions = async (
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width > maxWidth || img.height > maxHeight) {
        resolve(`Image dimensions must be ${maxWidth}x${maxHeight} or smaller`);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve("Invalid image file");
    };
    img.src = URL.createObjectURL(file);
  });
};

// Form validation class
export class FormValidator {
  private errors: Record<string, string> = {};
  private touched: Record<string, boolean> = {};

  /**
   * Validate a single field
   */
  validateField(
    fieldName: string,
    value: any,
    schema: z.ZodSchema,
    context?: { userId?: string; form?: string }
  ): string | null {
    try {
      schema.parse(value);
      this.clearFieldError(fieldName);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || "Invalid value";
        this.setFieldError(fieldName, errorMessage);

        // Log validation error
        handleValidationError(fieldName, errorMessage, context);

        return errorMessage;
      }
      return "Validation failed";
    }
  }

  /**
   * Validate multiple fields at once
   */
  validateFields(
    data: Record<string, any>,
    schema: z.ZodObject<any>,
    context?: { userId?: string; form?: string }
  ): Record<string, string> {
    try {
      schema.parse(data);
      this.errors = {};
      return {};
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.errors = {};
        error.errors.forEach((err) => {
          const fieldName = err.path.join(".");
          this.errors[fieldName] = err.message;

          // Log validation error
          handleValidationError(fieldName, err.message, context);
        });
        return this.errors;
      }
      return { general: "Validation failed" };
    }
  }

  /**
   * Set field as touched
   */
  setFieldTouched(fieldName: string): void {
    this.touched[fieldName] = true;
  }

  /**
   * Check if field has been touched
   */
  isFieldTouched(fieldName: string): boolean {
    return this.touched[fieldName] || false;
  }

  /**
   * Set field error
   */
  setFieldError(fieldName: string, error: string): void {
    this.errors[fieldName] = error;
  }

  /**
   * Get field error
   */
  getFieldError(fieldName: string): string | null {
    return this.errors[fieldName] || null;
  }

  /**
   * Clear field error
   */
  clearFieldError(fieldName: string): void {
    delete this.errors[fieldName];
  }

  /**
   * Check if form has errors
   */
  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  /**
   * Get all errors
   */
  getErrors(): Record<string, string> {
    return { ...this.errors };
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = {};
  }

  /**
   * Reset form state
   */
  reset(): void {
    this.errors = {};
    this.touched = {};
  }
}

// Common validation rules
export const validationRules = {
  required: (value: any): string | null => {
    if (value === null || value === undefined || value === "") {
      return "This field is required";
    }
    return null;
  },

  minLength: (value: string, min: number): string | null => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value: string, max: number): string | null => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  pattern: (value: string, pattern: RegExp, message: string): string | null => {
    if (value && !pattern.test(value)) {
      return message;
    }
    return null;
  },

  email: (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return null;
  },

  url: (value: string): string | null => {
    try {
      if (value && new URL(value)) {
        return null;
      }
    } catch {
      return "Please enter a valid URL";
    }
    return null;
  },

  number: (value: any): string | null => {
    if (value && isNaN(Number(value))) {
      return "Please enter a valid number";
    }
    return null;
  },

  min: (value: number, min: number): string | null => {
    if (value !== null && value !== undefined && value < min) {
      return `Must be at least ${min}`;
    }
    return null;
  },

  max: (value: number, max: number): string | null => {
    if (value !== null && value !== undefined && value > max) {
      return `Must be no more than ${max}`;
    }
    return null;
  },

  fileSize: (file: File, maxSize: number): string | null => {
    return validateFileSize(file, maxSize);
  },

  fileType: (file: File, allowedTypes: string[]): string | null => {
    return validateFileType(file, allowedTypes);
  },
};

// React Hook for form validation
export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  schema: z.ZodObject<any>
) {
  const [data, setData] = React.useState<T>(initialData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validate = React.useCallback(
    (fieldData: T) => {
      try {
        schema.parse(fieldData);
        setErrors({});
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const newErrors: Record<string, string> = {};
          error.errors.forEach((err) => {
            const fieldName = err.path.join(".");
            newErrors[fieldName] = err.message;
          });
          setErrors(newErrors);
          return false;
        }
        return false;
      }
    },
    [schema]
  );

  const setFieldValue = React.useCallback(
    (field: keyof T, value: any) => {
      setData((prev) => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field as string]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const setFieldTouched = React.useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = React.useCallback(
    async (
      onSubmit: (data: T) => Promise<void>,
      context?: { userId?: string; form?: string }
    ) => {
      setIsSubmitting(true);

      try {
        if (validate(data)) {
          await onSubmit(data);
        } else {
          // Log validation errors
          Object.entries(errors).forEach(([field, message]) => {
            handleValidationError(field, message, context);
          });
        }
      } catch (error) {
        console.error("Form submission error:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [data, errors, validate]
  );

  const reset = React.useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialData]);

  return {
    data,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    reset,
    validate,
  };
}
