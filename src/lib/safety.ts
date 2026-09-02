const HIGH_RISK_PATTERNS = [
  /\b(?:suicide|suicidal|self[-\s]?harm|hurt\s+myself|kill\s+myself|end\s+my\s+life|want\s+to\s+die|no\s+reason\s+to\s+live|can(?:not|'t)\s+go\s+on\s+living|end\s+it\s+all)\b/i,
  /(?:自杀|自傷|自伤|伤害自己|傷害自己|不想活(?:了)?|活不下去|结束生命|結束生命|结束这一切|結束這一切|想死|不想再活)/,
];

export function isHighRiskText(value: string): boolean {
  const text = String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  return HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text));
}

export function getCrisisFallback(value: string): string {
  const isChinese = /[\u3400-\u9fff]/.test(value);
  return isChinese
    ? "我很在意你现在的安全。请先暂停继续使用这项 AI 功能，并立刻联系身边可信任的人、当地紧急服务或危机支持热线。如果你在美国或加拿大，可拨打或发送短信至 988；其他地区可通过 https://findahelpline.com 查找经过核验的当地支持资源。若你正处于即刻危险中，请联系当地紧急服务。"
    : "Your safety matters most right now. Please pause this AI tool and contact someone you trust, local emergency services, or a crisis support service immediately. If you are in the United States or Canada, call or text 988. In other locations, find a verified local service at https://findahelpline.com. If you are in immediate danger, contact local emergency services now.";
}
