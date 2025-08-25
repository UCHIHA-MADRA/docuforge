# DocuForge UI Components & Utilities Guide

This guide documents all the UI components and utilities created for the DocuForge application, including edge case handling and best practices.

## 🎨 UI Components

### Core UI Components (`src/components/ui/`)

#### 1. **Button** (`button.tsx`)

- **Purpose**: Primary button component with multiple variants
- **Variants**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- **Sizes**: `default`, `sm`, `lg`, `icon`
- **Features**:
  - Accessible with proper ARIA labels
  - Loading states
  - Icon support
  - Disabled states

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="lg" disabled={isLoading}>
  {isLoading ? "Loading..." : "Submit"}
</Button>;
```

#### 2. **Dialog** (`dialog.tsx`)

- **Purpose**: Modal dialogs and overlays
- **Components**: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`
- **Features**:
  - Keyboard navigation (Esc to close)
  - Focus management
  - Backdrop click to close
  - Responsive design

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger>Open Dialog</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    {/* Dialog content */}
  </DialogContent>
</Dialog>;
```

#### 3. **Select** (`select.tsx`)

- **Purpose**: Dropdown selection component
- **Components**: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`
- **Features**:
  - Keyboard navigation
  - Search functionality
  - Custom styling
  - Accessibility compliant

```tsx
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>;
```

#### 4. **Badge** (`badge.tsx`)

- **Purpose**: Status indicators and labels
- **Variants**: `default`, `secondary`, `destructive`, `outline`
- **Features**:
  - Color-coded variants
  - Compact design
  - Icon support

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Active</Badge>
<Badge variant="destructive">Error</Badge>
```

#### 5. **Alert** (`alert.tsx`)

- **Purpose**: Important messages and notifications
- **Components**: `Alert`, `AlertTitle`, `AlertDescription`
- **Variants**: `default`, `destructive`
- **Features**:
  - Icon support
  - Color-coded variants
  - Accessible design

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert";

<Alert variant="destructive">
  <AlertDescription>This is an error message</AlertDescription>
</Alert>;
```

#### 6. **Progress** (`progress.tsx`)

- **Purpose**: Progress bars and loading indicators
- **Features**:
  - Animated progress
  - Customizable styling
  - Accessibility support

```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={75} className="w-full" />;
```

#### 7. **Textarea** (`textarea.tsx`)

- **Purpose**: Multi-line text input
- **Features**:
  - Resizable
  - Focus management
  - Validation support

```tsx
import { Textarea } from "@/components/ui/textarea";

<Textarea placeholder="Enter your message..." />;
```

#### 8. **Tabs** (`tabs.tsx`)

- **Purpose**: Tabbed content organization
- **Components**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- **Features**:
  - Keyboard navigation
  - Responsive design
  - Custom styling

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>;
```

#### 9. **Table** (`table.tsx`)

- **Purpose**: Data tables with sorting and pagination
- **Components**: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- **Features**:
  - Responsive design
  - Accessibility support
  - Custom styling

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>;
```

#### 10. **Separator** (`separator.tsx`)

- **Purpose**: Visual dividers
- **Features**:
  - Horizontal and vertical orientations
  - Customizable styling

```tsx
import { Separator } from "@/components/ui/separator";

<Separator orientation="horizontal" />;
```

#### 11. **Toggle** (`toggle.tsx`)

- **Purpose**: Toggle buttons and switches
- **Variants**: `default`, `outline`
- **Sizes**: `default`, `sm`, `lg`
- **Features**:
  - Pressed state
  - Icon support
  - Accessibility

```tsx
import { Toggle } from "@/components/ui/toggle";

<Toggle aria-label="Toggle bold">
  <Bold className="h-4 w-4" />
</Toggle>;
```

#### 12. **Slider** (`slider.tsx`)

- **Purpose**: Range input component
- **Features**:
  - Keyboard navigation
  - Customizable range
  - Accessibility support

```tsx
import { Slider } from "@/components/ui/slider";

<Slider defaultValue={[50]} max={100} step={1} />;
```

#### 13. **Skeleton** (`skeleton.tsx`)

- **Purpose**: Loading placeholders
- **Features**:
  - Animated loading state
  - Customizable styling

```tsx
import { Skeleton } from "@/components/ui/skeleton";

<Skeleton className="h-4 w-[250px]" />;
```

#### 14. **Tooltip** (`tooltip.tsx`)

- **Purpose**: Hover information display
- **Components**: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`
- **Features**:
  - Position customization
  - Delay options
  - Accessibility

```tsx
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>Tooltip content</TooltipContent>
  </Tooltip>
</TooltipProvider>;
```

#### 15. **Popover** (`popover.tsx`)

- **Purpose**: Floating content panels
- **Components**: `Popover`, `PopoverTrigger`, `PopoverContent`
- **Features**:
  - Position customization
  - Click outside to close
  - Accessibility

```tsx
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

<Popover>
  <PopoverTrigger>Open Popover</PopoverTrigger>
  <PopoverContent>Popover content</PopoverContent>
</Popover>;
```

#### 16. **ScrollArea** (`scroll-area.tsx`)

- **Purpose**: Custom scrollable containers
- **Components**: `ScrollArea`, `ScrollBar`
- **Features**:
  - Custom scrollbar styling
  - Cross-browser compatibility
  - Accessibility

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";

<ScrollArea className="h-[200px] w-[350px]">
  {/* Scrollable content */}
</ScrollArea>;
```

### Specialized UI Components

#### 17. **LoadingSpinner** (`loading-spinner.tsx`)

- **Purpose**: Consistent loading states
- **Components**: `LoadingSpinner`, `LoadingSpinnerOverlay`, `LoadingSpinnerInline`
- **Sizes**: `sm`, `md`, `lg`
- **Features**:
  - Multiple variants
  - Customizable text
  - Overlay option

```tsx
import { LoadingSpinner, LoadingSpinnerOverlay } from '@/components/ui/loading-spinner';

<LoadingSpinner size="lg" text="Loading data..." showText={true} />
<LoadingSpinnerOverlay text="Processing..." />
```

#### 18. **EmptyState** (`empty-state.tsx`)

- **Purpose**: Display when no data is available
- **Features**:
  - Icon support
  - Action buttons
  - Customizable messaging

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

<EmptyState
  icon={<FileText className="h-8 w-8" />}
  title="No documents found"
  description="Create your first document to get started"
  action={{
    label: "Create Document",
    onClick: () => createDocument(),
    variant: "default",
  }}
/>;
```

#### 19. **ErrorBoundary** (`error-boundary.tsx`)

- **Purpose**: React error boundary with fallback UI
- **Features**:
  - Error logging
  - Retry functionality
  - Development error details
  - Custom fallback support

```tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error("Error caught by boundary:", error, errorInfo);
  }}
>
  <YourComponent />
</ErrorBoundary>;
```

## 🛠️ Utility Libraries

### 1. **Error Handler** (`src/lib/error-handler.ts`)

- **Purpose**: Centralized error handling and logging
- **Features**:
  - Error categorization
  - User-friendly messages
  - Error logging
  - Toast notifications
  - Context tracking

```tsx
import {
  handleError,
  handleApiError,
  handleValidationError,
} from "@/lib/error-handler";

// Handle general errors
handleError(new Error("Something went wrong"), {
  userId: user.id,
  component: "FileUpload",
  action: "Upload file",
});

// Handle API errors
handleApiError(response, {
  userId: user.id,
  endpoint: "/api/files/upload",
  method: "POST",
});

// Handle validation errors
handleValidationError("email", "Invalid email format", {
  userId: user.id,
  form: "UserProfile",
});
```

### 2. **Form Validation** (`src/lib/form-validation.ts`)

- **Purpose**: Comprehensive form validation with Zod schemas
- **Features**:
  - Pre-built validation schemas
  - File validation helpers
  - Form validation class
  - React hooks for form validation
  - Error handling integration

```tsx
import {
  emailSchema,
  passwordSchema,
  validateFileSize,
  FormValidator,
  useFormValidation,
} from "@/lib/form-validation";

// Pre-built schemas
const userSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

// File validation
const fileError = validateFileSize(file, 10 * 1024 * 1024); // 10MB

// Form validation hook
const { data, errors, handleSubmit, isSubmitting } = useFormValidation(
  initialData,
  userSchema
);
```

### 3. **API Client** (`src/lib/api-client.ts`)

- **Purpose**: HTTP client with caching and error handling
- **Features**:
  - Request caching
  - Timeout handling
  - Error categorization
  - File upload/download
  - Request deduplication
  - Abort controller support

```tsx
import { api } from "@/lib/api-client";

// GET request with caching
const response = await api.get("/users");

// POST request
const result = await api.post("/users", userData);

// File upload
const uploadResult = await api.uploadFile("/files/upload", file, {
  metadata: { tags: ["important"] },
});

// File download
await api.downloadFile("/files/download/123", "document.pdf");
```

## 🔧 Edge Cases & Best Practices

### 1. **Authentication Edge Cases**

- **Session timeout handling**
- **Token refresh logic**
- **Fallback to session data**
- **Network error recovery**

### 2. **File Upload Edge Cases**

- **Duplicate file detection**
- **File size validation**
- **File type validation**
- **Upload timeout handling**
- **Network interruption recovery**
- **Progress tracking**

### 3. **Form Validation Edge Cases**

- **Real-time validation**
- **Cross-field validation**
- **Async validation**
- **Error message localization**

### 4. **API Request Edge Cases**

- **Request deduplication**
- **Cache invalidation**
- **Retry logic**
- **Offline handling**
- **Rate limiting**

### 5. **UI Component Edge Cases**

- **Loading states**
- **Error states**
- **Empty states**
- **Responsive design**
- **Accessibility compliance**

## 🎯 Usage Examples

### Complete Form with Validation

```tsx
import { useFormValidation } from "@/lib/form-validation";
import { Button, Input, Alert } from "@/components/ui";
import { userSchema } from "@/lib/schemas";

function UserForm() {
  const { data, errors, handleSubmit, isSubmitting } = useFormValidation(
    { email: "", password: "" },
    userSchema
  );

  const onSubmit = async (formData) => {
    try {
      await api.post("/users", formData);
      // Handle success
    } catch (error) {
      handleError(error, { component: "UserForm" });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(onSubmit);
      }}
    >
      <Input
        type="email"
        value={data.email}
        onChange={(e) => setFieldValue("email", e.target.value)}
        error={errors.email}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
```

### File Upload with Progress

```tsx
import { FileUpload } from "@/components/files/FileUpload";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function DocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = (fileId) => {
    // Handle successful upload
  };

  const handleUploadError = (error) => {
    handleFileError(error, "document.pdf", { userId: user.id });
  };

  return (
    <div>
      <FileUpload
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        maxFiles={5}
      />
      {isUploading && <LoadingSpinner text="Uploading files..." />}
    </div>
  );
}
```

### Error Boundary Implementation

```tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to monitoring service
        logError(error, errorInfo);
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/files" element={<FileManager />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

## 📋 Component Checklist

### ✅ Implemented Components

- [x] Button (with all variants)
- [x] Dialog (modal system)
- [x] Select (dropdown)
- [x] Badge (status indicators)
- [x] Alert (notifications)
- [x] Progress (loading bars)
- [x] Textarea (multi-line input)
- [x] Tabs (content organization)
- [x] Table (data display)
- [x] Separator (visual dividers)
- [x] Toggle (switches)
- [x] Slider (range input)
- [x] Skeleton (loading placeholders)
- [x] Tooltip (hover information)
- [x] Popover (floating content)
- [x] ScrollArea (custom scrollbars)
- [x] LoadingSpinner (loading states)
- [x] EmptyState (no data display)
- [x] ErrorBoundary (error handling)

### ✅ Implemented Utilities

- [x] Error Handler (centralized error management)
- [x] Form Validation (Zod-based validation)
- [x] API Client (HTTP client with caching)
- [x] Authentication Context (user management)
- [x] File Upload Component (with validation)
- [x] File Manager Component (file operations)

### ✅ Edge Cases Handled

- [x] Network errors and timeouts
- [x] File validation and size limits
- [x] Form validation and error states
- [x] Loading and error states
- [x] Authentication edge cases
- [x] API request deduplication
- [x] Cache management
- [x] Accessibility compliance
- [x] Responsive design
- [x] Error boundaries and fallbacks

## 🚀 Getting Started

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Import Components**

   ```tsx
   import { Button, Dialog, Alert } from "@/components/ui";
   ```

3. **Use Utilities**

   ```tsx
   import { handleError, api, useFormValidation } from "@/lib";
   ```

4. **Follow Patterns**
   - Use ErrorBoundary for component error handling
   - Implement proper loading states
   - Handle edge cases in forms
   - Use the API client for all HTTP requests
   - Implement proper validation

This comprehensive UI system provides a solid foundation for building robust, accessible, and user-friendly applications with proper error handling and edge case management.
