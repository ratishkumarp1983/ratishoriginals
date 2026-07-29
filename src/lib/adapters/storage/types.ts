/**
 * Storage adapter contract.
 *
 * The rest of the app only ever holds opaque `key`s (e.g. the value stored in
 * Document.storagePath). Original object URLs are NEVER handed to clients - a
 * caller that needs to serve bytes asks for a short-lived signed URL, or reads
 * the bytes server-side. This is what keeps original documents unexposed
 * (SRS §8 "Never expose storage URLs").
 */
export interface SignedUrl {
  url: string;
  expiresAt: number; // epoch ms
}

export interface StorageAdapter {
  readonly name: string;

  /** Store bytes under `key`, returning the same key. Overwrites if present. */
  put(key: string, data: Buffer, contentType?: string): Promise<string>;

  /** Read the full object bytes (server-side only). */
  get(key: string): Promise<Buffer>;

  /** Whether an object exists. */
  exists(key: string): Promise<boolean>;

  /** Delete an object (idempotent). */
  delete(key: string): Promise<void>;

  /**
   * A time-limited URL a browser can fetch. For the local driver this points
   * at an authenticated app route that itself checks entitlements; for R2 it
   * is an S3 presigned GET. TTL defaults to STORAGE_SIGNED_URL_TTL seconds.
   */
  signedUrl(key: string, ttlSeconds?: number): Promise<SignedUrl>;
}
