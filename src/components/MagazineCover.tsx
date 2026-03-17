import { motion } from 'framer-motion';
import './MagazineCover.css';

export default function MagazineCover() {
  // Generate barcode bars
  const barHeights = [12,8,14,6,10,14,8,12,6,14,10,8,14,6,12,8,10,14,8,12,14,6,10,8];

  return (
    <section className="mag-cover">
      <img className="mag-cover-img" src="/mag_cover.png" alt="Wedding" />

      <div className="mag-overlay" />

      <div className="mag-ui">
        {/* WEDDING — large title, center/bottom area */}
        <motion.div
          className="mag-wedding-title"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          WEDDING
        </motion.div>

        {/* Names — right side */}
        <motion.div
          className="mag-names"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
        >
          <span className="mag-name-highlight">경민</span>{' '}
          <span className="mag-name-connector">그리고</span>{' '}
          <span className="mag-name-highlight">OO</span>
          <div className="mag-names-tagline">
            서로의 곁에서,<br />
            하나가 되어 걸어갑니다.
          </div>
        </motion.div>

        {/* IN JUNE — below WEDDING */}
        <motion.div
          className="mag-in-month"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <span className="mag-month-text">IN JUNE</span>
          <span className="mag-month-line" />
        </motion.div>

        {/* Bottom left — invite text */}
        <motion.div
          className="mag-invite-text"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          INVITE YOU<br />
          CELEBRATE OUR MARRIAGE
        </motion.div>

        {/* Bottom right — issue number + barcode */}
        <motion.div
          className="mag-issue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <div className="mag-issue-label">IN.</div>
          <div className="mag-issue-num">06</div>
          <div className="mag-barcode">
            {barHeights.map((h, i) => (
              <span key={i} style={{ height: h }} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="mag-scroll-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="mag-scroll-arrow" />
      </motion.div>
    </section>
  );
}
