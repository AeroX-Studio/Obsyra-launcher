use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Language {
    English,
    Russian,
    German,
    French,
    Spanish,
    Portuguese,
    Ukrainian,
    Chinese,
    Japanese,
    #[serde(other)]
    Unknown,
}

impl Default for Language {
    fn default() -> Self {
        Language::English
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Theme {
    Light,
    Dark,
}

impl Default for Theme {
    fn default() -> Self {
        Theme::Light
    }
}

fn default_true() -> bool {
    true
}

fn default_fps_preset() -> String {
    "competitive".to_string()
}

fn default_mouse_sensitivity() -> f32 {
    1.0
}

fn default_fov() -> i32 {
    70
}

fn default_false() -> bool {
    false
}

fn default_zero() -> i32 {
    0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherState {
    pub scale: i32,
    pub language: Language,
    pub theme: Theme,

    pub memory_amount: i32,
    pub auto_memory: bool,

    pub screen_width: i32,
    pub screen_height: i32,
    pub fullscreen: bool,
    pub jvm_arguments: String,
    pub java_path: Option<String>,
    pub close_after_launch: bool,

    pub release_filter: bool,
    pub modded_filter: bool,
    pub snapshot_filter: bool,
    pub legacy_filter: bool,

    pub selected_profile_id: Option<String>,
    pub selected_version_id: Option<String>,

    #[serde(default = "default_true")]
    pub fps_booster_enabled: bool,
    #[serde(default = "default_fps_preset")]
    pub fps_preset: String,
    #[serde(default = "default_true")]
    pub force_discrete_gpu: bool,
    #[serde(default = "default_true")]
    pub high_process_priority: bool,
    #[serde(default = "default_true")]
    pub pre_touch_memory: bool,
    #[serde(default = "default_true")]
    pub optimize_game_gc: bool,

    #[serde(default = "default_mouse_sensitivity")]
    pub mouse_sensitivity: f32,
    #[serde(default = "default_fov")]
    pub fov: i32,
    #[serde(default = "default_false")]
    pub invert_mouse: bool,
    #[serde(default = "default_false")]
    pub auto_jump: bool,
    #[serde(default = "default_false")]
    pub lock_instance_deletion: bool,
    #[serde(default = "default_zero")]
    pub playtime_limit_hours: i32,
    #[serde(default = "default_false")]
    pub safe_mode_addons: bool,
}

impl Default for LauncherState {
    fn default() -> Self {
        Self {
            scale: 1,
            language: Language::English,
            theme: Theme::Light,
            memory_amount: 4096,
            auto_memory: true,
            screen_width: 854,
            screen_height: 480,
            fullscreen: false,
            jvm_arguments: String::new(),
            java_path: None,
            close_after_launch: false,
            release_filter: true,
            modded_filter: true,
            snapshot_filter: false,
            legacy_filter: false,
            selected_profile_id: None,
            selected_version_id: None,
            fps_booster_enabled: true,
            fps_preset: "competitive".to_string(),
            force_discrete_gpu: true,
            high_process_priority: true,
            pre_touch_memory: true,
            optimize_game_gc: true,
            mouse_sensitivity: 1.0,
            fov: 70,
            invert_mouse: false,
            auto_jump: false,
            lock_instance_deletion: false,
            playtime_limit_hours: 0,
            safe_mode_addons: false,
        }
    }
}

impl LauncherState {
    pub fn normalize(&mut self) {
        self.scale = self.scale.max(1);
        self.memory_amount = self.memory_amount.clamp(512, 65536);
        self.mouse_sensitivity = self.mouse_sensitivity.clamp(0.1, 3.0);
        self.fov = self.fov.clamp(30, 110);
        self.playtime_limit_hours = self.playtime_limit_hours.clamp(0, 12);
        if self.auto_memory {
            let sys = sysinfo::System::new_with_specifics(
                sysinfo::RefreshKind::nothing()
                    .with_memory(sysinfo::MemoryRefreshKind::everything()),
            );
            let total_mb = sys.total_memory() / 1024 / 1024;
            let optimal_ram = if total_mb <= 4096 {
                2048
            } else if total_mb <= 8192 {
                3584
            } else if total_mb <= 16384 {
                6144
            } else {
                8192
            };
            self.memory_amount = optimal_ram.clamp(1024, 12288);
        }
        if self.screen_width < 1 {
            self.screen_width = 854;
        }
        if self.screen_height < 1 {
            self.screen_height = 480;
        }
    }

    pub fn get_path(_app_handle: &tauri::AppHandle) -> PathBuf {
        crate::minecraft::versions::get_minecraft_dir().join("launcher_state.json")
    }

    pub fn load(app_handle: &tauri::AppHandle) -> Self {
        let path = Self::get_path(app_handle);
        let mut state = if path.exists() {
            match fs::read_to_string(&path) {
                Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
                Err(_) => Self::default(),
            }
        } else {
            Self::default()
        };
        state.normalize();
        let _ = state.save(app_handle);
        state
    }

    pub fn save(&self, app_handle: &tauri::AppHandle) -> Result<(), String> {
        let path = Self::get_path(app_handle);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let contents = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(path, contents).map_err(|e| e.to_string())?;
        Ok(())
    }
}
