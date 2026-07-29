import net from "node:net";
import { env } from "@/lib/env";

/**
 * Virus-scan adapter. The upload pipeline calls `scan()` before a file is
 * accepted (SRS FR-2 workflow: Upload -> Validation -> Virus Scan -> ...).
 *
 * - stub   (dev): trusts size/extension checks done by the caller; always clean.
 * - clamav (prod): streams bytes to a ClamAV daemon over TCP (INSTREAM).
 */
export interface ScanResult {
  clean: boolean;
  reason?: string;
}

export interface ScanAdapter {
  readonly name: string;
  scan(data: Buffer): Promise<ScanResult>;
}

class StubScanAdapter implements ScanAdapter {
  readonly name = "stub";
  async scan(): Promise<ScanResult> {
    return { clean: true };
  }
}

class ClamAvScanAdapter implements ScanAdapter {
  readonly name = "clamav";
  async scan(data: Buffer): Promise<ScanResult> {
    return new Promise((resolve) => {
      const socket = net.createConnection(
        { host: env.CLAMAV_HOST, port: env.CLAMAV_PORT },
        () => {
          socket.write("zINSTREAM\0");
          const size = Buffer.alloc(4);
          size.writeUInt32BE(data.length, 0);
          socket.write(size);
          socket.write(data);
          socket.write(Buffer.from([0, 0, 0, 0])); // zero-length chunk = end
        },
      );
      let reply = "";
      socket.on("data", (d) => (reply += d.toString()));
      socket.on("end", () => {
        const clean = reply.includes("OK") && !reply.includes("FOUND");
        resolve({
          clean,
          reason: clean ? undefined : reply.trim(),
        });
      });
      socket.on("error", (e) =>
        resolve({ clean: false, reason: `scanner error: ${e.message}` }),
      );
    });
  }
}

let instance: ScanAdapter | undefined;

export function scanner(): ScanAdapter {
  if (!instance) {
    instance =
      env.SCAN_DRIVER === "clamav"
        ? new ClamAvScanAdapter()
        : new StubScanAdapter();
  }
  return instance;
}
