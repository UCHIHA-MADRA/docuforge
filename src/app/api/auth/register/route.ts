import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";
import { z } from "zod";
import { auditHooks } from "@/middleware/audit";

// Validation schema for registration with enhanced validation
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine(
      (password) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return hasUpperCase && hasLowerCase && (hasNumbers || hasSpecialChar);
      },
      {
        message: "Password must contain uppercase, lowercase, and at least one number or special character",
      }
    ),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      // Extract the first error message for a better user experience
      const errorMessage = result.error.errors[0]?.message || "Invalid input data";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    const { email, password, name } = result.data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }
    
    // Hash password with increased cost factor for better security
    const hashedPassword = await hash(password, 12);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        isActive: true, // Set the user as active by default
        emailVerified: null, // Explicitly set as null since email is not verified yet
      },
    });
    
    // Log registration
    try {
      await auditHooks.logLoginAttempt(
        email,
        request.headers.get("x-forwarded-for") || "unknown",
        request.headers.get("user-agent") || "unknown",
        true,
        user.id
      );
    } catch (error) {
      console.error("Failed to log registration event:", error);
    }
    
    // Return success with more information
    return NextResponse.json(
      { 
        success: true, 
        userId: user.id,
        email: user.email,
        name: user.name,
        message: "Registration successful"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    
    // Check for specific database errors
    const errorMessage = error instanceof Error ? error.message : "An error occurred during registration";
    
    // Handle potential database constraint violations
    if (errorMessage.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "An error occurred during registration. Please try again later." },
      { status: 500 }
    );
  }
}