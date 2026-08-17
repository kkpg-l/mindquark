import React, { useState, useEffect } from "react";
import {
  User,
  Sparkles,
  Bot,
  Check,
  Save,
  MessageSquareShare,
  BrainCircuit,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getProfileConfig,
  saveProfileConfig,
  PRESET_USER_AVATARS,
  PRESET_FEMALE_COUNSELOR_AVATARS,
  PRESET_MALE_COUNSELOR_AVATARS,
  type ProfileConfig,
} from "@/lib/profileStore";
import { analyzeDialogue } from "@/services/api";
import { ThinkingOrb } from "thinking-orbs";
import { AvatarUploader } from "@/components/ui/avatar-uploader";

export const MeSection: React.FC = () => {
  const [config, setConfig] = useState<ProfileConfig>(getProfileConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Dialogue Analyzer State
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  useEffect(() => {
    setConfig(getProfileConfig());
  }, []);

  const updateProfile = (newConfig: ProfileConfig) => {
    setConfig(newConfig);
    saveProfileConfig(newConfig);
  };

  const handleSaveProfile = () => {
    saveProfileConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleRunAnalysis = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeDialogue(transcript);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sampleDialogue = `User: I worked 14 hours today and still feel like I didn't accomplish anything.
Agent: You should optimize your time management with the Pomodoro technique. Make a to-do list and stop procrastinating.`;

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-8 animate-in fade-in-50 duration-300">
      {/* Title Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
          <Avatar className="size-4.5 ring-1 ring-emerald-500/40">
            <AvatarImage src={config.userAvatar} />
            <AvatarFallback>{config.userName[0] || "U"}</AvatarFallback>
          </Avatar>
          <span>Profile Sanctuary & Dialogue Studio</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-lato-light">
          Personalize & Analyze
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
          Upload custom avatars, personalize counselor personas, and audit external AI dialogue psychology.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Module 1: Profile & Identity Customization (6 cols) */}
        <div className="md:col-span-6 space-y-6">
          {/* Your Profile Card */}
          <Card className="rounded-3xl p-6 border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-9 ring-2 ring-primary/30 rounded-xl overflow-hidden shadow-xs">
                  <AvatarImage src={config.userAvatar} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base font-bold">Your Client Profile</CardTitle>
                  <p className="text-xs text-muted-foreground">How you appear in mindful chat</p>
                </div>
              </div>
              <Avatar className="size-11 ring-2 ring-primary/40 shadow-sm">
                <AvatarImage src={config.userAvatar} />
                <AvatarFallback>{config.userName[0] || "U"}</AvatarFallback>
              </Avatar>
            </CardHeader>

            <CardContent className="p-0 space-y-4 text-xs">
              {/* User Name */}
              <div>
                <label className="font-semibold text-foreground/80 block mb-1.5">
                  Your Display Name:
                </label>
                <input
                  type="text"
                  value={config.userName}
                  onChange={(e) => updateProfile({ ...config, userName: e.target.value })}
                  placeholder="e.g. Alex, Maya, You..."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-light"
                />
              </div>

              {/* User Avatar with Upload + Presets */}
              <AvatarUploader
                label="Choose or Upload Your Avatar"
                currentAvatar={config.userAvatar}
                onAvatarChange={(newAvatar) => updateProfile({ ...config, userAvatar: newAvatar })}
                presetAvatars={PRESET_USER_AVATARS}
              />
            </CardContent>
          </Card>

          {/* Counselor Personas Card */}
          <Card className="rounded-3xl p-6 border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Bot className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Counselor Identity Studio</CardTitle>
                  <p className="text-xs text-muted-foreground">Customize names and upload custom avatars</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 space-y-5 text-xs">
              {/* Maya (Female Persona) */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9 ring-1 ring-primary/30">
                      <AvatarImage src={config.femaleCounselorAvatar} />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-semibold text-foreground block">🌸 Female Persona (Nurturing)</span>
                      <span className="text-[11px] text-muted-foreground font-lato-light-italic">Default Voice: Catherine</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Counselor Name:</label>
                  <input
                    type="text"
                    value={config.femaleCounselorName}
                    onChange={(e) => updateProfile({ ...config, femaleCounselorName: e.target.value })}
                    placeholder="Counselor Name"
                    className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-light"
                  />
                </div>

                <AvatarUploader
                  label="Select or Upload Avatar"
                  currentAvatar={config.femaleCounselorAvatar}
                  onAvatarChange={(newAvatar) => updateProfile({ ...config, femaleCounselorAvatar: newAvatar })}
                  presetAvatars={PRESET_FEMALE_COUNSELOR_AVATARS}
                />
              </div>

              {/* Liam (Male Persona) */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9 ring-1 ring-primary/30">
                      <AvatarImage src={config.maleCounselorAvatar} />
                      <AvatarFallback>L</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-semibold text-foreground block">🌿 Male Persona (Grounded)</span>
                      <span className="text-[11px] text-muted-foreground font-lato-light-italic">Default Voice: John</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Counselor Name:</label>
                  <input
                    type="text"
                    value={config.maleCounselorName}
                    onChange={(e) => updateProfile({ ...config, maleCounselorName: e.target.value })}
                    placeholder="Counselor Name"
                    className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-light"
                  />
                </div>

                <AvatarUploader
                  label="Select or Upload Avatar"
                  currentAvatar={config.maleCounselorAvatar}
                  onAvatarChange={(newAvatar) => updateProfile({ ...config, maleCounselorAvatar: newAvatar })}
                  presetAvatars={PRESET_MALE_COUNSELOR_AVATARS}
                />
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveProfile}
                className="w-full rounded-xl gap-1.5 text-xs h-10 shadow-sm"
              >
                {savedSuccess ? (
                  <>
                    <Check className="size-4 text-emerald-300" />
                    <span>All Settings Saved Successfully!</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>Save All Identity Settings</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Module 2: External Agent / Dialogue Psychological & CBT Analyzer (6 cols) */}
        <div className="md:col-span-6 space-y-6">
          <Card className="rounded-3xl p-6 border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md flex flex-col h-full">
            <CardHeader className="p-0 mb-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <MessageSquareShare className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">External Dialogue Psychological Audit</CardTitle>
                  <p className="text-xs text-muted-foreground">Paste transcripts from other AI agents or conversations</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 space-y-4 flex-1 flex flex-col text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-foreground/80">Paste Transcript / Dialogue:</span>
                  <button
                    onClick={() => setTranscript(sampleDialogue)}
                    className="text-[11px] text-primary hover:underline font-light"
                  >
                    Load sample dialogue
                  </button>
                </div>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste any conversation here, for example:
User: I made a small mistake and feel completely hopeless.
Agent: You just need to follow a strict checklist."
                  rows={6}
                  className="w-full rounded-2xl border border-input bg-background p-3.5 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  onClick={handleRunAnalysis}
                  disabled={!transcript.trim() || isAnalyzing}
                  className="rounded-xl text-xs px-5 h-9 gap-2 shadow-sm font-normal"
                >
                  <Sparkles className="size-3.5" />
                  <span>{isAnalyzing ? "Psychological Audit in progress..." : "Audit Dialogue with CBT"}</span>
                </Button>

                {transcript && (
                  <button
                    onClick={() => {
                      setTranscript("");
                      setAnalysisResult(null);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-light"
                  >
                    Clear text
                  </button>
                )}
              </div>

              {/* Thinking Orb Animation while analyzing */}
              {isAnalyzing && (
                <div className="p-6 rounded-2xl bg-muted/30 border border-border flex flex-col items-center justify-center gap-3 text-center my-2 animate-in fade-in duration-300">
                  <ThinkingOrb state="solving" size={64} speed={0.85} />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">MindQuark CBT Engine is Auditing Dialogue...</p>
                    <p className="text-[11px] text-muted-foreground font-lato-light-italic">
                      Evaluating emotional vulnerability, communication blindspots, and cognitive reframings.
                    </p>
                  </div>
                </div>
              )}

              {/* Analysis Structured Result */}
              {analysisResult && !isAnalyzing && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 text-xs leading-relaxed whitespace-pre-line animate-in fade-in-50">
                  <div className="font-semibold text-primary flex items-center gap-1.5 pb-2 border-b border-primary/20">
                    <BrainCircuit className="size-4" />
                    <span>CBT Psychological Audit Report</span>
                  </div>
                  <div className="text-foreground/90">{analysisResult}</div>
                </div>
              )}

              {/* Feature Note */}
              <div className="mt-auto pt-4 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5 font-lato-light-italic">
                <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                <span>Helps evaluate whether AI responses validate emotional needs or fall into toxic positivity.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
