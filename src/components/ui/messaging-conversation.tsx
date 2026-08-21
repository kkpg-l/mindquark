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
  type ChatHistoryMessage,
  type CounselorPersona,
} from "@/services/api";
import { getProfileConfig, subscribeProfileConfig, type ProfileConfig } from "@/lib/profileStore";
import { ThinkingOrb } from "thinking-orbs";
import { IFlytekVoiceDictation } from "@/lib/iflytekSpeech";
import { ttsPlayer } from "@/lib/iflytekTTS";

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
}: {
  onClear?: () => void;
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="User actions"
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
      <DropdownMenuContent className="min-w-44 rounded-xl bg-popover p-1.5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <Button
            onClick={onToggleAutoSpeak}
            className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-foreground hover:bg-accent"
            size="sm"
            type="button"
            variant="ghost"
          >
            {autoSpeak ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4 text-muted-foreground" />}
            <span>{autoSpeak ? "Auto Voice: On" : "Auto Voice: Off"}</span>
          </Button>

          <Button
            onClick={onClear}
            className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-destructive hover:bg-accent"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" focusable="false" />
            <span>Delete Conversation</span>
          </Button>

          <Button
            className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-rose-600 hover:bg-accent"
            size="sm"
            type="button"
            variant="ghost"
          >
            <UserMinus2 aria-hidden="true" className="size-4" focusable="false" />
            <span>Block Persona</span>
          </Button>

          <Button
            className="w-full justify-start gap-2.5 rounded-lg text-xs font-medium bg-transparent text-yellow-600 hover:bg-accent"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Flag aria-hidden="true" className="size-4" focusable="false" />
            <span>Report Concern</span>
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
}: {
  isMe: boolean;
  onCopy?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Message actions"
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
            aria-label="Reply"
            className="w-full justify-start gap-2 rounded-lg px-2.5 py-1 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Reply aria-hidden="true" className="size-3.5" focusable="false" />
            <span>Reply</span>
          </Button>

          <Button
            onClick={onCopy}
            aria-label="Copy"
            className="w-full justify-start gap-2 rounded-lg px-2.5 py-1 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-3.5" focusable="false" />
            <span>Copy</span>
          </Button>

          {isMe && (
            <Button
              onClick={onDelete}
              aria-label="Delete"
              className="w-full justify-start gap-2 rounded-lg px-2.5 py-1 text-destructive text-xs hover:bg-destructive/10"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-3.5" focusable="false" />
              <span>Delete</span>
            </Button>
          )}

          <Button
            aria-label="Report"
            className="w-full justify-start gap-2 rounded-lg px-2.5 py-1 text-xs text-yellow-600 hover:bg-yellow-500/10"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Flag aria-hidden="true" className="size-3.5" focusable="false" />
            <span>Report</span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MessageConversation({
  className,
  onNavigateToBreathe,
}: {
  className?: string;
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

  const currentUser: ChatUser = {
    id: "user-me",
    name: profile.userName || "You",
    avatar: profile.userAvatar,
    roleDescription: "Mindful Journey Seeker",
    status: "online",
  };

  const getCounselorUser = (p: CounselorPersona): ChatUser => {
    if (p === "female") {
      return {
        id: "counselor-female",
        name: profile.femaleCounselorName || "Maya",
        avatar: profile.femaleCounselorAvatar,
        roleDescription: "🌸 Gentle & Nurturing Perspective (CBT Companion)",
        status: "online",
      };
    }
    return {
      id: "counselor-male",
      name: profile.maleCounselorName || "Liam",
      avatar: profile.maleCounselorAvatar,
      roleDescription: "🌿 Steady & Grounded Perspective (CBT Companion)",
      status: "online",
    };
  };

  const currentCounselor = getCounselorUser(persona);

  const getGreetingText = (p: CounselorPersona) => {
    const counselorName = p === "female" ? profile.femaleCounselorName || "Maya" : profile.maleCounselorName || "Liam";
    const userName = profile.userName || "friend";
    if (p === "female") {
      return `Hello ${userName}, I'm ${counselorName}. 🌸
I'm here to offer you a quiet, warm space without any judgment. Whatever is resting heavily on your heart today, take a slow breath, and tell me whenever you feel ready.`;
    }
    return `Welcome ${userName}, I'm ${counselorName}. 🌿
Take all the time you need. We can gently explore what you're experiencing step-by-step and help you find steady ground. How are you feeling right in this moment?`;
  };

  const createWelcomeMessage = (
    selectedPersona: CounselorPersona,
    id = `welcome-${Date.now()}`
  ): ChatMessage => ({
    id,
    text: getGreetingText(selectedPersona),
    sender: getCounselorUser(selectedPersona),
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    cbtTip: "Active Listening: Safe, confidential, and judgment-free space.",
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage(persona, "initial-welcome"),
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<"en_us" | "zh_cn">("en_us");
  const dictationRef = useRef<IFlytekVoiceDictation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dictationRef.current = new IFlytekVoiceDictation();
    return () => {
      dictationRef.current?.stop();
    };
  }, []);

  const handleToggleVoice = async () => {
    if (isRecordingVoice) {
      dictationRef.current?.stop();
      setIsRecordingVoice(false);
    } else {
      setIsRecordingVoice(true);
      dictationRef.current?.start(
        {
          onStart: () => setIsRecordingVoice(true),
          onResult: (text) => {
            setInputVal((prev) => (prev ? `${prev} ${text}` : text));
          },
          onError: (err) => {
            console.warn("Voice dictation error:", err);
            setIsRecordingVoice(false);
          },
          onEnd: () => setIsRecordingVoice(false),
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

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || inputVal).trim();
    if (!textToSend) return;

    if (isRecordingVoice) {
      dictationRef.current?.stop();
      setIsRecordingVoice(false);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: textToSend,
      sender: currentUser,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
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
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        cbtTip: replyData.cbtCategory
          ? `${replyData.cbtCategory}: ${replyData.cbtTip || "Cognitive gentle validation"}`
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
        text: "I hear the weight in what you're expressing. Let's take a deep, gentle breath together. You are safe here.",
        sender: currentCounselor,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
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
    setInputVal((prev) => (prev ? `${prev} [Ref: "${text.slice(0, 30)}..."] ` : `Regarding "${text.slice(0, 30)}...": `));
  };

  return (
    <Card
      className={cn(
        "mx-auto flex h-[84vh] min-h-[600px] max-w-3xl w-full grow flex-col overflow-hidden border border-emerald-500/20 bg-card/90 dark:bg-card/75 shadow-xl shadow-emerald-500/5 backdrop-blur-xl rounded-3xl",
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
                <Sparkles className="size-3 text-emerald-600" /> CBT Companion
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

          {onNavigateToBreathe && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToBreathe}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs h-8 px-3 transition-all cursor-pointer"
            >
              <Wind className="size-3.5 text-teal-500" />
              <span>Breathe Sanctuary</span>
            </Button>
          )}

          <UserActionsMenu
            onClear={clearChat}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
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
          <div className="mx-auto my-2 max-w-lg rounded-2xl bg-amber-500/8 dark:bg-amber-950/25 p-3 text-center text-xs text-amber-950/85 dark:text-amber-200/90 border border-amber-500/25 font-lato-light-italic backdrop-blur-xs shadow-2xs">
            🌿 <strong>Gentle Note</strong>: MindQuark provides supportive CBT guidance and emotional reflection. It is not a replacement for clinical psychiatric emergency care. If in crisis, call or text <strong>988 (USA/Canada)</strong>.
          </div>

          {crisisMessage && (
            <div
              className="mx-auto my-3 flex max-w-lg items-start gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-foreground shadow-sm"
              role="alert"
            >
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-600" />
              <div className="space-y-2">
                <p className="font-semibold">Your safety comes first.</p>
                <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                  {crisisMessage}
                </p>
                <a
                  className="inline-flex text-xs font-semibold text-rose-700 underline underline-offset-2 dark:text-rose-300"
                  href="https://findahelpline.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  Find verified local crisis support
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
                  "group my-3 flex gap-2.5 animate-in fade-in-50 duration-300",
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
            <div className="my-3 flex justify-start animate-in fade-in duration-300">
              <div className="flex max-w-[80%] items-center gap-3 rounded-2xl bg-card/80 border border-emerald-500/20 px-4 py-3 shadow-sm backdrop-blur-md">
                <Avatar className="size-8 ring-1 ring-border shrink-0">
                  <AvatarImage alt={currentCounselor.name} src={currentCounselor.avatar} />
                  <AvatarFallback>{currentCounselor.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-3">
                  <ThinkingOrb state="solving" size={64} speed={0.85} style={{ width: 48, height: 48 }} />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">
                      {currentCounselor.name} is reflecting mindfully...
                    </span>
                    <span className="text-[11px] text-muted-foreground font-lato-light-italic">
                      Formulating empathetic CBT guidance
                    </span>
                  </div>
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
            title={isRecordingVoice ? "Click to stop microphone streaming" : "iFlytek Voice Dictation (Microphone)"}
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
            title="Switch iFlytek Speech Recognition Language"
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
                ? "🎙️ Listening to your voice (iFlytek ASR)... speak gently..."
                : `Share what's on your mind with ${currentCounselor.name}...`
            }
            className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 font-light"
          />

          {/* Send Button */}
          <Button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputVal.trim() || isTyping}
            className="size-10 rounded-xl shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
