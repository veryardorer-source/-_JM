import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import PostEditor from './components/PostEditor';
import DraftList from './components/DraftList';
import PostedList from './components/PostedList';
import Settings from './components/Settings';
import { getAuth } from './utils/storage';
import './App.css';

export default function App() {
  const [page, setPage] = useState('write');
  const [editDraft, setEditDraft] = useState(null);
  const [auth, setAuth] = useState(getAuth());

  const handleNav = (key) => {
    setPage(key);
    if (key !== 'write') setEditDraft(null);
  };

  const handleEditDraft = (draft) => {
    setEditDraft(draft);
    setPage('write');
  };

  const renderPage = () => {
    switch (page) {
      case 'write':
        return (
          <PostEditor
            key={editDraft?.id || 'new'}
            draft={editDraft}
            onSaved={() => {}}
            onNav={handleNav}
          />
        );
      case 'drafts':
        return <DraftList onEdit={handleEditDraft} />;
      case 'posted':
        return <PostedList />;
      case 'settings':
        return <Settings onAuthChange={setAuth} />;
      default:
        return null;
    }
  };

  return (
    <Layout page={page} onNav={handleNav} user={auth?.user}>
      {renderPage()}
    </Layout>
  );
}
