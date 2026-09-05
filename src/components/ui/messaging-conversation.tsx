"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Copy,
  Flag,
  MoreHorizontal,
  MoreVertical,
  Reply,
  Trash2,
  UserMinus2,
  Send,
  Sparkles,
  Heart,
  ShieldAlert,
  Check,
  UserCheck,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Wind,
  Phone,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  sendChatMessage,
  createVoiceCall,
  getVoiceCallStatus,
  type ChatHistoryMessage,
  type CounselorPersona,
  type VoiceCallStatusResponse,
} from "@/services/api";
import { getProfileConfig, subscribeProfileConfig, type ProfileConfig } from "@/lib/profileStore";
import { logChatMessage } from "@/lib/activityLog";
import { ThinkingOrb } from "thinking-orbs";
import { IFlytekVoiceDictation } from "@/lib/iflytekSpeech";
import { ttsPlayer } from "@/lib/iflytekTTS";
import { VoiceCallModal, type VoiceCallPhase } from "@/components/VoiceCallModal";
import { useLanguage } from "@/lib/i18n";

type StatusType = "online" | "dnd" | "offline";

const STATUS_COLORS: Record<StatusType, string> = {
  online: "bg-emerald-500",
  dnd: "bg-rose-500",
  offline: "bg-gray-400",
};

function StatusBadge({ status = "online" }: { status?: StatusType }) {
  return (
    <span
      aria-label={status}
      className={cn(
        "inline-block size-2.5 rounded-full border-2 border-background",
        STATUS_COLORS[status]
      )}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  roleDescription: string;
  status?: StatusType;
}

export interface ChatMessage {
  id: number | string;
  text: string;
  sender: ChatUser;
  time: string;
  cbtTip?: string;
}

// User actions block in header
function UserActionsMenu({
  onClear,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenCallModal,
  language = "en",
}: {
  onClear?: () => void;
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
  onOpenCallModal?: () => void;
  language?: string;
}) {
  const isZh = language === "zh";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={isZh ? "更多操作" : "User actions"}
          className="size-8 rounded-full border-muted-foreground/30 text-muted-foreground hover:text-foreground"
          size="icon"
          type="button"
          variant="outline"
        >
          <MoreVertical
            aria-hidden="true"
            className="size-4"
            focusable="false"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48 rounded-xl bg-popover p-1.5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-1">
          {onOpenCallModal && (
            <Button
              onClick={onOpenCallModal}
              className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-emerald-700 dark:text-emerald-300 hover:bg-accent"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Phone aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-400" focusable="false" />
              <span>{isZh ? "发起电话关怀 (AI 电话)" : "Call Me (AI Phone Call)"}</span>
            </Button>
          )}

          <Button
            onClick={onToggleAutoSpeak}
            className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-foreground hover:bg-accent"
            size="sm"
            type="button"
            variant="ghost"
          >
            {autoSpeak ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4 text-muted-foreground" />}
            <span>{isZh ? (autoSpeak ? "自动朗读: 开启" : "自动朗读: 关闭") : (autoSpeak ? "Auto Voice: On" : "Auto Voice: Off")}</span>
          </Button>

          <Button
            onClick={onClear}
            className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-destructive hover:bg-accent"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" focusable="false" />
            <span>{isZh ? "清空当前对话" : "Delete Conversation"}</span>
          </Button>

          <Button
            className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-rose-600 hover:bg-accent"
            size="sm"
            type="button"
            variant="ghost"
          >
            <UserMinus2 aria-hidden="true" className="size-4" focusable="false" />
            <span>{isZh ? "切换咨询师" : "Block Persona"}</span>
          </Button>

          <Button
            className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-yellow-600 hover:bg-accent"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Flag aria-hidden="true" className="size-4" focusable="false" />
            <span>{isZh ? "反馈与帮助" : "Report Concern"}</span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Single message action dropdown on hover
function MessageActions({
  isMe,
  onCopy,
  onDelete,
  onReply,
  language = "en",
}: {
  isMe: boolean;
  onCopy?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  language?: string;
}) {
  const isZh = language === "zh";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={isZh ? "消息操作" : "Message actions"}
          className="size-7 rounded bg-background hover:bg-accent shadow-xs"
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal
            aria-hidden="true"
            className="size-3.5"
            focusable="false"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="w-40 rounded-xl bg-popover p-1.5 shadow-xl backdrop-blur-md"
      >
        <div className="flex flex-col gap-1">
          <Button
            onClick={onReply}
            aria-label={isZh ? "引用回复" : "Reply"}
            className="w-full justify-start gap-2 rounded-lg px-2.5 py-1 text-xs transition-[background-color] duration-150"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Reply aria-hidden="true" className="size-3.5" focusable="false" />
            <span>{isZh ? "引用回复" : "Reply"}</span>
          </Button>

          <Button
            onClick={onCopy}
            aria-label={isZh ? "复制内容" : "Copy"}
            className="w-full justify-start gap-2 rounded-lg px-2.5 py-1 text-xs transition-[background-color] duration-150"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-3.5" focusable="false" />
            <span>{isZh ? "复制内容" : "Copy"}</span>
          </Button>

          {isMe && (
            <Button
              onClick={onDelete}
              aria-label={isZh ? "删除" : "Delete"}
              className="w-full justify-start gap-2 rounded-lg px-2.5 py-1 text-destructive text-xs transition-[background-color] duration-150 hover:bg-destructive/10"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-3.5" focusable="false" />
              <span>{isZh ? "删除" : "Delete"}</span>
            </Button>
          )}

          <Button
            aria-label={isZh ? "反馈" : "Report"}
            className="w-full justify-start gap-2 rounded-lg px-2.5 py-1 text-xs transition-[background-color] duration-150 text-yellow-600 hover:bg-yellow-500/10"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Flag aria-hidden="true" className="size-3.5" focusable="false" />
            <span>{isZh ? "反馈" : "Report"}</span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MessageConversation({
  className,
  initialPrompt,
  onPromptConsumed,
  onNavigateToBreathe,
}: {
  className?: string;
  initialPrompt?: string;
  onPromptConsumed?: () => void;
  onNavigateToBreathe?: () => void;
}) {
  const [profile, setProfile] = useState<ProfileConfig>(getProfileConfig());
  const [persona, setPersona] = useState<CounselorPersona>(profile.defaultPersona || "female");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeProfileConfig((newProfile) => {
      setProfile(newProfile);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = ttsPlayer.subscribe((state) => {
      setPlayingMsgId(state.isPlaying ? state.currentId : null);
    });
    return unsubscribe;
  }, []);

  const { language, t } = useLanguage();
  const isZh = language === "zh";

  const currentUser: ChatUser = {
    id: "user-me",
    name: profile.userName || (isZh ? "你" : "You"),
    avatar: profile.userAvatar,
    roleDescription: isZh ? "正念探索者" : "Mindful Journey Seeker",
    status: "online",
  };

  const getCounselorUser = (p: CounselorPersona): ChatUser => {
    if (p === "female") {
      return {
        id: "counselor-female",
        name: profile.femaleCounselorName || "Maya",
        avatar: profile.femaleCounselorAvatar,
        roleDescription: isZh ? "🌸 温和倾听与共情接纳 (CBT 愈疗伙伴)" : "🌸 Gentle & Nurturing Perspective (CBT Companion)",
        status: "online",
      };
    }
    return {
      id: "counselor-male",
      name: profile.maleCounselorName || "Liam",
      avatar: profile.maleCounselorAvatar,
      roleDescription: isZh ? "🌿 理性拆解与思维梳理 (CBT 愈疗伙伴)" : "🌿 Steady & Grounded Perspective (CBT Companion)",
      status: "online",
    };
  };

  const currentCounselor = getCounselorUser(persona);

  const getGreetingText = (p: CounselorPersona) => {
    const counselorName = p === "female" ? profile.femaleCounselorName || "Maya" : profile.maleCounselorName || "Liam";
    const userName = profile.userName || (isZh ? "朋友" : "friend");
    if (p === "female") {
      return isZh
        ? `你好 ${userName === "朋友" ? "" : userName}，我是 ${counselorName}。🌸
这里是一个完全安全、温暖且没有评判的倾诉空间。先做一次深呼吸，今天有什么心事或感受，想和我聊聊吗？`
        : `Hello ${userName}, I'm ${counselorName}. 🌸
I'm here to offer you a quiet, warm space without any judgment. Whatever is resting heavily on your heart today, take a slow breath, and tell me whenever you feel ready.`;
    }
    return isZh
      ? `你好 ${userName === "朋友" ? "" : userName}，我是 ${counselorName}。🌿
不用着急，我们可以一起慢慢梳理你遇到的困惑与想法，一步一步找回内心的清晰与平静。你此刻感觉如何？`
      : `Welcome ${userName}, I'm ${counselorName}. 🌿
Take all the time you need. We can gently explore what you're experiencing step-by-step and help you find steady ground. How are you feeling right in this moment?`;
  };

  const createWelcomeMessage = (
    selectedPersona: CounselorPersona,
    id = `welcome-${Date.now()}`
  ): ChatMessage => ({
    id,
    text: getGreetingText(selectedPersona),
    sender: getCounselorUser(selectedPersona),
    time: new Date().toLocaleTimeString(isZh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }),
    cbtTip: isZh ? "专注倾听：安全、私密且无评判的包容空间。" : "Active Listening: Safe, confidential, and judgment-free space.",
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage(persona, "initial-welcome"),
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<"en_us" | "zh_cn">(isZh ? "zh_cn" : "en_us");

  // Keep welcome message & voice input in sync when language toggles
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && (prev[0].id === "initial-welcome" || String(prev[0].id).startsWith("welcome-"))) {
        return [createWelcomeMessage(persona, "initial-welcome")];
      }
      return prev;
    });
    setVoiceLanguage(isZh ? "zh_cn" : "en_us");
  }, [language, persona]);

  // CALL-E voice check-in call state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callPhase, setCallPhase] = useState<VoiceCallPhase>("form");
  const [callPhone, setCallPhone] = useState("");
  const [callConsent, setCallConsent] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callStatusText, setCallStatusText] = useState<string | null>(null);
  const activeCallIdRef = useRef<string | null>(null);

  const dictationRef = useRef<IFlytekVoiceDictation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dictationRef.current = new IFlytekVoiceDictation();
    return () => {
      dictationRef.current?.stop();
    };
  }, []);

  // Custom prompt from external navigation
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(initialPrompt.trim());
      onPromptConsumed?.();
    }
  }, [initialPrompt]);

  const handleToggleVoice = () => {
    if (!dictationRef.current) return;

    if (isRecordingVoice) {
      dictationRef.current.stop();
      setIsRecordingVoice(false);
    } else {
      setIsRecordingVoice(true);
      dictationRef.current.start(
        {
          onResult: (text: string, isFinal: boolean) => {
            setInputVal((prev) => (isFinal ? prev + text : prev));
          },
          onError: (error: Error) => {
            console.error("Dictation error:", error);
            setIsRecordingVoice(false);
          },
          onEnd: () => {
            setIsRecordingVoice(false);
          },
        },
        voiceLanguage
      );
    }
  };

  const handlePlayVoice = (msgId: string | number, text: string) => {
    const id = String(msgId);
    ttsPlayer.play(id, text, persona, 48);
  };

  const handlePersonaChange = (newPersona: CounselorPersona) => {
    if (newPersona === persona) return;
    ttsPlayer.stop();
    setPersona(newPersona);
    setMessages((prev) => (prev.length <= 1 ? [createWelcomeMessage(newPersona)] : prev));
  };

  // ── CALL-E「Call Me」外呼功能 ────────────────────────────────────────
  const addCounselorMessage = (text: string, cbtTip: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `voice-call-${Date.now()}`,
        text,
        sender: currentCounselor,
        time: new Date().toLocaleTimeString(isZh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }),
        cbtTip,
      },
    ]);
  };

  const postCallFollowup = (status: VoiceCallStatusResponse) => {
    if (status.ok && status.status === "completed") {
      const summary = status.result?.support_summary?.trim();
      const moodDelta = status.result?.mood_after_call;
      const moodNote =
        moodDelta === "improved"
          ? (isZh ? " 欣喜地看到通话后你的心情有所好转。" : " I'm glad our phone check-in helped you feel a bit lighter.")
          : moodDelta === "worsened"
            ? (isZh ? " 听得出刚才的话题有些沉重——没关系，我就在这里陪着你。" : " I hear that things felt heavier as we talked — that's okay, and I'm here.")
            : "";
      addCounselorMessage(
        `📞 ${isZh ? "很高兴刚才听到了你的声音。" : "It was so good to hear your voice just now."}${moodNote}${summary ? ` ${summary}` : ""} ${isZh ? "随时都可以回到这里和我倾诉，我一直都在。🌸" : "Remember, I'm right here in this chat whenever you need me. 🌸"}`,
        isZh ? "电话关怀 · 专属陪伴通话" : "Call Me • CALL-E Companion Call"
      );
      return;
    }

    if (status.ok && (status.status === "failed" || status.status === "canceled")) {
      addCounselorMessage(
        isZh
          ? "📞 刚才尝试拨打你的电话，但本次通话未能接通。我们稍后可以再试——或者你可以直接在这里继续和我打字倾诉。🌿"
          : "📞 I tried to reach you for our voice check-in, but the call couldn't go through this time. We can try again later — or just keep chatting with me right here. 🌿",
        isZh ? "电话关怀 · 通话未接通" : "Call Me • Call Not Connected"
      );
      return;
    }

    addCounselorMessage(
      isZh
        ? "📞 我们的语音通话正在整理中。完成后我会在此同步总结——同时，我一直在这里陪伴着你。"
        : "📞 Our voice check-in is still wrapping up on the line. I'll share a gentle note here once it's done — meanwhile, I'm right here with you.",
      isZh ? "电话关怀 · 正在整理记录" : "Call Me • Awaiting Final Report"
    );
  };

  // Poll the backend (which proxies CALL-E) while a call is in flight
  useEffect(() => {
    if (callPhase !== "calling") return;
    let cancelled = false;
    let attempts = 0;
    let consecutiveErrors = 0;
    const MAX_ATTEMPTS = 48;
    const MAX_CONSECUTIVE_ERRORS = 3;

    const poll = async () => {
      attempts += 1;
      const callId = activeCallIdRef.current;
      if (cancelled || !callId) return;

      const status = await getVoiceCallStatus(callId);
      if (cancelled) return;

      if (!status.ok) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setCallStatusText(isZh ? "状态同步遇到问题，但通话仍在继续" : "Status sync had an issue, but your call may still be active");
          setCallPhase("form");
          postCallFollowup({ ok: true, status: "completed", callId: callId || "", crisis: false });
          return;
        }
      } else {
        consecutiveErrors = 0;
        if (status.status === "ringing") {
          setCallStatusText(isZh ? "正在拨号，请留意接听..." : "Ringing your phone now...");
        } else if (status.status === "in_progress") {
          setCallStatusText(isZh ? "通话进行中..." : "Call in progress...");
        } else if (
          status.status === "completed" ||
          status.status === "failed" ||
          status.status === "canceled"
        ) {
          setCallPhase("form");
          postCallFollowup(status);
          return;
        }
      }

      if (attempts >= MAX_ATTEMPTS) {
        setCallPhase("form");
        postCallFollowup({ ok: true, status: "completed", callId: callId || "", crisis: false });
        return;
      }

      if (!cancelled) {
        setTimeout(poll, 5000);
      }
    };

    const timer = setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [callPhase]);

  const openVoiceCallModal = () => {
    setCallError(null);
    setCallModalOpen(true);
  };

  const handleStartVoiceCall = async () => {
    if (!callConsent) {
      setCallError(isZh ? "请勾选同意接收 AI 语音通话" : "Please check the box to consent to the voice call.");
      return;
    }
    const cleanPhone = callPhone.trim();
    if (!cleanPhone) {
      setCallError(isZh ? "请输入用于接听通话的电话号码" : "Please enter a phone number to call.");
      return;
    }
    setCallError(null);
    setCallPhase("creating");

    try {
      const resp = await createVoiceCall(cleanPhone, callConsent);
      if (!resp.ok) {
        setCallError(resp.error || (isZh ? "发起通话遇到问题，请检查号码格式重试" : "Could not place the call. Please check the number and try again."));
        setCallPhase("form");
        return;
      }
      activeCallIdRef.current = resp.callId ?? null;
      setCallPhase("calling");
      setCallStatusText(isZh ? "正在为您发起通话..." : "Initiating your call...");
    } catch (err) {
      setCallError(isZh ? "网络连接异常，请稍后重试" : "Network error. Please try again in a moment.");
      setCallPhase("form");
    }
  };

  const handleSend = async (forcedText?: string) => {
    const textToSend = forcedText !== undefined ? forcedText : inputVal;
    if (!textToSend.trim() || isTyping) return;

    ttsPlayer.stop();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: textToSend,
      sender: currentUser,
      time: new Date().toLocaleTimeString(isZh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    logChatMessage("user", textToSend);

    setInputVal("");
    setIsTyping(true);

    try {
      const historyPayload: ChatHistoryMessage[] = messages.slice(-8).map((message) => ({
        role: message.sender.id === currentUser.id ? "user" : "assistant",
        content: message.text,
      }));

      const replyData = await sendChatMessage(textToSend, historyPayload, persona);

      const counselorMsg: ChatMessage = {
        id: `counselor-${Date.now()}`,
        text: replyData.reply,
        sender: currentCounselor,
        time: new Date().toLocaleTimeString(isZh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }),
        cbtTip: replyData.cbtCategory
          ? `${replyData.cbtCategory}: ${replyData.cbtTip || (isZh ? "认知温和接纳" : "Cognitive gentle validation")}`
          : undefined,
      };

      setMessages((prev) => [...prev, counselorMsg]);

      if (replyData.isCrisis) {
        ttsPlayer.stop();
        setCrisisMessage(replyData.reply);
      } else if (autoSpeak && replyData.reply) {
        handlePlayVoice(counselorMsg.id, replyData.reply);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const fallbackMsg: ChatMessage = {
        id: `counselor-err-${Date.now()}`,
        text: isZh
          ? "我体会到了你此刻承受的压力。让我们一起做一次深长而缓慢的呼吸。在这里，你是全然被理解与安全的。"
          : "I hear the weight in what you're expressing. Let's take a deep, gentle breath together. You are safe here.",
        sender: currentCounselor,
        time: new Date().toLocaleTimeString(isZh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    ttsPlayer.stop();
    setCrisisMessage(null);
    setMessages([createWelcomeMessage(persona)]);
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const deleteMessage = (id: string | number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const replyToMessage = (text: string) => {
    setInputVal((prev) => (prev ? `${prev} [${isZh ? "引用" : "Ref"}: "${text.slice(0, 30)}..."] ` : `${isZh ? "关于" : "Regarding"} "${text.slice(0, 30)}...": `));
  };

  return (
    <Card
      className={cn(
        "mx-auto flex h-[84vh] min-h-[600px] max-w-3xl w-full grow flex-col overflow-hidden border border-white/15 dark:border-white/[0.08] bg-card/60 dark:bg-card/45 shadow-xl shadow-black/[0.04] backdrop-blur-2xl backdrop-saturate-[1.8] rounded-3xl",
        className
      )}
    >
      {/* Header */}
      <CardHeader className="sticky top-0 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-500/15 bg-emerald-500/5 dark:bg-emerald-950/20 px-5 py-3.5 backdrop-blur-md">
        {/* Active Counselor Info with StatusBadge */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="size-10 ring-2 ring-primary/20">
              <AvatarImage alt={currentCounselor.name} src={currentCounselor.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary">MQ</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0">
              <StatusBadge status={currentCounselor.status || "online"} />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm md:text-base">
              <span>{currentCounselor.name}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <Sparkles className="size-3 text-emerald-600" /> {isZh ? "CBT 伴侣" : "CBT Companion"}
              </span>
            </div>
            <div className="text-muted-foreground text-xs font-lato-light-italic">
              {currentCounselor.roleDescription}
            </div>
          </div>
        </div>

        {/* Persona Switcher & User Actions Menu */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="inline-flex items-center rounded-2xl border border-border/80 bg-muted/50 p-1">
            <button
              onClick={() => handlePersonaChange("female")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium transition-all",
                persona === "female"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>🌸 {profile.femaleCounselorName}</span>
              {persona === "female" && <UserCheck className="size-3 text-primary" />}
            </button>

            <button
              onClick={() => handlePersonaChange("male")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium transition-all",
                persona === "male"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>🌿 {profile.maleCounselorName}</span>
              {persona === "male" && <UserCheck className="size-3 text-primary" />}
            </button>
          </div>

          <Button
            variant="outline"
            onClick={openVoiceCallModal}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/25 text-xs sm:text-sm font-semibold h-[34px] min-w-[136px] sm:min-w-[146px] px-4 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
            title={isZh ? "向咨询师发起电话关怀" : "Ask your companion to call you"}
          >
            <Phone className="size-3.5 sm:size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{isZh ? "电话关怀" : "Call Me"}</span>
            {callPhase === "calling" && (
              <span className="relative flex size-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
            )}
          </Button>

          <UserActionsMenu
            onClear={clearChat}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
            onOpenCallModal={openVoiceCallModal}
            language={language}
          />
        </div>
      </CardHeader>

      {/* Messages Scroll Area */}
      <CardContent className="min-h-0 flex-1 p-0 relative bg-linear-to-b from-background/40 to-background/90">
        <ScrollArea
          ref={scrollRef}
          aria-label="Conversation transcript"
          className="flex h-full max-h-full flex-col gap-4 p-4 md:p-6"
          role="log"
        >
          {/* Gentle Note: Crisis Hotline Banner with soft lower opacity & clear contrast */}
          <div className="mx-auto my-2 max-w-xl rounded-2xl bg-amber-500/8 dark:bg-amber-950/25 p-3 text-center text-xs text-amber-950/85 dark:text-amber-200/90 border border-amber-500/25 leading-relaxed backdrop-blur-xs shadow-2xs">
            {isZh ? (
              <span>
                🌿 <strong>温馨提示</strong>：MindQuark 提供基于认知行为（CBT）的倾听与情绪梳理陪伴，不可替代临床精神心理医疗急救。如您或身边的人处于急性危机或严重心理困境，请立即拨打全国心理危机干预热线：<strong>400-161-9995</strong>，或青少年心理热线：<strong>12355</strong>（紧急情况请致电 <strong>110 / 120</strong>）。
              </span>
            ) : (
              <span>
                🌿 <strong>Gentle Note</strong>: MindQuark provides supportive CBT guidance and emotional reflection. It is not a replacement for clinical psychiatric emergency care. If in crisis, call or text <strong>988 (USA/Canada)</strong> or contact local emergency services immediately.
              </span>
            )}
          </div>

          {crisisMessage && (
            <div
              className="mx-auto my-3 flex max-w-lg items-start gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-foreground shadow-sm"
              role="alert"
            >
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-600" />
              <div className="space-y-2">
                <p className="font-semibold">{isZh ? "你的生命安全至关重要" : "Your safety comes first."}</p>
                <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                  {crisisMessage}
                </p>
                <a
                  className="inline-flex text-xs font-semibold text-rose-700 underline underline-offset-2 dark:text-rose-300"
                  href={isZh ? "tel:400-161-9995" : "https://findahelpline.com"}
                  rel="noreferrer"
                  target="_blank"
                >
                  {isZh ? "立即拨打全国心理危机干预热线 (400-161-9995)" : "Find verified local crisis support"}
                </a>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender.id === currentUser.id;
            const isThisPlaying = playingMsgId === String(msg.id);

            return (
              <div
                className={cn(
                  "group my-3 flex gap-2.5 animate-in fade-in-50 zoom-in-95 duration-200 ease-out-soft",
                  isMe ? "justify-end" : "justify-start"
                )}
                key={msg.id}
              >
                <div
                  className={cn(
                    "flex max-w-[85%] md:max-w-[78%] items-start gap-2.5",
                    isMe ? "flex-row-reverse" : undefined
                  )}
                >
                  <Avatar className="size-8.5 ring-1 ring-border shrink-0 mt-0.5">
                    <AvatarImage alt={msg.sender.name} src={msg.sender.avatar} />
                    <AvatarFallback>{msg.sender.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-xs transition-all relative",
                        isMe
                          ? "bg-emerald-600 text-white rounded-tr-xs"
                          : "bg-card/90 border border-emerald-500/15 text-foreground rounded-tl-xs shadow-xs"
                      )}
                    >
                      {msg.text}

                      {/* iFlytek Voice Playback Bar for counselor */}
                      {!isMe && (
                        <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handlePlayVoice(msg.id, msg.text)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                              isThisPlaying
                                ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                          >
                            {isThisPlaying ? (
                              <>
                                <VolumeX className="size-3.5 animate-pulse" />
                                <span>Stop Voice</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="size-3.5" />
                                <span>Listen Voice (iFlytek TTS)</span>
                              </>
                            )}
                          </button>

                          {msg.cbtTip && (
                            <div className="text-xs text-primary dark:text-emerald-400 font-medium flex items-center gap-1.5 font-lato-light-italic">
                              <Heart className="size-3.5 fill-primary/20 shrink-0" />
                              <span className="hidden sm:inline">{msg.cbtTip}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={cn(
                        "mt-1 flex items-center gap-2 px-1 text-[11px] text-muted-foreground font-light",
                        isMe ? "justify-end" : "justify-start"
                      )}
                    >
                      <time dateTime={msg.time}>{msg.time}</time>
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageActions
                          isMe={isMe}
                          onCopy={() => copyMessage(msg.text)}
                          onDelete={() => deleteMessage(msg.id)}
                          onReply={() => replyToMessage(msg.text)}
                          language={language}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking Orb Animation when AI is generating */}
          {isTyping && (
            <div className="my-3 flex justify-start animate-in fade-in-50 duration-300">
              <div className="flex max-w-[80%] items-center gap-3 rounded-2xl bg-card/50 dark:bg-card/40 border border-white/15 dark:border-white/[0.08] px-4 py-3 shadow-sm backdrop-blur-xl backdrop-saturate-150">
                <Avatar className="size-8 ring-1 ring-border shrink-0">
                  <AvatarImage alt={currentCounselor.name} src={currentCounselor.avatar} />
                  <AvatarFallback>{currentCounselor.name[0]}</AvatarFallback>
                </Avatar>
                <ThinkingOrb state="solving" size={64} speed={0.85} style={{ width: 48, height: 48 }} />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">
                    {currentCounselor.name} {isZh ? "正在静心思考..." : "is reflecting mindfully..."}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-lato-light-italic">
                    {isZh ? "构思共情与专业的 CBT 引导回应" : "Formulating empathetic CBT guidance"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Input Box Footer with Voice Dictation */}
      <div className="border-t border-emerald-500/15 bg-background/95 p-3 md:p-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* iFlytek Voice Input Button */}
          <Button
            type="button"
            variant={isRecordingVoice ? "destructive" : "outline"}
            size="icon"
            onClick={handleToggleVoice}
            className={cn(
              "size-10 rounded-xl shrink-0 transition-all",
              isRecordingVoice && "animate-pulse ring-2 ring-rose-500"
            )}
            title={isRecordingVoice ? (isZh ? "点击停止麦克风录音" : "Click to stop microphone streaming") : (isZh ? "讯飞语音听写 (麦克风)" : "iFlytek Voice Dictation (Microphone)")}
          >
            {isRecordingVoice ? (
              <MicOff className="size-4 text-white" />
            ) : (
              <Mic className="size-4 text-primary" />
            )}
          </Button>

          {/* Language Toggle for Voice Input */}
          <button
            type="button"
            onClick={() => setVoiceLanguage((prev) => (prev === "en_us" ? "zh_cn" : "en_us"))}
            className="hidden sm:inline-flex items-center rounded-lg border border-border/80 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
            title={isZh ? "切换讯飞语音听写识别语种" : "Switch iFlytek Speech Recognition Language"}
          >
            {voiceLanguage === "en_us" ? "EN 🇺🇸" : "中文 🇨🇳"}
          </button>

          {/* Main Input Textarea/Input */}
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isRecordingVoice
                ? (isZh ? "🎙️ 正在倾听您的声音 (讯飞语音识别)... 请轻柔讲述..." : "🎙️ Listening to your voice (iFlytek ASR)... speak gently...")
                : (isZh ? `向 ${currentCounselor.name} 倾诉此刻的心事与想法...` : `Share what's on your mind with ${currentCounselor.name}...`)
            }
            className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 font-light"
          />

          {/* Send Button */}
          <Button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputVal.trim() || isTyping}
            className="size-10 rounded-xl shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            title={isZh ? "发送消息" : "Send message"}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>

      {/* Call Me Modal */}
      <VoiceCallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        counselorName={currentCounselor.name}
        callPhase={callPhase}
        callPhone={callPhone}
        onPhoneChange={setCallPhone}
        callConsent={callConsent}
        onConsentChange={setCallConsent}
        callError={callError}
        callStatusText={callStatusText}
        onStartCall={handleStartVoiceCall}
      />
    </Card>
  );
}
