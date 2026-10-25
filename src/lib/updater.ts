import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useState, useEffect } from "react";

export type UpdateState =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export interface UpdaterSnapshot {
  state: UpdateState;
  progress: number;
  availableVersion: string | null;
  releaseBody: string | null;
  errorMessage: string | null;
  lastChecked: number | null;
}

class AutoUpdaterService {
  private state: UpdateState = "idle";
  private progress = 0;
  private availableVersion: string | null = null;
  private releaseBody: string | null = null;
  private errorMessage: string | null = null;
  private lastChecked: number | null = null;
  private activeUpdate: Update | null = null;
  private listeners: Set<(snapshot: UpdaterSnapshot) => void> = new Set();
  private isDownloading = false;

  public getSnapshot(): UpdaterSnapshot {
    return {
      state: this.state,
      progress: this.progress,
      availableVersion: this.availableVersion,
      releaseBody: this.releaseBody,
      errorMessage: this.errorMessage,
      lastChecked: this.lastChecked,
    };
  }

  public subscribe(cb: (snapshot: UpdaterSnapshot) => void) {
    this.listeners.add(cb);
    cb(this.getSnapshot());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    for (const l of this.listeners) {
      try {
        l(snap);
      } catch {}
    }
  }

  public async checkForUpdates(isManual = false) {
    if (this.state === "checking" || this.isDownloading) return;

    this.state = "checking";
    this.errorMessage = null;
    this.emit();

    try {
      const update = await check();
      this.lastChecked = Date.now();

      if (update && update.available) {
        this.activeUpdate = update;
        this.availableVersion = update.version;
        this.releaseBody = update.body || null;
        this.state = "available";
        this.emit();

        // Start background download automatically
        await this.downloadUpdate(update);
      } else {
        this.state = "up-to-date";
        this.activeUpdate = null;
        this.availableVersion = null;
        this.releaseBody = null;
        this.emit();

        // Reset to idle after 4 seconds
        setTimeout(() => {
          if (this.state === "up-to-date") {
            this.state = "idle";
            this.emit();
          }
        }, 4000);
      }
    } catch (err: any) {
      console.warn("Update check failed:", err);
      this.state = "error";
      this.errorMessage =
        err?.message || (isManual ? "Failed to connect to update server" : null);
      this.emit();

      setTimeout(() => {
        if (this.state === "error") {
          this.state = "idle";
          this.emit();
        }
      }, 5000);
    }
  }

  public async downloadUpdate(updateToDownload?: Update) {
    const update = updateToDownload || this.activeUpdate;
    if (!update || this.isDownloading) return;

    this.isDownloading = true;
    this.state = "downloading";
    this.progress = 0;
    this.emit();

    let downloaded = 0;
    let contentLength = 0;

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              this.progress = Math.min(100, Math.round((downloaded / contentLength) * 100));
              this.emit();
            }
            break;
          case "Finished":
            this.progress = 100;
            this.state = "ready";
            this.isDownloading = false;
            this.emit();
            break;
        }
      });

      this.state = "ready";
      this.isDownloading = false;
      this.emit();
    } catch (err: any) {
      console.error("Failed to download/install update:", err);
      this.isDownloading = false;
      this.state = "error";
      this.errorMessage = err?.message || "Failed to download update package";
      this.emit();
    }
  }

  public async installAndRelaunch() {
    try {
      await relaunch();
    } catch (err) {
      console.error("Failed to relaunch application:", err);
    }
  }
}

export const autoUpdater = new AutoUpdaterService();

export function useAutoUpdater() {
  const [snapshot, setSnapshot] = useState<UpdaterSnapshot>(autoUpdater.getSnapshot());

  useEffect(() => {
    return autoUpdater.subscribe((snap) => {
      setSnapshot(snap);
    });
  }, []);

  return {
    ...snapshot,
    checkForUpdates: (manual = true) => autoUpdater.checkForUpdates(manual),
    installAndRelaunch: () => autoUpdater.installAndRelaunch(),
  };
}
