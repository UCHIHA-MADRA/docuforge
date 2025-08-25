import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import {
  EncryptedData,
  encryptFile,
  decryptFile,
  createEncryptedDocument,
  decryptDocument,
  generateDocumentKey,
  secureWipe,
} from "./encryption";
import { prisma } from "./prisma";

// Storage configuration
const STORAGE_BASE_PATH =
  process.env.ENCRYPTED_STORAGE_PATH || "./storage/encrypted";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export interface FileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedBy: string;
  uploadedAt: Date;
  tags?: string[];
  description?: string;
}

export interface EncryptedFileRecord {
  id: string;
  userId: string;
  encryptedPath: string;
  encryptedMetadata: EncryptedData;
  checksum: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt?: Date;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  userFiles: number;
  userSize: number;
  availableSpace: number;
}

/**
 * Initialize encrypted storage directory
 */
export async function initializeStorage(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_BASE_PATH, { recursive: true });

    // Create subdirectories for organization
    const subdirs = ["documents", "images", "temp", "backups"];
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(STORAGE_BASE_PATH, subdir), { recursive: true });
    }
  } catch (error) {
    throw new Error(
      `Failed to initialize storage: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validate file before encryption
 */
export function validateFile(file: {
  size: number;
  type: string;
  name: string;
}): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${
        MAX_FILE_SIZE / (1024 * 1024)
      }MB`
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }

  // Check for potentially dangerous file extensions
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".pif",
    ".com",
    ".jar",
  ];
  const fileExtension = path.extname(file.name).toLowerCase();

  if (dangerousExtensions.includes(fileExtension)) {
    throw new Error(
      `File extension ${fileExtension} is not allowed for security reasons`
    );
  }
}

/**
 * Generate secure file path
 */
function generateSecureFilePath(
  userId: string,
  fileId: string,
  category: string = "documents"
): string {
  const userHash = crypto
    .createHash("sha256")
    .update(userId)
    .digest("hex")
    .substring(0, 8);
  const fileHash = crypto
    .createHash("sha256")
    .update(fileId)
    .digest("hex")
    .substring(0, 16);

  return path.join(STORAGE_BASE_PATH, category, userHash, `${fileHash}.enc`);
}

/**
 * Calculate file checksum
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Store encrypted file
 */
export async function storeEncryptedFile(
  fileBuffer: Buffer,
  metadata: FileMetadata,
  userId: string,
  userKey: string
): Promise<EncryptedFileRecord> {
  try {
    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size`);
    }

    // Calculate checksum
    const checksum = calculateChecksum(fileBuffer);

    // Generate encryption key for this file
    const fileKey = generateDocumentKey(metadata.id, userKey);

    // Encrypt file content
    const encryptedFile = encryptFile(fileBuffer, fileKey, true);

    // Encrypt metadata
    const encryptedMetadata = createEncryptedDocument(
      metadata.id,
      JSON.stringify(metadata),
      { type: "file_metadata" },
      userKey
    ).encryptedMetadata;

    // Generate secure storage path
    const category = metadata.mimeType.startsWith("image/")
      ? "images"
      : "documents";
    const encryptedPath = generateSecureFilePath(userId, metadata.id, category);

    // Ensure directory exists
    await fs.mkdir(path.dirname(encryptedPath), { recursive: true });

    // Write encrypted file to disk
    const fileData = JSON.stringify(encryptedFile);
    await fs.writeFile(encryptedPath, fileData, "utf8");

    // Create database record
    const fileRecord = await prisma.file.create({
      data: {
        id: metadata.id,
        userId,
        name: metadata.originalName,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        path: encryptedPath,
        uploadedBy: userId,
        // Store checksum and encrypted metadata in available fields
        checksum: checksum,
        encryptedMetadata: JSON.stringify(encryptedMetadata),
        processingStatus: "COMPLETED",
      },
    });

    // Securely wipe the original buffer
    secureWipe(fileBuffer);

    return {
      id: fileRecord.id,
      userId: fileRecord.userId,
      encryptedPath: fileRecord.path,
      encryptedMetadata,
      checksum: checksum,
      size: Number(fileRecord.size),
      createdAt: fileRecord.uploadedAt,
      updatedAt: fileRecord.uploadedAt,
      accessCount: 0,
      lastAccessedAt: undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to store encrypted file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Retrieve and decrypt file
 */
export async function retrieveEncryptedFile(
  fileId: string,
  userId: string,
  userKey: string
): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
  try {
    // Get file record from database
    const fileRecord = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!fileRecord) {
      throw new Error("File not found or access denied");
    }

    // Read encrypted file from disk
    const encryptedFileData = await fs.readFile(fileRecord.path, "utf8");
    const encryptedFile: EncryptedData = JSON.parse(encryptedFileData);

    // Decrypt file content
    const fileKey = generateDocumentKey(fileId, userKey);
    const decryptedBuffer = decryptFile(encryptedFile, undefined, fileKey.key);

    // Extract checksum and encrypted metadata from description field
    let checksum: string;
    let encryptedMetadata: EncryptedData;

    try {
      const storedData = JSON.parse(fileRecord.encryptedMetadata || "{}");
      checksum = storedData.checksum;
      encryptedMetadata = JSON.parse(storedData.encryptedMetadata);
    } catch {
      // Fallback if description parsing fails
      checksum = crypto
        .createHash("sha256")
        .update(decryptedBuffer)
        .digest("hex");
      encryptedMetadata = createEncryptedDocument(
        fileId,
        JSON.stringify({
          id: fileId,
          originalName: fileRecord.originalName,
          mimeType: fileRecord.mimeType,
          size: fileRecord.size,
          uploadedBy: fileRecord.uploadedBy,
          uploadedAt: fileRecord.uploadedAt,
        }),
        { type: "file_metadata" },
        userKey
      ).encryptedMetadata;
    }

    // Verify checksum
    const calculatedChecksum = calculateChecksum(decryptedBuffer);
    if (calculatedChecksum !== checksum) {
      throw new Error(
        "File integrity check failed - possible corruption or tampering"
      );
    }

    // Decrypt metadata
    const metadataJson = decryptDocument(
      {
        id: fileId,
        encryptedContent: encryptedFile,
        encryptedMetadata,
        createdAt: fileRecord.uploadedAt,
        updatedAt: fileRecord.uploadedAt,
      },
      userKey
    ).metadata;

    // Update access tracking
    await prisma.file.update({
      where: { id: fileId },
      data: {
        lastAccessed: new Date(),
      },
    });

    return {
      buffer: decryptedBuffer,
      metadata: typeof metadataJson === 'string' 
        ? JSON.parse(metadataJson || "{}") as unknown as FileMetadata
        : metadataJson as unknown as FileMetadata,
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve encrypted file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Delete encrypted file
 */
export async function deleteEncryptedFile(
  fileId: string,
  userId: string
): Promise<void> {
  try {
    // Get file record from database
    const fileRecord = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!fileRecord) {
      throw new Error("File not found or access denied");
    }

    // Delete file from disk
    try {
      await fs.unlink(fileRecord.path);
    } catch (deleteError) {
      // File might already be deleted, log but don't fail
      console.warn(
        `Could not delete file from disk: ${fileRecord.path}`,
        deleteError
      );
    }

    // Delete database record
    await prisma.file.delete({
      where: { id: fileId },
    });
  } catch (error) {
    throw new Error(
      `Failed to delete encrypted file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * List user's encrypted files
 */
export async function listUserFiles(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    mimeType?: string;
    search?: string;
  } = {}
): Promise<{
  files: EncryptedFileRecord[];
  total: number;
  page: number;
  limit: number;
}> {
  const { page = 1, limit = 20, mimeType, search } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (mimeType) {
    where.mimeType = mimeType;
  }

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      skip,
      take: limit,
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.file.count({ where }),
  ]);

  const fileRecords: EncryptedFileRecord[] = files.map((file) => {
    // Parse stored metadata
    let storedData: { checksum?: string; encryptedMetadata?: string } = {};
    try {
      storedData = JSON.parse(file.encryptedMetadata || "{}");
    } catch {
      // Ignore parsing errors
    }

    return {
      id: file.id,
      userId: file.userId,
      encryptedPath: file.path,
      encryptedMetadata: storedData.encryptedMetadata
        ? JSON.parse(storedData.encryptedMetadata)
        : ({} as EncryptedData),
      checksum: storedData.checksum || "",
      size: Number(file.size),
      createdAt: file.uploadedAt,
      updatedAt: file.uploadedAt,
      accessCount: 0, // TODO: Implement access tracking
      lastAccessedAt: file.lastAccessed || undefined,
    };
  });

  return { files: fileRecords, total, page, limit };
}

/**
 * Get storage statistics
 */
export async function getStorageStats(userId?: string): Promise<StorageStats> {
  const [totalStats, userStats] = await Promise.all([
    prisma.file.aggregate({
      _count: { id: true },
      _sum: { size: true },
    }),
    userId
      ? prisma.file.aggregate({
          where: { userId },
          _count: { id: true },
          _sum: { size: true },
        })
      : null,
  ]);

  return {
    totalFiles: totalStats._count.id,
    totalSize: Number(totalStats._sum.size) || 0,
    userFiles: userStats?._count.id || 0,
    userSize: Number(userStats?._sum.size) || 0,
    availableSpace: MAX_FILE_SIZE * 1000, // Placeholder - implement actual quota system
  };
}

/**
 * Cleanup orphaned files (files in storage but not in database)
 */
export async function cleanupOrphanedFiles(): Promise<{
  cleaned: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let cleaned = 0;

  try {
    // Get all files from database
    const dbFiles = await prisma.file.findMany({
      select: { path: true },
    });

    const dbFilePaths = new Set(dbFiles.map((f) => f.path));

    // Scan storage directories
    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith(".enc")) {
            if (!dbFilePaths.has(fullPath)) {
              try {
                await fs.unlink(fullPath);
                cleaned++;
              } catch (unlinkError) {
                errors.push(`Failed to delete ${fullPath}: ${unlinkError}`);
              }
            }
          }
        }
      } catch (scanError) {
        errors.push(`Failed to scan directory ${dir}: ${scanError}`);
      }
    };

    await scanDirectory(STORAGE_BASE_PATH);
  } catch (error) {
    errors.push(`Cleanup failed: ${error}`);
  }

  return { cleaned, errors };
}

/**
 * Create encrypted backup of user's files
 */
export async function createEncryptedBackup(
  userId: string,
  userKey: string,
  backupPassword: string
): Promise<string> {
  try {
    const userFiles = await listUserFiles(userId, { limit: 1000 });
    const backupData: Array<{
      id: string;
      metadata: FileMetadata;
      content: string;
      checksum: string;
    }> = [];

    for (const fileRecord of userFiles.files) {
      try {
        const { buffer, metadata } = await retrieveEncryptedFile(
          fileRecord.id,
          userId,
          userKey
        );

        backupData.push({
          id: fileRecord.id,
          metadata,
          content: buffer.toString("base64"),
          checksum: fileRecord.checksum,
        });
      } catch (backupError) {
        console.warn(`Failed to backup file ${fileRecord.id}:`, backupError);
      }
    }

    // Encrypt backup data
    const backupJson = JSON.stringify({
      userId,
      createdAt: new Date().toISOString(),
      files: backupData,
    });

    const backupKey = generateDocumentKey(
      `backup-${userId}-${Date.now()}`,
      backupPassword
    );
    const encryptedBackup = encryptFile(
      Buffer.from(backupJson),
      backupKey,
      true
    );

    // Save backup to disk
    const backupPath = path.join(
      STORAGE_BASE_PATH,
      "backups",
      `${userId}-${Date.now()}.backup`
    );
    await fs.writeFile(backupPath, JSON.stringify(encryptedBackup));

    return backupPath;
  } catch (error) {
    throw new Error(
      `Failed to create backup: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
