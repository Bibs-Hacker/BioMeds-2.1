import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
export const themes = {
  light: "Medical Light",
  dark: "Midnight Navy",
  teal: "Clinical Teal",
  contrast: "High Contrast",
  system: "Match device",
};
export const fonts = {
  system: "System Sans",
  humanist: "Humanist Sans",
  serif: "Readable Serif",
  mono: "Engineering Mono",
};
type Preferences = {
  theme: keyof typeof themes;
  font: keyof typeof fonts;
  size: "standard" | "large";
  density: "comfortable" | "compact";
  motion: "system" | "reduced";
};
export const appearanceDefaults: Preferences = {
  theme: "system",
  font: "system",
  size: "standard",
  density: "comfortable",
  motion: "system",
};
export function normalizeAppearance(value: Partial<Preferences>): Preferences {
  value = value && typeof value === "object" ? value : {};
  return {
    theme: value.theme && value.theme in themes ? value.theme : "system",
    font: value.font && value.font in fonts ? value.font : "system",
    size: value.size === "large" ? "large" : "standard",
    density: value.density === "compact" ? "compact" : "comfortable",
    motion: value.motion === "reduced" ? "reduced" : "system",
  };
}
const C = createContext<{
  preferences: Preferences;
  update: (v: Partial<Preferences>) => void;
  reset: () => void;
}>(null!);
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preferences, set] = useState<Preferences>(() => {
    try {
      return normalizeAppearance(
        JSON.parse(localStorage.getItem("medeng-appearance") || "{}"),
      );
    } catch {
      return appearanceDefaults;
    }
  });
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const el = document.documentElement;
      el.dataset.theme =
        preferences.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : preferences.theme;
      el.dataset.font = preferences.font;
      el.dataset.size = preferences.size;
      el.dataset.density = preferences.density;
      el.dataset.motion = preferences.motion;
    };
    apply();
    media.addEventListener("change", apply);
    try {
      localStorage.setItem("medeng-appearance", JSON.stringify(preferences));
    } catch {
      /* Private-mode storage can be unavailable; preferences still apply in-memory. */
    }
    return () => media.removeEventListener("change", apply);
  }, [preferences]);
  return (
    <C.Provider
      value={{
        preferences,
        update: (v) => set((p) => normalizeAppearance({ ...p, ...v })),
        reset: () => set(appearanceDefaults),
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useAppearance = () => useContext(C);
