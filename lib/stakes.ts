export type Stakes = "low" | "medium" | "high";
export type Reversibility = "reversible" | "irreversible";

export type StakeBadge = {
  label: string;
  note: string;
  color: string;
};

// Returns a badge only when the decision genuinely warrants caution —
// high stakes or a one-way door. Everyday reversible calls get nothing.
export function getStakeBadge(
  stakes?: string | null,
  reversibility?: string | null
): StakeBadge | null {
  const high = stakes === "high";
  const irreversible = reversibility === "irreversible";

  if (!high && !irreversible) return null;

  if (irreversible && high) {
    return {
      label: "One-way door · High stakes",
      note: "Hard to undo and the downside is real. This is the one to slow down on — let the confidence number carry real weight.",
      color: "#e0a83a",
    };
  }
  if (irreversible) {
    return {
      label: "One-way door",
      note: "Hard to reverse once you commit. Be sure before you walk through it.",
      color: "#e0a83a",
    };
  }
  return {
    label: "High stakes",
    note: "The outcome matters a lot — but you can change course if it goes sideways.",
    color: "#e0a83a",
  };
}
