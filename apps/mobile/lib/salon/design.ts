export const fonts = {
  action: "Inter_700Bold",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  bold: "Inter_600SemiBold",
  display: "Inter_600SemiBold",
};
export function fieldLabel(label: string) {
  return label.replace(/\b[a-z][a-zA-Z]*/g, (word) => word[0].toUpperCase() + word.slice(1));
}
export const radii = { card: 18, button: 12 };
