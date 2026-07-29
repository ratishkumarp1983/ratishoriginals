import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import type { SignedUrl, StorageAdapter } from "./types";

/**
 * Cloudflare R2 (S3-compatible) storage for production. Selected when
 * STORAGE_DRIVER=r2. Signed URLs are true S3 presigned GETs with a short TTL.
 * Entitlement is still enforced before we hand any signed URL to a client.
 */
export class R2StorageAdapter implements StorageAdapter {
  readonly name = "r2";
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!env.R2_ENDPOINT || !env.R2_BUCKET) {
      throw new Error("STORAGE_DRIVER=r2 requires R2_ENDPOINT and R2_BUCKET");
    }
    this.bucket = env.R2_BUCKET;
    this.client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async put(key: string, data: Buffer, contentType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async signedUrl(
    key: string,
    ttlSeconds = env.STORAGE_SIGNED_URL_TTL,
  ): Promise<SignedUrl> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
    return { url, expiresAt: Date.now() + ttlSeconds * 1000 };
  }
}
