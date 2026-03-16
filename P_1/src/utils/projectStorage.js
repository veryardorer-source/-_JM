const LIST_KEY = 'ip_projects_list'
const DATA_PREFIX = 'ip_project_data_'

export function getProjectList() {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveProject(id, displayName, snapshot) {
  const list = getProjectList()
  const entry = { id, displayName, savedAt: new Date().toISOString() }
  const idx = list.findIndex(p => p.id === id)
  if (idx >= 0) list[idx] = entry
  else list.push(entry)
  localStorage.setItem(LIST_KEY, JSON.stringify(list))
  localStorage.setItem(DATA_PREFIX + id, JSON.stringify(snapshot))
}

export function loadProject(id) {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function deleteProject(id) {
  const list = getProjectList().filter(p => p.id !== id)
  localStorage.setItem(LIST_KEY, JSON.stringify(list))
  localStorage.removeItem(DATA_PREFIX + id)
}

export function generateProjectId() {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
