import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import type { GuestMessage } from '../lib/supabase';
import './VoiceGuestbook.css';

// Detect supported mimeType
function getSupportedMime(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function getExtension(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mimeRef = useRef<string>('');

  // Load + realtime
  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel('voice-guestbook')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voice_guestbook' }, (payload) => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === (payload.new as GuestMessage).id);
          if (exists) return prev;
          return [payload.new as GuestMessage, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadMessages() {
    const { data } = await supabase
      .from('voice_guestbook')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setMessages(data);
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      // Request data every 500ms for reliability
      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 30) {
            recorder.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch {
      alert('마이크 권한을 허용해주세요.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  }, []);

  // Preview recorded audio
  const playPreview = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  };

  // ── Upload voice ──
  const uploadVoice = useCallback(async () => {
    if (!guestName.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!guestPhone.trim()) { alert('연락처를 입력해주세요.'); return; }
    if (!recordedBlob) { alert('먼저 녹음해주세요.'); return; }

    setUploading(true);
    const ext = getExtension(mimeRef.current);
    const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, recordedBlob, { contentType: mimeRef.current || 'audio/webm' });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      alert('업로드에 실패했습니다. 다시 시도해주세요.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(fileName);

    await supabase.from('voice_guestbook').insert({
      name: guestName.trim(),
      phone: guestPhone.trim(),
      audio_url: urlData.publicUrl,
      duration: recordingTime,
      type: 'voice',
    });

    resetForm();
  }, [guestName, guestPhone, recordedBlob, recordingTime]);

  // ── Send text ──
  const sendText = useCallback(async () => {
    if (!guestName.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!guestPhone.trim()) { alert('연락처를 입력해주세요.'); return; }
    if (!textMessage.trim()) { alert('메시지를 입력해주세요.'); return; }

    setUploading(true);
    await supabase.from('voice_guestbook').insert({
      name: guestName.trim(),
      phone: guestPhone.trim(),
      message: textMessage.trim(),
      audio_url: '',
      duration: 0,
      type: 'text',
    });
    resetForm();
  }, [guestName, guestPhone, textMessage]);

  function resetForm() {
    setMode('none');
    setGuestName('');
    setGuestPhone('');
    setTextMessage('');
    setRecordedBlob(null);
    chunksRef.current = [];
    setRecordingTime(0);
    setUploading(false);
  }

  // ── Play audio ──
  const playAudio = (msg: GuestMessage) => {
    if (msg.type === 'text') return;
    if (playingId === msg.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(msg.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => { setPlayingId(null); alert('재생에 실패했습니다.'); };
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(msg.id);
  };

  // Cloud positions
  const getCloudStyle = (index: number) => {
    const positions = [
      { left: '8%', top: '5%' }, { left: '55%', top: '2%' },
      { left: '25%', top: '22%' }, { left: '65%', top: '20%' },
      { left: '5%', top: '40%' }, { left: '50%', top: '38%' },
      { left: '20%', top: '55%' }, { left: '60%', top: '52%' },
      { left: '10%', top: '70%' }, { left: '48%', top: '68%' },
      { left: '30%', top: '82%' }, { left: '70%', top: '80%' },
    ];
    return positions[index % positions.length];
  };

  return (
    <div className="vgb">
      {/* Floating clouds */}
      <div className="vgb-cloud-field">
        <AnimatePresence>
          {messages.slice(0, 12).map((msg, i) => (
            <motion.div
              key={msg.id}
              className={`vgb-cloud ${msg.type} ${playingId === msg.id ? 'playing' : ''}`}
              style={getCloudStyle(i)}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0, -5, 0] }}
              transition={{
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 },
                y: { duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
              }}
              onClick={() => playAudio(msg)}
              whileTap={{ scale: 0.95 }}
            >
              {msg.type === 'voice' ? (
                <>
                  <div className="vgb-cloud-wave">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className={`vgb-wave-bar ${playingId === msg.id ? 'active' : ''}`} style={{ animationDelay: `${j * 0.1}s` }} />
                    ))}
                  </div>
                  <div className="vgb-cloud-name">{msg.name}</div>
                  <div className="vgb-cloud-dur">{msg.duration}s</div>
                </>
              ) : (
                <>
                  <div className="vgb-cloud-text">{msg.message}</div>
                  <div className="vgb-cloud-name">{msg.name}</div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="vgb-empty">
            아직 메시지가 없습니다.<br />첫 번째 축하 메시지를 남겨주세요!
          </div>
        )}
      </div>

      {/* Action buttons */}
      {mode === 'none' && (
        <div className="vgb-btn-row">
          <motion.button className="vgb-record-btn" onClick={() => setMode('voice')} whileTap={{ scale: 0.95 }}>
            🎙 음성 축하
          </motion.button>
          <motion.button className="vgb-record-btn" onClick={() => setMode('text')} whileTap={{ scale: 0.95 }}>
            💬 메시지 축하
          </motion.button>
        </div>
      )}

      {/* Form */}
      {mode !== 'none' && (
        <motion.div className="vgb-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="vgb-privacy-notice">
            🔒 개인정보 보호를 위해 연락처를 수집하고 있습니다.<br />
            <span>부적절한 내용 방지 목적이며, 외부에 공개되지 않습니다.</span>
          </div>

          <input className="vgb-input" type="text" placeholder="이름" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={20} />
          <input className="vgb-input" type="tel" placeholder="연락처 (예: 010-1234-5678)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} maxLength={15} />

          {mode === 'voice' && (
            <>
              <div className="vgb-recorder">
                {!isRecording ? (
                  <button className="vgb-mic-btn" onClick={startRecording}>
                    <span className="vgb-mic-icon">🎙</span>
                    <span>{recordedBlob ? '다시 녹음하기' : '눌러서 녹음 시작'}</span>
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
            <textarea
              className="vgb-textarea"
              placeholder="축하 메시지를 남겨주세요"
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              maxLength={200}
              rows={3}
            />
          )}

          <div className="vgb-actions">
            <button className="vgb-cancel" onClick={resetForm}>취소</button>
            <button
              className="vgb-submit"
              onClick={mode === 'voice' ? uploadVoice : sendText}
              disabled={uploading}
            >
              {uploading ? '보내는 중...' : '축하 보내기'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
