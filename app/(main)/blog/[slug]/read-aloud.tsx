'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';

// Split text at sentence boundaries into ~900-char chunks (avoids browser SpeechSynthesis limits)
function splitChunks(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? [text];
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if (buf.length + s.length > 900 && buf) {
      out.push(buf.trim());
      buf = '';
    }
    buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [text];
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => /^en/i.test(v.lang));
  return (
    en.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ??
    en.find((v) => /google/i.test(v.name)) ??
    en.find((v) => /en-us/i.test(v.lang)) ??
    en[0] ??
    voices[0] ??
    null
  );
}

const SPEEDS = [0.8, 1, 1.25, 1.5, 2] as const;

export function ReadAloud({ title, plainText, excerpt }: { title: string; plainText: string; excerpt?: string }) {
  const [supported, setSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [progress, setProgress] = useState(0);
  const [voiceName, setVoiceName] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const chunksRef = useRef<string[]>([]);
  const chunkOffsetsRef = useRef<number[]>([0]); // cumulative char offsets per chunk
  const chunkIdxRef = useRef(0);
  const speedRef = useRef<number>(1);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => { speedRef.current = SPEEDS[speedIdx]; }, [speedIdx]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    setSupported(true);

    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (!v.length) return;
      const best = pickBestVoice(v);
      voiceRef.current = best;
      setVoiceName(best?.name.replace(/\s*\([^)]+\)/g, '').trim() ?? '');
    };

    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    const chunks = splitChunks(plainText);
    chunksRef.current = chunks;
    // Build cumulative char offsets so progress tracks characters, not chunk count
    const offs = [0];
    for (const c of chunks) offs.push(offs[offs.length - 1] + c.length);
    chunkOffsetsRef.current = offs;
  }, [plainText]);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const speakChunk = useCallback((idx: number) => {
    const synth = window.speechSynthesis;
    if (idx >= chunksRef.current.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      chunkIdxRef.current = 0;
      return;
    }
    chunkIdxRef.current = idx;
    const totalChars = chunkOffsetsRef.current[chunksRef.current.length] || 1;
    setProgress(Math.round((chunkOffsetsRef.current[idx] / totalChars) * 100));

    const u = new SpeechSynthesisUtterance(chunksRef.current[idx]);
    u.rate = speedRef.current;
    u.pitch = 1.05;
    u.volume = 1;
    if (voiceRef.current) u.voice = voiceRef.current;

    u.onend = () => speakChunk(idx + 1);
    u.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };
    synth.speak(u);
  }, []);

  const handlePlay = useCallback(() => {
    const synth = window.speechSynthesis;
    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    synth.cancel();
    chunkIdxRef.current = 0;
    setIsPlaying(true);
    setIsPaused(false);
    setProgress(0);
    speakChunk(0);
  }, [isPaused, speakChunk]);

  const handlePause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    chunkIdxRef.current = 0;
  }, []);

  // Jump ±N chunks; always resumes playback
  const handleSeek = useCallback((delta: number) => {
    const total = chunksRef.current.length;
    if (!total) return;
    const target = Math.max(0, Math.min(total - 1, chunkIdxRef.current + delta));
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    setIsPaused(false);
    setTimeout(() => speakChunk(target), 50);
  }, [speakChunk]);

  // Seek to a 0-1 fraction of the article by character position
  const seekToFraction = useCallback((pct: number) => {
    const chunks = chunksRef.current;
    const offs = chunkOffsetsRef.current;
    if (!chunks.length) return;
    const totalChars = offs[chunks.length] || 1;
    const targetChar = Math.round(pct * totalChars);
    // Find the chunk that contains targetChar
    let target = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (offs[i] <= targetChar) target = i;
      else break;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    setIsPaused(false);
    setTimeout(() => speakChunk(target), 50);
  }, [speakChunk]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const bar = progressBarRef.current;
    if (!bar) return;
    // Cache rect ONCE at drag start — re-querying on every mousemove causes drift
    const { left, width } = bar.getBoundingClientRect();
    const toPct = (x: number) => Math.max(0, Math.min(1, (x - left) / width));

    setIsDragging(true);
    setDragProgress(Math.round(toPct(e.clientX) * 100));

    const onMove = (ev: MouseEvent) => setDragProgress(Math.round(toPct(ev.clientX) * 100));
    const onUp = (ev: MouseEvent) => {
      setIsDragging(false);
      seekToFraction(toPct(ev.clientX));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [seekToFraction]);

  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const bar = progressBarRef.current;
    if (!bar) return;
    const { left, width } = bar.getBoundingClientRect();
    const toPct = (x: number) => Math.max(0, Math.min(1, (x - left) / width));

    setIsDragging(true);
    setDragProgress(Math.round(toPct(e.touches[0].clientX) * 100));

    const onMove = (ev: TouchEvent) => setDragProgress(Math.round(toPct(ev.touches[0].clientX) * 100));
    const onEnd = (ev: TouchEvent) => {
      setIsDragging(false);
      seekToFraction(toPct(ev.changedTouches[0].clientX));
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, [seekToFraction]);

  const handleSpeedChange = useCallback(() => {
    const nextIdx = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(nextIdx);
    speedRef.current = SPEEDS[nextIdx];
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setTimeout(() => speakChunk(chunkIdxRef.current), 50);
    }
  }, [speedIdx, isPlaying, speakChunk]);

  if (!supported) return null;

  const active = isPlaying || isPaused;

  return (
    <>
      {/* Trigger button + excerpt preview */}
      <div className="mt-5">
        <button
          type="button"
          onClick={active ? handleStop : handlePlay}
          className={`inline-flex items-center gap-2 text-sm font-medium rounded-full px-4 py-1.5 transition-all border
            ${active
              ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
              : 'bg-white/10 text-white/90 border-white/30 hover:bg-white/20 backdrop-blur-sm'
            }`}
        >
          <Headphones className="w-4 h-4" />
          {active ? 'Stop' : 'Listen'}
        </button>

        {excerpt && !active && (
          <p className="mt-2 text-sm text-white/65 italic max-w-xl leading-relaxed line-clamp-2">
            {excerpt}
          </p>
        )}
      </div>

      {/* Floating player bar */}
      {active && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50
            w-[min(560px,calc(100vw-2rem))]
            bg-white dark:bg-zinc-900 rounded-2xl
            shadow-2xl shadow-black/20 border border-orange-100 dark:border-zinc-700
            px-4 py-3 flex flex-col gap-2"
        >
          {/* Draggable progress bar */}
          <div
            ref={progressBarRef}
            role="slider"
            aria-label="Reading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={isDragging ? dragProgress : progress}
            onMouseDown={handleProgressMouseDown}
            onTouchStart={handleProgressTouchStart}
            className={`h-2 w-full rounded-full bg-orange-100 relative group select-none
              ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
          >
            <div
              className={`h-full bg-orange-500 rounded-full relative ${isDragging ? '' : 'transition-[width] duration-300'}`}
              style={{ width: `${isDragging ? dragProgress : progress}%` }}
            >
              {/* Thumb */}
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2
                  w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white shadow-md
                  transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Waveform animation */}
            <div className="flex items-end gap-0.5 h-5 flex-shrink-0" aria-hidden>
              {[3, 5, 4, 5, 3].map((h, i) => (
                <span
                  key={i}
                  className={`w-[3px] rounded-full bg-orange-500 ${isPlaying ? 'animate-wave-bar' : 'opacity-50'}`}
                  style={{ height: `${h * 3}px`, animationDelay: `${i * 0.13}s` }}
                />
              ))}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">{title}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {voiceName || 'System voice'} &middot; {progress}% complete
              </p>
            </div>

            {/* Seek back */}
            <button
              type="button"
              onClick={() => handleSeek(-2)}
              aria-label="Skip back"
              className="w-8 h-8 rounded-full hover:bg-orange-50 text-muted-foreground hover:text-orange-600 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={isPlaying ? handlePause : handlePlay}
              aria-label={isPlaying ? 'Pause' : 'Resume'}
              className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors shadow-md shadow-orange-200 flex-shrink-0"
            >
              {isPlaying
                ? <Pause className="w-4 h-4" />
                : <Play className="w-4 h-4 ml-0.5" />
              }
            </button>

            {/* Seek forward */}
            <button
              type="button"
              onClick={() => handleSeek(2)}
              aria-label="Skip forward"
              className="w-8 h-8 rounded-full hover:bg-orange-50 text-muted-foreground hover:text-orange-600 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed */}
            <button
              type="button"
              onClick={handleSpeedChange}
              aria-label="Change speed"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 w-9 h-9 rounded-full hover:bg-orange-50 flex items-center justify-center transition-colors flex-shrink-0"
            >
              {SPEEDS[speedIdx]}×
            </button>

            {/* Close / stop */}
            <button
              type="button"
              onClick={handleStop}
              aria-label="Stop reading"
              className="w-8 h-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wave-bar {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(2.8); }
        }
        .animate-wave-bar {
          animation: wave-bar 0.75s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>
    </>
  );
}
