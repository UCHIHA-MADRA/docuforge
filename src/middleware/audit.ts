import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { auditLogger, AuditEventType, RiskLevel } from "@/lib/audit-logger";

// Add missing SpreadsheetChanges type
interface SpreadsheetChanges {
  cells?: Array<{ row: number; col: number; value: unknown }>;
  rows?: Array<{ index: number; action: "add" | "delete" | "update" }>;
  columns?: Array<{ index: number; action: "add" | "delete" | "update" }>;
  metadata?: Record<string, unknown>;
}

// Audit middleware for API routes
export async function auditMiddleware(request: NextRequest) {
  const startTime = Date.now();
  const token = await getToken({ req: request });

  // Get request details
  const method = request.method;
  const url = request.url;
  const pathname = new URL(url).pathname;
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Continue with the request
  const response = NextResponse.next();

  // Log the request after completion
  response.headers.set("x-audit-logged", "true");

  // Schedule audit logging (non-blocking)
  setImmediate(async () => {
    const duration = Date.now() - startTime;
    const statusCode = response.status;

    try {
      await auditLogger.log({
        eventType: getEventTypeFromPath(pathname, method),
        userId: token?.sub,
        userEmail: token?.email || undefined,
        ipAddress,
        userAgent,
        sessionId: token?.jti as string | undefined,
        action: `${method} ${pathname}`,
        details: {
          method,
          pathname,
          statusCode,
          duration,
          query: JSON.stringify(Object.fromEntries(new URL(url).searchParams)),
          timestamp: new Date().toISOString(),
        },
        riskLevel: getRiskLevel(pathname, method, statusCode),
        success: statusCode < 400,
        errorMessage: statusCode >= 400 ? `HTTP ${statusCode}` : undefined,
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  });

  return response;
}

// Helper function to determine event type from API path
function getEventTypeFromPath(
  pathname: string,
  method: string
): AuditEventType {
  // Authentication endpoints
  if (pathname.includes("/auth/signin")) return AuditEventType.USER_LOGIN;
  if (pathname.includes("/auth/signout")) return AuditEventType.USER_LOGOUT;
  if (pathname.includes("/auth/signup")) return AuditEventType.USER_REGISTER;

  // Document operations
  if (pathname.includes("/api/documents")) {
    if (method === "POST") return AuditEventType.DOCUMENT_UPLOADED;
    if (method === "GET") return AuditEventType.DOCUMENT_VIEWED;
    if (method === "DELETE") return AuditEventType.DOCUMENT_DELETED;
  }

  // PDF operations
  if (pathname.includes("/api/pdf/merge")) return AuditEventType.PDF_MERGED;
  if (pathname.includes("/api/pdf/split")) return AuditEventType.PDF_SPLIT;
  if (pathname.includes("/api/pdf/compress"))
    return AuditEventType.PDF_COMPRESSED;
  if (pathname.includes("/api/pdf/annotate"))
    return AuditEventType.PDF_ANNOTATED;

  // OCR operations
  if (pathname.includes("/api/ocr")) return AuditEventType.OCR_PERFORMED;

  // Spreadsheet operations
  if (pathname.includes("/api/spreadsheet")) {
    if (method === "POST") return AuditEventType.SPREADSHEET_CREATED;
    if (method === "PUT" || method === "PATCH")
      return AuditEventType.SPREADSHEET_EDITED;
  }

  // Theme operations
  if (pathname.includes("/api/theme")) return AuditEventType.THEME_CHANGED;
  if (pathname.includes("/api/settings"))
    return AuditEventType.SETTINGS_UPDATED;

  // Default to system event
  return AuditEventType.SYSTEM_ERROR;
}

// Helper function to determine risk level
function getRiskLevel(
  pathname: string,
  method: string,
  statusCode: number
): RiskLevel {
  // Critical events
  if (statusCode === 401 || statusCode === 403) return RiskLevel.HIGH;
  if (pathname.includes("/auth") && statusCode >= 400) return RiskLevel.MEDIUM;

  // High-risk operations
  if (method === "DELETE") return RiskLevel.MEDIUM;
  if (pathname.includes("/admin")) return RiskLevel.MEDIUM;

  // Security-related endpoints
  if (pathname.includes("/api/auth") || pathname.includes("/api/security")) {
    return RiskLevel.MEDIUM;
  }

  // Error responses
  if (statusCode >= 500) return RiskLevel.HIGH;
  if (statusCode >= 400) return RiskLevel.MEDIUM;

  // Default to low risk
  return RiskLevel.LOW;
}

// Audit logging hooks for specific operations
export const auditHooks = {
  // Document operations
  async logDocumentUpload(
    userId: string,
    documentId: string,
    filename: string,
    size: number
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_UPLOADED,
      userId,
      documentId,
      `Uploaded document: ${filename}`,
      { filename, size, type: "upload" }
    );
  },

  async logDocumentDownload(
    userId: string,
    documentId: string,
    filename: string
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_DOWNLOADED,
      userId,
      documentId,
      `Downloaded document: ${filename}`,
      { filename, type: "download" }
    );
  },

  async logDocumentShare(
    userId: string,
    documentId: string,
    sharedWith: string[]
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_SHARED,
      userId,
      documentId,
      `Shared document with ${sharedWith.length} users`,
      { sharedWith: sharedWith.join(","), type: "share" }
    );
  },

  // PDF operations
  async logPDFMerge(userId: string, inputFiles: string[], outputFile: string) {
    await auditLogger.logDocumentOperation(
      AuditEventType.PDF_MERGED,
      userId,
      outputFile,
      `Merged ${inputFiles.length} PDF files`,
      { inputFiles: inputFiles.join(","), outputFile, type: "merge" }
    );
  },

  async logPDFSplit(userId: string, inputFile: string, outputFiles: string[]) {
    await auditLogger.logDocumentOperation(
      AuditEventType.PDF_SPLIT,
      userId,
      inputFile,
      `Split PDF into ${outputFiles.length} files`,
      { inputFile, outputFiles: outputFiles.join(","), type: "split" }
    );
  },

  async logPDFCompress(
    userId: string,
    documentId: string,
    originalSize: number,
    compressedSize: number
  ) {
    const compressionRatio = (
      ((originalSize - compressedSize) / originalSize) *
      100
    ).toFixed(2);
    await auditLogger.logDocumentOperation(
      AuditEventType.PDF_COMPRESSED,
      userId,
      documentId,
      `Compressed PDF by ${compressionRatio}%`,
      { originalSize, compressedSize, compressionRatio, type: "compress" }
    );
  },

  // OCR operations
  async logOCRExtraction(
    userId: string,
    documentId: string,
    extractedTextLength: number,
    confidence: number
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.OCR_PERFORMED,
      userId,
      documentId,
      `Extracted ${extractedTextLength} characters via OCR`,
      { extractedTextLength, confidence, type: "ocr" }
    );
  },

  // Spreadsheet operations
  async logSpreadsheetCreation(
    userId: string,
    spreadsheetId: string,
    name: string
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.SPREADSHEET_CREATED,
      userId,
      spreadsheetId,
      `Created spreadsheet: ${name}`,
      { name, type: "create" }
    );
  },

  async logSpreadsheetEdit(
    userId: string,
    spreadsheetId: string,
    changes: SpreadsheetChanges
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.SPREADSHEET_EDITED,
      userId,
      spreadsheetId,
      "Modified spreadsheet",
      { changes: JSON.stringify(changes), type: "edit" }
    );
  },

  // Security events
  async logUnauthorizedAccess(
    ipAddress: string,
    userAgent: string,
    attemptedResource: string
  ) {
    await auditLogger.logSecurityEvent(
      AuditEventType.UNAUTHORIZED_ACCESS,
      undefined,
      ipAddress,
      `Unauthorized access attempt to ${attemptedResource}`,
      { attemptedResource, userAgent },
      RiskLevel.HIGH
    );
  },

  async logSuspiciousActivity(
    userId: string | undefined,
    ipAddress: string,
    activity: string,
    details: Record<string, unknown>
  ) {
    await auditLogger.logSecurityEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      userId,
      ipAddress,
      `Suspicious activity detected: ${activity}`,
      { activity, ...details },
      RiskLevel.HIGH
    );
  },

  // Authentication events
  async logLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    userId?: string
  ) {
    await auditLogger.logUserLogin(
      userId || "unknown",
      email,
      ipAddress,
      userAgent,
      success
    );
  },

  async logPasswordChange(userId: string, ipAddress: string) {
    await auditLogger.log({
      eventType: AuditEventType.PASSWORD_CHANGED,
      userId,
      ipAddress,
      action: "User changed password",
      details: { type: "password_change" },
      riskLevel: RiskLevel.MEDIUM,
      success: true,
    });
  },

  // Document operations
  async logDocumentCreation(userId: string, documentId: string, title: string) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_UPLOADED,
      userId,
      documentId,
      `Created document: ${title}`,
      { title, type: "create" }
    );
  },

  async logDocumentEdit(
    userId: string,
    documentId: string,
    title: string,
    changes: Record<string, unknown>
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_UPLOADED,
      userId,
      documentId,
      `Edited document: ${title}`,
      { title, changes: JSON.stringify(changes), type: "edit" }
    );
  },

  async logDocumentDelete(userId: string, documentId: string) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_DELETED,
      userId,
      documentId,
      "Deleted document",
      { type: "delete" }
    );
  },

  async logFileUpload(
    userId: string,
    fileId: string,
    filename: string,
    size: number
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_UPLOADED,
      userId,
      fileId,
      `Uploaded file: ${filename}`,
      { filename, size, type: "upload" }
    );
  },

  async logFileDelete(userId: string, fileId: string, filename: string) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_DELETED,
      userId,
      fileId,
      `Deleted file: ${filename}`,
      { filename, type: "delete" }
    );
  },

  async logFileMetadataUpdate(
    userId: string,
    fileId: string,
    oldFilename: string,
    newFilename: string,
    description: string,
    tags: string[]
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_UPLOADED,
      userId,
      fileId,
      `Updated file metadata: ${oldFilename} -> ${newFilename}`,
      {
        oldFilename,
        newFilename,
        description,
        tags: tags ? JSON.stringify(tags) : undefined,
        type: "metadata_update",
      }
    );
  },

  async logDocumentConversion(
    userId: string,
    filename: string,
    outputFormat: string,
    outputFilename: string
  ) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_CONVERTED,
      userId,
      "conversion",
      `Converted ${filename} to ${outputFormat}`,
      { filename, outputFormat, outputFilename, type: "conversion" }
    );
  },

  async logPdfCreate(userId: string, fileId: string, description: string) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_UPLOADED,
      userId,
      fileId,
      `Created PDF: ${description}`,
      { description, type: "pdf_create" }
    );
  },

  async logPdfDelete(userId: string, fileId: string, description: string) {
    await auditLogger.logDocumentOperation(
      AuditEventType.DOCUMENT_DELETED,
      userId,
      fileId,
      `Deleted PDF: ${description}`,
      { description, type: "pdf_delete" }
    );
  },

  // Theme and settings
  async logThemeChange(userId: string, oldTheme: string, newTheme: string) {
    await auditLogger.log({
      eventType: AuditEventType.THEME_CHANGED,
      userId,
      action: `Changed theme from ${oldTheme} to ${newTheme}`,
      details: { oldTheme, newTheme, type: "theme_change" },
      riskLevel: RiskLevel.LOW,
      success: true,
    });
  },

  async logSettingsUpdate(
    userId: string,
    settingType: string,
    changes: Record<string, unknown>
  ) {
    await auditLogger.log({
      eventType: AuditEventType.SETTINGS_UPDATED,
      userId,
      action: `Updated ${settingType} settings`,
      details: {
        settingType,
        changes: JSON.stringify(changes),
        type: "settings_update",
      },
      riskLevel: RiskLevel.LOW,
      success: true,
    });
  },
};

// Export audit logger instance
export { auditLogger };
