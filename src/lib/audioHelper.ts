// Audio Helper for Bingo Number Sounds

// In-memory cache for uploaded audio Data URLs
const customAudioCache: Record<string, string> = {};

// Load saved custom sounds from localStorage on startup
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('lucky_bingo_custom_sounds');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(customAudioCache, parsed);
    }
  } catch (e) {
    console.warn('Failed to load custom sounds from localStorage', e);
  }
}

/**
 * Save custom sound for a specific number or key (e.g., "1", "B1", "75")
 */
export async function saveCustomSound(key: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const cleanKey = key.trim().toUpperCase();
        customAudioCache[cleanKey] = dataUrl;
        try {
          localStorage.setItem('lucky_bingo_custom_sounds', JSON.stringify(customAudioCache));
        } catch (err) {
          console.warn('LocalStorage limit reached for custom sounds', err);
        }
        resolve();
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Get all loaded custom sound keys
 */
export function getCustomSoundKeys(): string[] {
  return Object.keys(customAudioCache);
}

/**
 * Clear custom sound cache
 */
export function clearCustomSounds(): void {
  for (const k of Object.keys(customAudioCache)) {
    delete customAudioCache[k];
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lucky_bingo_custom_sounds');
  }
}

// Audio Context Singleton for synthesized beep fallback
let audioCtx: AudioContext | null = null;

function playBeepFallback(freq: number) {
  try {
    if (typeof window === 'undefined') return;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch (e) {
    // Ignore audio context errors
  }
}

/**
 * Play sound when a number/ball is called
 */
export function playNumberSound(
  ball: { letter?: string; number: number },
  soundEnabled: boolean = true
): void {
  if (!soundEnabled || typeof window === 'undefined') return;

  const num = ball.number;
  const letter = ball.letter || '';
  const numKey = `${num}`;
  const comboKey = `${letter}${num}`.toUpperCase();

  // 1. Check if custom uploaded sound exists in cache
  const customSrc = customAudioCache[comboKey] || customAudioCache[numKey];
  if (customSrc) {
    try {
      const audio = new Audio(customSrc);
      audio.play().catch(() => playSpeechOrBeep(letter, num));
      return;
    } catch (e) {
      // Fallback
    }
  }

  // 2. Try loading audio file from /sounds/[number].mp3 or /sounds/[letter][number].mp3
  const candidateUrls = [
    `/sounds/${comboKey}.mp3`,
    `/sounds/${num}.mp3`,
    `/sounds/${comboKey.toLowerCase()}.mp3`,
    `/sounds/${num}.wav`,
    `/sounds/call.mp3`,
  ];

  tryCandidateAudio(candidateUrls, 0, letter, num);
}

function tryCandidateAudio(urls: string[], index: number, letter: string, num: number) {
  if (index >= urls.length) {
    playSpeechOrBeep(letter, num);
    return;
  }

  const url = urls[index];
  const audio = new Audio(url);

  let played = false;
  audio.oncanplaythrough = () => {
    if (!played) {
      played = true;
      audio.play().catch(() => {
        tryCandidateAudio(urls, index + 1, letter, num);
      });
    }
  };

  audio.onerror = () => {
    if (!played) {
      played = true;
      tryCandidateAudio(urls, index + 1, letter, num);
    }
  };

  // Timeout fallback if network is slow
  setTimeout(() => {
    if (!played) {
      played = true;
      tryCandidateAudio(urls, index + 1, letter, num);
    }
  }, 300);
}

function playSpeechOrBeep(letter: string, num: number) {
  if ('speechSynthesis' in window && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      const text = letter ? `${letter}, ${num}` : `${num}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      return;
    } catch (e) {
      // Fallback to beep
    }
  }

  playBeepFallback(450 + (num % 15) * 15);
}
