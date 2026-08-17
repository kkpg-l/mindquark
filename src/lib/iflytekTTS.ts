const API_BASE_URL = "https://kkpg-d2ga363tca9086e3e-1469579803.ap-shanghai.app.tcloudbase.com";

export interface TTSState {
  isPlaying: boolean;
  currentId: string | null;
}

class TTSAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentPlayingId: string | null = null;
  private onStateChangeListeners: Array<(state: TTSState) => void> = [];
  private cache: Map<string, string> = new Map();

  subscribe(listener: (state: TTSState) => void): () => void {
    this.onStateChangeListeners.push(listener);
    // Send immediate state snapshot
    listener({
      isPlaying: Boolean(this.currentPlayingId),
      currentId: this.currentPlayingId,
    });
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const state: TTSState = {
      isPlaying: Boolean(this.currentPlayingId),
      currentId: this.currentPlayingId,
    };
    this.onStateChangeListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn("TTS listener error:", e);
      }
    });
  }

  getCurrentPlayingId(): string | null {
    return this.currentPlayingId;
  }

  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.src = "";
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.currentPlayingId = null;
    this.notify();
  }

  async play(
    id: string,
    text: string,
    persona: "female" | "male" = "female",
    speed: number = 48
  ): Promise<void> {
    if (this.currentPlayingId === id) {
      this.stop();
      return;
    }

    this.stop();
    this.currentPlayingId = id;
    this.notify();

    try {
      const cacheKey = `${persona}_${speed}_${text.slice(0, 120)}`;
      let audioUrl = this.cache.get(cacheKey);

      if (!audioUrl) {
        const res = await fetch(`${API_BASE_URL}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: persona, speed }),
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) throw new Error("TTS generation failed");
        const data = await res.json();
        if (!data.audioBase64) throw new Error("No audio returned");

        audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;
        this.cache.set(cacheKey, audioUrl);
      }

      // If user stopped while fetching
      if (this.currentPlayingId !== id) return;

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        if (this.currentPlayingId === id) {
          this.currentPlayingId = null;
          this.currentAudio = null;
          this.notify();
        }
      };

      audio.onerror = () => {
        this.stop();
      };

      await audio.play();
    } catch (err) {
      console.warn("TTS playback error, trying Web Speech Synthesis fallback:", err);
      this.fallbackBrowserTTS(id, text, persona);
    }
  }

  private fallbackBrowserTTS(id: string, text: string, persona: "female" | "male") {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      this.stop();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = persona === "female" ? 1.1 : 0.9;

      utterance.onend = () => {
        if (this.currentPlayingId === id) {
          this.currentPlayingId = null;
          this.notify();
        }
      };

      utterance.onerror = () => {
        this.stop();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.stop();
    }
  }
}

export const ttsPlayer = new TTSAudioPlayer();
