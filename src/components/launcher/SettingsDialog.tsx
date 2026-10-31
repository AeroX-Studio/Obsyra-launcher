import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLauncherStore, type FpsPreset } from "@/state";
import { getVersion } from "@tauri-apps/api/app";
import {
  Settings,
  Zap,
  Cpu,
  Clock,
  RefreshCw,
  Sparkles,
  Gauge,
  Rocket,
  Sliders,
  Flame,
  MonitorPlay,
  User,
  Shield,
  Lock,
  Unlock,
  Eye,
  MousePointer,
  Plus,
  Trash2,
  X,
  Layers,
  FolderSync,
  Radio,
  CheckCircle2,
  Swords,
  Compass,
} from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { useTranslation } from "react-i18next";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  useDiscordRpc,
  computePresencePayload,
} from "@/lib/discord";
import { useAutoUpdater } from "@/lib/updater";

export const SettingsDialog = () => {
  const {
    state,
    updateState,
    versions,
    profiles,
    fetchVersions,
    startupTimeMs,
    appMemoryMb,
    systemSpecs,
    fetchSystemSpecs,
    applyFpsOptimization,
    selectProfile,
    removeProfile,
    addOfflineProfile,
  } = useLauncherStore();

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

  const computedDiscordPresence = computePresencePayload(
    discord.config,
    false,
    null,
    selectedProfile,
    selectedVersion,
  );

  useEffect(() => {
    if (typeof fetchSystemSpecs === "function") {
      fetchSystemSpecs();
    }
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

  const activeProfile =
    profiles.find((p) => p.id === state?.selectedProfileId) || profiles[0];

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
            className="rounded-xl border border-white/10 bg-white/[0.05] text-muted-foreground backdrop-blur-md shadow-sm transition-all hover:border-white/20 hover:bg-white/[0.12] hover:text-foreground cursor-pointer"
            title={t("settings.title") || "Settings"}
          />
        }
      >
        <Settings className="h-5 w-5" />
      </DialogTrigger>

      <DialogContent
        fullscreen
        showCloseButton={false}
        className="h-screen w-screen bg-black text-foreground overflow-hidden select-none border-0 p-0"
      >
        <Tabs
          defaultValue="booster"
          orientation="vertical"
          className="flex h-screen w-screen flex-row overflow-hidden bg-black text-foreground"
        >
          {/* ================= LEFT SIDEBAR NAVIGATION ================= */}
          <aside className="flex h-full w-72 shrink-0 flex-col justify-between border-r border-white/10 bg-black/85 p-5 select-none z-20">
            <div className="flex flex-col gap-6">
              {/* Brand Logo & Header */}
              <div className="flex items-center gap-3 px-1">
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-black border border-white/20 shadow-lg shrink-0">
                  <img
                    src="/obsyra-logo.png"
                    alt="Obsyra Logo"
                    className="h-full w-full object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white tracking-tight truncate">
                    Obsyra Settings
                  </h2>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    v{appVersion} • Preferences
                  </p>
                </div>
              </div>

              {/* Navigation Tabs List */}
              <TabsList className="flex flex-col gap-1.5 w-full bg-transparent p-0">
                <TabsTrigger
                  value="booster"
                  className="flex items-center gap-3 w-full justify-start rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/[0.06] hover:text-white data-active:bg-white/10 data-active:text-white data-active:border-white/20 border border-transparent cursor-pointer"
                >
                  <Zap className="h-4 w-4 fill-emerald-400 text-emerald-400 shrink-0" />
                  <span>FPS Booster</span>
                  <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono uppercase font-bold">
                    500+ FPS
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="game"
                  className="flex items-center gap-3 w-full justify-start rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/[0.06] hover:text-white data-active:bg-white/10 data-active:text-white data-active:border-white/20 border border-transparent cursor-pointer"
                >
                  <Cpu className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Game & Memory</span>
                </TabsTrigger>

                <TabsTrigger
                  value="controls"
                  className="flex items-center gap-3 w-full justify-start rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/[0.06] hover:text-white data-active:bg-white/10 data-active:text-white data-active:border-white/20 border border-transparent cursor-pointer"
                >
                  <Sliders className="h-4 w-4 text-violet-400 shrink-0" />
                  <span>Users & Controls</span>
                </TabsTrigger>

                <TabsTrigger
                  value="window"
                  className="flex items-center gap-3 w-full justify-start rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/[0.06] hover:text-white data-active:bg-white/10 data-active:text-white data-active:border-white/20 border border-transparent cursor-pointer"
                >
                  <MonitorPlay className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Window & Display</span>
                </TabsTrigger>

                <TabsTrigger
                  value="versions"
                  className="flex items-center gap-3 w-full justify-start rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/[0.06] hover:text-white data-active:bg-white/10 data-active:text-white data-active:border-white/20 border border-transparent cursor-pointer"
                >
                  <Rocket className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Versions & Releases</span>
                </TabsTrigger>

                <TabsTrigger
                  value="discord"
                  className="flex items-center gap-3 w-full justify-start rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/[0.06] hover:text-white data-active:bg-white/10 data-active:text-white data-active:border-white/20 border border-transparent cursor-pointer"
                >
                  <Flame className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>Discord Presence</span>
                </TabsTrigger>

                <TabsTrigger
                  value="about"
                  className="flex items-center gap-3 w-full justify-start rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/[0.06] hover:text-white data-active:bg-white/10 data-active:text-white data-active:border-white/20 border border-transparent cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-white/60 shrink-0" />
                  <span>About Obsyra</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Sidebar Bottom Hardware & Health Pill */}
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-[11px] shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-mono uppercase text-[10px] tracking-wider text-white/60">
                  Engine Metrics
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <div
                className="text-xs font-semibold text-white truncate"
                title={systemSpecs?.gpuName || "Discrete GPU"}
              >
                {systemSpecs?.gpuName || "High-Performance GPU"}
              </div>
              <div
                className="text-[10px] text-muted-foreground font-mono truncate"
                title={systemSpecs?.cpuName || "Multi-Core CPU"}
              >
                {systemSpecs?.cpuName || "Multi-Core Processor"}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono text-[10px] text-muted-foreground">
                {totalPlaytime && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {totalPlaytime}
                  </span>
                )}
                {startupTimeMs !== null && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> {startupTimeMs}ms
                  </span>
                )}
                {appMemoryMb !== null && (
                  <span className="text-sky-400 flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> {appMemoryMb}MB
                  </span>
                )}
              </div>
            </div>
          </aside>

          {/* ================= RIGHT MAIN CONTENT AREA ================= */}
          <section className="flex flex-1 flex-col h-full overflow-hidden bg-black/90">
            {/* Top Header Bar with Close Button */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-8 bg-black/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Configuration Dashboard
                </h3>
                <span className="text-xs text-muted-foreground hidden sm:inline border-l border-white/10 pl-3">
                  Hardware FPS Booster, Gameplay Inputs, and Profile Controls
                </span>
              </div>
              <DialogClose
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border border-white/20 bg-white text-black hover:bg-white/90 font-semibold px-4 h-9 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Back to Launcher</span>
                    <kbd className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded font-mono font-normal">
                      ESC
                    </kbd>
                  </Button>
                }
              />
            </div>

            {/* Scrollable Content Container: max-w-4xl prevents stretching! */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="max-w-4xl mx-auto w-full pb-12 space-y-6">

                {/* ================= TAB 1: REAL HARDWARE FPS BOOSTER ================= */}
                <TabsContent value="booster" className="flex flex-col gap-6">
                  {/* System Hardware & Status Banner */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                          <Zap className="h-5 w-5 fill-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2.5">
                            Real Hardware FPS Booster Engine
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
                              {state.fpsBoosterEnabled ? "Active & Optimizing" : "Disabled"}
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Pre-allocated heap memory, High Priority Class execution, and dedicated GPU pipeline
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

                    {/* Detected Hardware Specs Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 p-2.5">
                        <Cpu className="h-4 w-4 text-sky-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-muted-foreground font-mono uppercase">CPU</div>
                          <div className="text-xs font-semibold text-white truncate" title={systemSpecs?.cpuName || "Host CPU"}>
                            {systemSpecs?.cpuName || "Multi-Core CPU"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 p-2.5">
                        <MonitorPlay className="h-4 w-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-muted-foreground font-mono uppercase">GPU</div>
                          <div className="text-xs font-semibold text-white truncate" title={systemSpecs?.gpuName || "Discrete GPU"}>
                            {systemSpecs?.gpuName || "Discrete GPU"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 p-2.5">
                        <Gauge className="h-4 w-4 text-amber-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-muted-foreground font-mono uppercase">Total RAM</div>
                          <div className="text-xs font-semibold text-white font-mono">
                            {systemSpecs ? `${Math.round(systemSpecs.totalMemoryMb / 1024)} GB` : "16 GB"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 p-2.5">
                        <Rocket className="h-4 w-4 text-rose-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-muted-foreground font-mono uppercase">Golden RAM</div>
                          <div className="text-xs font-semibold text-emerald-400 font-mono">
                            {systemSpecs ? `${systemSpecs.recommendedMemoryMb} MB` : "6144 MB"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preset Selector Card */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-emerald-400" />
                        1-Click Hardware Optimization Profiles
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Select a profile tuned to your playstyle for instantaneous GC and thread scheduling
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        {
                          id: "competitive",
                          name: "Competitive Raw FPS (PvP)",
                          badge: "Max Frame Ceiling",
                          badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                          desc: "Aggressive 20ms pause budget, 16M heap regions, disabled explicit GC. Built for 500+ FPS in PvP.",
                        },
                        {
                          id: "smooth",
                          name: "Frametime Smoother (Aikar's G1GC)",
                          badge: "Zero Micro-Stutter",
                          badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
                          desc: "Aikar's survivor ratio tuning. Eliminates lag spikes while exploring chunks and loading entities.",
                        },
                        {
                          id: "shenandoah",
                          name: "Ultra-Low Latency (Shenandoah)",
                          badge: "Concurrent GC",
                          badgeColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
                          desc: "Concurrent garbage collection eliminating world pauses entirely. Best for high-refresh 144Hz+ monitors.",
                        },
                        {
                          id: "modded",
                          name: "Modded & Heavy Modpack",
                          badge: "Large Heaps (6-12G)",
                          badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                          desc: "32M heap regions, 100ms pause target, parallel references for 200+ mod instances and shaders.",
                        },
                      ].map((preset) => {
                        const isSelected = state.fpsPreset === preset.id;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => applyFpsOptimization(preset.id as FpsPreset)}
                            className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 ${
                              isSelected
                                ? "bg-white/[0.08] border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.15)] ring-1 ring-emerald-500/40"
                                : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />}
                                {preset.name}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${preset.badgeColor}`}>
                                {preset.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {preset.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Advanced Performance Toggles */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <h5 className="text-xs font-bold text-white/90 uppercase tracking-wider font-mono">
                      Kernel & Driver Elevators
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3">
                        <div className="min-w-0 pr-3">
                          <div className="text-xs font-semibold text-white">Dedicated GPU Pipeline</div>
                          <div className="text-[11px] text-muted-foreground">Force high-performance discrete GPU</div>
                        </div>
                        <Switch
                          checked={state.forceDiscreteGpu}
                          onCheckedChange={(checked) => updateState({ ...state, forceDiscreteGpu: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3">
                        <div className="min-w-0 pr-3">
                          <div className="text-xs font-semibold text-white">Elevated Process Priority</div>
                          <div className="text-[11px] text-muted-foreground">High Priority Class CPU scheduling</div>
                        </div>
                        <Switch
                          checked={state.highProcessPriority}
                          onCheckedChange={(checked) => updateState({ ...state, highProcessPriority: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3">
                        <div className="min-w-0 pr-3">
                          <div className="text-xs font-semibold text-white">Always Pre-Touch Memory</div>
                          <div className="text-[11px] text-muted-foreground">Pre-commits all RAM pages on boot</div>
                        </div>
                        <Switch
                          checked={state.preTouchMemory}
                          onCheckedChange={(checked) => updateState({ ...state, preTouchMemory: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3">
                        <div className="min-w-0 pr-3">
                          <div className="text-xs font-semibold text-white">Garbage Collection Tuning</div>
                          <div className="text-[11px] text-muted-foreground">Eliminate runtime micro-pauses</div>
                        </div>
                        <Switch
                          checked={state.optimizeGameGc}
                          onCheckedChange={(checked) => updateState({ ...state, optimizeGameGc: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ================= TAB 2: GAME & MEMORY SETTINGS ================= */}
                <TabsContent value="game" className="flex flex-col gap-6">
                  {/* Memory Card */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">Memory Allocation (RAM)</h4>
                        <p className="text-xs text-muted-foreground">Allocate optimal heap memory for Minecraft</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="auto-memory" className="text-xs text-muted-foreground">
                          {t("settings.autoMemory")}
                        </Label>
                        <Switch
                          id="auto-memory"
                          checked={state.autoMemory}
                          onCheckedChange={(checked) => updateState({ ...state, autoMemory: checked })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-white">Allocated Heap</span>
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                          {state.memoryAmount} MB ({Math.round(state.memoryAmount / 1024 * 10) / 10} GB)
                        </span>
                      </div>
                      <Slider
                        disabled={state.autoMemory}
                        min={1024}
                        max={16384}
                        step={512}
                        value={[state.memoryAmount]}
                        onValueChange={(val) => updateState({ ...state, memoryAmount: val[0] ?? 4096 })}
                        className="w-full py-1"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>1024 MB</span>
                        <span>4096 MB (Recommended)</span>
                        <span>16384 MB</span>
                      </div>
                    </div>
                  </div>

                  {/* JVM Arguments Card */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{t("settings.jvmArgs")}</h4>
                        <p className="text-xs text-muted-foreground">Custom startup flags for the Java Virtual Machine</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateState({
                            ...state,
                            jvmArguments:
                              "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapRegionSize=8M -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:G1SATBBufferEnqueueingThresholdPercent=30 -XX:G1ConcMarkStepDurationMillis=5.0",
                          })
                        }
                        className="h-7 text-xs bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/10 rounded-xl"
                      >
                        {t("settings.applyAikar")}
                      </Button>
                    </div>
                    <Input
                      value={state.jvmArguments}
                      onChange={(e) => updateState({ ...state, jvmArguments: e.target.value })}
                      placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled ..."
                      className="bg-black/40 border-white/10 rounded-xl text-xs font-mono"
                    />
                    <p className="text-muted-foreground text-[11px]">{t("settings.aikarHint")}</p>
                  </div>

                  {/* Java Path & Launch behavior */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex flex-col gap-2">
                      <Label className="text-xs font-bold text-white">{t("settings.javaPath") || "Java Executable Path"}</Label>
                      <Input
                        value={state.javaPath || ""}
                        onChange={(e) => updateState({ ...state, javaPath: e.target.value || null })}
                        placeholder="/usr/bin/java (leave empty for auto-download)"
                        className="bg-black/40 border-white/10 rounded-xl text-xs font-mono h-9"
                      />
                      <p className="text-[10px] text-muted-foreground">Leave blank to let Obsyra auto-manage the ideal Java JDK</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <Label htmlFor="close-after-launch" className="text-xs font-bold text-white cursor-pointer">
                          {t("settings.closeAfterLaunch")}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">Exit launcher UI once Minecraft is loaded</p>
                      </div>
                      <Switch
                        id="close-after-launch"
                        checked={state.closeAfterLaunch}
                        onCheckedChange={(checked) => updateState({ ...state, closeAfterLaunch: checked })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ================= TAB 3: USERS & CONTROLS ================= */}
                <TabsContent value="controls" className="flex flex-col gap-6">
                  {/* Account Manager Card */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            Active Player Account
                            <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                              {activeProfile?.microsoft ? "Microsoft License" : "Offline"}
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground">Manage identities, credentials, and switch accounts</p>
                        </div>
                      </div>
                    </div>

                    {/* Active Profile Pill */}
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3.5">
                      <div className="flex items-center gap-3">
                        {activeProfile ? (
                          <ProfileAvatar username={activeProfile.username} size={44} className="h-11 w-11 rounded-lg border border-white/15" />
                        ) : (
                          <div className="h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-white/50" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            {activeProfile?.username || "Player"}
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                              SELECTED
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">ID: {activeProfile?.id || "local"}</div>
                        </div>
                      </div>
                    </div>

                    {/* All Registered Accounts */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-white/80">Configured Accounts ({profiles.length})</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {profiles.map((p) => {
                          const isActive = p.id === state.selectedProfileId;
                          return (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 border transition-all ${
                                isActive
                                  ? "border-sky-500/40 bg-sky-500/10 text-white"
                                  : "border-white/5 bg-black/20 hover:border-white/15 hover:bg-white/[0.03]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ProfileAvatar username={p.username} size={28} className="h-7 w-7 rounded-md border border-white/10" />
                                <div className="truncate">
                                  <div className="text-xs font-medium text-white truncate">{p.username}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {p.microsoft ? "Microsoft" : "Offline"}
                                  </div>
                                </div>
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
                                    className="h-6 px-2 text-[11px] bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 cursor-pointer"
                                  >
                                    Select
                                  </Button>
                                )}
                                {profiles.length > 1 && !isActive && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeProfile(p.id)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
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

                    {/* Inline Add Offline User */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <Input
                        value={newOfflineUser}
                        onChange={(e) => setNewOfflineUser(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddOfflineUser()}
                        placeholder="Register offline nickname (e.g. Alex_Pro)..."
                        className="h-9 text-xs bg-black/40 border-white/10 rounded-xl"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddOfflineUser}
                        disabled={!newOfflineUser.trim()}
                        className="h-9 px-4 text-xs bg-white text-black hover:bg-white/90 font-medium rounded-xl shrink-0 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Account
                      </Button>
                    </div>
                  </div>

                  {/* Game Controls & In-Game Options Sync */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                        <Sliders className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          Game Controls & In-Game Sync
                          <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                            Auto-Sync
                          </span>
                        </h4>
                        <p className="text-xs text-muted-foreground">Options synchronize directly to Minecraft options.txt before boot</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Mouse Sensitivity */}
                      <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/30 p-3.5">
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
                          <span>0.2x</span>
                          <span>1.0x (Standard)</span>
                          <span>2.0x (Hyperspeed)</span>
                        </div>
                      </div>

                      {/* FOV */}
                      <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/30 p-3.5">
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
                          <span>110° (Quake Pro)</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3">
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-white">Invert Y-Axis Pitch</div>
                          <div className="text-[11px] text-muted-foreground">Invert mouse vertical look movement</div>
                        </div>
                        <Switch
                          checked={state.invertMouse}
                          onCheckedChange={(checked) => updateState({ ...state, invertMouse: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3">
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-white">Auto-Jump</div>
                          <div className="text-[11px] text-muted-foreground">Automatically step up single blocks</div>
                        </div>
                        <Switch
                          checked={state.autoJump}
                          onCheckedChange={(checked) => updateState({ ...state, autoJump: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* User Access & Safety Controls */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          User Access & Safety Controls
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                            Protection
                          </span>
                        </h4>
                        <p className="text-xs text-muted-foreground">Instance protection locks, play break limits, and safe mod verification</p>
                      </div>
                    </div>

                    {/* Lock Instance Deletion */}
                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3.5">
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className={`p-2 rounded-lg border ${state.lockInstanceDeletion ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                          {state.lockInstanceDeletion ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-2">
                            Lock Instance & World Deletion
                            {state.lockInstanceDeletion && (
                              <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.2 rounded font-mono">
                                LOCKED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Blocks instance deletion across the launcher to prevent accidental data loss
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={state.lockInstanceDeletion}
                        onCheckedChange={(checked) => updateState({ ...state, lockInstanceDeletion: checked })}
                      />
                    </div>

                    {/* Daily Playtime Break Reminder */}
                    <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/30 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <Label className="text-xs font-semibold text-white">Daily Playtime Break Reminder</Label>
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
                    </div>

                    {/* Safe Mode Addons */}
                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3.5">
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-semibold text-white">Strict Safe Addon Mode</div>
                        <div className="text-[11px] text-muted-foreground">
                          Enforce integrity verification on jars and prevent unverified scripts
                        </div>
                      </div>
                      <Switch
                        checked={state.safeModeAddons}
                        onCheckedChange={(checked) => updateState({ ...state, safeModeAddons: checked })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ================= TAB 4: WINDOW & DISPLAY ================= */}
                <TabsContent value="window" className="flex flex-col gap-6">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <h4 className="text-sm font-bold text-white">Display Resolution & Window State</h4>
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
                          className="bg-black/40 border-white/10 rounded-xl"
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
                          className="bg-black/40 border-white/10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        <Label htmlFor="fullscreen" className="text-xs font-semibold text-white">
                          {t("settings.fullscreen")}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">Launch Minecraft directly into exclusive fullscreen</p>
                      </div>
                      <Switch
                        id="fullscreen"
                        checked={state.fullscreen}
                        onCheckedChange={(checked) =>
                          updateState({ ...state, fullscreen: checked })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ================= TAB 5: VERSIONS & RELEASES ================= */}
                <TabsContent value="versions" className="flex flex-col gap-6">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <h4 className="text-sm font-bold text-white">Version Visibility & Catalogs</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show-releases" className="text-xs font-semibold text-white">
                          {t("settings.showReleases")}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">Official stable release builds</p>
                      </div>
                      <Switch
                        id="show-releases"
                        checked={state.releaseFilter}
                        onCheckedChange={(checked) => {
                          updateState({ ...state, releaseFilter: checked });
                          fetchVersions();
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        <Label htmlFor="show-snapshots" className="text-xs font-semibold text-white">
                          {t("settings.showSnapshots")}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">Experimental snapshots and development previews</p>
                      </div>
                      <Switch
                        id="show-snapshots"
                        checked={state.snapshotFilter}
                        onCheckedChange={(checked) => {
                          updateState({ ...state, snapshotFilter: checked });
                          fetchVersions();
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        <Label htmlFor="show-old" className="text-xs font-semibold text-white">
                          {t("settings.showOld")}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">Historical Alpha and Beta releases</p>
                      </div>
                      <Switch
                        id="show-old"
                        checked={state.legacyFilter}
                        onCheckedChange={(checked) => {
                          updateState({ ...state, legacyFilter: checked });
                          fetchVersions();
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ================= TAB 6: DISCORD RPC ================= */}
                <TabsContent value="discord" className="flex flex-col gap-6">
                  {/* Master Card & Connection Status */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 shrink-0">
                          <Flame className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            Discord Rich Presence
                            {discord.status === "connected" && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Connected
                              </span>
                            )}
                            {discord.status === "connecting" && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                                Connecting...
                              </span>
                            )}
                            {discord.status === "disabled" && (
                              <span className="text-[10px] bg-white/10 text-white/50 border border-white/20 px-2 py-0.5 rounded-full font-mono uppercase">
                                Disabled
                              </span>
                            )}
                            {discord.status === "disconnected" && (
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                                Client Idle
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Display your active Obsyra Launcher status cleanly on your Discord profile
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={discord.config.enabled}
                        onCheckedChange={(checked) => discord.updateConfig({ enabled: checked })}
                      />
                    </div>
                  </div>

                  {/* Clean Realistic Discord Profile Card Preview */}
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-2xl">
                    <div className="h-16 w-full bg-gradient-to-r from-[#5865F2]/40 via-[#3c45a5]/30 to-[#111214] relative p-3 flex justify-between items-start border-b border-white/5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 bg-black/50 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-1.5">
                        <Radio className="h-3 w-3 text-emerald-400" />
                        Live Discord Presence Preview
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded-full font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Output
                      </span>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                      {/* User Header */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-14 w-14 rounded-full border-2 border-white/10 bg-[#232428] overflow-hidden flex items-center justify-center shadow-lg">
                            {activeProfile?.skinPng ? (
                              <ProfileAvatar skinPng={activeProfile.skinPng} size={56} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-white font-bold text-lg">
                                {selectedProfile.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-[#23a55a] border-2 border-[#111214]" title="Online" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white tracking-tight">{selectedProfile}</span>
                            <span className="text-xs text-white/40 font-mono">#0001</span>
                            <span className="text-[9px] bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 px-1.5 py-0.2 rounded font-semibold tracking-wide">
                              VERIFIED
                            </span>
                          </div>
                          <p className="text-[11px] text-white/50">Playing on Obsyra Client</p>
                        </div>
                      </div>

                      {/* Discord Embedded Activity Box */}
                      <div className="rounded-xl bg-[#1e1f22] p-4 border border-white/5 flex flex-col gap-3">
                        <div className="text-[10px] font-bold tracking-wider text-white/70 uppercase">
                          PLAYING A GAME
                        </div>

                        <div className="flex items-center gap-3.5">
                          {/* Big Obsyra Logo */}
                          <div className="relative h-16 w-16 shrink-0 rounded-2xl bg-black/60 border border-white/10 p-1 flex items-center justify-center shadow-md">
                            <img src="/obsyra-logo.png" alt="Obsyra Logo" className="h-full w-full object-contain" />
                          </div>

                          {/* Activity Details */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                              Obsyra Launcher
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            </div>
                            <div className="text-xs font-semibold text-white/90 truncate">
                              {computedDiscordPresence.details}
                            </div>
                            <div className="text-xs text-white/60 truncate font-mono">
                              {computedDiscordPresence.state}
                            </div>
                            {discord.config.showTimer && (
                              <div className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5 font-mono">
                                <Clock className="h-3 w-3" />
                                <span>00:18:42 elapsed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Presence Display Options */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                      Presence Display Options
                    </h4>

                    {/* Show Minecraft Version */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-white">Show Minecraft Version</div>
                        <div className="text-[11px] text-muted-foreground">Display active Minecraft version on Discord profile</div>
                      </div>
                      <Switch
                        checked={discord.config.showVersion}
                        onCheckedChange={(checked) => discord.updateConfig({ showVersion: checked })}
                      />
                    </div>

                    {/* Show Profile Username */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        <div className="text-xs font-semibold text-white">Show Profile Username</div>
                        <div className="text-[11px] text-muted-foreground">Display active player nickname on Discord profile</div>
                      </div>
                      <Switch
                        checked={discord.config.showProfile}
                        onCheckedChange={(checked) => discord.updateConfig({ showProfile: checked })}
                      />
                    </div>

                    {/* Show Elapsed Timer */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        <div className="text-xs font-semibold text-white">Show Session Playtime Timer</div>
                        <div className="text-[11px] text-muted-foreground">Display live elapsed session duration on Discord</div>
                      </div>
                      <Switch
                        checked={discord.config.showTimer}
                        onCheckedChange={(checked) => discord.updateConfig({ showTimer: checked })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ================= TAB 7: ABOUT OBSYRA ================= */}
                <TabsContent value="about" className="flex flex-col gap-6">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-black border border-white/20">
                          <img src="/obsyra-logo.png" alt="Obsyra" className="h-full w-full object-contain p-1" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            Obsyra Launcher v{appVersion}
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                              Official Build
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground">The world's highest performance Minecraft launcher</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (updater.state === "ready") {
                            updater.installAndRelaunch();
                          } else {
                            updater.checkForUpdates(true);
                          }
                        }}
                        className="rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-xs cursor-pointer"
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
                      <div className="bg-primary/20 h-2 w-full overflow-hidden rounded-full mt-2">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${updater.progress}%` }}
                        />
                      </div>
                    )}

                    <div className="border-t border-white/10 pt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                      <div>Copyright © 2026 Obsyra Studio by AeroX. All rights reserved.</div>
                      <div className="text-[11px] opacity-70">
                        Official releases and signed packages are verified with cryptographically secure Ed25519 signatures.
                      </div>
                    </div>
                  </div>
                </TabsContent>

              </div>
            </div>
          </section>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
