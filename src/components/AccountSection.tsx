import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AccountSection.css';

interface Account {
  bank: string;
  number: string;
  holder: string;
}

interface AccountGroupProps {
  label: string;
  accounts: Account[];
}

function showToast(msg: string) {
  const existing = document.getElementById('toast');
  if (existing) {
    existing.textContent = msg;
    existing.classList.add('show');
    setTimeout(() => existing.classList.remove('show'), 2000);
  }
}

function copyAccount(num: string) {
  navigator.clipboard.writeText(num).then(() => {
    showToast('계좌번호가 복사되었습니다');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = num;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('계좌번호가 복사되었습니다');
  });
}

function AccountGroup({ label, accounts }: AccountGroupProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button className={`account-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <span className="arrow">▼</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="account-list-animated"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {accounts.map((acc, i) => (
              <div key={i} className="account-item">
                <div>
                  <div className="acct-bank">{acc.bank}</div>
                  <div className="acct-num">{acc.number}</div>
                  <div className="acct-holder">{acc.holder}</div>
                </div>
                <button className="copy-btn" onClick={() => copyAccount(acc.number)}>복사</button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AccountSection() {
  return (
    <>
      <AccountGroup
        label="신랑측 계좌번호"
        accounts={[
          { bank: 'OO은행', number: '000-000000-00-000', holder: '최경민' },
          { bank: 'OO은행 (아버지)', number: '000-000000-00-000', holder: '최OO' },
        ]}
      />
      <div style={{ marginTop: 8 }}>
        <AccountGroup
          label="신부측 계좌번호"
          accounts={[
            { bank: 'OO은행', number: '000-000000-00-000', holder: 'OOO' },
          ]}
        />
      </div>
    </>
  );
}
