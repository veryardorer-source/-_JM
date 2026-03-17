import { useState, useEffect } from 'react'

const STORAGE_KEYS = {
  posts: 'jm_blog_posts',
  categories: 'jm_blog_categories',
  settings: 'jm_blog_settings',
}

const defaultCategories = [
  { id: '1', name: '시공사례', color: '#4f46e5' },
  { id: '2', name: '회사소식', color: '#0891b2' },
  { id: '3', name: '인테리어팁', color: '#059669' },
  { id: '4', name: '자재소개', color: '#d97706' },
]

const defaultSettings = {
  apiKey: '',
  companyName: '',
  companyDesc: '',
  tone: '친근하고 전문적인',
}

function loadFromStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

let listeners = []
let state = {
  posts: loadFromStorage(STORAGE_KEYS.posts, []),
  categories: loadFromStorage(STORAGE_KEYS.categories, defaultCategories),
  settings: loadFromStorage(STORAGE_KEYS.settings, defaultSettings),
}

function setState(updater) {
  state = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
  listeners.forEach(fn => fn(state))
}

export function useStore() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1)
    listeners.push(listener)
    return () => { listeners = listeners.filter(l => l !== listener) }
  }, [])

  function savePost(post) {
    const now = new Date().toISOString()
    let newPosts
    if (post.id) {
      newPosts = state.posts.map(p => p.id === post.id ? { ...post, updatedAt: now } : p)
    } else {
      const newPost = { ...post, id: Date.now().toString(), createdAt: now, updatedAt: now }
      newPosts = [newPost, ...state.posts]
    }
    setState(s => ({ ...s, posts: newPosts }))
    saveToStorage(STORAGE_KEYS.posts, newPosts)
  }

  function deletePost(id) {
    const newPosts = state.posts.filter(p => p.id !== id)
    setState(s => ({ ...s, posts: newPosts }))
    saveToStorage(STORAGE_KEYS.posts, newPosts)
  }

  function saveCategory(cat) {
    let newCats
    if (cat.id) {
      newCats = state.categories.map(c => c.id === cat.id ? cat : c)
    } else {
      newCats = [...state.categories, { ...cat, id: Date.now().toString() }]
    }
    setState(s => ({ ...s, categories: newCats }))
    saveToStorage(STORAGE_KEYS.categories, newCats)
  }

  function deleteCategory(id) {
    const newCats = state.categories.filter(c => c.id !== id)
    setState(s => ({ ...s, categories: newCats }))
    saveToStorage(STORAGE_KEYS.categories, newCats)
  }

  function saveSettings(settings) {
    setState(s => ({ ...s, settings }))
    saveToStorage(STORAGE_KEYS.settings, settings)
  }

  return {
    ...state,
    savePost,
    deletePost,
    saveCategory,
    deleteCategory,
    saveSettings,
  }
}
