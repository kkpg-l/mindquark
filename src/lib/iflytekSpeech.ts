const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://kkpg-d2ga363tca9086e3e-1469579803.ap-shanghai.app.tcloudbase.com"
).replace(/\/$/, "");

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
}

export class IFlytekVoiceDictation {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private browserRecognition: any = null;
  private handlers: SpeechRecognitionHandlers | null = null;
  private isRecording = false;
  private didNotifyEnd = false;
  private fullText = "";

  async start(
    handlers: SpeechRecognitionHandlers,
    language: "en_us" | "zh_cn" = "en_us"
  ): Promise<void> {
    if (this.isRecording) {
      this.stop();
      return;
    }

    this.handlers = handlers;
    this.didNotifyEnd = false;
    this.fullText = "";

    try {
      const authResponse = await fetch(`${API_BASE_URL}/api/iat-auth`);
      if (!authResponse.ok) {
        throw new Error("Failed to authenticate voice recognition service.");
      }

      const { url, appId } = await authResponse.json();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16_000 },
      });

      this.ws = new WebSocket(url);
      this.isRecording = true;
      handlers.onStart?.();

      this.ws.onopen = () => {
        this.ws?.send(
          JSON.stringify({
            common: { app_id: appId },
            business: {
              language,
              domain: "iat",
              accent: "mandarin",
              vad_eos: 5_000,
              dwa: "wpgs",
              pd: "health",
            },
            data: { status: 0, format: "audio/L16;rate=16000", encoding: "raw" },
          })
        );
        this.setupAudioRecording();
      };

      this.ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.code !== 0) {
            this.handlers?.onError?.(new Error(`iFlytek error (${response.code}): ${response.message}`));
            this.fallbackToBrowserSpeech(language);
            return;
          }

          const words = response.data?.result?.ws ?? [];
          const chunk = words
            .map((item: { cw?: Array<{ w?: string }> }) => item.cw?.[0]?.w || "")
            .join("");
          if (chunk) {
            this.fullText += chunk;
            this.handlers?.onResult?.(this.fullText, response.data?.status === 2);
          }

          if (response.data?.status === 2) {
            this.stop();
          }
        } catch (error) {
          console.warn("Unable to parse voice recognition response:", error);
        }
      };

      this.ws.onerror = () => {
        this.handlers?.onError?.(new Error("Voice recognition connection failed; trying browser fallback."));
        this.fallbackToBrowserSpeech(language);
      };

      this.ws.onclose = () => {
        if (this.isRecording && !this.browserRecognition) {
          this.fallbackToBrowserSpeech(language);
        }
      };
    } catch (error) {
      console.warn("Voice recognition initialization failed; trying browser fallback:", error);
      this.handlers?.onError?.(error instanceof Error ? error : new Error("Voice recognition unavailable."));
      this.fallbackToBrowserSpeech(language);
    }
  }

  private setupAudioRecording(): void {
    if (!this.mediaStream) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass({ sampleRate: 16_000 });
    const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);

    this.processor.onaudioprocess = (event) => {
      if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const pcm16 = this.floatTo16BitPCM(event.inputBuffer.getChannelData(0));
      this.ws.send(
        JSON.stringify({
          data: {
            status: 1,
            format: "audio/L16;rate=16000",
            encoding: "raw",
            audio: this.bufferToBase64(pcm16),
          },
        })
      );
    };
  }

  private fallbackToBrowserSpeech(language: "en_us" | "zh_cn"): void {
    this.releaseIatResources(false);

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      this.isRecording = false;
      this.handlers?.onError?.(new Error("Voice recognition is unavailable in this browser."));
      this.notifyEnd();
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      this.browserRecognition = recognition;
      this.isRecording = true;
      recognition.lang = language === "zh_cn" ? "zh-CN" : "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => this.handlers?.onStart?.();
      recognition.onresult = (event: any) => {
        const text = Array.from(event.results as ArrayLike<any>)
          .map((result: any) => result[0]?.transcript || "")
          .join("");
        this.handlers?.onResult?.(text, Boolean(event.results?.[event.results.length - 1]?.isFinal));
      };
      recognition.onerror = (event: any) => {
        this.handlers?.onError?.(new Error(event.error || "Browser speech recognition failed."));
      };
      recognition.onend = () => {
        this.browserRecognition = null;
        this.isRecording = false;
        this.notifyEnd();
      };
      recognition.start();
    } catch (error) {
      this.isRecording = false;
      this.handlers?.onError?.(error instanceof Error ? error : new Error("Browser speech recognition failed."));
      this.notifyEnd();
    }
  }

  private releaseIatResources(sendFinalFrame: boolean): void {
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }

    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== "closed") this.audioCtx.close().catch(() => {});
      } catch {}
      this.audioCtx = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.mediaStream = null;
    }

    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        if (sendFinalFrame && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ data: { status: 2, format: "audio/L16;rate=16000", encoding: "raw" } }));
        }
        ws.close();
      } catch {}
    }
  }

  private notifyEnd(): void {
    if (this.didNotifyEnd) return;
    this.didNotifyEnd = true;
    const handlers = this.handlers;
    this.handlers = null;
    handlers?.onEnd?.();
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    for (let index = 0; index < input.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, input[index]));
      output.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return output.buffer;
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.byteLength; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return window.btoa(binary);
  }

  stop(): void {
    const recognition = this.browserRecognition;
    this.browserRecognition = null;
    if (recognition) {
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {}
    }

    this.releaseIatResources(true);
    this.isRecording = false;
    this.notifyEnd();
  }
}
