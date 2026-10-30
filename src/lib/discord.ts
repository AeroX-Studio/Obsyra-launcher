import { listen } from "@tauri-apps/api/event";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useLauncherStore } from "@/state";

export type DiscordStatus = "connected" | "connecting" | "disconnected" | "disabled";

export interface DiscordConfig {
  enabled: boolean;
  showProfile: boolean;
  showVersion: boolean;
  customDetails: string;
}

const STORAGE_KEY = "obsyra:discord:config";
const DISCORD_CLIENT_ID = "1129482123891724398";
const DEFAULT_CONFIG: DiscordConfig = {
  enabled: true,
  showProfile: true,
  showVersion: true,
  customDetails: "Playing Obsyra Launcher",
};

export function getDiscordConfig(): DiscordConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw), enabled: true };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveDiscordConfig(cfg: DiscordConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error("Failed to save Discord config:", e);
  }
  discordManager.notifyConfigChange(cfg);
}

class DiscordRpcManager {
  private socket: WebSocket | null = null;
  private currentPortIndex = 0;
  private ports = [6463, 6464, 6465, 6466];
  private status: DiscordStatus = "disconnected";
  private listeners: Set<(status: DiscordStatus) => void> = new Set();
  private retryTimer: any = null;
  private currentConfig: DiscordConfig = getDiscordConfig();
  private isGameRunning = false;
  private inGameVersion: string | null = null;
  private gameStartTime: number | null = null;
  private launcherStartTime = Math.floor(Date.now() / 1000);
  private initialized = false;

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    if (!this.currentConfig.enabled) {
      this.setStatus("disabled");
      return;
    }

    this.connect();

    // Listen to game progress lifecycle
    if (isTauri()) listen("launch-progress", (event) => {
      const payload = event.payload as { status: string };
      if (payload.status === "success") {
        this.isGameRunning = true;
        this.gameStartTime = Math.floor(Date.now() / 1000);
        const state = useLauncherStore.getState();
        this.inGameVersion = state.state?.selectedVersionId || null;
        this.updatePresence();
      } else if (payload.status === "finished") {
        this.isGameRunning = false;
        this.inGameVersion = null;
        this.gameStartTime = null;
        this.updatePresence();
      }
    }).catch(() => {});

    // Check if game was already running on launcher startup
    if (isTauri()) invoke<boolean>("is_game_running")
      .then((running) => {
        if (running) {
          this.isGameRunning = true;
          this.gameStartTime = Math.floor(Date.now() / 1000);
          const state = useLauncherStore.getState();
          this.inGameVersion = state.state?.selectedVersionId || null;
          this.updatePresence();
        }
      })
      .catch(() => {});

    // Clean disconnect on window beforeunload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.disconnect();
      });
    }
  }

  public subscribe(cb: (status: DiscordStatus) => void) {
    this.listeners.add(cb);
    cb(this.status);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getStatus(): DiscordStatus {
    return this.status;
  }

  public notifyConfigChange(newConfig: DiscordConfig) {
    this.currentConfig = newConfig;
    if (!newConfig.enabled) {
      this.disconnect();
      this.setStatus("disabled");
    } else {
      if (this.status === "disabled" || this.status === "disconnected") {
        this.connect();
      } else {
        this.updatePresence();
      }
    }
  }

  public refresh() {
    if (this.currentConfig.enabled) {
      this.updatePresence();
    }
  }

  private setStatus(status: DiscordStatus) {
    if (this.status !== status) {
      this.status = status;
      for (const listener of this.listeners) {
        try {
          listener(status);
        } catch {}
      }
    }
  }

  private connect() {
    if (!this.currentConfig.enabled) {
      this.setStatus("disabled");
      return;
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.setStatus("connecting");
    const port = this.ports[this.currentPortIndex];

    try {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/?v=1&client_id=${DISCORD_CLIENT_ID}`);
      this.socket = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.setStatus("connected");
        this.currentPortIndex = 0;
        this.updatePresence();
      };

      ws.onmessage = () => {
        // Discord heartbeat / event responses
      };

      ws.onerror = () => {
        clearTimeout(timeout);
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        if (this.socket === ws) {
          this.socket = null;
        }

        if (this.currentConfig.enabled) {
          // Try next port in range
          this.currentPortIndex = (this.currentPortIndex + 1) % this.ports.length;
          this.setStatus("disconnected");

          // Schedule gentle backoff retry (every 15 seconds if not found)
          if (!this.retryTimer) {
            this.retryTimer = setTimeout(() => {
              this.retryTimer = null;
              this.connect();
            }, 15000);
          }
        }
      };
    } catch {
      this.setStatus("disconnected");
      if (this.currentConfig.enabled && !this.retryTimer) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.connect();
        }, 15000);
      }
    }
  }

  public updatePresence() {
    if (!this.currentConfig.enabled) {
      this.clearPresence();
      return;
    }

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
      return;
    }

    const { state, profiles, versions } = useLauncherStore.getState();
    const selectedProfile = profiles.find((p) => p.id === state?.selectedProfileId);
    const selectedVersion = versions.find((v) => v.id === state?.selectedVersionId);

    let details = this.currentConfig.customDetails || "Obsyra Launcher";
    let statusText = "In Main Menu";

    if (this.isGameRunning) {
      const verId = this.inGameVersion || selectedVersion?.id || "Minecraft";
      details = `Playing Minecraft ${verId}`;
      if (this.currentConfig.showProfile && selectedProfile) {
        statusText = `Player: ${selectedProfile.username}`;
      } else {
        statusText = "In Game";
      }
    } else {
      let parts: string[] = [];
      if (this.currentConfig.showProfile && selectedProfile) {
        parts.push(`Profile: ${selectedProfile.username}`);
      }
      if (this.currentConfig.showVersion && selectedVersion) {
        parts.push(selectedVersion.id);
      }
      if (parts.length > 0) {
        statusText = parts.join(" • ");
      }
    }

    const startTs = this.isGameRunning && this.gameStartTime
      ? this.gameStartTime
      : this.launcherStartTime;

    const payload = {
      cmd: "SET_ACTIVITY",
      args: {
        pid: 1,
        activity: {
          details: details,
          state: statusText,
          timestamps: {
            start: startTs,
          },
          assets: {
            large_image: "obsy_logo",
            large_text: "Obsyra Launcher",
            small_image: this.isGameRunning ? "minecraft" : undefined,
            small_text: this.isGameRunning ? "Minecraft" : "Obsyra Studio by AeroX",
          },
        },
      },
      nonce: String(Date.now()),
    };

    try {
      this.socket.send(JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to send Discord activity payload:", e);
    }
  }

  public clearPresence() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const payload = {
          cmd: "SET_ACTIVITY",
          args: {
            pid: 1,
            activity: null,
          },
          nonce: String(Date.now()),
        };
        this.socket.send(JSON.stringify(payload));
      } catch {}
    }
  }

  public disconnect() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.clearPresence();
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }
}

export const discordManager = new DiscordRpcManager();

import { useState, useEffect } from "react";

export function useDiscordRpc() {
  const [status, setStatus] = useState<DiscordStatus>(discordManager.getStatus());
  const [config, setConfig] = useState<DiscordConfig>(getDiscordConfig());

  useEffect(() => {
    return discordManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  const updateConfig = (newConfig: DiscordConfig) => {
    setConfig(newConfig);
    saveDiscordConfig(newConfig);
  };

  return {
    status,
    config,
    updateConfig,
    refreshPresence: () => discordManager.refresh(),
  };
}
