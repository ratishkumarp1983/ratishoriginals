import { env } from "@/lib/env";
import { LocalStorageAdapter } from "./local";
import { R2StorageAdapter } from "./r2";
import type { StorageAdapter } from "./types";

let instance: StorageAdapter | undefined;

/** The active storage adapter, chosen by STORAGE_DRIVER. Singleton. */
export function storage(): StorageAdapter {
  if (!instance) {
    instance =
      env.STORAGE_DRIVER === "r2"
        ? new R2StorageAdapter()
        : new LocalStorageAdapter();
  }
  return instance;
}

export type { StorageAdapter, SignedUrl } from "./types";
