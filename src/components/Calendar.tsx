import { useMemo } from 'react';
import { motion } from 'framer-motion';
import './Calendar.css';

const HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// June 2026: starts on Monday (dayOfWeek=1)
const WEDDING_DAY = 20;
const START_OFFSET = 1; // Monday = 1 empty cell (Sunday first)
const DAYS_IN_MONTH = 30;

export default function Calendar() {
  const dday = useMemo(() => {
    const wedding = new Date('2026-06-20T14:00:00+09:00');
    const diff = Math.ceil((wedding.getTime() - Date.now()) / 86400000);
    if (diff > 0) return `D - ${diff}`;
    if (diff === 0) return 'D - DAY';
    return `D + ${Math.abs(diff)}`;
  }, []);

  const cells: { day: number; type: string }[] = [];

  // Leading empties
  for (let i = 0; i < START_OFFSET; i++) cells.push({ day: 0, type: 'empty' });

  // Days
  for (let d = 1; d <= DAYS_IN_MONTH; d++) {
    const idx = (START_OFFSET + d - 1) % 7;
    let type = '';
    if (idx === 0) type = 'sun';
    else if (idx === 6) type = 'sat';
    if (d === WEDDING_DAY) type = 'highlight';
    cells.push({ day: d, type });
  }

  // Trailing empties
  while (cells.length % 7 !== 0) cells.push({ day: 0, type: 'empty' });

  return (
    <div className="cal-wrap">
      <div className="cal-grid">
        {HEADERS.map((h, i) => (
          <div key={`h${i}`} className="cal-head">{h}</div>
        ))}
        {cells.map((c, i) => (
          <motion.div
            key={i}
            className={`cal-day ${c.type}`}
            initial={c.day === WEDDING_DAY ? { scale: 0 } : undefined}
            whileInView={c.day === WEDDING_DAY ? { scale: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
          >
            {c.type === 'empty' ? '' : c.day}
          </motion.div>
        ))}
      </div>
      <div className="cal-detail">
        2026년 6월 20일 토요일 오후 2시<br />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          더 파티움 여의도 B1 그랜드컨벤션홀
        </span>
      </div>
      <motion.div
        className="dday"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        {dday}
      </motion.div>
    </div>
  );
}
