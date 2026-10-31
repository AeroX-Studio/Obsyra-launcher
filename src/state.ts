import { invoke, isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";

export type Language =
  | "ENGLISH"
  | "RUSSIAN"
  | "GERMAN"
  | "FRENCH"
  | "SPANISH"
  | "PORTUGUESE"
  | "UKRAINIAN"
  | "CHINESE"
  | "JAPANESE";
export type Theme = "LIGHT" | "DARK";

export type FpsPreset = "competitive" | "smooth" | "shenandoah" | "modded" | "custom";

export interface SystemSpecs {
  cpuName: string;
  cpuCores: number;
  totalMemoryMb: number;
  availableMemoryMb: number;
  recommendedMemoryMb: number;
  osName: string;
  gpuName: string;
}

export interface LauncherState {
  scale: number;
  language: Language;
  theme: Theme;
  memoryAmount: number;
  autoMemory: boolean;
  screenWidth: number;
  screenHeight: number;
  fullscreen: boolean;
  jvmArguments: string;
  javaPath: string | null;
  closeAfterLaunch: boolean;
  releaseFilter: boolean;
  moddedFilter: boolean;
  snapshotFilter: boolean;
  legacyFilter: boolean;
  selectedProfileId: string | null;
  selectedVersionId: string | null;
  fpsBoosterEnabled: boolean;
  fpsPreset: FpsPreset;
  forceDiscreteGpu: boolean;
  highProcessPriority: boolean;
  preTouchMemory: boolean;
  optimizeGameGc: boolean;
}

export interface MinecraftVersion {
  id: string;
  type: string;
  isLocal: boolean;
  releaseTime: string | null;
}

export interface Profile {
  id: string;
  username: string;
  microsoft: boolean;
  skinPng: string | null;
  slim: boolean;
}

export interface MinecraftCape {
  id: string;
  state: string;
  url: string;
  alias?: string | null;
  base64?: string | null;
}

export interface WardrobeSkin {
  id: string;
  name: string;
  base64Data: string;
  slim: boolean;
  profileId: string | null;
}

interface LauncherStore {
  state: LauncherState | null;
  profiles: Profile[];
  versions: MinecraftVersion[];
  wardrobe: WardrobeSkin[];
  startupTimeMs: number | null;
  appMemoryMb: number | null;
  fetchStartupTime: () => Promise<void>;
  fetchAppMemory: () => Promise<void>;
  fetchState: () => Promise<void>;
  updateState: (newState: LauncherState) => Promise<void>;
  fetchProfiles: () => Promise<void>;
  addOfflineProfile: (username: string) => Promise<void>;
  selectProfile: (id: string) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  fetchVersions: () => Promise<void>;
  selectVersion: (id: string) => Promise<void>;
  openVersionFolder: (versionId: string) => Promise<void>;
  deleteInstance: (versionId: string) => Promise<void>;
  fetchWardrobe: () => Promise<void>;
  refreshProfileSkin: (profileId: string) => Promise<void>;
  refreshProfileToken: (profileId: string) => Promise<void>;
  addSkinToWardrobe: (
    fileBytes: number[],
    name: string,
    slim: boolean,
    profileId: string,
  ) => Promise<void>;
  removeSkinFromWardrobe: (id: string) => Promise<void>;
  applySkin: (profileId: string, skinId: string) => Promise<void>;
  getAccountCapes: (profileId: string) => Promise<MinecraftCape[]>;
    systemSpecs: SystemSpecs | null;
  fetchSystemSpecs: () => Promise<void>;
  applyFpsOptimization: (preset: FpsPreset) => Promise<void>;
  setActiveCape: (profileId: string, capeId: string | null) => Promise<void>;
}

export const DEFAULT_LAUNCHER_STATE: LauncherState = {
  scale: 1,
  language: "ENGLISH",
  theme: "DARK",
  memoryAmount: 4096,
  autoMemory: true,
  screenWidth: 854,
  screenHeight: 480,
  fullscreen: false,
  jvmArguments: "",
  javaPath: null,
  closeAfterLaunch: false,
  releaseFilter: true,
  moddedFilter: true,
  snapshotFilter: false,
  legacyFilter: false,
  selectedProfileId: "demo-player-1",
  selectedVersionId: "1.21.4",
  fpsBoosterEnabled: true,
  fpsPreset: "competitive",
  forceDiscreteGpu: true,
  highProcessPriority: true,
  preTouchMemory: true,
  optimizeGameGc: true,
};

export const DEFAULT_PROFILES: Profile[] = [
  {
    id: "demo-player-1",
    username: "Player",
    microsoft: false,
    skinPng: null,
    slim: false,
  },
];

export const DEFAULT_VERSIONS: MinecraftVersion[] = [
  { id: "1.21.4", type: "release", isLocal: true, releaseTime: "2024-12-03" },
  { id: "1.21.1", type: "release", isLocal: false, releaseTime: "2024-08-08" },
  { id: "1.20.4", type: "release", isLocal: true, releaseTime: "2023-12-07" },
  { id: "1.20.1", type: "release", isLocal: false, releaseTime: "2023-06-12" },
  { id: "1.19.4", type: "release", isLocal: false, releaseTime: "2023-03-14" },
  { id: "1.16.5", type: "release", isLocal: false, releaseTime: "2021-01-15" },
  { id: "1.12.2", type: "release", isLocal: false, releaseTime: "2017-09-18" },
  { id: "1.8.9", type: "release", isLocal: false, releaseTime: "2015-12-09" },
];

const WEB_STATE_KEY = "obsy:launcher_state";
const WEB_PROFILES_KEY = "obsy:launcher_profiles";
const WEB_VERSIONS_KEY = "obsy:launcher_versions";
const WEB_WARDROBE_KEY = "obsy:launcher_wardrobe";

function getStoredWebState(): LauncherState {
  try {
    const raw = localStorage.getItem(WEB_STATE_KEY);
    if (raw) return { ...DEFAULT_LAUNCHER_STATE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_LAUNCHER_STATE;
}

function saveStoredWebState(state: LauncherState) {
  try {
    localStorage.setItem(WEB_STATE_KEY, JSON.stringify(state));
  } catch {}
}

function getStoredWebProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(WEB_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PROFILES;
}

function saveStoredWebProfiles(profiles: Profile[]) {
  try {
    localStorage.setItem(WEB_PROFILES_KEY, JSON.stringify(profiles));
  } catch {}
}

function getStoredWebVersions(): MinecraftVersion[] {
  try {
    const raw = localStorage.getItem(WEB_VERSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_VERSIONS;
}

function saveStoredWebVersions(versions: MinecraftVersion[]) {
  try {
    localStorage.setItem(WEB_VERSIONS_KEY, JSON.stringify(versions));
  } catch {}
}

/**
 * Safely invokes a Tauri backend command with centralized error logging and Web fallback.
 */
async function safeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
  fallback?: T,
): Promise<T | undefined> {
  if (!isTauri()) {
    return fallback;
  }
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    console.error(`[Obsyra State] Error in "${cmd}":`, error);
    return fallback;
  }
}

export const useLauncherStore = create<LauncherStore>((set, get) => ({
  state: !isTauri() ? getStoredWebState() : null,
  profiles: !isTauri() ? getStoredWebProfiles() : [],
  versions: !isTauri() ? getStoredWebVersions() : [],
  wardrobe: [],
  startupTimeMs: null,
  appMemoryMb: null,

  fetchStartupTime: async () => {
    if (get().startupTimeMs !== null) return;
    if (!isTauri()) {
      set({ startupTimeMs: Math.round(performance.now()) });
      return;
    }
    const ms = await safeInvoke<number>(
      "get_startup_time",
      undefined,
      Math.round(performance.now()),
    );
    if (ms !== undefined && ms > 0) set({ startupTimeMs: ms });
  },

  fetchAppMemory: async () => {
    if (!isTauri()) {
      const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
      const mb = perfMemory?.usedJSHeapSize
        ? Math.round(perfMemory.usedJSHeapSize / (1024 * 1024))
        : 95;
      set({ appMemoryMb: mb });
      return;
    }
    const mb = await safeInvoke<number>("get_app_memory_usage", undefined, 0);
    if (mb && mb > 0) set({ appMemoryMb: mb });
  },

  fetchState: async () => {
    if (!isTauri()) {
      set({ state: getStoredWebState() });
      return;
    }
    const state = await safeInvoke<LauncherState>(
      "get_launcher_state",
      undefined,
      getStoredWebState(),
    );
    if (state) set({ state });
  },

  updateState: async (newState) => {
    set({ state: newState });
    if (!isTauri()) {
      saveStoredWebState(newState);
      return;
    }
    await safeInvoke("update_launcher_state", { newState });
  },

  fetchProfiles: async () => {
    if (!isTauri()) {
      set({ profiles: getStoredWebProfiles() });
      return;
    }
    const profiles = await safeInvoke<Profile[]>(
      "get_profiles",
      undefined,
      getStoredWebProfiles(),
    );
    if (profiles) set({ profiles });
  },

  addOfflineProfile: async (username: string) => {
    if (!isTauri()) {
      const current = get().profiles;
      const newProf: Profile = {
        id: `offline-${Date.now()}`,
        username,
        microsoft: false,
        skinPng: null,
        slim: false,
      };
      const updated = [...current, newProf];
      saveStoredWebProfiles(updated);
      set({ profiles: updated });
      await get().selectProfile(newProf.id);
      return;
    }
    const profiles = await safeInvoke<Profile[]>("add_offline_profile", {
      username,
    });
    if (profiles) {
      set({ profiles });
      const newProfile = profiles.find((p) => p.username === username);
      if (newProfile) {
        await get().selectProfile(newProfile.id);
      }
    }
  },

  selectProfile: async (id: string) => {
    if (isTauri()) {
      await safeInvoke("select_profile", { id });
    }
    const currentState = get().state;
    if (currentState) {
      const updated = { ...currentState, selectedProfileId: id };
      set({ state: updated });
      if (!isTauri()) saveStoredWebState(updated);
    }
  },

  removeProfile: async (id: string) => {
    if (!isTauri()) {
      const updated = get().profiles.filter((p) => p.id !== id);
      saveStoredWebProfiles(updated);
      set({ profiles: updated });
      const currentState = get().state;
      if (currentState?.selectedProfileId === id) {
        const nextId = updated[0]?.id || null;
        const nextState = { ...currentState, selectedProfileId: nextId };
        set({ state: nextState });
        saveStoredWebState(nextState);
      }
      return;
    }
    const profiles = await safeInvoke<Profile[]>("remove_profile", { id });
    if (profiles) {
      set({ profiles });
      const currentState = get().state;
      if (currentState?.selectedProfileId === id) {
        set({ state: { ...currentState, selectedProfileId: null } });
      }
    }
  },

  fetchVersions: async () => {
    if (!isTauri()) {
      set({ versions: getStoredWebVersions() });
      return;
    }
    const versions = await safeInvoke<MinecraftVersion[]>(
      "get_versions",
      undefined,
      getStoredWebVersions(),
    );
    if (versions) set({ versions });
  },

  selectVersion: async (id: string) => {
    if (isTauri()) {
      await safeInvoke("select_version", { id });
    }
    const currentState = get().state;
    if (currentState) {
      const updated = { ...currentState, selectedVersionId: id };
      set({ state: updated });
      if (!isTauri()) saveStoredWebState(updated);
    }
  },

  openVersionFolder: async (versionId: string) => {
    if (!isTauri()) {
      console.log(`[Obsyra Web Preview] Open folder for version: ${versionId}`);
      return;
    }
    await safeInvoke("open_version_folder", { versionId });
  },

  deleteInstance: async (versionId: string) => {
    if (!isTauri()) {
      const updated = get().versions.filter((v) => v.id !== versionId);
      saveStoredWebVersions(updated);
      set({ versions: updated });
      const currentState = get().state;
      if (currentState?.selectedVersionId === versionId) {
        const nextId = updated[0]?.id || null;
        const nextState = { ...currentState, selectedVersionId: nextId };
        set({ state: nextState });
        saveStoredWebState(nextState);
      }
      return;
    }
    await safeInvoke("delete_instance", { versionId });
    await get().fetchVersions();
    const currentState = get().state;
    if (currentState?.selectedVersionId === versionId) {
      set({ state: { ...currentState, selectedVersionId: null } });
    }
  },

  fetchWardrobe: async () => {
    if (!isTauri()) {
      try {
        const raw = localStorage.getItem(WEB_WARDROBE_KEY);
        set({ wardrobe: raw ? JSON.parse(raw) : [] });
      } catch {
        set({ wardrobe: [] });
      }
      return;
    }
    const wardrobe = await safeInvoke<WardrobeSkin[]>(
      "get_wardrobe",
      undefined,
      [],
    );
    if (wardrobe) set({ wardrobe });
  },

  refreshProfileSkin: async (profileId: string) => {
    if (isTauri()) {
      await safeInvoke("refresh_profile_skin", { profileId });
      await get().fetchProfiles();
    }
  },

  refreshProfileToken: async (profileId: string) => {
    if (isTauri()) {
      await safeInvoke("refresh_profile_token", { profileId });
      await get().fetchProfiles();
    }
  },

  addSkinToWardrobe: async (
    fileBytes: number[],
    name: string,
    slim: boolean,
    profileId: string,
  ) => {
    if (!isTauri()) {
      const base64 = `data:image/png;base64,${btoa(String.fromCharCode(...fileBytes.slice(0, 5000)))}`;
      const newSkin: WardrobeSkin = {
        id: `skin-${Date.now()}`,
        name,
        base64Data: base64,
        slim,
        profileId,
      };
      const current = get().wardrobe;
      const updated = [newSkin, ...current];
      try {
        localStorage.setItem(WEB_WARDROBE_KEY, JSON.stringify(updated));
      } catch {}
      set({ wardrobe: updated });
      return;
    }
    try {
      await invoke("add_skin_to_wardrobe", {
        fileBytes,
        name,
        slim,
        profileId,
      });
      await get().fetchWardrobe();
    } catch (error) {
      console.error("[Obsyra State] Failed to add skin to wardrobe:", error);
      throw error;
    }
  },

  removeSkinFromWardrobe: async (id: string) => {
    if (!isTauri()) {
      const updated = get().wardrobe.filter((s) => s.id !== id);
      try {
        localStorage.setItem(WEB_WARDROBE_KEY, JSON.stringify(updated));
      } catch {}
      set({ wardrobe: updated });
      return;
    }
    await safeInvoke("remove_skin_from_wardrobe", { id });
    await get().fetchWardrobe();
  },

  applySkin: async (profileId: string, skinId: string) => {
    if (!isTauri()) {
      const skin = get().wardrobe.find((s) => s.id === skinId);
      if (skin) {
        const updated = get().profiles.map((p) =>
          p.id === profileId
            ? { ...p, skinPng: skin.base64Data, slim: skin.slim }
            : p,
        );
        saveStoredWebProfiles(updated);
        set({ profiles: updated });
      }
      return;
    }
    try {
      await invoke("apply_skin", { profileId, skinId });
      await get().fetchProfiles();
    } catch (error) {
      console.error("[Obsyra State] Failed to apply skin:", error);
      throw error;
    }
  },

  getAccountCapes: async (profileId: string) => {
    if (!isTauri()) return [];
    const capes = await safeInvoke<MinecraftCape[]>(
      "get_account_capes",
      { profileId },
      [],
    );
    return capes || [];
  },

  setActiveCape: async (profileId: string, capeId: string | null) => {
    if (!isTauri()) return;
    try {
      await invoke("set_active_cape", { profileId, capeId });
    } catch (error) {
      console.error("[Obsyra State] Failed to set active cape:", error);
      throw error;
    }
  },
}));
