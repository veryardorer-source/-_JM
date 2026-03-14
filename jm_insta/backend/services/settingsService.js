const fs = require('fs')
const path = require('path')

const SETTINGS_PATH = path.join(__dirname, '../data/settings.json')

const defaults = {
  claudeApiKey: '',
  openaiApiKey: '',
  brandContext: '서울 강남/서초 지역 전문 인테리어 회사. 아파트·오피스텔 시공의뢰 및 디자인의뢰 전문.',
  defaultHashtags: ['JM인테리어', '인테리어', '인테리어디자인', '홈인테리어'],
  preferredStyles: ['모던', '미니멀'],
  targetAudience: '30-40대 신혼부부 및 이사 예정 가정',
}

function read() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    const dir = path.dirname(SETTINGS_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2))
    return { ...defaults }
  }
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
}

function write(settings) {
  const dir = path.dirname(SETTINGS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

function masked() {
  const s = read()
  return {
    ...s,
    claudeApiKey: s.claudeApiKey ? `sk-ant-***${s.claudeApiKey.slice(-4)}` : '',
    openaiApiKey: s.openaiApiKey ? `sk-***${s.openaiApiKey.slice(-4)}` : '',
  }
}

function isConfigured() {
  const s = read()
  return { claude: !!s.claudeApiKey, openai: !!s.openaiApiKey }
}

module.exports = { read, write, masked, isConfigured }
