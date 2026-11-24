// Web Speech wrapper used for simulated radio traffic.

let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof speechSynthesis === "undefined") return;
  const all = speechSynthesis.getVoices();
  const en = all.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  voices = en.length ? en : all;
}
if (typeof speechSynthesis !== "undefined") {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

export const speechAvailable = typeof speechSynthesis !== "undefined";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function speak(text: string, speaker: string, volume: number, opts: { rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!speechAvailable) {
      setTimeout(resolve, Math.min(9000, 600 + text.length * 55));
      return;
    }
    if (!voices.length) loadVoices();
    const u = new SpeechSynthesisUtterance(text);
    const h = hash(speaker);
    if (voices.length) u.voice = voices[h % voices.length];
    u.pitch = 0.75 + ((h >> 3) % 50) / 100; // 0.75..1.25
    u.rate = opts.rate ?? 1.05 + ((h >> 5) % 25) / 100;
    u.volume = Math.max(0, Math.min(1, volume));
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      resolve();
    };
    const guard = setTimeout(finish, 2500 + text.length * 110);
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  });
}

export function stopSpeech() {
  if (speechAvailable) speechSynthesis.cancel();
}
