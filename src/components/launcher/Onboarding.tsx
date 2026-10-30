import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLauncherStore, type Language } from "@/state";
import { AnimatePresence, m, type Variants } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Globe,
  UserCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { playStartupSound } from "@/lib/audio";
import { ProfileSelector } from "./ProfileSelector";

const ONBOARDING_LANGUAGES: { value: Language; label: string; flag: string }[] = [
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

interface OnboardingProps {
  onComplete: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, type: "spring", bounce: 0.3 },
  },
  exit: { opacity: 0, scale: 1.05, transition: { duration: 0.3 } },
};

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const { state, updateState, profiles } = useLauncherStore();

  useEffect(() => {
    playStartupSound();
  }, []);

  const handleLanguageChange = (lang: Language) => {
    if (state) {
      updateState({ ...state, language: lang });
    }
  };

  const handleNext = () => setStep((s) => s + 1);

  return (
    <div className="bg-black/80 backdrop-blur-2xl fixed inset-0 z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <m.div
            key="step0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-3xl border border-white/15 bg-black/90 p-10 backdrop-blur-3xl text-center shadow-2xl"
          >
<<<<<<< HEAD
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-black/80 p-2.5 shadow-2xl ring-1 ring-white/20 transition-transform hover:scale-105">
=======
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-black/80 p-2 shadow-2xl ring-1 ring-white/15 transition-transform duration-300 hover:scale-105 hover:ring-purple-500/40">
>>>>>>> 67baaec4492ac64546ba611939b01e1752334424
              <img
                src="/obsyra-logo.png"
                alt="Obsyra Launcher"
                className="h-20 w-20 rounded-2xl object-contain drop-shadow-md"
              />
            </div>
            <div>
              <h1 className="mb-2 text-3xl font-bold">
                {t("onboarding.welcome")}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("onboarding.description")}
              </p>
            </div>

            {/* Language Selection Card */}
            <div className="flex w-full flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md shadow-sm">
              <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs font-medium">
                <Globe className="text-primary h-3.5 w-3.5" />
                <span>Select Language</span>
              </div>
              <Select
                value={state?.language || "ENGLISH"}
                onValueChange={(val) => val && handleLanguageChange(val as Language)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
                  <SelectValue>
                    {() => {
                      const sel = ONBOARDING_LANGUAGES.find(
                        (l) => l.value === state?.language
                      ) || ONBOARDING_LANGUAGES[0];
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-base">{sel.flag}</span>
                          <span className="text-sm font-medium">{sel.label}</span>
                        </div>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  {ONBOARDING_LANGUAGES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.flag}</span>
                        <span className="text-sm">{item.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="mt-2 h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm transition-transform active:scale-[0.98]"
              onClick={handleNext}
            >
              <span>{t("onboarding.getStarted")}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </m.div>
        )}

        {step === 1 && (
          <m.div
            key="step1"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-3xl border border-white/15 bg-black/90 p-10 backdrop-blur-3xl shadow-2xl"
          >
            <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full shadow-inner">
              <UserCircle2 className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">
                {t("onboarding.profilesTitle")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("onboarding.profilesDesc")}
              </p>
            </div>
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
              <ProfileSelector />
            </div>
            <Button
              className="mt-4 h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm transition-transform active:scale-[0.98]"
              variant={profiles.length > 0 ? "default" : "secondary"}
              onClick={handleNext}
            >
              <span>{t("onboarding.continue")}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </m.div>
        )}

        {step === 2 && (
          <m.div
            key="step2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-3xl border border-white/15 bg-black/90 p-10 backdrop-blur-3xl text-center shadow-2xl"
          >
            <div className="bg-primary/10 text-primary flex h-24 w-24 items-center justify-center rounded-full shadow-inner">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div>
              <h2 className="mb-2 text-3xl font-bold">
                {t("onboarding.readyTitle")}
              </h2>
              <p className="text-muted-foreground">
                {t("onboarding.readyDesc")}
              </p>
            </div>
            <Button
              className="mt-4 h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm transition-transform active:scale-[0.98]"
              onClick={onComplete}
            >
              <span>{t("onboarding.finish")}</span>
            </Button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};
