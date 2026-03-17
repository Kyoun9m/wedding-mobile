import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionProps {
  label?: string;
  title?: string;
  alt?: boolean;
  noPadX?: boolean;
  children: ReactNode;
  className?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] as const },
  },
};

export default function Section({ label, title, alt, noPadX, children, className = '' }: SectionProps) {
  return (
    <motion.div
      className={`section ${alt ? 'section-alt' : ''} ${className}`}
      style={noPadX ? { paddingLeft: 0, paddingRight: 0 } : undefined}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
    >
      {(label || title) && (
        <div style={noPadX ? { padding: '0 32px' } : undefined}>
          {label && <div className="section-label">{label}</div>}
          {title && <div className="section-title-kr">{title}</div>}
          <div className="divider" />
        </div>
      )}
      {children}
    </motion.div>
  );
}
