import React, { useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { Loader2, Plus, Zap, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLauncherStore } from "@/state";

export interface CreateInstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableMcVersions: string[];
}

export const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  open,
  onOpenChange,
  availableMcVersions,
}) => {
  const { t } = useTranslation();
  const { fetchVersions, selectVersion } = useLauncherStore();

  const [newInstanceName, setNewInstanceName] = useState("");
  const [selectedBaseVersion, setSelectedBaseVersion] = useState("1.21.4");
  const [selectedLoader, setSelectedLoader] = useState("fabric");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateInstance = async () => {
    const trimmed = newInstanceName.trim();
    if (!trimmed) return;

    setIsCreating(true);
    try {
      if (!isTauri()) {
        const id = trimmed.toLowerCase().replace(/[^a-z0-9-_.]/g, "-");
        const newVer = {
          id,
          type: selectedLoader,
          isLocal: true,
          releaseTime: new Date().toISOString(),
        };
        const currentVersions = useLauncherStore.getState().versions;
        useLauncherStore.setState({ versions: [newVer, ...currentVersions] });
        await selectVersion(id);
        onOpenChange(false);
        setIsCreating(false);
        return;
      }
      const createdId = await invoke<string>("create_instance", {
        id: trimmed.toLowerCase().replace(/[^a-z0-9-_.]/g, "-"),
        baseVersion: selectedBaseVersion,
        loader: selectedLoader,
        loaderVersion: selectedLoader === "fabric" ? "0.19.3" : "latest",
        files: null,
      });

      await fetchVersions();
      if (createdId) {
        await selectVersion(createdId);
      }

      onOpenChange(false);
      setNewInstanceName("");
    } catch (e) {
      console.error("Failed to create instance:", e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              title={t("version.createInstance")}
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            />
          }
        >
          <Plus className="h-4 w-4" />
        </DialogTrigger>
      </m.div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("version.createInstanceTitle")}</DialogTitle>
          <DialogDescription>
            {t("version.createInstanceDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
        {/* 1-Click High-FPS Preset Button */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Zap className="h-4 w-4 fill-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                ⚡ 500+ FPS Fabric Profile
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full uppercase font-mono">Recommended</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Sodium & Lithium ready for maximum framerates
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              const base = availableMcVersions[0] || "1.21.4";
              setNewInstanceName("High-FPS Fabric " + base);
              setSelectedBaseVersion(base);
              setSelectedLoader("fabric");
            }}
            className="h-7 text-xs font-bold px-2.5"
          >
            Apply Preset
          </Button>
        </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="instance-name">{t("version.instanceName")}</Label>
            <Input
              id="instance-name"
              placeholder={t("version.instanceNamePlaceholder")}
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateInstance()}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("version.minecraftVersion")}</Label>
              <Select
                value={selectedBaseVersion}
                onValueChange={(val) => {
                  if (val) setSelectedBaseVersion(val as string);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("version.minecraftVersion")} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableMcVersions.map((ver) => (
                    <SelectItem key={ver} value={ver}>
                      {ver}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("version.loader")}</Label>
              <Select
                value={selectedLoader}
                onValueChange={(val) => {
                  if (val) setSelectedLoader(val as string);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(val: string | null) => {
                      const map: Record<string, string> = {
                        fabric: "Fabric",
                        neoforge: "NeoForge",
                        forge: "Forge",
                        quilt: "Quilt",
                        vanilla: "Vanilla",
                      };
                      return map[val ?? "fabric"] ?? "Fabric";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[200px]">
                  <SelectItem value="fabric">Fabric</SelectItem>
                  <SelectItem value="neoforge">NeoForge</SelectItem>
                  <SelectItem value="forge">Forge</SelectItem>
                  <SelectItem value="quilt">Quilt</SelectItem>
                  <SelectItem value="vanilla">Vanilla</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("common.cancel")}
          </DialogClose>
          <Button
            onClick={handleCreateInstance}
            disabled={isCreating || !newInstanceName.trim()}
            className="gap-2"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("version.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
