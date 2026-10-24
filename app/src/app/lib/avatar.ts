export const avatarColors = ["#d8e8fa", "#dceedd", "#e8def4", "#fbe5cf", "#f6dce6"];

export function randomAvatarColor() {
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
}

export function usernameInitial(username: string) {
  const segments = new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(username.trim());
  return segments[Symbol.iterator]().next().value?.segment ?? "?";
}
