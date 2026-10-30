import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Play, Download } from "lucide-react";
import { useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { useLauncherStore } from "@/state";

import { addonRegistry } from "@/lib/addons/registry";
import { m, AnimatePresence } from "framer-motion";

interface LaunchState {
  isLaunching: boolean;
  isRunning: boolean;
  launchStatus: string;
  launchProgress: number;
  launchDetail: string;
}

type LaunchAction =
  | { type: "SET_RUNNING"; isRunning: boolean }
  | { type: "START_LAUNCH" }
  | { type: "PROGRESS"; status: string; progress: number; detail?: string }
  | { type: "SUCCESS" }
  | { type: "FINISHED" }
  | { type: "ERROR" };

const initialLaunchState: LaunchState = {
  isLaunching: false,
  isRunning: false,
  launchStatus: "",
  launchProgress: 0,
  launchDetail: "",
};

function launchReducer(state: LaunchState, action: LaunchAction): LaunchState {
  switch (action.type) {
    case "SET_RUNNING":
      return { ...state, isRunning: action.isRunning };
    case "START_LAUNCH":
      return {
        ...state,
        isLaunching: true,
        launchStatus: "starting",
        launchProgress: 0,
        launchDetail: "",
      };
    case "PROGRESS":
      return {
        ...state,
        isLaunching: true,
        launchStatus: action.status,
        launchProgress: action.progress * 100,
        launchDetail: action.detail || "",
      };
    case "SUCCESS":
      return {
        ...state,
        isLaunching: false,
        isRunning: true,
        launchStatus: "",
        launchProgress: 0,
        launchDetail: "",
      };
    case "FINISHED":
    case "ERROR":
      return {
        ...state,
        isLaunching: false,
        isRunning: false,
        launchStatus: "",
        launchProgress: 0,
        launchDetail: "",
      };
    default:
      return state;
  }
}

export const LaunchButton = () => {
  const { state, versions } = useLauncherStore();
  const { t } = useTranslation();

  const [launchState, dispatch] = useReducer(launchReducer, initialLaunchState);
  const { isLaunching, isRunning, launchStatus, launchProgress, launchDetail } =
    launchState;

  const selectedVersion = versions.find(
    (v) => v.id === state?.selectedVersionId,
  );
  const isDownloaded = selectedVersion?.isLocal ?? false;

  useEffect(() => {
    if (!isTauri()) return;
    invoke<boolean>("is_game_running")
      .then((running) => {
        if (running) {
          dispatch({ type: "SET_RUNNING", isRunning: true });
        }
      })
      .catch(() => {});

    const unlisten = listen("launch-progress", (event) => {
      const payload = event.payload as {
        status: string;
        progress: number;
        detail?: string;
      };

      if (payload.status === "success") {
        dispatch({ type: "SUCCESS" });
      } else if (payload.status === "finished") {
        dispatch({ type: "FINISHED" });
      } else {
        dispatch({
          type: "PROGRESS",
          status: payload.status,
          progress: payload.progress,
          detail: payload.detail,
        });
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleLaunch = async () => {
    if (
      !state?.selectedProfileId ||
      !state?.selectedVersionId ||
      isLaunching ||
      isRunning
    )
      return;

    if (!isTauri()) {
      dispatch({ type: "START_LAUNCH" });
      setTimeout(() => {
        dispatch({
          type: "PROGRESS",
          status: "downloading_libraries",
          progress: 45,
          detail: "Simulating launcher environment...",
        });
      }, 400);
      setTimeout(() => {
        dispatch({
          type: "PROGRESS",
          status: "launching",
          progress: 90,
          detail: "Starting simulated game client...",
        });
      }, 900);
      setTimeout(() => {
        dispatch({ type: "SUCCESS" });
      }, 1400);
      return;
    }

    dispatch({ type: "START_LAUNCH" });

    try {
      const launchContext = {
        profileId: state.selectedProfileId,
        versionId: state.selectedVersionId,
        jvmArguments: state.jvmArguments
          ? state.jvmArguments.split(" ").filter(Boolean)
          : [],
        environment: {},
      };

      const allowed = await addonRegistry.runBeforeLaunchHooks(launchContext);
      if (!allowed) {
        dispatch({ type: "FINISHED" });
        return;
      }

      addonRegistry.emit("game:launching", {
        profileId: state.selectedProfileId,
        versionId: state.selectedVersionId,
      });

      await invoke("launch_game", {
        profileId: state.selectedProfileId,
        versionId: state.selectedVersionId,
      });
      useLauncherStore.getState().fetchVersions();
    } catch (error) {
      console.error(error);
      alert(`Launch error: ${error}`);
      dispatch({ type: "ERROR" });
    }
  };

  if (!state) return null;

  return (
    <div className="mt-auto flex flex-col gap-3 pt-4">
      <m.div
        whileHover={{ scale: isRunning || isLaunching ? 1 : 1.02 }}
        whileTap={{ scale: isRunning || isLaunching ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Button
          size="lg"
          className={`relative h-14 w-full overflow-hidden text-lg font-black uppercase tracking-wider rounded-2xl transition-all duration-300 ${
            isRunning
              ? "cursor-not-allowed border border-white/30 bg-white/10 text-white backdrop-blur-2xl opacity-90 shadow-[0_0_25px_rgba(255,255,255,0.25)]"
              : isLaunching
              ? "border border-white/40 bg-white/20 text-white backdrop-blur-2xl shadow-[0_0_25px_rgba(255,255,255,0.25)]"
              : "border border-white bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4),0_10px_25px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,1)] hover:bg-white/95 hover:shadow-[0_0_45px_rgba(255,255,255,0.65)] hover:scale-[1.01]"
          }`}
          disabled={
            !state.selectedProfileId ||
            !state.selectedVersionId ||
            isLaunching ||
            isRunning
          }
          onClick={handleLaunch}
        >
          {/* Subtle Glassmorphic Shine Overlay */}
          {!isRunning && !isLaunching && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
          )}
          <AnimatePresence mode="wait">
            {isRunning ? (
              <m.div
                key="running"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center gap-2.5"
              >
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-sm font-semibold tracking-wide">
                  {t("launch.running")}
                </span>
              </m.div>
            ) : isLaunching ? (
              <m.div
                key="launching"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex w-full flex-col items-center gap-1"
              >
                <span className="text-sm font-normal">
                  {t(`launch.${launchStatus}`)} {Math.round(launchProgress)}%{" "}
                  {launchDetail ? `(${launchDetail})` : ""}
                </span>
                <Progress
                  value={launchProgress}
                  className="h-1.5 w-full transition-[width]"
                />
              </m.div>
            ) : (
              <m.div
                key={isDownloaded ? "play" : "download"}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center text-black font-black tracking-wider"
              >
                {isDownloaded ? (
                  <Play className="mr-2.5 h-5 w-5 fill-black text-black" />
                ) : (
                  <Download className="mr-2.5 h-5 w-5 text-black" />
                )}
                {isDownloaded ? t("launch.play") : t("launch.download")}
              </m.div>
            )}
          </AnimatePresence>
        </Button>
      </m.div>
    </div>
  );
};
