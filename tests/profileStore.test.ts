import { describe, it, expect } from "vitest";
import { getProfileConfig, saveProfileConfig } from "@/lib/profileStore";

describe("profileStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default config when storage is empty", () => {
    const profile = getProfileConfig();
    expect(profile).toEqual(expect.objectContaining({
      userName: "You",
      femaleCounselorName: "Maya",
      maleCounselorName: "Liam",
    }));
  });

  it("should load saved config and merge with defaults", () => {
    saveProfileConfig({
      userName: "TestUser",
      femaleCounselorName: "Aria",
      maleCounselorName: "Leo",
    });

    const profile = getProfileConfig();
    expect(profile.userName).toBe("TestUser");
    expect(profile.femaleCounselorName).toBe("Aria");
    expect(profile.maleCounselorName).toBe("Leo");
  });

  it("should not crash on invalid stored JSON", () => {
    localStorage.setItem("mindquark_profile_config_v1", "not-json");
    const profile = getProfileConfig();
    expect(profile).toEqual(expect.objectContaining({
      userName: "You",
    }));
  });
});
