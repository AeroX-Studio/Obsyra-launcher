import { listen } from "@tauri-apps/api/event";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useLauncherStore } from "@/state";
import { useState, useEffect } from "react";

export type DiscordStatus = "connected" | "connecting" | "disconnected" | "disabled";

export type DiscordActivityMode = "auto" | "competitive" | "survival" | "modded";

export interface DiscordConfig {
  enabled: boolean;
  showProfile: boolean;
  showVersion: boolean;
  showFpsBooster: boolean;
  showTimer: boolean;
  autoRotateStatus: boolean;
  activityMode: DiscordActivityMode;
  customDetails?: string;
}

export const LAUNCHER_AUTO_ROTATING_LINES = [
  "In Launcher • Ready to Play",
  "⚡ 500+ FPS Booster • Discrete GPU",
  "High Performance GC • Zero Stutter",
  "Obsyra Client • Ready for Action",
];

export interface DiscordStatusPreset {
  id: DiscordActivityMode;
  title: string;
  badge: string;
  desc: string;
  previewDetails: string;
  previewState: string;
}

export const AUTO_STATUS_PRESETS: DiscordStatusPreset[] = [
  {
    id: "auto",
    title: "Auto-Adaptive Dynamic",
    badge: "Recommended",
    desc: "Intelligently auto-rotates and adapts based on whether you are configuring settings, selecting releases, or in-game",
    previewDetails: "In Launcher • Ready to Play",
    previewState: "⚡ 500+ FPS Engine • Ready",
  },
  {
    id: "competitive",
    title: "Competitive PvP (500+ FPS)",
    badge: "Max Frame Ceiling",
    desc: "Low-latency frame ceiling with zero GC micro-stutters and dedicated high-performance pipeline",
    previewDetails: "Competitive PvP • Low Latency",
    previewState: "⚡ 500+ FPS • 0ms GC Overhead",
  },
  {
    id: "survival",
    title: "Hardcore Survival & Exploration",
    badge: "Adventure",
    desc: "Long-session stability with continuous frametime smoothing and memory pre-touch",
    previewDetails: "Surviving the Wilderness",
    previewState: "🌲 Infinite World • Smooth 144Hz+",
  },
  {
    id: "modded",
    title: "Heavy Modpack & Shaders",
    badge: "Aikar's GC",
    desc: "Aikar's G1GC optimization with 32MB heap regions configured for 200+ mod instances",
    previewDetails: "Heavy Modpack Performance",
    previewState: "🚀 Optimized GC • Discrete GPU",
  },
];

const STORAGE_KEY = "obsyra:discord:config";
const DISCORD_CLIENT_ID = "1129482123891724398";

export const DEFAULT_CONFIG: DiscordConfig = {
  enabled: true,
  showProfile: true,
  showVersion: true,
  showFpsBooster: true,
  showTimer: true,
  autoRotateStatus: true,
  activityMode: "auto",
};

export function getDiscordConfig(): DiscordConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      enabled: parsed.enabled ?? true,
      activityMode: parsed.activityMode || "auto",
      autoRotateStatus: parsed.autoRotateStatus ?? true,
      showFpsBooster: parsed.showFpsBooster ?? true,
      showTimer: parsed.showTimer ?? true,
      showProfile: parsed.showProfile ?? true,
      showVersion: parsed.showVersion ?? true,
    };
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

export function computePresencePayload(
  config: DiscordConfig,
  isGameRunning: boolean,
  inGameVersion: string | null,
  selectedProfileName: string,
  selectedVersionId: string,
  rotationIndex: number = 0,
) {
  const verId = inGameVersion || selectedVersionId || "1.21.4";
  const mode = config.activityMode || "auto";

  let details = "Obsyra Launcher";
  let statusText = "In Launcher";

  if (isGameRunning) {
    switch (mode) {
      case "competitive":
        details = `Competitive PvP • Minecraft ${verId}`;
        statusText = config.showFpsBooster
          ? "⚡ 500+ FPS • Ultra Low Latency"
          : "Competitive PvP Match";
        break;
      case "survival":
        details = `Surviving the Wilderness • ${verId}`;
        statusText = "🌲 Hardcore Adventure • Smooth 144Hz+";
        break;
      case "modded":
        details = `Playing Heavy Modpack • ${verId}`;
        statusText = "🚀 Optimized GC • Aikar's Tuning";
        break;
      case "auto":
      default:
        details = `Playing Minecraft ${verId}`;
        const parts: string[] = [];
        if (config.showProfile && selectedProfileName) {
          parts.push(selectedProfileName);
        }
        if (config.showFpsBooster) {
          parts.push("⚡ 500+ FPS Engine");
        } else if (config.showVersion) {
          parts.push(verId);
        }
        statusText = parts.length > 0 ? parts.join(" • ") : "Playing Minecraft";
        break;
    }
  } else {
    switch (mode) {
      case "competitive":
        details = "Practicing PvP • Obsyra Client";
        statusText = "⚡ 500+ FPS • Competitive Ready";
        break;
      case "survival":
        details = "Preparing Survival World";
        statusText = "🌲 Hardcore Expedition Ready";
        break;
      case "modded":
        details = "Configuring Modpacks & Addons";
        statusText = "🚀 Aikar's GC & Memory Tuned";
        break;
      case "auto":
      default:
        if (config.autoRotateStatus) {
          details =
            LAUNCHER_AUTO_ROTATING_LINES[
              rotationIndex % LAUNCHER_AUTO_ROTATING_LINES.length
            ];
        } else {
          details = "In Launcher • Ready to Play";
        }
        const launcherParts: string[] = [];
        if (config.showProfile && selectedProfileName) {
          launcherParts.push(`Player: ${selectedProfileName}`);
        }
        if (config.showVersion && selectedVersionId) {
          launcherParts.push(selectedVersionId);
        }
        if (config.showFpsBooster) {
          launcherParts.push("⚡ 500+ FPS Ready");
        }
        statusText =
          launcherParts.length > 0 ? launcherParts.join(" • ") : "Obsyra v1.0.0";
        break;
    }
  }

  return {
    details,
    state: statusText,
    verId,
  };
}

class DiscordRpcManager {
  private socket: WebSocket | null = null;
  private currentPortIndex = 0;
  private ports = [6463, 6464, 6465, 6466];
  private status: DiscordStatus = "disconnected";
  private listeners: Set<(status: DiscordStatus) => void> = new Set();
  private retryTimer: any = null;
  private rotationTimer: any = null;
  private rotationIndex = 0;
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

    this.startRotation();
    this.connect();

    // Listen to game progress lifecycle
    if (isTauri()) {
      listen("launch-progress", (event) => {
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
    }

    // Check if game was already running on launcher startup
    if (isTauri()) {
      invoke<boolean>("is_game_running")
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
    }

    // Clean disconnect on window beforeunload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.disconnect();
      });
    }
  }

  private startRotation() {
    this.stopRotation();
    this.rotationTimer = setInterval(() => {
      if (
        this.currentConfig.enabled &&
        this.currentConfig.autoRotateStatus &&
        this.currentConfig.activityMode === "auto" &&
        !this.isGameRunning &&
        this.socket &&
        this.socket.readyState === WebSocket.OPEN
      ) {
        this.rotationIndex = (this.rotationIndex + 1) % LAUNCHER_AUTO_ROTATING_LINES.length;
        this.updatePresence();
      }
    }, 25000);
  }

  private stopRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
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
      this.stopRotation();
      this.disconnect();
      this.setStatus("disabled");
    } else {
      if (newConfig.autoRotateStatus && newConfig.activityMode === "auto") {
        this.startRotation();
      } else {
        this.stopRotation();
      }

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
          this.currentPortIndex = (this.currentPortIndex + 1) % this.ports.length;
          this.setStatus("disconnected");

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
    const profileName = selectedProfile ? selectedProfile.username : "Player";
    const verId = selectedVersion ? selectedVersion.id : "1.21.4";

    const { details, state: statusText } = computePresencePayload(
      this.currentConfig,
      this.isGameRunning,
      this.inGameVersion,
      profileName,
      verId,
      this.rotationIndex,
    );

    const startTs =
      this.isGameRunning && this.gameStartTime
        ? this.gameStartTime
        : this.launcherStartTime;

    const payload = {
      cmd: "SET_ACTIVITY",
      args: {
        pid: 1,
        activity: {
          details: details,
          state: statusText,
          timestamps: this.currentConfig.showTimer
            ? {
                start: startTs,
              }
            : undefined,
          assets: {
            large_image: "obsy_logo",
            large_text: "Obsyra Launcher • World's Best FPS",
            small_image: this.isGameRunning ? "minecraft" : "fps_badge",
            small_text: this.isGameRunning ? `Minecraft ${verId}` : "⚡ 500+ FPS Active",
          },
          buttons: [
            { label: "⚡ Play on Obsyra", url: "https://obsyra.com" },
            { label: "🚀 Join Community", url: "https://discord.gg/obsyra" },
          ],
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
    this.stopRotation();
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

export function useDiscordRpc() {
  const [status, setStatus] = useState<DiscordStatus>(discordManager.getStatus());
  const [config, setConfig] = useState<DiscordConfig>(getDiscordConfig());
  const [rotationIndex, setRotationIndex] = useState(0);

  useEffect(() => {
    const unSub = discordManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    const interval = setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % LAUNCHER_AUTO_ROTATING_LINES.length);
    }, 4000);

    return () => {
      unSub();
      clearInterval(interval);
    };
  }, []);

  const updateConfig = (newConfig: Partial<DiscordConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    saveDiscordConfig(merged);
  };

  return {
    status,
    config,
    rotationIndex,
    updateConfig,
    refreshPresence: () => discordManager.refresh(),
  };
}
