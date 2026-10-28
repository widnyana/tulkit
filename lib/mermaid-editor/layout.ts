const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function nextNodeId(existing: Iterable<string>): string {
  const used = new Set(existing);
  for (const letter of LETTERS) {
    if (letter !== "end" && !used.has(letter)) return letter;
  }
  for (let n = 1; ; n++) {
    const candidate = `N${n}`;
    if (candidate !== "end" && !used.has(candidate)) return candidate;
  }
}
