// ─────────────────────────────────────────────
// 계산 유틸리티
// ─────────────────────────────────────────────
import { GAKJAE } from '../data/materials.js'

const GAKJAE_SPACING = 450 // mm
const WASTE_RATE = 1.1     // 할증 10%
const SQM_TO_PYUNG = 3.3058

// ── 각재 계산 ──────────────────────────────────
// 주어진 면의 가로(mm)×세로(mm) 기준으로
// 450mm 간격 격자 프레임의 총 m수 계산
export function calcGakjae(widthMm, heightMm) {
  const verticalCount = Math.floor(widthMm / GAKJAE_SPACING) + 1  // 세로 부재 수
  const horizontalCount = Math.floor(heightMm / GAKJAE_SPACING) + 1 // 가로 부재 수

  const verticalTotalMm = verticalCount * heightMm   // 세로 부재 총 길이
  const horizontalTotalMm = horizontalCount * widthMm // 가로 부재 총 길이

  const totalMm = (verticalTotalMm + horizontalTotalMm) * WASTE_RATE
  const totalM = totalMm / 1000

  // 최적 길이 조합 (낭비 최소화)
  const lengths = GAKJAE.map(g => g.length).sort((a, b) => b - a) // 긴 것부터
  const breakdown = calcGakjaeBreakdown(totalMm, lengths)

  return { totalM: Math.round(totalM * 100) / 100, breakdown }
}

function calcGakjaeBreakdown(totalMm, sortedLengths) {
  const result = []
  let remaining = totalMm

  for (const len of sortedLengths) {
    if (remaining <= 0) break
    const count = Math.floor(remaining / len)
    if (count > 0) {
      result.push({ length: len, count })
      remaining -= count * len
    }
  }

  // 나머지가 있으면 가장 짧은 길이 1개 추가
  if (remaining > 0) {
    const shortest = sortedLengths[sortedLengths.length - 1]
    const last = result.find(r => r.length === shortest)
    if (last) last.count += 1
    else result.push({ length: shortest, count: 1 })
  }

  return result
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
// areaSqm: 면적(㎡), layers: 장수(1 or 2), pricePerSheet: 장당 단가
export function calcSeokgo(areaSqm, layers, pricePerSheet) {
  const areaPerSheet = 1.62
  const sheets = Math.ceil((areaSqm / areaPerSheet) * WASTE_RATE) * layers
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
export function calcTile(areaSqm, areaPerBox, pricePerBox) {
  const boxes = Math.ceil((areaSqm / areaPerBox) * WASTE_RATE)
  const cost = boxes * pricePerBox
  return { boxes, cost }
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

// ── 숫자 포맷 ────────────────────────────────────
export function formatWon(n) {
  return Math.round(n).toLocaleString('ko-KR') + '원'
}
