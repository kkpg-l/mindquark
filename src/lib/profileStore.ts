export interface ProfileConfig {
  userName: string;
  userAvatar: string;
  femaleCounselorName: string;
  femaleCounselorAvatar: string;
  maleCounselorName: string;
  maleCounselorAvatar: string;
  defaultPersona: "female" | "male";
}

const DEFAULT_CONFIG: ProfileConfig = {
  userName: "You",
  userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  femaleCounselorName: "Maya",
  femaleCounselorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  maleCounselorName: "Liam",
  maleCounselorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  defaultPersona: "female",
};

const STORAGE_KEY = "mindquark_profile_config_v1";
export const PROFILE_UPDATE_EVENT = "mindquark_profile_updated";

export function getProfileConfig(): ProfileConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveProfileConfig(config: Partial<ProfileConfig>): void {
  if (typeof window === "undefined") return;
  try {
    const nextConfig: ProfileConfig = { ...getProfileConfig(), ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
    window.dispatchEvent(
      new CustomEvent<ProfileConfig>(PROFILE_UPDATE_EVENT, { detail: nextConfig })
    );
  } catch (err) {
    console.warn("Failed to save profile config to localStorage:", err);
  }
}

export function subscribeProfileConfig(listener: (config: ProfileConfig) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<ProfileConfig>;
    if (custom.detail) {
      listener(custom.detail);
    } else {
      listener(getProfileConfig());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      listener(getProfileConfig());
    }
  };

  window.addEventListener(PROFILE_UPDATE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(PROFILE_UPDATE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

export const PRESET_USER_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
];

export const PRESET_FEMALE_COUNSELOR_AVATARS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534751516642-a171edd26cb7?w=150&auto=format&fit=crop&q=80",
];

export const PRESET_MALE_COUNSELOR_AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
];
