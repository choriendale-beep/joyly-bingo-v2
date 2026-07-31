import React, { useState } from 'react';
import { Volume2, Upload, Trash2, CheckCircle, Music, Play, X, Info } from 'lucide-react';
import { saveCustomSound, getCustomSoundKeys, clearCustomSounds, playNumberSound } from '../lib/audioHelper';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({ isOpen, onClose }) => {
  const [loadedKeys, setLoadedKeys] = useState<string[]>(getCustomSoundKeys());
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [testNumber, setTestNumber] = useState<number>(1);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatusMessage('ፋይሎችን በመጫን ላይ...');

    let count = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Infer key from filename e.g. "1.mp3" -> "1", "B12.wav" -> "B12"
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const key = nameWithoutExt.trim().toUpperCase();

        if (key) {
          await saveCustomSound(key, file);
          count++;
        }
      }
      setLoadedKeys(getCustomSoundKeys());
      setStatusMessage(`ተሳክቷል! ${count} የድምፅ ፋይሎች ተጭነዋል።`);
    } catch (err) {
      setStatusMessage('ፋይል በመጫን ላይ ስህተት ተከሰተ።');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('ሁሉንም የተጫኑ የድምፅ ፋይሎች ማፅዳት ይፈልጋሉ?')) {
      clearCustomSounds();
      setLoadedKeys([]);
      setStatusMessage('የተጫኑ የድምፅ ፋይሎች ተፀድተዋል።');
    }
  };

  const handleTestPlay = () => {
    playNumberSound({ number: testNumber }, true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">የቁጥሮች ድምፅ ማስተካከያ (Sound Settings)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-300 text-sm">
          {/* Instructions Box */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>የድምፅ ፋይል አጠቃቀም መመሪያ:</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                ቁጥር ሲወጣ ድምፅ እኩል እንዲወጣ ዴስክቶፕ ላይ ያሏችሁን <strong>.mp3 / .wav</strong> ፋይሎች እዚህ መጫን ይችላሉ።
              </li>
              <li>
                የፋይሉ ስም ከቁጥሩ ጋር እኩል መሆን አለበት። (ምሳሌ: <strong>1.mp3</strong>, <strong>2.mp3</strong>, ... <strong>75.mp3</strong> ወይም <strong>B1.mp3</strong>)
              </li>
              <li>
                በተጨማሪም በፕሮጀክቱ <code>/public/sounds/</code> ፎልደር ውስጥ <strong>1.mp3</strong>, <strong>2.mp3</strong> በማድረግ ማስቀመጥ ይቻላል።
              </li>
            </ul>
          </div>

          {/* Upload Section */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col gap-3">
            <label className="font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>ከዴስክቶፕ ፎልደርዎ የድምፅ ፋይሎችን ይምረጡ:</span>
            </label>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 file:cursor-pointer cursor-pointer"
            />
            {statusMessage && (
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{statusMessage}</span>
              </p>
            )}
          </div>

          {/* Test Player */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <label className="font-bold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-400" />
              <span>የድምፅ ሙከራ (Test Sound):</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={75}
                value={testNumber}
                onChange={(e) => setTestNumber(Number(e.target.value) || 1)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white w-24 font-bold text-center"
              />
              <button
                onClick={handleTestPlay}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ድምፁን አሰማ (Play #{testNumber})</span>
              </button>
            </div>
          </div>

          {/* Uploaded List Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                የተጫኑ የድምፅ ፋይሎች ብዛት: <span className="text-amber-400">{loadedKeys.length}</span>
              </span>
              {loadedKeys.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>አፅዳ (Clear)</span>
                </button>
              )}
            </div>

            {loadedKeys.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px]">
                {loadedKeys.map((key) => (
                  <span
                    key={key}
                    className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded-lg border border-slate-700 font-mono"
                  >
                    #{key}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                ምንም የተጫነ ብጁ የድምፅ ፋይል የለም። (የስርዓቱ ነባሪ ድምፅ/ንግግር ይሰራል።)
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            ዘጋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
