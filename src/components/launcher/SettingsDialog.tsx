import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLauncherStore } from "@/state";
import { getVersion } from "@tauri-apps/api/app";
import { Settings, Zap, Cpu, Clock, RefreshCw, Sparkles, Gauge, Rocket, Sliders, Flame, MonitorPlay, User, Shield, Lock, Unlock, Eye, MousePointer, Plus, Trash2 } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { useTranslation } from "react-i18next";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useDiscordRpc } from "@/lib/discord";
import { useAutoUpdater } from "@/lib/updater";

export const SettingsDialog = () => {
  const { state, updateState, versions, profiles, fetchVersions, startupTimeMs, appMemoryMb, systemSpecs, fetchSystemSpecs, applyFpsOptimization, selectProfile, removeProfile, addOfflineProfile } =
    useLauncherStore();
  const [newOfflineUser, setNewOfflineUser] = useState<string>("");
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>("1.0.0");
  const [totalPlaytime, setTotalPlaytime] = useState<string | null>(null);

  const discord = useDiscordRpc();
  const updater = useAutoUpdater();

  const selectedVersion =
    versions.find((v) => v.id === state?.selectedVersionId)?.id ||
    state?.selectedVersionId ||
    "1.21.4";
  const selectedProfile =
    profiles.find((p) => p.id === state?.selectedProfileId)?.username ||
    "Player";

  useEffect(() => {
    fetchSystemSpecs();
    if (!isTauri()) {
      setTotalPlaytime("16h 05m");
      return;
    }
    getVersion()
      .then((ver) => setAppVersion(ver))
      .catch(() => {});

    invoke<{ formattedTotal: string; totalSeconds: number }>(
      "get_playtime_summary",
    )
      .then((res) => {
        if (res && res.totalSeconds > 0) {
          setTotalPlaytime(res.formattedTotal);
        }
      })
      .catch(() => {});
  }, []);

  const activeProfile = profiles.find((p) => p.id === state?.selectedProfileId) || profiles[0];

  const handleAddOfflineUser = () => {
    const trimmed = newOfflineUser.trim();
    if (trimmed) {
      addOfflineProfile(trimmed);
      setNewOfflineUser("");
    }
  };

  if (!state) return null;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl border border-white/10 bg-white/[0.05] text-muted-foreground backdrop-blur-md shadow-sm transition-all hover:border-white/20 hover:bg-white/[0.12] hover:text-foreground"
          />
        }
      >
        <Settings className="h-5 w-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="game" className="w-full">
          <TabsList className="grid w-full grid-cols-7 rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md">
            <TabsTrigger value="game">{t("settings.game")}</TabsTrigger>
            <TabsTrigger value="booster" className="flex items-center gap-1 font-semibold text-emerald-400 text-xs">
              <Zap className="h-3 w-3 fill-emerald-400" />
              <span>FPS</span>
            </TabsTrigger>
            <TabsTrigger value="controls" className="flex items-center gap-1 font-semibold text-sky-400 text-xs">
              <Sliders className="h-3 w-3 text-sky-400" />
              <span>Controls</span>
            </TabsTrigger>
            <TabsTrigger value="window">{t("settings.window")}</TabsTrigger>
            <TabsTrigger value="versions">{t("settings.versions")}</TabsTrigger>
            <TabsTrigger value="discord">Discord</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Game Settings */}
          <TabsContent value="game" className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="auto-memory"
                className="flex flex-col items-start gap-1"
              >
                <span>{t("settings.autoMemory")}</span>
              </Label>
              <Switch
                id="auto-memory"
                checked={state.autoMemory}
                onCheckedChange={(checked) =>
                  updateState({ ...state, autoMemory: checked })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <Label>{t("settings.memory")}</Label>
                <span className="text-muted-foreground text-sm">
                  {state.memoryAmount} MB
                </span>
              </div>
              <Slider
                disabled={state.autoMemory}
                value={[state.memoryAmount]}
                max={16384}
                min={512}
                step={512}
                onValueChange={(val: number | readonly number[]) =>
                  updateState({
                    ...state,
                    memoryAmount: Array.isArray(val) ? val[0] : val,
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{t("settings.jvmArgs")}</Label>
                <button
                  type="button"
                  onClick={() =>
                    updateState({
                      ...state,
                      jvmArguments:
                        "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapRegionSize=8M",
                    })
                  }
                  className="text-primary cursor-pointer text-xs hover:underline"
                >
                  {t("settings.applyAikar")}
                </button>
              </div>
              <Input
                value={state.jvmArguments}
                onChange={(e) =>
                  updateState({
                    ...state,
                    jvmArguments: e.target.value,
                  })
                }
                placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled ..."
              />
              <p className="text-muted-foreground text-[11px]">
                {t("settings.aikarHint")}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("settings.javaPath") || "Java Path"}</Label>
              <Input
                value={state.javaPath || ""}
                onChange={(e) =>
                  updateState({
                    ...state,
                    javaPath: e.target.value || null,
                  })
                }
                placeholder="/usr/bin/java (leave empty for default)"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="close-after-launch"
                className="flex flex-col items-start gap-1"
              >
                <span>{t("settings.closeAfterLaunch")}</span>
              </Label>
              <Switch
                id="close-after-launch"
                checked={state.closeAfterLaunch}
                onCheckedChange={(checked) =>
                  updateState({ ...state, closeAfterLaunch: checked })
                }
              />
            </div>
          </TabsContent>

                    {/* Real In-Game FPS Booster Hub */}
          <TabsContent value="booster" className="flex flex-col gap-4 py-3 max-h-[460px] overflow-y-auto pr-1">
            {/* System Hardware & Status Pill Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                    <Zap className="h-5 w-5 fill-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      Real Hardware FPS Engine
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                        {state.fpsBoosterEnabled ? "Active" : "Disabled"}
                      </span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Zero-stutter memory allocation, process elevation & GPU acceleration
                    </p>
                  </div>
                </div>
                <Switch
                  checked={state.fpsBoosterEnabled}
                  onCheckedChange={(checked) =>
                    updateState({ ...state, fpsBoosterEnabled: checked })
                  }
                />
              </div>

              {/* Live Detected Hardware Specs Grid */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 p-2.5">
                  <Cpu className="h-4 w-4 text-sky-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">Processor</div>
                    <div className="text-xs font-semibold text-white truncate" title={systemSpecs?.cpuName || "Multi-Core Processor"}>
                      {systemSpecs?.cpuName || "Multi-Core Processor"} ({systemSpecs?.cpuCores || 4}T)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 p-2.5">
                  <MonitorPlay className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">Graphics Adapter</div>
                    <div className="text-xs font-semibold text-white truncate" title={systemSpecs?.gpuName || "Discrete GPU"}>
                      {systemSpecs?.gpuName || "High-Performance GPU"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 p-2.5">
                  <Gauge className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">System Memory</div>
                    <div className="text-xs font-semibold text-white truncate">
                      {systemSpecs?.totalMemoryMb ? `${Math.round(systemSpecs.totalMemoryMb / 1024)} GB Installed` : "8 GB Installed"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 p-2.5">
                  <Rocket className="h-4 w-4 text-purple-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">Tuned Heap (Fixed)</div>
                    <div className="text-xs font-semibold text-white truncate">
                      {state.memoryAmount} MB (Optimal)
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-Click Auto-Tune Best Settings Button */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Auto-tunes RAM and JVM arguments for your hardware
                </span>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => applyFpsOptimization("competitive")}
                  className="h-8 gap-1.5 px-3 text-xs font-bold"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-Tune For My PC
                </Button>
              </div>
            </div>

            {/* Tuning Presets */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Real JVM Optimization Presets
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: "competitive",
                    title: "Competitive High FPS",
                    badge: "Max Frame Rate",
                    badgeColor: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
                    desc: "20ms GC pause budget, 16MB heap regions, parallel ref processing. Maximum peak FPS and minimum frame latency.",
                  },
                  {
                    id: "smooth",
                    title: "Aikar's Frametime Smoother",
                    badge: "Zero Stutter",
                    badgeColor: "text-sky-400 bg-sky-500/15 border-sky-500/30",
                    desc: "Industry gold-standard anti-stutter profile. Stabilizes 1% low framerates and prevents micro-freezes.",
                  },
                  {
                    id: "shenandoah",
                    title: "Shenandoah Ultra-Low Latency",
                    badge: "Concurrent GC",
                    badgeColor: "text-amber-400 bg-amber-500/15 border-amber-500/30",
                    desc: "Parallel memory cleanup without freezing render threads. Zero hitching on modern Java 17/21.",
                  },
                  {
                    id: "modded",
                    title: "Modded Powerhouse",
                    badge: "100+ Mods",
                    badgeColor: "text-purple-400 bg-purple-500/15 border-purple-500/30",
                    desc: "32MB heap regions with string deduplication. Prevents memory leaks and out-of-memory crashes on heavy modpacks.",
                  },
                ].map((preset) => {
                  const isSelected = state.fpsPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => updateState({ ...state, fpsPreset: preset.id as any })}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-all backdrop-blur-md ${
                        isSelected
                          ? "border-white/40 bg-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/30"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{preset.title}</span>
                        <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded-full ${preset.badgeColor}`}>
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                        {preset.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real Hardware Accelerators (Toggles) */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-primary" />
                Hardware Accelerators
              </Label>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-all hover:bg-white/[0.06]">
                  <Label className="flex flex-col items-start gap-0.5 cursor-pointer">
                    <span className="text-xs font-semibold text-foreground">Force Discrete GPU (NVIDIA / AMD)</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Directs Windows Graphics & DirectX to prioritize your high-performance GPU over weak integrated graphics
                    </span>
                  </Label>
                  <Switch
                    checked={state.forceDiscreteGpu}
                    onCheckedChange={(checked) =>
                      updateState({ ...state, forceDiscreteGpu: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-all hover:bg-white/[0.06]">
                  <Label className="flex flex-col items-start gap-0.5 cursor-pointer">
                    <span className="text-xs font-semibold text-foreground">Real-Time Process Priority</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Elevates Minecraft to HIGH_PRIORITY_CLASS upon spawn to prevent background apps from causing frame drops
                    </span>
                  </Label>
                  <Switch
                    checked={state.highProcessPriority}
                    onCheckedChange={(checked) =>
                      updateState({ ...state, highProcessPriority: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-all hover:bg-white/[0.06]">
                  <Label className="flex flex-col items-start gap-0.5 cursor-pointer">
                    <span className="text-xs font-semibold text-foreground">Pre-Touch Heap Memory (-Xms == -Xmx)</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Allocates all RAM pages at launch and eliminates runtime OS memory paging hitches during chunk generation
                    </span>
                  </Label>
                  <Switch
                    checked={state.preTouchMemory}
                    onCheckedChange={(checked) =>
                      updateState({ ...state, preTouchMemory: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-all hover:bg-white/[0.06]">
                  <Label className="flex flex-col items-start gap-0.5 cursor-pointer">
                    <span className="text-xs font-semibold text-foreground">Garbage Collection Stutter Reducer</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Disables explicit GC calls and eliminates JVM shared memory disk polling stalls (-XX:+PerfDisableSharedMem)
                    </span>
                  </Label>
                  <Switch
                    checked={state.optimizeGameGc}
                    onCheckedChange={(checked) =>
                      updateState({ ...state, optimizeGameGc: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* User Controls, Accounts & Safety Hub */}
          <TabsContent value="controls" className="flex flex-col gap-4 py-3 max-h-[460px] overflow-y-auto pr-1">
            {/* Section 1: User & Profile Management */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      Active Player Profile
                      <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                        {activeProfile?.microsoft ? "Microsoft" : "Offline"}
                      </span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Switch accounts, register nicknames, and manage player credentials
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Active Account Showcase */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 mb-3">
                <div className="flex items-center gap-3">
                  {activeProfile ? (
                    <ProfileAvatar username={activeProfile.username} size={40} className="h-10 w-10 rounded-lg border border-white/10 shadow-sm" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-white/50" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {activeProfile?.username || "Player"}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      Currently Selected for Launch
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-muted-foreground">
                  ID: <span className="text-white/80">{activeProfile?.id?.slice(0, 12) || "local"}</span>
                </div>
              </div>

              {/* All Configured Profiles List */}
              <div className="flex flex-col gap-1.5 mb-3">
                <div className="text-[11px] font-medium text-white/70 px-1">Registered Accounts ({profiles.length})</div>
                <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
                  {profiles.map((p) => {
                    const isActive = p.id === state.selectedProfileId;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 border transition-all ${
                          isActive
                            ? "border-sky-500/40 bg-sky-500/10 text-white"
                            : "border-white/5 bg-black/20 hover:border-white/15 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ProfileAvatar username={p.username} size={24} className="h-6 w-6 rounded-md border border-white/10" />
                          <span className="text-xs font-medium truncate">{p.username}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {p.microsoft ? "(License)" : "(Offline)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono">
                              Active
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => selectProfile(p.id)}
                              className="h-6 px-2 text-[11px] bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10"
                            >
                              Select
                            </Button>
                          )}
                          {profiles.length > 1 && !isActive && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeProfile(p.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              title="Remove Account"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Add Offline Account */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <Input
                  value={newOfflineUser}
                  onChange={(e) => setNewOfflineUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddOfflineUser()}
                  placeholder="Add offline nickname (e.g. Alex_Pro)..."
                  className="h-8 text-xs bg-black/40 border-white/10 rounded-xl"
                />
                <Button
                  size="sm"
                  onClick={handleAddOfflineUser}
                  disabled={!newOfflineUser.trim()}
                  className="h-8 px-3 text-xs bg-white text-black hover:bg-white/90 font-medium rounded-xl shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add User
                </Button>
              </div>
            </div>

            {/* Section 2: In-Game Input & Gameplay Controls */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-lg flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-[0_0_15px_rgba(167,139,250,0.2)]">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    Game Controls & In-Game Sync
                    <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                      Auto-Sync
                    </span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Options are synchronized directly to Minecraft options.txt before launch
                  </p>
                </div>
              </div>

              {/* Mouse Sensitivity */}
              <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-3.5 w-3.5 text-violet-400" />
                    <Label className="text-xs font-semibold text-white">Mouse Sensitivity</Label>
                  </div>
                  <span className="text-xs font-mono text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">
                    {state.mouseSensitivity.toFixed(2)}x {state.mouseSensitivity < 0.7 ? "(Slow)" : state.mouseSensitivity > 1.3 ? "(Hyperspeed)" : "(Normal)"}
                  </span>
                </div>
                <Slider
                  min={0.2}
                  max={2.0}
                  step={0.05}
                  value={[state.mouseSensitivity]}
                  onValueChange={(vals) => updateState({ ...state, mouseSensitivity: vals[0] ?? 1.0 })}
                  className="w-full py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0.2x (Precision)</span>
                  <span>1.0x (Standard 100%)</span>
                  <span>2.0x (Hyperspeed)</span>
                </div>
              </div>

              {/* FOV (Field of View) */}
              <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-violet-400" />
                    <Label className="text-xs font-semibold text-white">Field of View (FOV)</Label>
                  </div>
                  <span className="text-xs font-mono text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">
                    {state.fov}° {state.fov <= 50 ? "(Zoom)" : state.fov === 70 ? "(Default Normal)" : state.fov >= 100 ? "(Quake Pro)" : "(Wide)"}
                  </span>
                </div>
                <Slider
                  min={30}
                  max={110}
                  step={1}
                  value={[state.fov]}
                  onValueChange={(vals) => updateState({ ...state, fov: vals[0] ?? 70 })}
                  className="w-full py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>30° (Narrow)</span>
                  <span>70° (Normal)</span>
                  <span>90° (Speed)</span>
                  <span>110° (Quake Pro)</span>
                </div>
              </div>

              {/* Invert Mouse Y-Axis & Auto-Jump Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-white">Invert Y-Axis</div>
                    <div className="text-[10px] text-muted-foreground">Invert mouse vertical pitch</div>
                  </div>
                  <Switch
                    checked={state.invertMouse}
                    onCheckedChange={(checked) => updateState({ ...state, invertMouse: checked })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-white">Auto-Jump</div>
                    <div className="text-[10px] text-muted-foreground">Jump over single-block ledges</div>
                  </div>
                  <Switch
                    checked={state.autoJump}
                    onCheckedChange={(checked) => updateState({ ...state, autoJump: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: User Access & Safety Controls */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-lg flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    User Access & Safety Controls
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                      Parental / Protection
                    </span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Instance protection locks, play session reminders, and safe addon sandboxing
                  </p>
                </div>
              </div>

              {/* Lock Instance Deletion */}
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3">
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div className={`p-2 rounded-lg border ${state.lockInstanceDeletion ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                    {state.lockInstanceDeletion ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      Lock Instance & World Deletion
                      {state.lockInstanceDeletion && (
                        <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                          LOCKED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Blocks instance and world deletion across the launcher to prevent accidental data loss
                    </div>
                  </div>
                </div>
                <Switch
                  checked={state.lockInstanceDeletion}
                  onCheckedChange={(checked) => updateState({ ...state, lockInstanceDeletion: checked })}
                />
              </div>

              {/* Playtime Limit Reminder */}
              <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <Label className="text-xs font-semibold text-white">Daily Playtime Reminder</Label>
                  </div>
                  <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                    {state.playtimeLimitHours === 0 ? "Disabled" : `Every ${state.playtimeLimitHours}h`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { hours: 0, label: "Disabled" },
                    { hours: 1, label: "1 Hour" },
                    { hours: 2, label: "2 Hours" },
                    { hours: 4, label: "4 Hours" },
                  ].map((item) => {
                    const isSelected = state.playtimeLimitHours === item.hours;
                    return (
                      <Button
                        key={item.hours}
                        size="sm"
                        variant="outline"
                        onClick={() => updateState({ ...state, playtimeLimitHours: item.hours })}
                        className={`h-8 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                            : "bg-white/[0.03] text-muted-foreground border-white/10 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Sends gentle notifications recommending a screen break during long gaming sessions
                </div>
              </div>

              {/* Safe Mode Addons */}
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3">
                <div className="min-w-0 pr-3">
                  <div className="text-xs font-semibold text-white">Strict Safe Addon Mode</div>
                  <div className="text-[11px] text-muted-foreground">
                    Enforce integrity checks on downloaded jars and block unverified external scripts
                  </div>
                </div>
                <Switch
                  checked={state.safeModeAddons}
                  onCheckedChange={(checked) => updateState({ ...state, safeModeAddons: checked })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Window Settings */}
          <TabsContent value="window" className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("settings.width")}</Label>
                <Input
                  type="number"
                  value={state.screenWidth}
                  onChange={(e) =>
                    updateState({
                      ...state,
                      screenWidth: parseInt(e.target.value) || 854,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("settings.height")}</Label>
                <Input
                  type="number"
                  value={state.screenHeight}
                  onChange={(e) =>
                    updateState({
                      ...state,
                      screenHeight: parseInt(e.target.value) || 480,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="fullscreen"
                className="flex flex-col items-start gap-1"
              >
                <span>{t("settings.fullscreen")}</span>
              </Label>
              <Switch
                id="fullscreen"
                checked={state.fullscreen}
                onCheckedChange={(checked) =>
                  updateState({ ...state, fullscreen: checked })
                }
              />
            </div>
          </TabsContent>

          {/* Version Filters */}
          <TabsContent value="versions" className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="show-releases"
                className="flex flex-col items-start gap-1"
              >
                <span>{t("settings.showReleases")}</span>
              </Label>
              <Switch
                id="show-releases"
                checked={state.releaseFilter}
                onCheckedChange={(checked) => {
                  updateState({ ...state, releaseFilter: checked });
                  fetchVersions();
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="show-snapshots"
                className="flex flex-col items-start gap-1"
              >
                <span>{t("settings.showSnapshots")}</span>
              </Label>
              <Switch
                id="show-snapshots"
                checked={state.snapshotFilter}
                onCheckedChange={(checked) => {
                  updateState({ ...state, snapshotFilter: checked });
                  fetchVersions();
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="show-old"
                className="flex flex-col items-start gap-1"
              >
                <span>{t("settings.showOld")}</span>
              </Label>
              <Switch
                id="show-old"
                checked={state.legacyFilter}
                onCheckedChange={(checked) => {
                  updateState({ ...state, legacyFilter: checked });
                  fetchVersions();
                }}
              />
            </div>
          </TabsContent>

          {/* Built-in Discord Rich Presence Settings */}
          <TabsContent value="discord" className="flex flex-col gap-4 py-3">
            {/* Master Toggle Glass Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur-xl transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                      discord.config.enabled && discord.status === "connected"
                        ? "bg-[#5865F2]/25 text-[#5865F2] ring-1 ring-[#5865F2]/40 shadow-[0_0_15px_rgba(88,101,242,0.3)]"
                        : "bg-white/[0.06] text-muted-foreground ring-1 ring-white/10"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tracking-tight">Discord Rich Presence</span>
                      {discord.config.enabled && discord.status === "connected" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          discord.config.enabled && discord.status === "connected"
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                            : discord.config.enabled && discord.status === "connecting"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                      <span>
                        {discord.config.enabled
                          ? discord.status === "connected"
                            ? "Connected to Discord Client"
                            : discord.status === "connecting"
                            ? "Connecting to local Discord client..."
                            : "Discord desktop client not running"
                          : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
                <Switch
                  checked={discord.config.enabled}
                  onCheckedChange={(checked) =>
                    discord.updateConfig({ ...discord.config, enabled: checked })
                  }
                />
              </div>
            </div>

            {/* Live Discord Activity Preview Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1e1f29]/80 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-wider text-[#b5bac1] uppercase">
                  Activity Preview
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-[#5865F2] bg-[#5865F2]/10 px-2 py-0.5 rounded-full ring-1 ring-[#5865F2]/20">
                  <Sparkles className="h-2.5 w-2.5" />
                  Live Discord Profile
                </span>
              </div>

              <div className="flex items-start gap-3.5 rounded-xl border border-white/5 bg-black/45 p-3.5">
                <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl bg-black/90 p-1 ring-1 ring-white/15 shadow-md">
                  <img
                    src="/obsyra-logo.png"
                    alt="Obsyra Launcher"
                    className="h-full w-full rounded-lg object-contain"
                  />
                  <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-black" />
                </div>

                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <span className="font-semibold text-white text-sm truncate leading-tight">Obsyra Launcher</span>
                  <span className="text-xs text-[#dbdee1] truncate mt-1 font-medium">
                    {discord.config.showVersion ? `Playing Minecraft ${selectedVersion}` : "Playing Minecraft"}
                  </span>
                  <span className="text-xs text-[#949ba4] truncate mt-0.5">
                    {discord.config.showProfile ? `In-Game as ${selectedProfile}` : "In Main Menu"}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#949ba4] mt-1 font-mono">
                    <Clock className="h-3 w-3" />
                    00:42 elapsed
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy & Display Options (Glass Cards) */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] p-3.5 transition-all hover:bg-white/[0.06] hover:border-white/15">
                <Label className="flex flex-col items-start gap-0.5 cursor-pointer">
                  <span className="text-xs font-semibold text-foreground">Show Minecraft Version</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Display active instance version (e.g. {selectedVersion}) on your Discord profile
                  </span>
                </Label>
                <Switch
                  disabled={!discord.config.enabled}
                  checked={discord.config.showVersion}
                  onCheckedChange={(checked) =>
                    discord.updateConfig({ ...discord.config, showVersion: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] p-3.5 transition-all hover:bg-white/[0.06] hover:border-white/15">
                <Label className="flex flex-col items-start gap-0.5 cursor-pointer">
                  <span className="text-xs font-semibold text-foreground">Show Profile Username</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Display your in-game username ({selectedProfile}) in Discord activity details
                  </span>
                </Label>
                <Switch
                  disabled={!discord.config.enabled}
                  checked={discord.config.showProfile}
                  onCheckedChange={(checked) =>
                    discord.updateConfig({ ...discord.config, showProfile: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* About Tab with Branding & Updater */}
          <TabsContent value="about" className="flex flex-col gap-4 py-4">
            <div className="bg-card/40 border-border/40 flex items-center gap-4 rounded-xl border p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/80 p-2 shadow-md ring-1 ring-white/20">
                <img
                  src="/obsyra-logo.png"
                  alt="Obsyra Launcher"
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold tracking-tight">Obsyra Launcher</h3>
                <p className="text-xs font-semibold text-primary">Obsyra Studio by AeroX</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Modern high-performance cross-platform Minecraft launcher.
                </p>
                <span className="text-muted-foreground/80 mt-1 font-mono text-[11px]">
                  Version: v{appVersion}
                </span>
              </div>
            </div>

            {/* Check for Updates section */}
            <div className="bg-card/30 border-border/40 flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Software Updates</div>
                  <div className="text-xs text-muted-foreground">
                    {updater.state === "checking"
                      ? "Checking for new releases..."
                      : updater.state === "downloading"
                      ? `Downloading v${updater.availableVersion} (${updater.progress}%)`
                      : updater.state === "ready"
                      ? `Update ready to install: v${updater.availableVersion}`
                      : updater.state === "up-to-date"
                      ? "You are on the latest official version."
                      : updater.state === "error"
                      ? (updater.errorMessage || "Unable to check updates")
                      : "Automatic background updates are active."}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={updater.state === "checking" || updater.state === "downloading"}
                  onClick={() => {
                    if (updater.state === "ready") {
                      updater.installAndRelaunch();
                    } else {
                      updater.checkForUpdates(true);
                    }
                  }}
                  className="cursor-pointer text-xs"
                >
                  {updater.state === "checking" ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Checking...
                    </>
                  ) : updater.state === "ready" ? (
                    <>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                      Restart to Update
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Check for Updates
                    </>
                  )}
                </Button>
              </div>

              {updater.state === "downloading" && (
                <div className="bg-primary/20 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${updater.progress}%` }}
                  />
                </div>
              )}
            </div>

            <div className="border-border/30 text-muted-foreground flex flex-col gap-1 border-t pt-3 text-xs">
              <div>Copyright © 2026 Obsyra Studio by AeroX. All rights reserved.</div>
              <div className="text-[11px] opacity-70">
                Official releases and signed packages are verified with cryptographically secure signatures.
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Footer status info */}
        <div className="border-border/40 text-muted-foreground flex items-center justify-between border-t pt-3 font-mono text-[11px]">
          <span className="font-semibold text-foreground/80">Obsyra Launcher v{appVersion}</span>
          <div className="flex items-center gap-3">
            {totalPlaytime && (
              <span className="flex items-center gap-1 text-amber-400">
                <Clock className="h-3 w-3" />
                {t("playtime.title")}: {totalPlaytime}
              </span>
            )}
            {startupTimeMs !== null && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Zap className="h-3 w-3" />
                {t("settings.startupTime", { ms: startupTimeMs })}
              </span>
            )}
            {appMemoryMb !== null && (
              <span className="flex items-center gap-1 text-sky-400">
                <Cpu className="h-3 w-3" />
                RAM: {appMemoryMb} MB
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
