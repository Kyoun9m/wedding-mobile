import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import type { GuestMessage } from '../lib/supabase';
import './VoiceGuestbook.css';

function getSupportedMime(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const t of types) if (MediaRecorder.isTypeSupported(t)) return t;
  return '';
}

function getExtension(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

// Seeded random for consistent cloud positions per message
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return () => { h = (h * 16807 + 0) % 2147483647; return (h & 0x7fffffff) / 2147483647; };
}

interface CloudProps {
  msg: GuestMessage;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
}

function FloatingCloud({ msg, index, isPlaying, onPlay }: CloudProps) {
  const rng = useMemo(() => seededRandom(msg.id), [msg.id]);
  const startX = useMemo(() => 5 + rng() * 50, [rng]);
  const startY = useMemo(() => 5 + (index % 4) * 23 + rng() * 10, [rng, index]);
  const driftX = useMemo(() => (rng() - 0.5) * 40, [rng]);
  const driftY = useMemo(() => (rng() - 0.5) * 20, [rng]);
  const duration = useMemo(() => 6 + rng() * 6, [rng]);
  const delay = useMemo(() => index * 0.4, [index]);

  return (
    <motion.div
      className={`vgb-cloud ${msg.type} ${isPlaying ? 'playing' : ''}`}
      style={{ left: `${startX}%`, top: `${startY}%` }}
      initial={{ opacity: 0, scale: 0, y: 30 }}
      animate={{
        opacity: [0, 1, 1, 1, 0.8, 1],
        scale: 1,
        x: [0, driftX * 0.5, driftX, driftX * 0.3, -driftX * 0.2, 0],
        y: [0, driftY - 8, driftY * 0.5, driftY + 5, -driftY * 0.3, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay },
        scale: { duration: 0.5, delay, type: 'spring', stiffness: 200 },
        x: { duration, repeat: Infinity, ease: 'easeInOut', delay },
        y: { duration: duration * 0.8, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.5 },
      }}
      onClick={onPlay}
      whileTap={{ scale: 0.92 }}
    >
      {msg.type === 'voice' ? (
        <>
          <div className="vgb-cloud-wave">
            {[...Array(5)].map((_, j) => (
              <span key={j} className={`vgb-wave-bar ${isPlaying ? 'active' : ''}`} style={{ animationDelay: `${j * 0.1}s` }} />
            ))}
          </div>
          <div className="vgb-cloud-name">{msg.name}</div>
        </>
      ) : (
        <>
          <div className="vgb-cloud-emoji">💌</div>
          <div className="vgb-cloud-text">{msg.message}</div>
          <div className="vgb-cloud-name">{msg.name}</div>
        </>
      )}
    </motion.div>
  );
}

export default function VoiceGuestbook() {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [textMessage, setTextMessage] = useState('');
  const [mode, setMode] = useState<'none' | 'voice' | 'text'>('none');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mimeRef = useRef<string>('');

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel('voice-guestbook')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voice_guestbook' }, (payload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === (payload.new as GuestMessage).id)) return prev;
          return [payload.new as GuestMessage, ...prev];
        });
        triggerConfetti();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadMessages() {
    const { data } = await supabase.from('voice_guestbook').select('*').order('created_at', { ascending: false });
    if (data) setMessages(data);
  }

  function triggerConfetti() {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);
  }

  // ── Recording ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = getSupportedMime();
      mimeRef.current = mime;
      const options: MediaRecorderOptions = mime ? { mimeType: mime } : {};
      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];
      setRecordedBlob(null);

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 30) { recorder.stop(); setIsRecording(false); clearInterval(timerRef.current); return t; }
          return t + 1;
        });
      }, 1000);
    } catch { alert('마이크 권한을 허용해주세요.'); }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const playPreview = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  };

  const uploadVoice = useCallback(async () => {
    if (!guestName.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!guestPhone.trim()) { alert('연락처를 입력해주세요.'); return; }
    if (!recordedBlob) { alert('먼저 녹음해주세요.'); return; }
    setUploading(true);
    const ext = getExtension(mimeRef.current);
    const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('voice-messages').upload(fileName, recordedBlob, { contentType: mimeRef.current || 'audio/webm' });
    if (uploadError) { alert('업로드에 실패했습니다.'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(fileName);
    await supabase.from('voice_guestbook').insert({ name: guestName.trim(), phone: guestPhone.trim(), audio_url: urlData.publicUrl, duration: recordingTime, type: 'voice' });
    triggerConfetti();
    resetForm();
  }, [guestName, guestPhone, recordedBlob, recordingTime]);

  const sendText = useCallback(async () => {
    if (!guestName.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!guestPhone.trim()) { alert('연락처를 입력해주세요.'); return; }
    if (!textMessage.trim()) { alert('메시지를 입력해주세요.'); return; }
    setUploading(true);
    await supabase.from('voice_guestbook').insert({ name: guestName.trim(), phone: guestPhone.trim(), message: textMessage.trim(), audio_url: '', duration: 0, type: 'text' });
    triggerConfetti();
    resetForm();
  }, [guestName, guestPhone, textMessage]);

  function resetForm() {
    setMode('none'); setGuestName(''); setGuestPhone(''); setTextMessage('');
    setRecordedBlob(null); chunksRef.current = []; setRecordingTime(0); setUploading(false);
  }

  const playAudio = (msg: GuestMessage) => {
    if (msg.type === 'text') return;
    if (playingId === msg.id) { audioRef.current?.pause(); setPlayingId(null); return; }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(msg.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => { setPlayingId(null); };
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(msg.id);
  };

  // Confetti particles
  const confettiEmojis = ['🎉', '💕', '✨', '🥂', '💐', '🎊', '💍', '🤍'];

  return (
    <div className="vgb">
      {/* Confetti burst */}
      <AnimatePresence>
        {showConfetti && (
          <div className="vgb-confetti">
            {confettiEmojis.map((emoji, i) => (
              <motion.span
                key={i}
                className="vgb-confetti-item"
                initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  y: -(80 + Math.random() * 120),
                  x: (Math.random() - 0.5) * 200,
                  scale: 0.5,
                  rotate: Math.random() * 360,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 + Math.random(), ease: 'easeOut' }}
              >
                {emoji}
              </motion.span>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Floating clouds */}
      <div className="vgb-cloud-field">
        <AnimatePresence>
          {messages.slice(0, 12).map((msg, i) => (
            <FloatingCloud key={msg.id} msg={msg} index={i} isPlaying={playingId === msg.id} onPlay={() => playAudio(msg)} />
          ))}
        </AnimatePresence>
        {messages.length === 0 && (
          <div className="vgb-empty">
            <div className="vgb-empty-icon">💬</div>
            아직 메시지가 없습니다.<br />첫 번째 축하를 남겨주세요!
          </div>
        )}
      </div>

      {/* Message count */}
      {messages.length > 0 && (
        <div className="vgb-count">
          {messages.length}개의 축하 메시지
        </div>
      )}

      {/* Action buttons */}
      {mode === 'none' && (
        <div className="vgb-btn-row">
          <motion.button className="vgb-action-btn voice" onClick={() => setMode('voice')} whileTap={{ scale: 0.95 }}>
            <span className="vgb-action-icon">🎙</span>
            <span className="vgb-action-label">음성 축하</span>
          </motion.button>
          <motion.button className="vgb-action-btn text" onClick={() => setMode('text')} whileTap={{ scale: 0.95 }}>
            <span className="vgb-action-icon">💬</span>
            <span className="vgb-action-label">메시지 축하</span>
          </motion.button>
        </div>
      )}

      {/* Form */}
      {mode !== 'none' && (
        <motion.div className="vgb-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="vgb-privacy-notice">
            🔒 부적절한 내용 방지를 위해 연락처를 수집합니다.
            <span>외부에 공개되지 않습니다.</span>
          </div>
          <div className="vgb-form-row">
            <input className="vgb-input" type="text" placeholder="이름" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={20} />
            <input className="vgb-input" type="tel" placeholder="010-0000-0000" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} maxLength={15} />
          </div>

          {mode === 'voice' && (
            <>
              <div className="vgb-recorder">
                {!isRecording ? (
                  <button className="vgb-mic-btn" onClick={startRecording}>
                    <span className="vgb-mic-icon">{recordedBlob ? '🔄' : '🎙'}</span>
                    <span>{recordedBlob ? '다시 녹음' : '눌러서 녹음'}</span>
                  </button>
                ) : (
                  <button className="vgb-mic-btn recording" onClick={stopRecording}>
                    <span className="vgb-pulse" />
                    <span className="vgb-mic-icon">⏹</span>
                    <span>{recordingTime}초 / 30초</span>
                  </button>
                )}
              </div>
              {recordedBlob && !isRecording && (
                <div className="vgb-preview">
                  <span>✓ {recordingTime}초 녹음 완료</span>
                  <button className="vgb-play-preview" onClick={playPreview}>▶ 미리듣기</button>
                </div>
              )}
            </>
          )}

          {mode === 'text' && (
            <textarea className="vgb-textarea" placeholder="축하 메시지를 남겨주세요 💕" value={textMessage} onChange={(e) => setTextMessage(e.target.value)} maxLength={200} rows={3} />
          )}

          <div className="vgb-actions">
            <button className="vgb-cancel" onClick={resetForm}>취소</button>
            <button className="vgb-submit" onClick={mode === 'voice' ? uploadVoice : sendText} disabled={uploading}>
              {uploading ? '보내는 중...' : '💌 축하 보내기'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
