// Remove only speech fillers at the start. Never strip arbitrary clauses,
// negation, questions or quoted/reported instructions to find a command inside.
export function stripSpokenLeadIn(text) {
  return String(text).trim().replace(/^(?:[嗯呃啊哎唉哦噢]+[\s，,。.!！:：；;]*)+/u, '').trim();
}
