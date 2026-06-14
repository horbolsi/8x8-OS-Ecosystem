/**
 * Cloudflare R2 Storage Adapter
 * S3-compatible object storage for 8x8 Hub
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "application/json",
  "application/xml",
  "text/csv",
  "application/zip",
  "application/x-tar",
  "application/gzip",
]);

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

export class R2Storage {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(config: R2Config) {
    // R2 uses S3-compatible API
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucketName = config.bucketName;
    this.publicUrl = config.publicUrl;
  }

  /**
   * Validate file type based on MIME type
   */
  validateFileType(contentType: string): boolean {
    return ALLOWED_MIME_TYPES.has(contentType);
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number): boolean {
    return size <= MAX_FILE_SIZE;
  }

  /**
   * Generate a unique key for the file
   */
  generateKey(
    originalName: string,
    folder: string = "uploads"
  ): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `${folder}/${timestamp}-${randomStr}-${sanitizedName}`;
  }

  /**
   * Upload a file to R2
   */
  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    // Validate file type
    if (!this.validateFileType(contentType)) {
      throw new Error(
        `File type ${contentType} is not allowed. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`
      );
    }

    // Validate file size
    if (!this.validateFileSize(buffer.length)) {
      throw new Error(
        `File size ${buffer.length} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
      );
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.client.send(command);

    return {
      key,
      url: `${this.publicUrl}/${key}`,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Upload from a file path
   */
  async uploadFile(
    filePath: string,
    folder: string = "uploads"
  ): Promise<UploadResult> {
    const fs = await import("fs/promises");
    const path = await import("path");
    
    const buffer = await fs.readFile(filePath);
    const originalName = path.basename(filePath);
    const contentType = this.getContentType(filePath);
    const key = this.generateKey(originalName, folder);

    return this.upload(buffer, key, contentType);
  }

  /**
   * Download a file from R2
   */
  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);
    const stream = response.Body;

    if (!stream) {
      throw new Error("Empty response body");
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Get a presigned URL for downloading
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get a presigned URL for uploading
   */
  async getUploadPresignedUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileInfo | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(
    folder: string = "",
    maxKeys: number = 100
  ): Promise<FileInfo[]> {
    const prefix = folder ? `${folder}/` : "";

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await this.client.send(command);
    const files: FileInfo[] = [];

    for (const item of response.Contents || []) {
      if (item.Key && item.Key !== prefix) {
        files.push({
          key: item.Key,
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
          contentType: "application/octet-stream",
        });
      }
    }

    return files;
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      txt: "text/plain",
      json: "application/json",
      xml: "application/xml",
      csv: "text/csv",
      zip: "application/zip",
      tar: "application/x-tar",
      gz: "application/gzip",
    };
    return mimeTypes[ext || ""] || "application/octet-stream";
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}

/**
 * Create R2 storage instance from environment variables
 */
export function createR2Storage(): R2Storage | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    console.warn("R2 storage not configured. Missing environment variables:");
    if (!accountId) console.warn("  - R2_ACCOUNT_ID");
    if (!accessKeyId) console.warn("  - R2_ACCESS_KEY_ID");
    if (!secretAccessKey) console.warn("  - R2_SECRET_ACCESS_KEY");
    if (!bucketName) console.warn("  - R2_BUCKET_NAME");
    if (!publicUrl) console.warn("  - R2_PUBLIC_URL");
    return null;
  }

  return new R2Storage({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  });
}

// Singleton instance
let r2StorageInstance: R2Storage | null = null;

export function getR2Storage(): R2Storage | null {
  if (!r2StorageInstance) {
    r2StorageInstance = createR2Storage();
  }
  return r2StorageInstance;
}
