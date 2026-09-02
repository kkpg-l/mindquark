declare global {
  interface Window {
    TencentCaptcha?: new (
      appId: string,
      callback: (res: TencentCaptchaResult) => void,
      options?: Record<string, unknown>
    ) => TencentCaptchaInstance;
    __TCAPTCHA_APP_ID__?: string;
  }
}

export interface TencentCaptchaResult {
  ret: number;
  ticket?: string;
  randstr?: string;
  bizState?: unknown;
  errorCode?: number;
  errorMessage?: string;
}

export interface TencentCaptchaInstance {
  show: () => void;
  destroy: () => void;
}

const TCAPTCHA_APP_ID =
  (import.meta.env.VITE_TCAPTCHA_APP_ID as string | undefined) ||
  (typeof window !== "undefined" ? window.__TCAPTCHA_APP_ID__ : undefined) ||
  "";

/**
 * Trigger seamless Tencent Cloud Captcha (防水墙) verification
 * If no APP ID is configured, resolves immediately with null (graceful degradation)
 */
export async function getCaptchaVerification(): Promise<{ ticket?: string; randstr?: string } | null> {
  if (!TCAPTCHA_APP_ID || typeof window === "undefined" || !window.TencentCaptcha) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const captcha = new (window as unknown as { TencentCaptcha: typeof window.TencentCaptcha }).TencentCaptcha(
        TCAPTCHA_APP_ID,
        (res: TencentCaptchaResult) => {
          if (res && res.ret === 0 && res.ticket && res.randstr) {
            resolve({ ticket: res.ticket, randstr: res.randstr });
          } else {
            resolve(null);
          }
        },
        {
          type: "popup",
          themeColor: "10b981", // Emerald theme matching MindQuark
        }
      );
      captcha.show();
    } catch (err) {
      console.warn("Tencent Captcha invocation warning:", err);
      resolve(null);
    }
  });
}
