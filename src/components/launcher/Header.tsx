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

const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: "ENGLISH", label: "English", flag: "🇬🇧" },
  { value: "RUSSIAN", label: "Русский", flag: "🇷🇺" },
  { value: "GERMAN", label: "Deutsch", flag: "🇩🇪" },
  { value: "FRENCH", label: "Français", flag: "🇫🇷" },
  { value: "SPANISH", label: "Español", flag: "🇪🇸" },
  { value: "PORTUGUESE", label: "Português", flag: "🇧🇷" },
  { value: "UKRAINIAN", label: "Українська", flag: "🇺🇦" },
  { value: "CHINESE", label: "简体中文", flag: "🇨🇳" },
  { value: "JAPANESE", label: "日本語", flag: "🇯🇵" },
];

export const Header = () => {
  const { state, updateState } = useLauncherStore();
  const { t } = useTranslation();

  const handleLanguageChange = (val: string | null) => {
    if (val && state) {
      updateState({ ...state, language: val as Language });
    }
  };

  const currentLang =
    LANGUAGE_OPTIONS.find((l) => l.value === state?.language) ||
    LANGUAGE_OPTIONS[0];

  return (
    <header
      data-tauri-drag-region
      className="border-border/50 bg-card/60 flex w-full cursor-default items-center justify-between border-b px-4 py-3 backdrop-blur-md select-none transition-colors"
    >
      <div
        className="pointer-events-none ml-2 flex items-center gap-3"
        data-tauri-drag-region
      >
        <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-black ring-1 ring-white/15 shadow-md transition-all duration-300 hover:scale-105 hover:ring-purple-500/40">
          <img
            src="/obsyra-logo.png"
            alt="Obsyra Launcher Logo"
            className="h-full w-full object-contain"
          />
        </div>
        <h1
          data-tauri-drag-region
          className="text-foreground text-xl font-bold tracking-tight"
        >
          {t("app.title", "Obsyra Launcher")}
        </h1>
      </div>
      {state && (
        <div className="flex items-center gap-2">
          <PluginSlot name="header.actions" className="mr-1" />
          <AddonsDialog />
          <ConsoleDialog />
          <SettingsDialog />

          <Select value={state.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[145px] h-9 border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/40">
              <SelectValue>
                {() => (
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-medium">{currentLang.flag} {currentLang.label}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {LANGUAGE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <span>{item.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </header>
  );
};
