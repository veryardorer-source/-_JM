import { useState } from 'react';
import { getDrafts, deleteDraft } from '../utils/storage';
import styles from './DraftList.module.css';

export default function DraftList({ onEdit }) {
  const [drafts, setDrafts] = useState(getDrafts());

  const handleDelete = (id) => {
    if (!confirm('이 임시저장을 삭제할까요?')) return;
    setDrafts(deleteDraft(id));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📝 임시저장 목록</h1>
        <span className={styles.count}>{drafts.length}개</span>
      </div>

      {drafts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📄</div>
          <p>임시저장된 글이 없습니다.</p>
          <button className={styles.btnWrite} onClick={() => onEdit(null)}>
            새 글 쓰기
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {drafts.map((draft) => (
            <div key={draft.id} className={styles.item}>
              <div className={styles.itemContent}>
                <h3 className={styles.itemTitle}>{draft.title || '(제목 없음)'}</h3>
                <p className={styles.itemPreview}>
                  {draft.content?.replace(/<[^>]+>/g, '').slice(0, 80) || '(내용 없음)'}
                </p>
                <div className={styles.itemMeta}>
                  {draft.tags && <span className={styles.tag}>🏷️ {draft.tags}</span>}
                  <span className={styles.date}>🕐 {formatDate(draft.updatedAt)}</span>
                  <span className={styles.visibility}>{draft.isPublic ? '🌐 공개' : '🔒 비공개'}</span>
                </div>
              </div>
              <div className={styles.itemActions}>
                <button className={styles.btnEdit} onClick={() => onEdit(draft)}>
                  수정
                </button>
                <button className={styles.btnDelete} onClick={() => handleDelete(draft.id)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
