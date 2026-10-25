import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLauncherStore, type Language } from "@/state";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsDialog } from "./SettingsDialog";
import { ConsoleDialog } from "./ConsoleDialog";
import { AddonsDialog } from "@/components/addons/AddonsDialog";
import { PluginSlot } from "@/components/addons/PluginSlot";
import { useDiscordRpc } from "@/lib/discord";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const { state, updateState } = useLauncherStore();
  const { t } = useTranslation();
  const discord = useDiscordRpc();

  const handleLanguageChange = (val: string | null) => {
    if (val && state) {
      updateState({ ...state, language: val as Language });
    }
  };

  const toggleDiscord = () => {
    discord.updateConfig({
      ...discord.config,
      enabled: !discord.config.enabled,
    });
  };

  return (
    <header
      data-tauri-drag-region
      className="border-border/50 bg-card/50 flex w-full cursor-default items-center justify-between border-b p-4 backdrop-blur-md select-none"
    >
      <div
        className="pointer-events-none ml-3 flex items-center gap-3"
        data-tauri-drag-region
      >
        <img
          src="/obsyra-logo.png"
          alt="Obsyra Launcher Logo"
          className="h-8 w-8 object-contain drop-shadow transition-transform hover:scale-105"
        />
        <h1
          data-tauri-drag-region
          className="text-foreground text-xl font-bold tracking-tight"
        >
          {t("app.title", "Obsyra Launcher")}
        </h1>
      </div>
      {state && (
        <div className="flex items-center gap-2">
          {/* First-Party Discord Rich Presence Header Widget */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDiscord}
            title={
              discord.config.enabled
                ? discord.status === "connected"
                  ? "Discord RPC: Connected"
                  : discord.status === "connecting"
                  ? "Discord RPC: Connecting..."
                  : "Discord RPC: Disconnected (Open Discord desktop)"
                : "Discord RPC: Disabled (Click to enable)"
            }
            className={`border-border/40 bg-card/40 flex h-9 cursor-pointer items-center gap-2 px-3 text-xs font-semibold whitespace-nowrap backdrop-blur-sm transition-all ${
              discord.config.enabled && discord.status === "connected"
                ? "text-foreground hover:border-[#5865F2]/50 hover:bg-[#5865F2]/10"
                : "text-muted-foreground opacity-60 hover:border-border/60 hover:bg-accent/40"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="currentColor"
              className={
                discord.config.enabled && discord.status === "connected"
                  ? "text-[#5865F2] shrink-0"
                  : "text-muted-foreground shrink-0"
              }
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Discord</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                discord.config.enabled && discord.status === "connected"
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                  : discord.config.enabled && discord.status === "connecting"
                  ? "bg-amber-400 animate-ping"
                  : "bg-muted-foreground/40"
              }`}
            />
          </Button>

          <PluginSlot name="header.actions" className="mr-1" />
          <AddonsDialog />
          <ConsoleDialog />
          <SettingsDialog />

          <Select value={state.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue>
                {(val: Language | null) => (
                  <div className="flex items-center gap-2">
                    <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span>{val === "RUSSIAN" ? "Русский" : "English"}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ENGLISH">English</SelectItem>
              <SelectItem value="RUSSIAN">Русский</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </header>
  );
};
