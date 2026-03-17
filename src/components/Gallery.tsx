import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './Gallery.css';

const images = [
  { src: '/couple_portrait.png', alt: 'Couple' },
  { src: '/hero.png', alt: 'Wedding' },
  { src: '/bouquet.png', alt: 'Bouquet' },
  { src: '/detail_rings.png', alt: 'Rings' },
];

export default function Gallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = (el.firstElementChild as HTMLElement)?.offsetWidth + 10;
    setActiveIdx(Math.round(el.scrollLeft / cardWidth));
  };

  return (
    <>
      <div className="gallery-scroll" ref={scrollRef} onScroll={handleScroll}>
        {images.map((img, i) => (
          <motion.div
            key={i}
            className="gallery-card"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <img src={img.src} alt={img.alt} />
          </motion.div>
        ))}
      </div>
      <div className="gallery-dots">
        {images.map((_, i) => (
          <div key={i} className={`gallery-dot ${i === activeIdx ? 'active' : ''}`} />
        ))}
      </div>
    </>
  );
}
