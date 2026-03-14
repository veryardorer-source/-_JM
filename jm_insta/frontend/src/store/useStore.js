import { useState, useEffect } from 'react'

const POSTS_KEY = 'jm_insta_posts_v1'

let state = {
  posts: JSON.parse(localStorage.getItem(POSTS_KEY) || '[]'),
}

let listeners = []
const notify = () => listeners.forEach(fn => fn())

function save() {
  localStorage.setItem(POSTS_KEY, JSON.stringify(state.posts))
}

export function useStore() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1)
    listeners.push(listener)
    return () => { listeners = listeners.filter(l => l !== listener) }
  }, [])

  return {
    posts: state.posts,

    addPost(post) {
      state = { ...state, posts: [post, ...state.posts] }
      save()
      notify()
    },

    deletePost(id) {
      state = { ...state, posts: state.posts.filter(p => p.id !== id) }
      save()
      notify()
    },

    updatePost(id, updates) {
      state = {
        ...state,
        posts: state.posts.map(p => p.id === id ? { ...p, ...updates } : p),
      }
      save()
      notify()
    },
  }
}
