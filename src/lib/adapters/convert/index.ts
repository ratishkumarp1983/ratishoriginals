import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Document -> PDF conversion adapter (SRS FR-2 "Convert to PDF").
 *
 * - passthrough (default): only PDF is accepted; other types are rejected with
 *   a clear message. Keeps dev dependency-free.
 * - libreoffice: converts DOC/DOCX/TXT/RTF/PPT(X) via the `soffice` CLI when
 *   CONVERT_DRIVER=libreoffice and LibreOffice is installed on the host/image.
 *
 * The reading pipeline is PDF-centric, so everything normalises to PDF here.
 */
export const SUPPORTED_EXTENSIONS = ["pdf", "doc", "docx", "txt", "rtf"] as const;
export type SupportedExt = (typeof SUPPORTED_EXTENSIONS)[number];

export interface ConvertResult {
  pdf: Buffer;
  converted: boolean; // false when the input was already a PDF
}

export interface ConvertAdapter {
  readonly name: string;
  /** Whether this driver can turn `ext` into a PDF. */
  canConvert(ext: string): boolean;
  toPdf(bytes: Buffer, ext: string): Promise<ConvertResult>;
}

class PassthroughConvertAdapter implements ConvertAdapter {
  readonly name = "passthrough";
  canConvert(ext: string): boolean {
    return ext === "pdf";
  }
  async toPdf(bytes: Buffer, ext: string): Promise<ConvertResult> {
    if (ext !== "pdf") {
      throw new ConversionError(
        `This build accepts PDF uploads. To ingest ${ext.toUpperCase()} files, ` +
          `enable the LibreOffice converter (CONVERT_DRIVER=libreoffice).`,
      );
    }
    return { pdf: bytes, converted: false };
  }
}

class LibreOfficeConvertAdapter implements ConvertAdapter {
  readonly name = "libreoffice";
  canConvert(ext: string): boolean {
    return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
  }
  async toPdf(bytes: Buffer, ext: string): Promise<ConvertResult> {
    if (ext === "pdf") return { pdf: bytes, converted: false };

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ro-convert-"));
    try {
      const input = path.join(dir, `${randomUUID()}.${ext}`);
      await fs.writeFile(input, bytes);
      await runSoffice(["--headless", "--convert-to", "pdf", "--outdir", dir, input]);
      const outPath = input.replace(new RegExp(`\\.${ext}$`), ".pdf");
      const pdf = await fs.readFile(outPath);
      return { pdf, converted: true };
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
}

function runSoffice(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = process.env.SOFFICE_BIN || "soffice";
    const child = spawn(bin, args, { stdio: "ignore" });
    child.on("error", (e) =>
      reject(new ConversionError(`LibreOffice not available: ${e.message}`)),
    );
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new ConversionError(`LibreOffice exited with code ${code}`)),
    );
  });
}

export class ConversionError extends Error {}

let instance: ConvertAdapter | undefined;

export function converter(): ConvertAdapter {
  if (!instance) {
    instance =
      process.env.CONVERT_DRIVER === "libreoffice"
        ? new LibreOfficeConvertAdapter()
        : new PassthroughConvertAdapter();
  }
  return instance;
}
