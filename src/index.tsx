import React, { Suspense } from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Input } from "./components/ui/input";
import { Switch } from "./components/ui/switch";
import { Slider } from "./components/ui/slider";
import { Progress } from "./components/ui/progress";
import { Label } from "./components/ui/label";
import { useLauncherStore } from "./state";
import { useAddonStore } from "./lib/addons/addonStore";

// Expose React runtime and components to dynamically imported external addons
window.React = React;
window.ReactDOM = ReactDOM;
window.Obsy = {
  Button,
  useLauncherStore,
  useAddonStore,
  ui: {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Input,
    Switch,
    Slider,
    Progress,
    Label,
  },
};
window.Obsyra = window.Obsy;

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Obsyra Root Error Boundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-black p-6 text-center text-white">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          </div>
          <h2 className="mb-2 text-xl font-bold tracking-tight">Launcher Encountered an Issue</h2>
          <p className="mb-6 max-w-md font-mono text-xs text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred while loading components."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/20 bg-white px-5 py-2 text-xs font-semibold text-black transition-all hover:bg-white/90"
          >
            Reload Launcher
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");

createRoot(root!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <Suspense
        fallback={
          <div className="bg-background flex h-screen w-screen items-center justify-center" />
        }
      >
        <App />
      </Suspense>
    </RootErrorBoundary>
  </React.StrictMode>,
);

