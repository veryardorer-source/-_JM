import styles from './Layout.module.css';

const NAV_ITEMS = [
  { key: 'write', icon: '✏️', label: '새 글 쓰기' },
  { key: 'drafts', icon: '📝', label: '임시저장' },
  { key: 'posted', icon: '✅', label: '발행 목록' },
  { key: 'settings', icon: '⚙️', label: '설정' },
];

export default function Layout({ page, onNav, user, children }) {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>N</span>
          <span className={styles.logoText}>블로그 포스터</span>
        </div>

        {user && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{user.name?.[0] || 'U'}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.name || user.nickname}</div>
              <div className={styles.userEmail}>{user.email || '네이버 계정'}</div>
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`${styles.navItem} ${page === item.key ? styles.active : ''}`}
              onClick={() => onNav(item.key)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <span>JM Blog Poster v1.0</span>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
