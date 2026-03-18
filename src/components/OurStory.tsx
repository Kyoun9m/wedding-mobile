import { motion } from 'framer-motion';
import './OurStory.css';

const timeline = [
  { date: '2023. 03', title: '처음 만난 날', desc: '운명처럼 시작된 우리의 이야기' },
  { date: '2023. 12', title: '첫 여행', desc: '함께한 첫 겨울, 잊지 못할 추억' },
  { date: '2025. 06', title: '프로포즈', desc: '"나와 평생을 함께 해줄래?"' },
  { date: '2026. 06', title: '결혼', desc: '서로의 곁에서, 하나가 되어' },
];

export default function OurStory() {
  return (
    <div className="story-timeline">
      {timeline.map((item, i) => (
        <motion.div
          key={i}
          className="story-item"
          initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: i * 0.15 }}
        >
          <div className="story-dot" />
          <div className="story-date">{item.date}</div>
          <div className="story-title">{item.title}</div>
          <div className="story-desc">{item.desc}</div>
        </motion.div>
      ))}
      <div className="story-line" />
    </div>
  );
}
