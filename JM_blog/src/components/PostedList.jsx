import { useState } from 'react';
import { getPostedList } from '../utils/storage';
import styles from './PostedList.module.css';

export default function PostedList() {
  const [posts] = useState(getPostedList());

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>✅ 발행 목록</h1>
        <span className={styles.count}>{posts.length}개</span>
      </div>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p>발행된 글이 없습니다.</p>
          <p className={styles.sub}>새 글 쓰기에서 포스팅하면 여기에 기록됩니다.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {posts.map((post, i) => (
            <div key={i} className={styles.item}>
              <div className={styles.badge}>발행완료</div>
              <div className={styles.content}>
                <h3 className={styles.itemTitle}>{post.title || '(제목 없음)'}</h3>
                {post.preview && (
                  <p className={styles.preview}>{post.preview}</p>
                )}
                <div className={styles.meta}>
                  {post.tags && <span>🏷️ {post.tags}</span>}
                  <span>📅 {formatDate(post.postedAt)}</span>
                  <span>{post.isPublic ? '🌐 공개' : '🔒 비공개'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
