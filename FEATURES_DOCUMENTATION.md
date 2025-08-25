# DocuForge Features Documentation

This document provides a comprehensive overview of all features implemented in the DocuForge application, including their code locations and dependencies.

## Table of Contents

1. [Core Features](#core-features)
2. [Authentication & User Management](#authentication--user-management)
3. [Document Management](#document-management)
4. [PDF Processing](#pdf-processing)
5. [File Management](#file-management)
6. [Real-time Collaboration](#real-time-collaboration)
7. [UI Components](#ui-components)
8. [Theme System](#theme-system)
9. [Tools & Utilities](#tools--utilities)
10. [API Endpoints](#api-endpoints)
11. [Security Features](#security-features)

## Core Features

### Landing Page

- **Implementation**: `src/app/page.tsx`
- **Components**:
  - Hero Section: `src/components/hero-section.tsx`
  - Features Section: `src/components/features-section.tsx`
  - CTA Section: `src/components/cta-section.tsx`
  - Social Proof: `src/components/social-proof.tsx`
  - Footer: `src/components/footer.tsx`
- **Dependencies**: Background effects, animations, UI components

### Dashboard

- **Implementation**: `src/app/dashboard/page.tsx`
- **Features**:
  - Document management interface
  - File management
  - Tools access
  - Text editor integration
- **Dependencies**: Authentication context, UI components, file management

### Navigation System

- **Main Navigation**: `src/components/navigation.tsx`
- **Mobile Navigation**: `src/components/mobile-navigation.tsx`
- **Header**: `src/components/header.tsx`
- **Features**:
  - Responsive design
  - Mobile-friendly navigation
  - Theme toggle integration
  - Authentication-aware components

## Authentication & User Management

### Authentication System

- **Implementation**:
  - Context: `src/lib/auth-context.tsx`
  - API Routes: `src/app/api/auth/[...nextauth]`
  - Sign In Page: `src/app/auth/signin/page.tsx`
  - Sign Up Page: `src/app/auth/signup/page.tsx`
- **Features**:
  - Google OAuth integration
  - Email/password authentication
  - Session management
  - Protected routes
- **Dependencies**: NextAuth.js, Prisma ORM

### User Management

- **API Routes**: `src/app/api/users/me`
- **Auth Guard**: `src/components/auth/AuthGuard.tsx`
- **Features**:
  - User profiles
  - Role-based access control
  - User preferences
- **Dependencies**: Permissions system (`src/lib/permissions.ts`)

## Document Management

### Document Editor

- **Implementation**:
  - Rich Text Editor: `src/components/editor/rich-text-editor.tsx`
  - Editor Toolbar: `src/components/editor/editor-toolbar.tsx`
  - Editor Menu: `src/components/editor/editor-menu.tsx`
  - Enhanced Document Editor: `src/components/documents/enhanced-document-editor.tsx`
- **Features**:
  - Rich text formatting
  - Document versioning
  - Autosave functionality
  - Formatting options
- **Dependencies**: Editor extensions, UI components

### Document API

- **Implementation**: `src/app/api/documents/route.ts`
- **Document Operations**: `src/app/api/documents/[id]`
- **Features**:
  - CRUD operations
  - Version control
  - Document conversion
  - Metadata management
- **Dependencies**: Prisma ORM, error handling

## PDF Processing

### PDF Tools

- **Implementation**: `src/app/pdf/page.tsx`
- **PDF Editor**: `src/components/pdf/PDFEditor.tsx`
- **Features**:
  - PDF viewing
  - PDF editing
  - Annotation tools
  - Page management
- **Dependencies**: PDF processor, annotation tools

### PDF Processing Engine

- **Implementation**: `src/lib/pdf-processor.ts`
- **API Routes**:
  - Merge: `src/app/api/pdf/merge`
  - Split: `src/app/api/pdf/split`
  - Compress: `src/app/api/pdf/compress`
  - Convert: `src/app/api/pdf/convert`
  - Edit: `src/app/api/pdf/edit`
- **Features**:
  - PDF merging
  - PDF splitting
  - PDF compression
  - PDF conversion
  - PDF editing
- **Dependencies**: PDF-lib, error handling

### PDF Annotations

- **Implementation**:
  - Annotation Canvas: `src/components/pdf/AnnotationCanvas.tsx`
  - Annotation Sidebar: `src/components/pdf/AnnotationSidebar.tsx`
  - Annotation Toolbar: `src/components/pdf/AnnotationToolbar.tsx`
  - PDF Annotations Lib: `src/lib/pdf-annotations.ts`
- **Features**:
  - Text annotations
  - Drawing tools
  - Highlighting
  - Comments
- **Dependencies**: PDF processor, UI components

## File Management

### File Manager

- **Implementation**: `src/components/files/FileManager.tsx`
- **File Upload**: `src/components/files/FileUpload.tsx`
- **Files Page**: `src/app/files/page.tsx`
- **Features**:
  - File browsing
  - File organization
  - File preview
  - File sharing
- **Dependencies**: API client, UI components

### File API

- **Implementation**: `src/app/api/files/route.ts`
- **File Operations**: `src/app/api/files/[fileId]`
- **Upload Endpoint**: `src/app/api/files/upload`
- **Features**:
  - File upload
  - File download
  - File metadata
  - File validation
- **Dependencies**: Prisma ORM, error handling

### Folder Management

- **Implementation**: `src/app/api/folders/route.ts`
- **Features**:
  - Folder creation
  - Folder organization
  - Nested folders
  - Access control
- **Dependencies**: Prisma ORM, permissions system

## Real-time Collaboration

### Collaborative Editor

- **Implementation**: `src/components/CollaborativeEditor.tsx`
- **Collaboration Page**: `src/app/collaborate/page.tsx`
- **Demo Page**: `src/app/collaborative-demo/page.tsx`
- **Features**:
  - Real-time editing
  - User presence
  - Cursor tracking
  - Conflict resolution
- **Dependencies**: Y.js, WebSocket server

### Collaboration Extensions

- **Implementation**:
  - Collaboration: `src/components/editor/editor-extensions/collaboration.tsx`
  - Comments: `src/components/editor/editor-extensions/comments.tsx`
  - Mentions: `src/components/editor/editor-extensions/mentions.tsx`
  - Cursor: `src/components/editor/collaboration-cursor.tsx`
- **Features**:
  - Collaborative editing
  - Comment threads
  - User mentions
  - Cursor presence
- **Dependencies**: Y.js, WebSocket server

### WebSocket Server

- **Implementation**:
  - WebSocket Server: `src/lib/websocket-server.ts`
  - Collaboration Server: `src/lib/collaboration-server.ts`
- **Features**:
  - Real-time communication
  - Document synchronization
  - User awareness
  - Offline support
- **Dependencies**: Y.js, WebSocket

## UI Components

### Core UI Components

- **Implementation**: `src/components/ui/`
- **Key Components**:
  - Button: `button.tsx`
  - Dialog: `dialog.tsx`
  - Card: `card.tsx`
  - Input: `input.tsx`
  - Dropdown Menu: `dropdown-menu.tsx`
  - Tabs: `tabs.tsx`
  - Table: `table.tsx`
  - Alert: `alert.tsx`
- **Features**:
  - Accessible design
  - Responsive layouts
  - Consistent styling
  - Theme integration
- **Dependencies**: Tailwind CSS, Radix UI

### Specialized UI Components

- **Implementation**:
  - Loading Spinner: `src/components/ui/loading-spinner.tsx`
  - Empty State: `src/components/ui/empty-state.tsx`
  - Error Boundary: `src/components/ui/error-boundary.tsx`
  - Glowing Button: `src/components/ui/glowing-button.tsx`
- **Features**:
  - Loading states
  - Empty state handling
  - Error handling
  - Visual effects
- **Dependencies**: UI components, animations

## Theme System

### Theme Context

- **Implementation**: `src/contexts/ThemeContext.tsx`
- **Features**:
  - Light/dark mode
  - Color schemes
  - Font size options
  - Border radius customization
  - Animation preferences
  - High contrast mode
- **Dependencies**: React context, local storage

### Theme Components

- **Implementation**:
  - Theme Toggle: `src/components/theme/ThemeToggle.tsx`
  - Theme Settings: `src/components/theme/ThemeSettings.tsx`
  - Client Theme Toggle: `src/components/theme/ClientThemeToggle.tsx`
  - Enhanced Theme Toggle: `src/components/theme/EnhancedThemeToggle.tsx`
- **Features**:
  - Theme switching
  - Theme customization
  - Client-side rendering
  - Enhanced visual effects
- **Dependencies**: Theme context, UI components

## Tools & Utilities

### Document Conversion

- **Implementation**:
  - Document Converter: `src/components/tools/DocumentConverter.tsx`
  - Document Converter Lib: `src/lib/document-converter.ts`
  - API Route: `src/app/api/documents/convert`
- **Features**:
  - Format conversion
  - Document export
  - Document import
- **Dependencies**: File processing libraries

### OCR Processing

- **Implementation**:
  - OCR Extractor: `src/components/tools/OCRExtractor.tsx`
  - OCR Service: `src/lib/ocr-service.ts`
  - API Route: `src/app/api/ocr/extract`
- **Features**:
  - Text extraction from images
  - Document scanning
  - Text recognition
- **Dependencies**: OCR libraries

### PDF Tools

- **Implementation**:
  - PDF Splitter: `src/components/tools/PDFSplitter.tsx`
  - PDF Splitter Page: `src/app/tools/pdf-splitter/page.tsx`
- **Features**:
  - PDF splitting
  - Page extraction
  - Document reorganization
- **Dependencies**: PDF processor

### Spreadsheet Tools

- **Implementation**:
  - Spreadsheet Engine: `src/components/spreadsheet/SpreadsheetEngine.tsx`
  - Spreadsheet Editor: `src/components/spreadsheets/spreadsheet-editor.tsx`
  - Spreadsheets Page: `src/app/dashboard/spreadsheets/page.tsx`
- **Features**:
  - Spreadsheet editing
  - Formula support
  - Data visualization
- **Dependencies**: Spreadsheet libraries

## API Endpoints

### Authentication API

- **Implementation**: `src/app/api/auth/[...nextauth]`
- **Register Endpoint**: `src/app/api/auth/register`
- **User Data Endpoint**: `src/app/api/auth/user-data`
- **Features**:
  - Authentication
  - Registration
  - User data management
- **Dependencies**: NextAuth.js, Prisma ORM

### Document API

- **Implementation**: `src/app/api/documents/route.ts`
- **Document Operations**: `src/app/api/documents/[id]`
- **Features**:
  - CRUD operations
  - Document metadata
  - Document sharing
- **Dependencies**: Prisma ORM, permissions system

### File API

- **Implementation**: `src/app/api/files/route.ts`
- **File Operations**: `src/app/api/files/[fileId]`
- **Features**:
  - File upload
  - File download
  - File metadata
- **Dependencies**: Prisma ORM, file storage

### PDF Processing API

- **Implementation**:
  - Merge: `src/app/api/pdf/merge`
  - Split: `src/app/api/pdf/split`
  - Compress: `src/app/api/pdf/compress`
  - Convert: `src/app/api/pdf/convert`
  - Edit: `src/app/api/pdf/edit`
- **Features**:
  - PDF operations
  - File processing
  - Error handling
- **Dependencies**: PDF processor, file storage

### Admin API

- **Implementation**:
  - Roles: `src/app/api/admin/roles`
  - Audit Logs: `src/app/api/audit/logs`
  - Audit Stats: `src/app/api/audit/stats`
- **Features**:
  - Role management
  - Audit logging
  - System statistics
- **Dependencies**: Prisma ORM, audit logger

## Security Features

### Authentication Security

- **Implementation**: NextAuth.js integration
- **Features**:
  - OAuth security
  - CSRF protection
  - Session management
  - Secure cookies
- **Dependencies**: NextAuth.js, secure storage

### File Security

- **Implementation**:
  - File validation
  - Malware scanning
  - Access control
- **Features**:
  - File type validation
  - Size limits
  - Secure storage
  - Access permissions
- **Dependencies**: Permissions system, validation libraries

### Encryption

- **Implementation**:
  - Encryption Lib: `src/lib/encryption.ts`
  - Encrypted Storage: `src/lib/encrypted-storage.ts`
- **Features**:
  - Data encryption
  - Secure storage
  - Key management
- **Dependencies**: Encryption libraries

### Audit Logging

- **Implementation**:
  - Audit Logger: `src/lib/audit-logger.ts`
  - Audit Middleware: `src/middleware/audit.ts`
  - Audit Dashboard: `src/components/audit/AuditDashboard.tsx`
- **Features**:
  - Activity logging
  - Security monitoring
  - Compliance tracking
- **Dependencies**: Prisma ORM, middleware

### Permissions System

- **Implementation**: `src/lib/permissions.ts`
- **Features**:
  - Role-based access control
  - Resource permissions
  - Permission checking
  - Organization roles
- **Dependencies**: Authentication context, Prisma ORM