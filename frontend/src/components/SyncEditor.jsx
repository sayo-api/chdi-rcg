import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

function formatTime(ms) {
  if (!ms && ms !== 0) return '--';
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, '0')}`;
}

function formatTimeSec(s) {
  if (!s && s !== 0) return '--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── TimeInput ─────────────────────────────────────────────────────────────────
function TimeInput({ line, idx, onApply, onSeek, onClear }) {
  const [val, setVal] = useState(
    line.stamped && line.timeMs !== null ? (line.timeMs / 1000).toFixed(2) : ''
  );
  const inputRef = useRef(null);
  const prevTimeMs = useRef(line.timeMs);

  useEffect(() => {
    if (line.timeMs !== prevTimeMs.current) {
      prevTimeMs.current = line.timeMs;
      if (document.activeElement !== inputRef.current) {
        setVal(line.stamped && line.timeMs !== null ? (line.timeMs / 1000).toFixed(2) : '');
      }
    }
  }, [line.timeMs, line.stamped]);

  const applyValue = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) onApply(idx, n);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <input
        ref={inputRef}
        type="number"
        placeholder="seg"
        step="0.01"
        min="0"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={applyValue}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); applyValue(); inputRef.current?.blur(); }
        }}
        title="Tempo em segundos. Pressione Enter ou clique fora para aplicar."
        style={{
          width: 68, padding: '4px 6px', fontSize: 12,
          background: 'rgba(94,114,68,0.1)',
          border: `1px solid ${line.stamped ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 6, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
        }}
      />
      {line.stamped && line.timeMs !== null && (
        <>
          <button type="button" onClick={() => onSeek(idx)} title={`Ir para ${formatTime(line.timeMs)}`}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', padding: '2px 4px', whiteSpace: 'nowrap' }}>
            ▶{formatTime(line.timeMs)}
          </button>
          <button type="button" onClick={() => { onClear(idx); setVal(''); }} title="Remover timestamp"
            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>
            ×
          </button>
        </>
      )}
    </div>
  );
}

// ─── MiniPlayer — FORA do SyncEditor para evitar remount a cada re-render ──────
function MiniPlayer({ playing, currentTime, duration, seekPct, onTogglePlay, onSeek, onChangeSpeed, speed, showSpeed }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: showSpeed ? 12 : 0 }}>
        <button
          type="button"
          onClick={onTogglePlay}
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
        >
          {playing
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>}
        </button>
        <div style={{ flex: 1 }}>
          <input type="range" min="0" max="100" step="0.01" value={seekPct}
            onChange={onSeek}
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
          {formatTimeSec(currentTime)} / {formatTimeSec(duration)}
        </span>
        {showSpeed && (
          <select value={speed} onChange={e => onChangeSpeed(parseFloat(e.target.value))}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.25">1.25×</option>
          </select>
        )}
      </div>
      {showSpeed && (
        <div style={{ padding: '8px 12px', background: 'rgba(94,114,68,0.08)', borderRadius: 8, borderLeft: '3px solid var(--accent)', fontSize: 12, color: 'var(--text-secondary)' }}>
          🎯 <strong style={{ color: 'var(--accent)' }}>Sync:</strong> pressione{' '}
          <kbd style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 5px', borderRadius: 4, fontFamily: 'monospace' }}>ESPAÇO</kbd>
          {' '}no início de cada verso, ou clique <strong>⊕</strong>. Para ajuste fino, digite o tempo em segundos e pressione{' '}
          <kbd style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 5px', borderRadius: 4, fontFamily: 'monospace' }}>Enter</kbd>.
        </div>
      )}
    </div>
  );
}

// ─── SyncEditor ───────────────────────────────────────────────────────────────
export default function SyncEditor({ audioFile, audioUrl, initialLyrics = [], onChange }) {
  const [lines, setLines] = useState(() =>
    initialLyrics.map(l => ({ text: l.text, timeMs: l.timeMs, stamped: true }))
  );
  const [rawText, setRawText]     = useState(() => initialLyrics.map(l => l.text).join('\n'));
  const [mode, setMode]           = useState(initialLyrics.length > 0 ? 'sync' : 'text');
  const [playing, setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]   = useState(0);
  const [activeLine, setActiveLine] = useState(-1);
  const [nextLineIdx, setNextLineIdx] = useState(0);
  const [speed, setSpeed]         = useState(1);

  const audioRef    = useRef(null);
  const syncListRef = useRef(null);
  const lineRefs    = useRef([]);
  const objectUrlRef = useRef(null);
  const rafRef      = useRef(null);
  const linesRef    = useRef(lines);

  useEffect(() => { linesRef.current = lines; }, [lines]);

  const audioSrc = useMemo(() => {
    if (audioFile) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(audioFile);
      return objectUrlRef.current;
    }
    return audioUrl || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFile, audioUrl]);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioSrc) { audio.src = audioSrc; audio.load(); }
    else          { audio.src = ''; }
  }, [audioSrc]);

  const stopRaf = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startRaf = useCallback(() => {
    stopRaf();
    const tick = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      const t  = audio.currentTime;
      setCurrentTime(t);
      const ms = t * 1000;
      const ls = linesRef.current;
      let idx  = -1;
      for (let i = 0; i < ls.length; i++) {
        if (ls[i].stamped && ls[i].timeMs !== null && ms >= ls[i].timeMs) idx = i;
        else if (ls[i].stamped && ls[i].timeMs !== null && ms < ls[i].timeMs) break;
      }
      setActiveLine(idx);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf]);

  useEffect(() => {
    if (mode !== 'preview') return;
    if (activeLine >= 0 && lineRefs.current[activeLine]) {
      lineRefs.current[activeLine].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLine, mode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta  = () => setDuration(audio.duration || 0);
    const onEnd   = () => { setPlaying(false); stopRaf(); };
    const onPause = () => { setPlaying(false); stopRaf(); };
    const onPlay  = () => { setPlaying(true);  startRaf(); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended',  onEnd);
    audio.addEventListener('pause',  onPause);
    audio.addEventListener('play',   onPlay);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended',  onEnd);
      audio.removeEventListener('pause',  onPause);
      audio.removeEventListener('play',   onPlay);
      stopRaf();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else              audio.pause();
  }, []);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const t = (e.target.value / 100) * duration;
    audio.currentTime = t;
    setCurrentTime(t);
  }, [duration]);

  const handleChangeSpeed = useCallback((s) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = s;
    setSpeed(s);
  }, []);

  const stamp = useCallback((idx) => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = Math.round(audio.currentTime * 1000);
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], timeMs: ms, stamped: true };
      const stamped = updated.filter(l => l.stamped && l.timeMs !== null);
      onChange(stamped.map(l => ({ text: l.text, timeMs: l.timeMs })));
      return updated;
    });
    setNextLineIdx(() => {
      const len  = linesRef.current.length;
      const next = idx + 1 < len ? idx + 1 : idx;
      if (lineRefs.current[next]) {
        lineRefs.current[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return next;
    });
  }, [onChange]);

  const clearStamp = useCallback((idx) => {
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], timeMs: null, stamped: false };
      const stamped = updated.filter(l => l.stamped && l.timeMs !== null);
      onChange(stamped.map(l => ({ text: l.text, timeMs: l.timeMs })));
      return updated;
    });
  }, [onChange]);

  const editTime = useCallback((idx, seconds) => {
    const ms = Math.round(seconds * 1000);
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], timeMs: ms, stamped: true };
      const stamped = updated.filter(l => l.stamped && l.timeMs !== null);
      onChange(stamped.map(l => ({ text: l.text, timeMs: l.timeMs })));
      return updated;
    });
  }, [onChange]);

  const seekToLine = useCallback((idx) => {
    const audio = audioRef.current;
    if (!audio || lines[idx].timeMs == null) return;
    audio.currentTime = lines[idx].timeMs / 1000;
    setCurrentTime(lines[idx].timeMs / 1000);
  }, [lines]);

  useEffect(() => {
    if (mode !== 'sync') return;
    const handler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (nextLineIdx < linesRef.current.length) stamp(nextLineIdx);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, nextLineIdx, stamp]);

  const handleGoToSync = () => {
    const parsed = rawText.split('\n').map(t => t.trim()).filter(Boolean);
    const existingMap = {};
    lines.forEach(l => { existingMap[l.text] = l.timeMs; });
    const newLines = parsed.map(text => ({
      text,
      timeMs: existingMap[text] ?? null,
      stamped: existingMap[text] != null,
    }));
    setLines(newLines);
    setMode('sync');
    const first = newLines.findIndex(l => !l.stamped);
    setNextLineIdx(first >= 0 ? first : 0);
  };

  const handleGoToPreview = () => {
    const stamped = lines.filter(l => l.stamped && l.timeMs !== null);
    onChange(stamped.map(l => ({ text: l.text, timeMs: l.timeMs })));
    setMode('preview');
  };

  const stampedCount = lines.filter(l => l.stamped).length;
  const seekPct      = duration ? (currentTime / duration) * 100 : 0;

  const tabStyle = (key) => ({
    padding: '10px 18px', background: 'none', border: 'none',
    borderBottom: mode === key ? '2px solid var(--accent)' : '2px solid transparent',
    color: mode === key ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.04em', transition: 'all 0.15s', marginBottom: -1,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Áudio sempre no DOM */}
      <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} />

      {/* Abas */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[
          { key: 'text',    label: '① Letras',        icon: '✏️' },
          { key: 'sync',    label: '② Sincronizar',    icon: '🎵' },
          { key: 'preview', label: '③ Pré-visualizar', icon: '▶'  },
        ].map(({ key, label, icon }) => (
          <button key={key} type="button"
            onClick={() => {
              if (key === 'sync')         handleGoToSync();
              else if (key === 'preview') handleGoToPreview();
              else                        setMode('text');
            }}
            style={tabStyle(key)}>
            {icon} {label}
          </button>
        ))}
        {lines.length > 0 && (
          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 12,
            color: stampedCount === lines.length ? 'var(--accent)' : 'var(--text-muted)', paddingRight: 4 }}>
            {stampedCount}/{lines.length} sincronizadas
          </span>
        )}
      </div>

      {/* ── Passo 1: Letras ── */}
      {mode === 'text' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Cole ou escreva todas as linhas da letra. Uma linha por verso.
          </p>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={"Ouviram do Ipiranga as margens plácidas\nDe um povo heróico o brado retumbante,\n..."}
            style={{
              width: '100%', minHeight: 220, resize: 'vertical',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 12, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {rawText.split('\n').filter(l => l.trim()).length} linhas detectadas
            </span>
            <button type="button" className="btn btn-accent"
              onClick={handleGoToSync}
              disabled={!rawText.trim() || !audioSrc}>
              Próximo: Sincronizar →
            </button>
          </div>
          {!audioSrc && (
            <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>⚠️ Faça upload do áudio na aba "Áudio" antes de sincronizar.</p>
          )}
        </div>
      )}

      {/* ── Passo 2: Sincronizar ── */}
      {mode === 'sync' && (
        <div>
          <MiniPlayer
            playing={playing} currentTime={currentTime} duration={duration}
            seekPct={seekPct} onTogglePlay={togglePlay} onSeek={handleSeek}
            onChangeSpeed={handleChangeSpeed} speed={speed} showSpeed={true}
          />
          <div ref={syncListRef} style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {lines.map((line, i) => (
              <div key={i} ref={el => lineRefs.current[i] = el}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  borderRadius: 8, transition: 'background 0.15s',
                  background: i === nextLineIdx
                    ? 'rgba(94,114,68,0.12)'
                    : line.stamped ? 'rgba(94,114,68,0.06)' : 'rgba(0,0,0,0.03)',
                  border: i === nextLineIdx ? '1px solid rgba(94,114,68,0.4)' : '1px solid transparent',
                }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 22, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <button type="button" onClick={() => stamp(i)} title="Carimbar no tempo atual"
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: line.stamped ? 'rgba(94,114,68,0.2)' : 'rgba(94,114,68,0.1)',
                    border: `1px solid ${line.stamped ? 'var(--accent)' : 'var(--border)'}`,
                    color: line.stamped ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                  {line.stamped ? '✓' : '⊕'}
                </button>
                <span style={{ flex: 1, fontSize: 13, color: line.stamped ? 'var(--text-primary)' : 'var(--text-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {line.text}
                </span>
                <TimeInput line={line} idx={i} onApply={editTime} onSeek={seekToLine} onClear={clearStamp} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setMode('text')}>← Editar Letras</button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: stampedCount === lines.length ? 'var(--accent)' : 'var(--text-muted)' }}>
                {stampedCount}/{lines.length} sincronizadas
              </span>
              <button type="button" className="btn btn-accent" onClick={handleGoToPreview}>
                Pré-visualizar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Passo 3: Pré-visualizar ── */}
      {mode === 'preview' && (
        <div>
          <MiniPlayer
            playing={playing} currentTime={currentTime} duration={duration}
            seekPct={seekPct} onTogglePlay={togglePlay} onSeek={handleSeek}
            onChangeSpeed={handleChangeSpeed} speed={speed} showSpeed={false}
          />
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, maxHeight: 360, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 2 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>PRÉVIA DA ANIMAÇÃO</span>
            </div>
            {lines.filter(l => l.stamped).map((line, i) => (
              <div key={i} ref={el => lineRefs.current[i] = el}
                onClick={() => {
                  const audio = audioRef.current;
                  if (audio) { audio.currentTime = line.timeMs / 1000; audio.play().catch(() => {}); }
                }}
                style={{
                  padding: '10px 14px', marginBottom: 4, borderRadius: 8,
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontSize:   i === activeLine ? 17 : 14,
                  fontWeight: i === activeLine ? 700 : 400,
                  color:      i === activeLine ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: i === activeLine ? 'rgba(94,114,68,0.15)' : 'transparent',
                  borderLeft: i === activeLine ? '3px solid var(--accent)' : '3px solid transparent',
                  transform:  i === activeLine ? 'translateX(6px)' : 'none',
                }}>
                {line.text}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setMode('sync')}>← Voltar ao Sync</button>
            <span style={{ fontSize: 12, color: 'var(--accent)', alignSelf: 'center' }}>✓ {stampedCount} linhas salvas</span>
          </div>
        </div>
      )}
    </div>
  );
}
