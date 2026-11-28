/** AdSense ads.txt — kök URL `/ads.txt` (text/plain). */
export const ADS_TXT_LINES = [
  "google.com, pub-6962376212093267, DIRECT, f08c47fec0942fa0",
] as const;

export function adsTxtBody(): string {
  return `${ADS_TXT_LINES.join("\n")}\n`;
}
