import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { saveDraft, addPosted, getAuth, getSettings } from '../utils/storage';
import { postToBlog } from '../utils/naverApi';
import styles from './PostEditor.module.css';

const TOOLBAR = [
  { cmd: 'bold', icon: 'B', title: '굵게', style: { fontWeight: 'bold' } },
  { cmd: 'italic', icon: 'I', title: '기울임', style: { fontStyle: 'italic' } },
  { cmd: 'underline', icon: 'U', title: '밑줄', style: { textDecoration: 'underline' } },
  { cmd: 'strikeThrough', icon: 'S', title: '취소선', style: { textDecoration: 'line-through' } },
  { sep: true },
  { cmd: 'insertUnorderedList', icon: '≡', title: '목록' },
  { cmd: 'insertOrderedList', icon: '①', title: '번호 목록' },
  { sep: true },
  { cmd: 'justifyLeft', icon: '◀', title: '왼쪽 정렬' },
  { cmd: 'justifyCenter', icon: '▬', title: '가운데 정렬' },
  { cmd: 'justifyRight', icon: '▶', title: '오른쪽 정렬' },
];

const HEADING_OPTIONS = [
  { value: 'p', label: '본문' },
  { value: 'h1', label: '제목1' },
  { value: 'h2', label: '제목2' },
  { value: 'h3', label: '제목3' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

export default function PostEditor({ draft, onSaved, onNav }) {
  const [id] = useState(draft?.id || uuidv4());
  const [title, setTitle] = useState(draft?.title || '');
  const [tags, setTags] = useState(draft?.tags || '');
  const [isPublic, setIsPublic] = useState(draft?.isPublic ?? true);
  const [status, setStatus] = useState(null);
  const [posting, setPosting] = useState(false);
  const editorRef = useRef(null);

  const execCmd = (cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const handleHeading = (e) => {
    execCmd('formatBlock', e.target.value);
  };

  const handleFontSize = (e) => {
    execCmd('fontSize', 3);
    // fontSize command uses 1-7 scale; use span workaround for px
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = e.target.value;
      try {
        range.surroundContents(span);
      } catch {}
    }
  };

  const handleColor = (e) => {
    execCmd('foreColor', e.target.value);
  };

  const handleLink = () => {
    const url = prompt('링크 URL 입력:');
    if (url) execCmd('createLink', url);
  };

  const getContent = () => editorRef.current?.innerHTML || '';

  const handleSaveDraft = () => {
    const content = getContent();
    if (!title && !content) {
      setStatus({ type: 'error', text: '제목 또는 내용을 입력해주세요.' });
      return;
    }
    const saved = saveDraft({ id, title, content, tags, isPublic });
    setStatus({ type: 'success', text: '✅ 임시저장 완료!' });
    onSaved?.(saved);
    setTimeout(() => setStatus(null), 3000);
  };

  const handlePost = async () => {
    const content = getContent();
    if (!title.trim()) {
      setStatus({ type: 'error', text: '제목을 입력해주세요.' });
      return;
    }
    if (!content.trim()) {
      setStatus({ type: 'error', text: '내용을 입력해주세요.' });
      return;
    }
    const auth = getAuth();
    if (!auth.accessToken) {
      setStatus({ type: 'error', text: '⚠️ 네이버 로그인이 필요합니다. 설정에서 로그인해주세요.' });
      return;
    }
    setPosting(true);
    setStatus({ type: 'info', text: '📤 포스팅 중...' });
    try {
      await postToBlog({
        accessToken: auth.accessToken,
        title,
        contents: content,
        tags,
        isPublic,
      });
      addPosted({ id, title, tags, isPublic, preview: content.replace(/<[^>]+>/g, '').slice(0, 100) });
      setStatus({ type: 'success', text: '🎉 포스팅 성공! 네이버 블로그에 발행되었습니다.' });
    } catch (e) {
      setStatus({ type: 'error', text: `포스팅 실패: ${e.message}` });
    } finally {
      setPosting(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      editorRef.current?.focus();
      document.execCommand('insertImage', false, ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{draft ? '글 수정' : '새 글 쓰기'}</h1>
        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={handleSaveDraft}>임시저장</button>
          <button
            className={styles.btnPost}
            onClick={handlePost}
            disabled={posting}
          >
            {posting ? '발행 중...' : '📤 네이버 발행'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`${styles.status} ${styles[status.type]}`}>{status.text}</div>
      )}

      <div className={styles.editorCard}>
        {/* 제목 */}
        <input
          className={styles.titleInput}
          type="text"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* 툴바 */}
        <div className={styles.toolbar}>
          <select className={styles.select} onChange={handleHeading} defaultValue="p">
            {HEADING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select className={styles.select} onChange={handleFontSize} defaultValue="">
            <option value="" disabled>크기</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className={styles.divider} />

          {TOOLBAR.map((item, i) =>
            item.sep ? (
              <div key={i} className={styles.divider} />
            ) : (
              <button
                key={item.cmd}
                title={item.title}
                className={styles.toolBtn}
                onMouseDown={(e) => { e.preventDefault(); execCmd(item.cmd); }}
                style={item.style}
              >
                {item.icon}
              </button>
            )
          )}

          <div className={styles.divider} />

          <button className={styles.toolBtn} title="링크" onMouseDown={(e) => { e.preventDefault(); handleLink(); }}>
            🔗
          </button>

          <label className={styles.toolBtn} title="이미지 삽입">
            🖼️
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>

          <div className={styles.divider} />

          <input
            type="color"
            className={styles.colorPicker}
            title="글자 색상"
            onChange={handleColor}
            defaultValue="#000000"
          />
        </div>

        {/* 에디터 */}
        <div
          ref={editorRef}
          className={styles.editor}
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: draft?.content || '' }}
          data-placeholder="내용을 입력하세요..."
        />
      </div>

      {/* 태그 & 공개 설정 */}
      <div className={styles.meta}>
        <div className={styles.metaField}>
          <label>🏷️ 태그</label>
          <input
            type="text"
            placeholder="태그를 입력하세요 (쉼표로 구분: 인테리어, 리모델링)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <div className={styles.metaField}>
          <label>공개 설정</label>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggleBtn} ${isPublic ? styles.active : ''}`}
              onClick={() => setIsPublic(true)}
            >
              🌐 공개
            </button>
            <button
              className={`${styles.toggleBtn} ${!isPublic ? styles.active : ''}`}
              onClick={() => setIsPublic(false)}
            >
              🔒 비공개
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
