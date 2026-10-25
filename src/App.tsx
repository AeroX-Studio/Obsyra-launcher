import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
      i18n.changeLanguage(state.language === "RUSSIAN" ? "ru" : "en");
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
        <div className="bg-background text-foreground flex h-screen w-screen flex-col overflow-hidden font-sans">
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
                  <div className="bg-card border-border/50 relative flex w-96 max-w-full flex-col gap-6 overflow-hidden rounded-xl border p-6 shadow-2xl backdrop-blur-md">
                    <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent" />

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
