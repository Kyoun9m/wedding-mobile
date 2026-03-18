import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import type { VoiceMessage } from '../lib/supabase';
import './VoiceGuestbook.css';

export default function VoiceGuestbook() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load existing messages
  useEffect(() => {
    loadMessages();
    // Realtime subscription
    const channel = supabase
      .channel('voice-guestbook')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'voice_guestbook' },
        (payload) => {
          setMessages((prev) => [payload.new as VoiceMessage, ...prev]);
        }
      )
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

  // Recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 30) { stopRecording(); return t; }
          return t + 1;
        });
      }, 1000);
    } catch {
      alert('마이크 권한을 허용해주세요.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const uploadVoice = useCallback(async () => {
    if (!guestName.trim()) { alert('이름을 입력해주세요.'); return; }
    if (chunksRef.current.length === 0) { alert('먼저 녹음해주세요.'); return; }

    setUploading(true);
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, blob, { contentType: 'audio/webm' });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      alert('업로드에 실패했습니다. 다시 시도해주세요.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(fileName);

    // Insert record
    await supabase.from('voice_guestbook').insert({
      name: guestName.trim(),
      audio_url: urlData.publicUrl,
      duration: recordingTime,
    });

    setShowForm(false);
    setGuestName('');
    chunksRef.current = [];
    setRecordingTime(0);
    setUploading(false);
  }, [guestName, recordingTime]);

  // Play audio
  const playAudio = (msg: VoiceMessage) => {
    if (playingId === msg.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(msg.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(msg.id);
  };

  // Random positions for floating clouds
  const getCloudStyle = (index: number) => {
    const positions = [
      { left: '8%', top: '5%' },
      { left: '55%', top: '2%' },
      { left: '25%', top: '22%' },
      { left: '65%', top: '20%' },
      { left: '5%', top: '40%' },
      { left: '50%', top: '38%' },
      { left: '20%', top: '55%' },
      { left: '60%', top: '52%' },
      { left: '10%', top: '70%' },
      { left: '48%', top: '68%' },
      { left: '30%', top: '82%' },
      { left: '70%', top: '80%' },
    ];
    return positions[index % positions.length];
  };

  return (
    <div className="vgb">
      {/* Floating voice clouds */}
      <div className="vgb-cloud-field">
        <AnimatePresence>
          {messages.slice(0, 12).map((msg, i) => (
            <motion.div
              key={msg.id}
              className={`vgb-cloud ${playingId === msg.id ? 'playing' : ''}`}
              style={getCloudStyle(i)}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -8, 0, -5, 0],
              }}
              transition={{
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 },
                y: { duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
              }}
              onClick={() => playAudio(msg)}
              whileTap={{ scale: 0.95 }}
            >
              <div className="vgb-cloud-wave">
                {[...Array(5)].map((_, j) => (
                  <span
                    key={j}
                    className={`vgb-wave-bar ${playingId === msg.id ? 'active' : ''}`}
                    style={{ animationDelay: `${j * 0.1}s` }}
                  />
                ))}
              </div>
              <div className="vgb-cloud-name">{msg.name}</div>
              <div className="vgb-cloud-dur">{msg.duration}s</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="vgb-empty">
            아직 음성 메시지가 없습니다.<br />
            첫 번째 축하 메시지를 남겨주세요!
          </div>
        )}
      </div>

      {/* Record button */}
      {!showForm ? (
        <motion.button
          className="vgb-record-btn"
          onClick={() => setShowForm(true)}
          whileTap={{ scale: 0.95 }}
        >
          🎙 음성으로 축하해주세요
        </motion.button>
      ) : (
        <motion.div
          className="vgb-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <input
            className="vgb-input"
            type="text"
            placeholder="이름을 입력해주세요"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={20}
          />

          <div className="vgb-recorder">
            {!isRecording ? (
              <button className="vgb-mic-btn" onClick={startRecording}>
                <span className="vgb-mic-icon">🎙</span>
                <span>눌러서 녹음</span>
              </button>
            ) : (
              <button className="vgb-mic-btn recording" onClick={stopRecording}>
                <span className="vgb-pulse" />
                <span className="vgb-mic-icon">⏹</span>
                <span>{recordingTime}s / 30s</span>
              </button>
            )}
          </div>

          {recordingTime > 0 && !isRecording && (
            <div className="vgb-preview">
              ✓ {recordingTime}초 녹음 완료
            </div>
          )}

          <div className="vgb-actions">
            <button className="vgb-cancel" onClick={() => { setShowForm(false); chunksRef.current = []; }}>
              취소
            </button>
            <button
              className="vgb-submit"
              onClick={uploadVoice}
              disabled={uploading || chunksRef.current.length === 0}
            >
              {uploading ? '보내는 중...' : '축하 보내기'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
