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
import { Settings, Zap, Cpu, Clock, RefreshCw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { useDiscordRpc } from "@/lib/discord";
import { useAutoUpdater } from "@/lib/updater";

export const SettingsDialog = () => {
  const { state, updateState, fetchVersions, startupTimeMs, appMemoryMb } =
    useLauncherStore();
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>("1.0.1");
  const [totalPlaytime, setTotalPlaytime] = useState<string | null>(null);

  const discord = useDiscordRpc();
  const updater = useAutoUpdater();

  useEffect(() => {
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

  if (!state) return null;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Settings className="h-5 w-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="game" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="game">{t("settings.game")}</TabsTrigger>
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
          <TabsContent value="discord" className="flex flex-col gap-4 py-4">
            <div className="bg-card/50 border-border/40 flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    discord.config.enabled && discord.status === "connected"
                      ? "bg-[#5865F2]/20 text-[#5865F2]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold">Discord Rich Presence</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        discord.config.enabled && discord.status === "connected"
                          ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
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

            <div className="flex items-center justify-between">
              <Label className="flex flex-col items-start gap-1">
                <span>Show Minecraft Version</span>
                <span className="text-xs text-muted-foreground">
                  Display current Minecraft version on Discord profile
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

            <div className="flex items-center justify-between">
              <Label className="flex flex-col items-start gap-1">
                <span>Show Profile Username</span>
                <span className="text-xs text-muted-foreground">
                  Display current player username on Discord profile
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

            <div className="flex flex-col gap-2">
              <Label>Custom Status Text</Label>
              <Input
                disabled={!discord.config.enabled}
                value={discord.config.customDetails}
                onChange={(e) =>
                  discord.updateConfig({
                    ...discord.config,
                    customDetails: e.target.value,
                  })
                }
                placeholder="Playing Obsyra Launcher"
              />
            </div>
          </TabsContent>

          {/* About Tab with Branding & Updater */}
          <TabsContent value="about" className="flex flex-col gap-4 py-4">
            <div className="bg-card/40 border-border/40 flex items-center gap-4 rounded-xl border p-4">
              <img
                src="/obsyra-logo.png"
                alt="Obsyra Launcher"
                className="h-16 w-16 object-contain drop-shadow-md"
              />
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
