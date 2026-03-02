export function classifyScore(score) {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "medium";
  return "low";
}

export function computeScore(signal) {
  const text = String(signal || "").toLowerCase();
  const weights = {
    critical: 0.35,
    breach: 0.35,
    outage: 0.30,
    failure: 0.25,
    incident: 0.25,
    warning: 0.15,
    anomaly: 0.20,
    latency: 0.12,
    timeout: 0.15,
    retry: 0.08,
  };
  let score = 0.05;
  const reasons = [];
  for (const [k, v] of Object.entries(weights)) {
    if (text.includes(k)) {
      score += v;
      reasons.push(`keyword:${k}`);
    }
  }
  if (!reasons.length) reasons.push("keyword:none");
  return { score: Math.min(score, 1), reasons };
}
