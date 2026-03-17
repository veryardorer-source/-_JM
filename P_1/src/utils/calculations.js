// ─────────────────────────────────────────────
// 계산 유틸리티
// ─────────────────────────────────────────────
import { GAKJAE } from '../data/materials.js'

const GAKJAE_SPACING = 450 // mm
const WASTE_RATE = 1.1     // 할증 10%
const SQM_TO_PYUNG = 3.3058

// 층고(referenceMm) 이상인 각재 중 가장 짧은 것 선택
// 해당하는 길이가 없으면 가장 긴 것 사용
function selectGakjaeByHeight(referenceMm) {
  const sorted = [...GAKJAE].sort((a, b) => a.length - b.length)
  return sorted.find(g => g.length >= referenceMm) || sorted[sorted.length - 1]
}

// ── 각재 계산 (벽면용) ──────────────────────────
// 세로상(수직 부재): 450mm 간격
// 가로상(수평 부재): (벽 폭 / 각재 길이) × 단수 (2단 or 3단)
//   단수: null → 높이 2400 이하 2단, 초과 3단 자동 / 또는 직접 지정
export function calcGakjae(widthMm, heightMm, rows = null) {
  // 세로상: 450mm 간격, 높이 방향으로 뻗음
  const verticalCount   = Math.floor(widthMm / GAKJAE_SPACING) + 1
  const verticalTotalMm = verticalCount * heightMm

  // 가로상 단수 결정
  const rowCount = rows ?? (heightMm <= 2400 ? 2 : 3)

  // 가로상: 벽 폭 전체를 rowCount 단 배치
  const horizontalTotalMm = widthMm * rowCount

  const totalMm = (verticalTotalMm + horizontalTotalMm) * WASTE_RATE

  // 층고(heightMm) 기준으로 각재 길이 선택: 층고 이상인 것 중 가장 짧은 것
  const selectedGak = selectGakjaeByHeight(heightMm)
  const count = Math.ceil(totalMm / selectedGak.length)
  const breakdown = [{ length: selectedGak.length, count }]

  return { totalM: Math.round(totalMm / 1000 * 100) / 100, breakdown, rowCount }
}

// ── 천장 목공 트러스 각재 계산 ──────────────────
// 짧은 면 방향 → 1000mm 간격 (주 각재)
// 긴 면 방향  → 450mm 간격  (부 각재)
// 지지 합판   → 부각재(짧은면 450mm 간격) 위치에서 슬라브를 지지하는 용도
//              studHeightM(슬라브-마감 차이)에 따라 장수 계산
//              studHeightM=0이면 합판 불필요 (슬라브H 미입력)
// roomHeightMm → 층고(마감 높이, mm) 기준으로 각재 길이 선택
export function calcCeilingGakjae(widthMm, depthMm, studHeightM, roomHeightMm) {
  const shortMm = Math.min(widthMm, depthMm)
  const longMm  = Math.max(widthMm, depthMm)

  // 주 각재: 짧은 면 방향으로 뻗음, 긴 면 따라 1000mm 간격 배치
  const mainCount    = Math.floor(longMm / 1000) + 1
  const mainTotalMm  = mainCount * shortMm

  // 부 각재: 긴 면 방향으로 뻗음, 짧은 면 따라 450mm 간격 배치
  const subCount    = Math.floor(shortMm / 450) + 1
  const subTotalMm  = subCount * longMm

  const totalMm = (mainTotalMm + subTotalMm) * WASTE_RATE

  // 층고(roomHeightMm) 기준으로 각재 길이 선택
  const selectedGak = selectGakjaeByHeight(roomHeightMm || 0)
  const count = Math.ceil(totalMm / selectedGak.length)
  const breakdown = [{ length: selectedGak.length, count }]

  // 스터드 높이가 0 이하면 최소 200mm로 처리
  const effectiveStudH = (!studHeightM || studHeightM <= 0) ? 0.2 : studHeightM

  // 조각 높이 = 슬라브-마감 간격, 폭 = 200mm 고정
  // 지지점 = 부각재(짧은면 450간격) × 주각재(긴면 1000간격) 교차점
  const pieceHeightMm  = Math.round(effectiveStudH * 1000)
  const pieceWidthMm   = 200
  const piecesPerCol   = pieceHeightMm <= 2440 ? Math.floor(2440 / pieceHeightMm) : 1
  const piecesPerRow   = Math.floor(1220 / pieceWidthMm)
  const piecesPerSheet = Math.max(1, piecesPerCol * piecesPerRow)
  const supportCount   = mainCount * subCount  // 부각재 × 주각재 교차점 수
  const hapanSheets    = Math.ceil(supportCount / piecesPerSheet)

  return {
    totalM: Math.round(totalMm / 1000 * 100) / 100,
    breakdown,
    mainCount,
    subCount,
    supportHapanSheets: hapanSheets,
    pieceHeightMm,
  }
}

// ── 벽 100mm: 각재 28 + 합판 + 28 = 100mm 계산 ──
// 두 겹의 28mm 각재 사이를 합판으로 채움
// 1장(1220mm)에서 13조각 재단
export function calcWall100mmHapan(widthMm, heightMm) {
  const SHEET_W = 1220, SHEET_H = 2440
  const verticalCount = Math.floor(widthMm / 450) + 1  // 세로각재 수 (450mm 간격)
  const stripsPerSheet = 13                             // 1장에서 13조각 (1220/13 ≈ 94mm)
  const stripsPerPos = Math.ceil(heightMm / SHEET_H)   // 높이 초과 시 2스트립
  const totalStrips = verticalCount * stripsPerPos
  const sheets = Math.ceil(totalStrips / stripsPerSheet)
  return { sheets, verticalCount }
}


// 각재 단가 계산
export function calcGakjaeCost(breakdown) {
  let total = 0
  for (const { length, count } of breakdown) {
    const gak = GAKJAE.find(g => g.length === length)
    if (!gak) continue
    // 단(묶음) 단가 계산: 1단에 N개, 필요 단수 = ceil(count / countPerDan)
    const danCount = Math.ceil(count / gak.countPerDan)
    total += danCount * gak.pricePerDan
  }
  return total
}

// ── 석고보드 계산 ───────────────────────────────
// areaSqm: 면적(㎡), layers: 겹수(1 or 2), pricePerSheet: 장당 단가
export function calcSeokgo(areaSqm, layers, pricePerSheet) {
  const areaPerSheet = 1.62
  const sheets = Math.ceil(areaSqm / areaPerSheet) * layers
  const cost = sheets * pricePerSheet
  return { sheets, cost }
}

// ── 합판/MDF 계산 ───────────────────────────────
export function calcBoard(areaSqm, areaPerSheet, pricePerSheet) {
  const sheets = Math.ceil((areaSqm / areaPerSheet) * WASTE_RATE)
  const cost = sheets * pricePerSheet
  return { sheets, cost }
}

// ── 벽지 계산 ───────────────────────────────────
export function calcWallpaper(areaSqm, pricePerRoll, pyungPerRoll) {
  const pyung = areaSqm / SQM_TO_PYUNG
  const rolls = Math.ceil(pyung / pyungPerRoll)
  const cost = rolls * pricePerRoll
  return { rolls, cost }
}

// ── 타일 계산 ───────────────────────────────────
// widthMm/heightMm: 면 치수(mm), tile: TILE 객체
// tileW/tileH 있으면 장수 기반 계산, 없으면 면적 기반 fallback
export function calcTile(widthMm, heightMm, tile) {
  let boxes
  if (tile.tileW && tile.tileH && tile.tilesPerBox) {
    const tilesW = Math.ceil(widthMm / tile.tileW)
    const tilesH = Math.ceil(heightMm / tile.tileH)
    boxes = Math.ceil((tilesW * tilesH) / tile.tilesPerBox)
  } else {
    const areaSqm = (widthMm * heightMm) / 1_000_000
    boxes = Math.ceil((areaSqm / tile.areaPerBox) * WASTE_RATE)
  }
  return { boxes, cost: boxes * tile.pricePerBox }
}

// ── 바닥재 계산 ─────────────────────────────────
export function calcFlooring(areaSqm, areaPerUnit, pricePerUnit, unit) {
  if (unit === '㎡') {
    // 장판: areaPerUnit은 장당 면적이 아닌 단순 단위면적
    const units = Math.ceil(areaSqm * WASTE_RATE)
    const cost = units * pricePerUnit
    return { units, cost }
  } else {
    // BOX
    const boxes = Math.ceil((areaSqm / areaPerUnit) * WASTE_RATE)
    const cost = boxes * pricePerUnit
    return { units: boxes, cost }
  }
}

// ── 루바 계산 ───────────────────────────────────
export function calcLuba(areaSqm, areaPerPack, pricePerPack) {
  const packs = Math.ceil((areaSqm / areaPerPack) * WASTE_RATE)
  const cost = packs * pricePerPack
  return { packs, cost }
}

// ── 인테리어필름 계산 (구간별) ──────────────────
// 롤폭 고정 1200mm
// sections: [{id, label, widthMm, patternRepeatMm, heightOverrideMm}]
// wallHeightMm: 벽 높이(mm), pricePerM: 필름 m당 단가
const FILM_ROLL_WIDTH_MM = 1200
const FILM_MARGIN_MM = 100 // 위아래 여유

// sections: [{id, label, widthMm, patternRepeatMm, heightOverrideMm, filmName, pricePerM}]
// defaultPricePerM: 구간에 단가가 없을 때 사용
export function calcFilmSections(sections, wallHeightMm, defaultPricePerM) {
  if (!sections || sections.length === 0) return { sectionResults: [], totalM: 0, cost: 0 }

  const sectionResults = sections.map((sec) => {
    const heightMm = sec.heightOverrideMm > 0 ? sec.heightOverrideMm : wallHeightMm
    const widthMm = sec.widthMm || 0
    // 이 구간을 커버하려면 몇 장의 롤 폭이 필요한가
    const stripsNeeded = Math.ceil(widthMm / FILM_ROLL_WIDTH_MM)
    // 한 스트립 길이 = 높이 + 패턴간격 + 여유
    const stripLengthMm = heightMm + (sec.patternRepeatMm || 0) + FILM_MARGIN_MM
    // 구간 소요 총 길이
    const sectionTotalMm = stripsNeeded * stripLengthMm
    const sectionM = Math.round(sectionTotalMm / 100) / 10  // 소수점 1자리
    // 로스: 재단 후 남는 폭 × 길이
    const usedWidthMm = stripsNeeded * FILM_ROLL_WIDTH_MM
    const lossWidthMm = usedWidthMm - widthMm
    const lossM = Math.round((lossWidthMm * stripLengthMm) / 1000 / 100) / 10
    // 구간 단가: 구간별 단가 우선, 없으면 기본 단가
    const pricePerM = sec.pricePerM > 0 ? sec.pricePerM : (defaultPricePerM || 0)
    const sectionCost = sectionM * pricePerM

    return {
      id: sec.id,
      label: sec.label || `구간`,
      filmName: sec.filmName || '',
      widthMm,
      heightMm,
      patternRepeatMm: sec.patternRepeatMm || 0,
      stripsNeeded,
      sectionM,
      lossM,
      pricePerM,
      sectionCost,
    }
  })

  const totalM = Math.round(sectionResults.reduce((s, r) => s + r.sectionM, 0) * 10) / 10
  const cost = sectionResults.reduce((s, r) => s + r.sectionCost, 0)
  return { sectionResults, totalM, cost }
}

export { FILM_ROLL_WIDTH_MM }

// ── 개구부 면적 차감 ─────────────────────────────
export function netAreaSqm(widthM, heightM, openings = []) {
  const gross = widthM * heightM
  const deduction = openings.reduce((sum, o) => sum + o.width * o.height, 0)
  return Math.max(0, gross - deduction)
}

// ── T5/T7 라인조명 조합 계산 ─────────────────────
const LINEAR_SIZES = [1200, 900, 600, 300]

export function calcLinearCombo(totalMm) {
  if (!totalMm || totalMm <= 0) return { items: [], remaining: 0 }
  const result = []
  let remaining = totalMm
  for (const size of LINEAR_SIZES) {
    const count = Math.floor(remaining / size)
    if (count > 0) {
      result.push({ size, count })
      remaining -= count * size
    }
  }
  return { items: result, remaining }
}

// ── 숫자 포맷 ────────────────────────────────────
export function formatWon(n) {
  return Math.round(n).toLocaleString('ko-KR') + '원'
}
