const API_BASE_URL = "https://kkpg-d2ga363tca9086e3e-1469579803.ap-shanghai.app.tcloudbase.com";

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (err: Error) => void;
  onEnd?: () => void;
}

export class IFlytekVoiceDictation {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isRecording = false;
  private fullText = "";

  async start(handlers: SpeechRecognitionHandlers, lang: "en_us" | "zh_cn" = "en_us"): Promise<void> {
    if (this.isRecording) {
      this.stop();
      return;
    }

    this.fullText = "";

    try {
      // 1. Get authenticated WebSocket URL from our CloudBase backend
      const authRes = await fetch(`${API_BASE_URL}/api/iat-auth`);
      if (!authRes.ok) throw new Error("Failed to authenticate voice recognition service.");
      const { url, appId } = await authRes.json();

      // 2. Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      // 3. Connect to iFlytek WebSocket
      this.ws = new WebSocket(url);
      this.isRecording = true;
      handlers.onStart?.();

      this.ws.onopen = () => {
        // Send initial configuration frame
        const frame = {
          common: {
            app_id: appId,
          },
          business: {
            language: lang,
            domain: "iat",
            accent: "mandarin",
            vad_eos: 5000,
            dwa: "wpgs",
            pd: "health",
          },
          data: {
            status: 0,
            format: "audio/L16;rate=16000",
            encoding: "raw",
          },
        };
        this.ws?.send(JSON.stringify(frame));
        this.setupAudioRecording(handlers);
      };

      this.ws.onmessage = (e) => {
        try {
          const res = JSON.parse(e.data);
          if (res.code !== 0) {
            handlers.onError?.(new Error(`iFlytek Error (${res.code}): ${res.message}`));
            this.stop();
            return;
          }

          if (res.data?.result?.ws) {
            let chunkText = "";
            for (const wsItem of res.data.result.ws) {
              if (wsItem.cw?.[0]?.w) {
                chunkText += wsItem.cw[0].w;
              }
            }
            this.fullText += chunkText;
            handlers.onResult?.(this.fullText, res.data.status === 2);
          }

          if (res.data?.status === 2) {
            this.stop();
            handlers.onEnd?.();
          }
        } catch (err) {
          console.warn("Error parsing IAT response:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("iFlytek WebSocket error, falling back to Web Speech API if needed:", err);
        this.fallbackWebSpeech(handlers, lang);
      };

      this.ws.onclose = () => {
        this.stop();
        handlers.onEnd?.();
      };
    } catch (err: any) {
      console.warn("Microphone / IAT initialization error:", err);
      // Try Web Speech API fallback
      this.fallbackWebSpeech(handlers, lang);
    }
  }

  private setupAudioRecording(handlers: SpeechRecognitionHandlers) {
    if (!this.mediaStream) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass({ sampleRate: 16000 });
    const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = this.floatTo16BitPCM(input);
      const base64Audio = this.bufferToBase64(pcm16);

      const audioFrame = {
        data: {
          status: 1,
          format: "audio/L16;rate=16000",
          encoding: "raw",
          audio: base64Audio,
        },
      };
      this.ws.send(JSON.stringify(audioFrame));
    };
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output.buffer;
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Graceful browser Web Speech fallback if microphone format or streaming is interrupted
  private fallbackWebSpeech(handlers: SpeechRecognitionHandlers, lang: string) {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      handlers.onError?.(new Error("Voice recognition unavailable in this browser environment."));
      handlers.onEnd?.();
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = lang === "zh_cn" ? "zh-CN" : "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => handlers.onStart?.();
      recognition.onresult = (e: any) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        handlers.onResult?.(text, true);
      };
      recognition.onerror = (e: any) => {
        handlers.onError?.(new Error(e.error || "Speech error"));
      };
      recognition.onend = () => {
        this.stop();
        handlers.onEnd?.();
      };
      recognition.start();
    } catch (e: any) {
      handlers.onError?.(e);
      handlers.onEnd?.();
    }
  }

  stop(): void {
    this.isRecording = false;

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }

    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== "closed") {
          this.audioCtx.close().catch(() => {});
        }
      } catch {}
      this.audioCtx = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.mediaStream = null;
    }

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          // Send last frame to close gracefully
          this.ws.send(JSON.stringify({ data: { status: 2, format: "audio/L16;rate=16000", encoding: "raw" } }));
          this.ws.close();
        }
      } catch {}
      this.ws = null;
    }
  }
}
