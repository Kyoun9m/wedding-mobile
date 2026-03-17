import { motion } from 'framer-motion';
import MagazineCover from './components/MagazineCover';
import Section from './components/Section';
import Gallery from './components/Gallery';
import Calendar from './components/Calendar';
import AccountSection from './components/AccountSection';
import './styles/global.css';
import './App.css';

export default function App() {
  return (
    <div className="wrapper">
      <MagazineCover />

      {/* Greeting */}
      <Section label="Invitation" title="소중한 분들을 초대합니다">
        <div className="greeting">
          <p>
            서로가 마주보며 다져온 사랑을<br />
            이제 함께 한 곳을 바라보며<br />
            걸어가고자 합니다.
          </p>
          <br />
          <p>
            저희 두 사람이 사랑의 이름으로<br />
            지켜나갈 수 있도록<br />
            축복해 주시면 감사하겠습니다.
          </p>
        </div>
      </Section>

      {/* Families */}
      <Section alt>
        <div className="families-row">
          <div className="family-col">
            <div className="family-side">신랑측</div>
            <div className="family-parents">최OO · OOO</div>
            <div className="family-child">장남 경민</div>
          </div>
          <div className="family-col">
            <div className="family-side">신부측</div>
            <div className="family-parents">OOO · OOO</div>
            <div className="family-child"><span className="family-relation">장녀</span> OO</div>
          </div>
        </div>
      </Section>

      {/* Gallery */}
      <Section label="Gallery" title="우리의 이야기" noPadX>
        <Gallery />
      </Section>

      {/* Calendar */}
      <Section label="Calendar" title="예식 일시" alt>
        <Calendar />
      </Section>

      {/* Venue */}
      <Section label="Location" title="오시는 길">
        <div className="venue-photo">
          <motion.img
            src="/venue_mood.png"
            alt="더파티움 여의도"
            initial={{ scale: 1.1 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ width: '100%', display: 'block' }}
          />
        </div>
        <div className="venue-name">더 파티움 여의도</div>
        <div className="venue-detail">B1층 그랜드컨벤션홀</div>
        <div className="venue-address">
          서울특별시 영등포구 국제금융로 7길 32<br />
          (여의도동) 더 파티움
        </div>
        <div className="map-area">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3164.5!2d126.924!3d37.522!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z64-U7YyM7Yuw7JuAIOyXrOydmOuPhA!5e0!3m2!1sko!2skr!4v1"
            allowFullScreen
            loading="lazy"
            title="map"
          />
        </div>
        <div className="transport">
          <div className="transport-row">
            <span className="transport-icon">지하철</span>
            <span>5·9호선 여의도역 1번 출구 도보 5분</span>
          </div>
          <div className="transport-row">
            <span className="transport-icon">버스</span>
            <span>여의도 환승센터 하차</span>
          </div>
          <div className="transport-row">
            <span className="transport-icon">주차</span>
            <span>건물 내 지하주차장 이용 가능</span>
          </div>
        </div>
      </Section>

      {/* Account */}
      <Section label="Gift" title="마음 전하실 곳" alt>
        <AccountSection />
      </Section>

      {/* RSVP */}
      <Section label="R.S.V.P" title="참석 여부">
        <p className="rsvp-text">
          축하의 마음으로 참석해주시면<br />
          더없는 기쁨이 되겠습니다.
        </p>
        <motion.a
          className="rsvp-btn"
          href="#"
          whileTap={{ scale: 0.97 }}
        >
          참석 의사 전달하기
        </motion.a>
      </Section>

      {/* Footer */}
      <div className="footer">
        <motion.div
          className="footer-heart"
          animate={{ scale: [1, 1.15, 1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          ♥
        </motion.div>
        <div className="footer-names">Kyoungmin & Bride</div>
      </div>

      {/* Toast */}
      <div className="toast" id="toast" />
    </div>
  );
}
