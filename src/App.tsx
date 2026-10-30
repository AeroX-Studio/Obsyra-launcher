import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Header } from "./components/launcher/Header";
import { addGameLog } from "./lib/logger";
import { LaunchButton } from "./components/launcher/LaunchButton";
import { ProfileSelector } from "./components/launcher/ProfileSelector";
import { VersionSelector } from "./components/launcher/VersionSelector";
import { Onboarding } from "./components/launcher/Onboarding";
import "./i18n";
import { useLauncherStore } from "./state";
import { useAddonStore } from "./lib/addons/addonStore";
import { PluginSlot } from "./components/addons/PluginSlot";
import { useAutoUpdater } from "./lib/updater";
import { discordManager } from "./lib/discord";
import { Button } from "./components/ui/button";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
} from "framer-motion";

const LANGUAGE_CODE_MAP: Record<string, string> = {
  ENGLISH: "en",
  RUSSIAN: "ru",
  GERMAN: "de",
  FRENCH: "fr",
  SPANISH: "es",
  PORTUGUESE: "pt",
  UKRAINIAN: "uk",
  CHINESE: "zh",
  JAPANESE: "ja",
};

const App = () => {
  const {
    state,
    fetchState,
    fetchProfiles,
    fetchVersions,
    fetchStartupTime,
    fetchAppMemory,
    refreshProfileSkin,
    refreshProfileToken,
  } = useLauncherStore();
  const { t, i18n } = useTranslation();
  const updater = useAutoUpdater();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem("hasCompletedOnboarding") !== "true";
  });

  useEffect(() => {
    // Check for updates in background
    updater.checkForUpdates(false);

    // Initialize built-in Discord Rich Presence
    discordManager.init();

    // Initialize Addons
    useAddonStore.getState().initAddons();

    // Measure startup time
    fetchStartupTime().then(() => {
      const ms = useLauncherStore.getState().startupTimeMs;
      if (ms) {
        addGameLog("info", `[Obsyra] Launcher initialized in ${ms} ms`);
      }
    });

    fetchAppMemory();
    fetchState();
    fetchProfiles();
    fetchVersions();

    const memInterval = setInterval(() => {
      fetchAppMemory();
    }, 5000);

    return () => {
      clearInterval(memInterval);
    };
  }, [
    fetchState,
    fetchProfiles,
    fetchVersions,
    fetchStartupTime,
    fetchAppMemory,
  ]);

  useEffect(() => {
    if (!isTauri()) return;

    const unlistenLog = listen<string>("minecraft-log", (event) => {
      addGameLog("info", `[Minecraft] ${event.payload}`);
    });
    const unlistenErr = listen<string>("minecraft-error", (event) => {
      addGameLog("error", `[Minecraft] ${event.payload}`);
    });

    return () => {
      unlistenLog.then((f) => f());
      unlistenErr.then((f) => f());
    };
  }, []);

  useEffect(() => {
    if (state?.language) {
      i18n.changeLanguage(LANGUAGE_CODE_MAP[state.language] || "en");
    }
  }, [state?.language, i18n]);

  useEffect(() => {
    if (state?.selectedProfileId) {
      refreshProfileToken(state.selectedProfileId);
      refreshProfileSkin(state.selectedProfileId);
      discordManager.refresh();
    }
  }, [state?.selectedProfileId, refreshProfileSkin, refreshProfileToken]);

  useEffect(() => {
    if (state?.selectedVersionId) {
      discordManager.refresh();
    }
  }, [state?.selectedVersionId]);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-black font-sans text-foreground select-none">
          {/* Pure OLED Black Glassmorphism Canvas */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
            <div className="absolute -top-[20%] -left-[10%] h-[550px] w-[550px] rounded-full bg-white/[0.035] blur-[150px]" />
            <div className="absolute -bottom-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-white/[0.025] blur-[160px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_0%,transparent_75%)]" />
          </div>
          {showOnboarding && (
            <Onboarding
              onComplete={() => {
                localStorage.setItem("hasCompletedOnboarding", "true");
                setShowOnboarding(false);
              }}
            />
          )}
          <Header />
          <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
            <PluginSlot name="dashboard.widgets" className="mb-3" />
            <AnimatePresence>
              {state && (
                <m.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
                  className="flex max-w-full flex-row items-stretch gap-6"
                >
                  <div className="relative flex w-[390px] max-w-full flex-col gap-6 overflow-hidden rounded-3xl border border-white/15 bg-white/[0.03] p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-3xl transition-all duration-300">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/50" />

                    {/* Background Update Status Banner */}
                    <AnimatePresence>
                      {updater.state === "downloading" && (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-primary/10 border-primary/20 relative z-10 overflow-hidden rounded-lg border p-3"
                        >
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="flex items-center gap-1.5 text-primary">
                              <Download className="h-3.5 w-3.5 animate-bounce" />
                              {t("updater.downloading", { version: updater.availableVersion || "" })}
                            </span>
                            <span className="font-mono text-muted-foreground">{updater.progress}%</span>
                          </div>
                          <div className="bg-primary/20 mt-2 h-1.5 w-full overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full transition-all duration-300 ease-out"
                              style={{ width: `${updater.progress}%` }}
                            />
                          </div>
                        </m.div>
                      )}

                      {updater.state === "ready" && (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-emerald-500/10 border-emerald-500/30 relative z-10 flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                            <Sparkles className="h-4 w-4 shrink-0" />
                            <span>{t("updater.downloaded", "Update ready!")}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updater.installAndRelaunch()}
                            className="h-7 cursor-pointer bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500"
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Restart
                          </Button>
                        </m.div>
                      )}
                    </AnimatePresence>

                    <div className="relative z-10 flex h-full flex-col gap-6">
                      <ProfileSelector />
                      <VersionSelector />
                      <LaunchButton />
                    </div>
                  </div>

                  {/* Side Slot: Extensible for 3D Skin Viewer and custom side widgets */}
                  <PluginSlot name="dashboard.side" />
                </m.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
};

export default App;
