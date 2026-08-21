// Pure Web Audio API Harmonic Tibetan Chime & Zen Bell Synthesizer

class ChimeAudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a soft, calming Tibetan singing bowl chime with gentle harmonic overtone resonance
   */
  public playPhaseChime(type: "inhale" | "hold" | "exhale" | "complete") {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      let rootFreq = 432; // Healing A4

      if (type === "inhale") rootFreq = 528; // Transformation/Love tone (Solfeggio 528Hz)
      if (type === "hold") rootFreq = 396; // Grounding / Calm (Solfeggio 396Hz)
      if (type === "exhale") rootFreq = 432; // Serene natural balance (432Hz)
      if (type === "complete") rootFreq = 639; // Heart connection (Solfeggio 639Hz)

      // Tibetan singing bowl harmonic structure: Fundamental + Perfect 5th + 2nd Octave + Golden Overtones
      const frequencies = [
        rootFreq,
        rootFreq * 1.5,
        rootFreq * 2.01,
        rootFreq * 2.76,
        rootFreq * 3.33,
      ];
      const gains = [0.24, 0.12, 0.05, 0.02, 0.008];

      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Exponential decay envelope resembling hammered bronze bowl
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(gains[idx], now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 3.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 3.5);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (_) {
            // Ignore
          }
        };
      });
    } catch (err) {
      console.warn("Web Audio Chime Error:", err);
    }
  }
}

export const chimeAudio = new ChimeAudioService();
