import crypto from "crypto";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Key derivation configuration
const PBKDF2_ITERATIONS = 100000;
const SCRYPT_OPTIONS = {
  N: 16384, // CPU/memory cost parameter
  r: 8, // Block size parameter
  p: 1, // Parallelization parameter
  maxmem: 32 * 1024 * 1024, // 32MB max memory
};

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
  salt: string; // Base64 encoded salt (for key derivation)
  algorithm: string;
  keyDerivation: "pbkdf2" | "scrypt";
}

export interface EncryptionKey {
  key: Buffer;
  salt: Buffer;
}

/**
 * Generate a cryptographically secure random key
 */
export function generateEncryptionKey(): EncryptionKey {
  const key = crypto.randomBytes(KEY_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  return { key, salt };
}

/**
 * Derive an encryption key from a password using PBKDF2
 */
export function deriveKeyFromPassword(
  password: string,
  salt?: Buffer
): EncryptionKey {
  const keySalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(
    password,
    keySalt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );
  return { key, salt: keySalt };
}

/**
 * Derive an encryption key from a password using scrypt (more secure but slower)
 */
export function deriveKeyFromPasswordScrypt(
  password: string,
  salt?: Buffer
): EncryptionKey {
  const keySalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = crypto.scryptSync(password, keySalt, KEY_LENGTH, SCRYPT_OPTIONS);
  return { key, salt: keySalt };
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(
  data: string | Buffer,
  encryptionKey: EncryptionKey,
  useScrypt = false
): EncryptedData {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey.key, iv);

    let encrypted = Buffer.isBuffer(data)
      ? cipher.update(data).toString("base64")
      : cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");

    const tag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      salt: encryptionKey.salt.toString("base64"),
      algorithm: ALGORITHM,
      keyDerivation: useScrypt ? "scrypt" : "pbkdf2",
    };
  } catch (error) {
    throw new Error(
      `Encryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(
  encryptedData: EncryptedData,
  password?: string,
  key?: Buffer
): string {
  try {
    let decryptionKey: Buffer;

    if (key) {
      decryptionKey = key;
    } else if (password) {
      const salt = Buffer.from(encryptedData.salt, "base64");
      if (encryptedData.keyDerivation === "scrypt") {
        decryptionKey = crypto.scryptSync(
          password,
          salt,
          KEY_LENGTH,
          SCRYPT_OPTIONS
        );
      } else {
        decryptionKey = crypto.pbkdf2Sync(
          password,
          salt,
          PBKDF2_ITERATIONS,
          KEY_LENGTH,
          "sha256"
        );
      }
    } else {
      throw new Error("Either password or key must be provided for decryption");
    }

    const iv = Buffer.from(encryptedData.iv, "base64");
    const tag = Buffer.from(encryptedData.tag, "base64");

    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      decryptionKey,
      iv
    );
    (decipher as any).setAuthTag(tag);

    let decrypted = decipher.update(encryptedData.data, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Encrypt a file buffer
 */
export function encryptFile(
  fileBuffer: Buffer,
  encryptionKey: EncryptionKey,
  useScrypt = false
): EncryptedData {
  return encryptData(fileBuffer, encryptionKey, useScrypt);
}

/**
 * Decrypt a file and return buffer
 */
export function decryptFile(
  encryptedData: EncryptedData,
  password?: string,
  key?: Buffer
): Buffer {
  const decryptedString = decryptData(encryptedData, password, key);
  return Buffer.from(decryptedString, "binary");
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length = 32): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
}

/**
 * Hash a password for storage (not for encryption keys)
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );

  return {
    hash: hash.toString("base64"),
    salt: salt.toString("base64"),
  };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(
  password: string,
  hash: string,
  salt: string
): boolean {
  try {
    const saltBuffer = Buffer.from(salt, "base64");
    const hashBuffer = Buffer.from(hash, "base64");
    const computedHash = crypto.pbkdf2Sync(
      password,
      saltBuffer,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      "sha256"
    );

    return crypto.timingSafeEqual(hashBuffer, computedHash);
  } catch (error) {
    return false;
  }
}

/**
 * Create a digital signature for data integrity
 */
export function signData(data: string | Buffer, privateKey: string): string {
  try {
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(data);
    return sign.sign(privateKey, "base64");
  } catch (error) {
    throw new Error(
      `Signing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Verify a digital signature
 */
export function verifySignature(
  data: string | Buffer,
  signature: string,
  publicKey: string
): boolean {
  try {
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(data);
    return verify.verify(publicKey, signature, "base64");
  } catch (error) {
    return false;
  }
}

/**
 * Generate RSA key pair for digital signatures
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { publicKey, privateKey };
}

/**
 * Encrypt data for transmission (includes metadata)
 */
export function encryptForTransmission(
  data: string | Buffer | object,
  password: string
): string {
  const jsonData = JSON.stringify(data);
  const encryptionKey = deriveKeyFromPasswordScrypt(password);
  const encrypted = encryptData(jsonData, encryptionKey, true);

  return Buffer.from(JSON.stringify(encrypted)).toString("base64");
}

/**
 * Decrypt data received from transmission
 */
export function decryptFromTransmission<T>(
  encryptedPayload: string,
  password: string
): T {
  const encryptedData: EncryptedData = JSON.parse(
    Buffer.from(encryptedPayload, "base64").toString()
  );
  const decryptedJson = decryptData(encryptedData, password);

  return JSON.parse(decryptedJson);
}

/**
 * Utility function to securely wipe sensitive data from memory
 */
export function secureWipe(buffer: Buffer): void {
  if (buffer && Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  }
}

/**
 * Generate a unique encryption key for each document
 */
export function generateDocumentKey(
  documentId: string,
  userKey: string
): EncryptionKey {
  const combinedKey = `${documentId}:${userKey}`;
  const salt = crypto.createHash("sha256").update(documentId).digest();
  const key = crypto.pbkdf2Sync(
    combinedKey,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );

  return { key, salt };
}

/**
 * Encrypt document metadata separately from content
 */
export interface EncryptedDocument {
  id: string;
  encryptedContent: EncryptedData;
  encryptedMetadata: EncryptedData;
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create an encrypted document with separate content and metadata encryption
 */
export function createEncryptedDocument(
  documentId: string,
  content: string | Buffer,
  metadata: Record<string, unknown>,
  userKey: string,
  privateKey?: string
): EncryptedDocument {
  const documentKey = generateDocumentKey(documentId, userKey);

  const encryptedContent = encryptData(content, documentKey, true);
  const encryptedMetadata = encryptData(
    JSON.stringify(metadata),
    documentKey,
    true
  );

  const document: EncryptedDocument = {
    id: documentId,
    encryptedContent,
    encryptedMetadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Add digital signature if private key is provided
  if (privateKey) {
    const dataToSign = JSON.stringify({
      id: documentId,
      contentHash: crypto
        .createHash("sha256")
        .update(encryptedContent.data)
        .digest("hex"),
      metadataHash: crypto
        .createHash("sha256")
        .update(encryptedMetadata.data)
        .digest("hex"),
    });
    document.signature = signData(dataToSign, privateKey);
  }

  return document;
}

/**
 * Decrypt an encrypted document
 */
export function decryptDocument(
  encryptedDocument: EncryptedDocument,
  userKey: string,
  publicKey?: string
): {
  content: string | Buffer;
  metadata: { [key: string]: unknown };
  verified: boolean;
} {
  // Verify signature if public key is provided
  let verified = false;
  if (publicKey && encryptedDocument.signature) {
    const dataToVerify = JSON.stringify({
      id: encryptedDocument.id,
      contentHash: crypto
        .createHash("sha256")
        .update(encryptedDocument.encryptedContent.data)
        .digest("hex"),
      metadataHash: crypto
        .createHash("sha256")
        .update(encryptedDocument.encryptedMetadata.data)
        .digest("hex"),
    });
    verified = verifySignature(
      dataToVerify,
      encryptedDocument.signature,
      publicKey
    );
  }

  const documentKey = generateDocumentKey(encryptedDocument.id, userKey);

  const content = decryptData(
    encryptedDocument.encryptedContent,
    undefined,
    documentKey.key
  );
  const metadataJson = decryptData(
    encryptedDocument.encryptedMetadata,
    undefined,
    documentKey.key
  );
  const metadata = JSON.parse(metadataJson);

  return { content, metadata, verified };
}
