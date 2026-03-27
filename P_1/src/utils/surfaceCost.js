// ─────────────────────────────────────────────
// 면(surface) 하나의 전체 비용 계산
// ─────────────────────────────────────────────
import {
  GAKJAE, SEOKGO, MDF, HAPAN, WALLPAPER, TILE, FLOORING, LUBA, TEX, INSULATION,
} from '../data/materials.js'

// 자재 조회: 커스텀 자재 우선, 없으면 기본 배열에서 찾기
function findMat(defaultArr, id, customMaterials = [], category = '') {
  if (id) {
    const custom = customMaterials.find((m) => m.category === category && m.id === id)
    if (custom) return custom
  }
  return defaultArr.find((m) => m.id === id)
}

// 단가 조회: priceOverrides 우선 적용
function ep(mat, priceKey, priceOverrides = {}) {
  if (!mat) return 0
  // 커스텀 자재는 price 필드 사용
  const base = mat.price !== undefined ? mat.price : (mat[priceKey] ?? 0)
  return priceOverrides[mat.id] !== undefined ? priceOverrides[mat.id] : base
}

// 커스텀 자재 여부 확인
function isCustom(mat) {
  return mat && typeof mat.id === 'string' && mat.id.startsWith('custom_')
}

// 커스텀 자재 산출방식별 계산
function calcCustomMat(area, widthMm, heightMm, room, mat, priceOverrides) {
  const price = priceOverrides[mat.id] !== undefined ? priceOverrides[mat.id] : (mat.price || 0)
  const waste = 1 + (mat.wasteFactor ?? 0.1)
  const name = mat.company ? `[${mat.company}] ${mat.name}` : mat.name

  switch (mat.calcMethod) {
    case 'per_sqm': {
      const qty = Math.round(area * waste * 100) / 100
      return { name, qty, unit: '㎡', unitPrice: price, cost: qty * price }
    }
    case 'per_sheet': {
      const qty = Math.ceil(area * waste / (mat.areaPerSheet || 1))
      return { name, qty, unit: '장', unitPrice: price, cost: qty * price }
    }
    case 'per_box': {
      const qty = Math.ceil(area * waste / (mat.areaPerBox || 1))
      return { name, qty, unit: 'BOX', unitPrice: price, cost: qty * price }
    }
    case 'per_roll': {
      const pyungPerRoll = (mat.pyungPerRoll || 5) * (1 - (mat.wasteFactor ?? 0.1))
      const pyung = area / 3.3058
      const qty = Math.ceil(pyung / pyungPerRoll)
      return { name, spec: `${qty}롤`, qty, unit: '롤', unitPrice: price, cost: qty * price }
    }
    case 'per_pack': {
      const qty = Math.ceil(area * waste / (mat.areaPerPack || 1))
      return { name, qty, unit: '팩', unitPrice: price, cost: qty * price }
    }
    case 'per_tile': {
      const tileArea = (mat.tileW || 600) * (mat.tileH || 600) / 1e6
      const areaPerBox = tileArea * (mat.tilesPerBox || 1)
      const qty = Math.ceil(area * waste / areaPerBox)
      return { name, qty, unit: 'BOX', unitPrice: price, cost: qty * price }
    }
    case 'per_linear_m': {
      const base = mat.linearBase || 'width'
      let m = 0
      if (base === 'width') m = widthMm / 1000
      else if (base === 'depth') m = (room.depthM || 0)
      else if (base === 'perimeter') m = ((widthMm + heightMm) / 1000) * 2
      else if (base === 'height') m = heightMm / 1000
      const qty = Math.ceil(m * waste)
      return { name, qty, unit: 'm', unitPrice: price, cost: qty * price }
    }
    case 'per_ea': {
      const qty = mat.defaultQty || 1
      return { name, qty, unit: 'EA', unitPrice: price, cost: qty * price }
    }
    default: {
      const qty = Math.round(area * waste * 100) / 100
      return { name, qty, unit: mat.unit || '㎡', unitPrice: price, cost: qty * price }
    }
  }
}
import {
  calcGakjae, calcGakjaeCost, calcCeilingGakjae,
  calcSeokgo, calcBoard,
  calcWallpaper, calcTile, calcFlooring, calcLuba, calcFilmSections,
  calcWall100mmHapan,
} from './calculations.js'

// 면의 치수 반환 (방향에 따라 가로/높이 결정)
export function getSurfaceDimensions(room, sf) {
  const { widthM, depthM, heightM } = room
  switch (sf.direction) {
    case 'floor':   return { widthMm: widthM * 1000, heightMm: depthM * 1000, areaSqm: widthM * depthM }
    case 'ceiling': return { widthMm: widthM * 1000, heightMm: depthM * 1000, areaSqm: widthM * depthM }
    case 'wallA': case 'wallB':
    case 'wallN': case 'wallS':  // 구버전 호환
      return { widthMm: widthM * 1000, heightMm: heightM * 1000, areaSqm: widthM * heightM }
    case 'wallC': case 'wallD':
    case 'wallE': case 'wallW':  // 구버전 호환
      return { widthMm: depthM * 1000, heightMm: heightM * 1000, areaSqm: depthM * heightM }
    case 'wallExtra': {
      const w = (sf.extraWidthM || 0) * 1000
      const h = (sf.extraHeightM || heightM) * 1000
      return { widthMm: w, heightMm: h, areaSqm: (sf.extraWidthM || 0) * (sf.extraHeightM || heightM) }
    }
    default:        return { widthMm: 0, heightMm: 0, areaSqm: 0 }
  }
}

export function calcSurfaceCost(room, sf, { customMaterials = [], priceOverrides = {} } = {}) {
  // 직접설정: customItems만 합산
  if (!sf.enabled || !sf.finishType) return { items: [], total: 0 }
  if (sf.finishType === 'none') {
    const items = (sf.customItems || [])
      .filter(ci => ci.name)
      .map(ci => ({
        name: ci.name,
        spec: ci.spec || '',
        qty: ci.qty || 0,
        unit: ci.unit || '식',
        unitPrice: ci.unitPrice || 0,
        cost: (ci.qty || 0) * (ci.unitPrice || 0),
      }))
    // 바탕재 자동 계산 (면적이 있을 때만)
    const { areaSqm: noneArea } = getSurfaceDimensions(room, sf)
    if (noneArea > 0) {
      if (sf.noneSeokgoType && sf.noneSeokgoType !== 'none') {
        const sg = findMat(SEOKGO, sf.noneSeokgoType, customMaterials, 'seokgo') || SEOKGO[0]
        const unitPrice = ep(sg, 'pricePerSheet', priceOverrides)
        const { sheets, cost } = calcSeokgo(noneArea, 1, unitPrice)
        items.unshift({ name: sg.name, spec: '', qty: sheets, unit: '장', unitPrice, cost })
      }
      if (sf.noneHapanId && sf.noneHapanId !== 'none') {
        const hp = findMat(HAPAN, sf.noneHapanId, customMaterials, 'hapan') || HAPAN[0]
        const unitPrice = ep(hp, 'pricePerSheet', priceOverrides)
        const { sheets, cost } = calcBoard(noneArea, hp.areaPerSheet, unitPrice)
        items.unshift({ name: hp.name, spec: '', qty: sheets, unit: '장', unitPrice, cost })
      }
    }
    return { items, total: items.reduce((s, i) => s + i.cost, 0) }
  }

  const { widthMm, heightMm, areaSqm } = getSurfaceDimensions(room, sf)
  if (areaSqm <= 0) return { items: [], total: 0 }

  // 개구부 차감 없이 전체 면적 사용
  const area = areaSqm
  const items = []

  const isWall = !['floor', 'ceiling'].includes(sf.direction)

  // 분리 시공: 상부 도배/페인트 + 하부 필름 (lowerEnabled)
  const isSplitWall = isWall && sf.lowerEnabled
    && (sf.lowerHeightMm > 0)
    && ['wallpaper', 'paint'].includes(sf.finishType)
  const lowerHMm  = isSplitWall ? Math.min(sf.lowerHeightMm, heightMm) : 0
  const upperHMm  = heightMm - lowerHMm
  const upperArea = isSplitWall ? (widthMm * upperHMm) / 1e6 : area
  const lowerArea = isSplitWall ? (widthMm * lowerHMm) / 1e6 : 0

  // ── 각재 (바닥, 바닥재, 텍스 제외) ────────────────────
  if (sf.direction !== 'floor' && sf.finishType !== 'flooring' && sf.finishType !== 'tex') {
    if (sf.direction === 'ceiling') {
      // 천장: 트러스 구조 계산 (짧은 면 1000mm / 긴 면 450mm)
      // 스터드 높이 = 슬라브 - 마감 (slabHeightM 미입력이면 최소 0.2m 기본값)
      const studHeightM = (room.slabHeightM && room.slabHeightM > room.heightM)
        ? room.slabHeightM - room.heightM
        : 0.2  // 슬라브H 미입력 시 최소 200mm
      const { breakdown, mainCount, subCount, supportHapanSheets, pieceHeightMm } =
        calcCeilingGakjae(widthMm, heightMm, studHeightM, room.heightM * 1000)
      breakdown.forEach(({ length, count }) => {
        const gak = GAKJAE.find(g => g.length === length)
        if (!gak || count === 0) return
        const dan = Math.ceil(count / gak.countPerDan)
        items.push({
          name: `각재 28×28×${length}`,
          spec: `주${mainCount}본(1000간격)/부${subCount}본(450간격) 트러스`,
          qty: dan,
          unit: '단',
          unitPrice: gak.pricePerDan,
          cost: dan * gak.pricePerDan,
        })
      })
      // 지지 합판 (부각재 짧은면 450간격 × 주각재 1000간격 교차점, 200mm폭 × 층고차 재단)
      if (supportHapanSheets > 0) {
        const hapan = HAPAN.find(h => h.id === 'hp_normal_4') || HAPAN[0]
        const unitPrice = ep(hapan, 'pricePerSheet', priceOverrides)
        items.push({
          name: hapan.name,
          spec: `천장각재지지 200×${Math.round(pieceHeightMm)}mm재단 (부각재${subCount}×주각재${mainCount}=${mainCount * subCount}점)`,
          qty: supportHapanSheets,
          unit: '장',
          unitPrice,
          cost: supportHapanSheets * unitPrice,
        })
      }
    } else {
      // 벽면: 세로상 450mm 간격, 가로상 단수(2 or 3) 적용
      const { breakdown, rowCount } = calcGakjae(widthMm, heightMm, sf.gakjaeRows ?? null)
      breakdown.forEach(({ length, count }) => {
        const gak = GAKJAE.find(g => g.length === length)
        if (!gak || count === 0) return
        const dan = Math.ceil(count / gak.countPerDan)
        items.push({
          name: `각재 28×28×${length}`,
          spec: `세로 450간격 / 가로 ${rowCount}단`,
          qty: dan,
          unit: '단',
          unitPrice: gak.pricePerDan,
          cost: dan * gak.pricePerDan,
        })
      })
    }
  }

  // ── 합판 (벽 100mm: 각재 28 + 합판 + 28 = 100mm) ─────
  if (isWall && sf.wallThickness === '100mm') {
    const { sheets, verticalCount } = calcWall100mmHapan(widthMm, heightMm)
    if (sheets > 0) {
      const hapan = HAPAN.find(h => h.id === 'hp_normal_4') || HAPAN[0]
      const unitPrice = ep(hapan, 'pricePerSheet', priceOverrides)
      items.push({
        name: hapan.name,
        spec: `100mm벽 각재지지 (세로각재 ${verticalCount}위치, 장당 13조각 재단, 28+합판+28=100mm)`,
        qty: sheets,
        unit: '장',
        unitPrice,
        cost: sheets * unitPrice,
      })
    }
  }

  // ── M-BAR (텍스 천장) ────────────────────────────
  if (sf.finishType === 'tex') {
    items.push({
      name: 'M-BAR',
      qty: area,
      unit: '㎡',
      unitPrice: 0,
      cost: 0,
    })
  }

  // ── 흡음재 ──────────────────────────────────────
  if (sf.insulationType && sf.insulationType !== 'none') {
    const ins = findMat(INSULATION, sf.insulationType, customMaterials, 'insulation')
    if (ins) {
      if (isCustom(ins)) {
        items.push(calcCustomMat(area, widthMm, heightMm, room, ins, priceOverrides))
      } else {
        const unitPrice = ep(ins, 'pricePerSqm', priceOverrides)
        const qty = Math.ceil(area * 1.05)
        items.push({ name: ins.name, qty, unit: '㎡', unitPrice, cost: qty * unitPrice })
      }
    }
  }

  // ── 석고보드 (바닥 제외) ─────────────────────────────
  // 분리시공 시: 상부(도배/페인트) 구간 면적만 적용
  const needsSeokgo = sf.direction !== 'floor' && ['wallpaper', 'paint', 'film', 'luba', 'tile'].includes(sf.finishType)
  if (needsSeokgo) {
    const layers = sf.finishType === 'paint' ? 2 : 1
    const seokgoType = sf.finishType === 'tile' ? 'sg_waterproof' : sf.seokgoType
    const sg = findMat(SEOKGO, seokgoType, customMaterials, 'seokgo') || SEOKGO[0]
    const seokgoArea = isSplitWall ? upperArea : area
    const seokgoSpec = isSplitWall ? `상부 ${upperHMm}mm구간${layers > 1 ? ` ${layers}겹` : ''}` : (layers > 1 ? `${layers}겹` : '')
    if (isCustom(sg)) {
      const r = calcCustomMat(seokgoArea * layers, widthMm, upperHMm, room, sg, priceOverrides)
      items.push({ ...r, spec: seokgoSpec })
    } else {
      const unitPrice = ep(sg, 'pricePerSheet', priceOverrides)
      const { sheets, cost } = calcSeokgo(seokgoArea, layers, unitPrice)
      items.push({ name: sg.name, spec: seokgoSpec, qty: sheets, unit: '장', unitPrice, cost })
    }
  }

  // ── MDF (인테리어필름) ───────────────────────────
  if (sf.finishType === 'film') {
    const mdf = findMat(MDF, sf.mdfId, customMaterials, 'mdf') || MDF.find(m => m.id === 'mdf_9')
    if (isCustom(mdf)) {
      items.push(calcCustomMat(area, widthMm, heightMm, room, mdf, priceOverrides))
    } else {
      const unitPrice = ep(mdf, 'pricePerSheet', priceOverrides)
      const { sheets, cost } = calcBoard(area, mdf.areaPerSheet, unitPrice)
      items.push({ name: mdf.name, spec: '', qty: sheets, unit: '장', unitPrice, cost })
    }
  }

  // ── 마감재 ───────────────────────────────────────
  switch (sf.finishType) {
    case 'wallpaper': {
      const wp = findMat(WALLPAPER, sf.finishMaterialId, customMaterials, 'wallpaper') || WALLPAPER[0]
      const wpArea = isSplitWall ? upperArea : area
      const wpSpec = isSplitWall ? `상부 ${upperHMm}mm구간` : ''
      if (isCustom(wp)) {
        items.push(calcCustomMat(wpArea, widthMm, isSplitWall ? upperHMm : heightMm, room, wp, priceOverrides))
      } else {
        const unitPrice = ep(wp, 'pricePerRoll', priceOverrides)
        const { rolls, cost } = calcWallpaper(wpArea, unitPrice, wp.pyungPerRoll)
        items.push({ name: wp.name, spec: `${wpSpec}${rolls}롤`, qty: rolls, unit: '롤', unitPrice, cost })
      }
      break
    }
    case 'paint': {
      const paintArea = isSplitWall ? upperArea : area
      const paintSpec = isSplitWall ? `상부 ${upperHMm}mm구간 ${Math.round(paintArea * 10) / 10}㎡` : `${Math.round(paintArea * 10) / 10}㎡`
      items.push({
        name: '도장(페인트)',
        spec: paintSpec,
        qty: Math.round(paintArea * 10) / 10,
        unit: '㎡',
        unitPrice: sf.paintPricePerSqm || 0,
        cost: (sf.paintPricePerSqm || 0) * paintArea,
      })
      break
    }
    case 'tile': {
      const tile = findMat(TILE, sf.finishMaterialId, customMaterials, 'tile') || TILE[0]
      if (isCustom(tile)) {
        items.push(calcCustomMat(area, widthMm, heightMm, room, tile, priceOverrides))
      } else {
        const unitPrice = ep(tile, 'pricePerBox', priceOverrides)
        const { boxes, cost } = calcTile(widthMm, heightMm, { ...tile, pricePerBox: unitPrice })
        items.push({ name: tile.name, spec: `${boxes}BOX`, qty: boxes, unit: 'BOX', unitPrice, cost })
      }
      break
    }
    case 'flooring': {
      const fl = findMat(FLOORING, sf.finishMaterialId, customMaterials, 'flooring') || FLOORING[0]
      if (isCustom(fl)) {
        items.push(calcCustomMat(area, widthMm, heightMm, room, fl, priceOverrides))
      } else {
        const unitPrice = ep(fl, 'pricePerUnit', priceOverrides)
        const { units, cost } = calcFlooring(areaSqm, fl.areaPerUnit, unitPrice, fl.unit)
        items.push({ name: fl.name, spec: '', qty: units, unit: fl.unit, unitPrice, cost })
      }
      break
    }
    case 'luba': {
      const lu = findMat(LUBA, LUBA[0]?.id, customMaterials, 'luba') || LUBA[0]
      if (isCustom(lu)) {
        items.push(calcCustomMat(area, widthMm, heightMm, room, lu, priceOverrides))
      } else {
        const unitPrice = ep(lu, 'pricePerPack', priceOverrides)
        const { packs, cost } = calcLuba(area, lu.areaPerPack, unitPrice)
        items.push({ name: lu.name, spec: `${packs}팩`, qty: packs, unit: '팩', unitPrice, cost })
      }
      break
    }
    case 'tex': {
      const tex = TEX.find(t => t.id === sf.finishMaterialId) || TEX[0]
      const pricePerBox = sf.texPricePerBox || 0
      const boxes = Math.ceil((area / tex.areaPerBox) * 1.1)
      const cost = boxes * pricePerBox
      items.push({ name: tex.name, spec: `${boxes}BOX`, qty: boxes, unit: 'BOX', unitPrice: pricePerBox, cost })
      break
    }
    case 'film': {
      const defaultPricePerM = sf.filmPricePerM || 0
      const { sectionResults, totalM, cost } = calcFilmSections(
        sf.filmSections || [],
        heightMm,
        defaultPricePerM
      )
      // 필름 종류(filmName)별로 그룹화 → 종류가 다르면 별도 항목
      const filmGroups = {}
      sectionResults.forEach(sec => {
        const key = sec.filmName || '인테리어필름'
        if (!filmGroups[key]) {
          filmGroups[key] = { filmName: key, sections: [], totalM: 0, cost: 0, pricePerM: sec.pricePerM }
        }
        filmGroups[key].sections.push(sec)
        filmGroups[key].totalM = Math.round((filmGroups[key].totalM + sec.sectionM) * 10) / 10
        filmGroups[key].cost += sec.sectionCost
      })
      Object.values(filmGroups).forEach(group => {
        const displayName = group.filmName === '인테리어필름'
          ? '인테리어필름'
          : `인테리어필름(${group.filmName})`
        items.push({
          name: displayName,
          spec: sf.label,
          surfaceLabel: sf.label,
          sections: group.sections,
          qty: group.totalM,
          unit: 'm',
          unitPrice: group.pricePerM,
          cost: group.cost,
          isFilm: true,
        })
      })
      // 섹션이 없는 경우 빈 항목
      if (sectionResults.length === 0) {
        items.push({
          name: '인테리어필름',
          spec: sf.label,
          surfaceLabel: sf.label,
          sections: [],
          qty: 0,
          unit: 'm',
          unitPrice: defaultPricePerM,
          cost: 0,
          isFilm: true,
        })
      }
      break
    }
    default:
      break
  }

  // ── 하부 마감 (분리 시공: 상부 도배/페인트 + 하부 다양한 마감) ──────
  if (isSplitWall) {
    const lowerType = sf.lowerFinishType || 'film'
    const lowerSpec = `하부 ${lowerHMm}mm구간`

    if (lowerType === 'film' || lowerType === 'tempaboard') {
      // MDF (필름/템파보드 공통)
      const lowerMdf = findMat(MDF, sf.lowerMdfId, customMaterials, 'mdf') || MDF.find(m => m.id === 'mdf_9')
      if (lowerMdf) {
        if (isCustom(lowerMdf)) {
          const r = calcCustomMat(lowerArea, widthMm, lowerHMm, room, lowerMdf, priceOverrides)
          items.push({ ...r, spec: lowerSpec })
        } else {
          const unitPrice = ep(lowerMdf, 'pricePerSheet', priceOverrides)
          const { sheets, cost } = calcBoard(lowerArea, lowerMdf.areaPerSheet, unitPrice)
          items.push({ name: lowerMdf.name, spec: lowerSpec, qty: sheets, unit: '장', unitPrice, cost })
        }
      }
    }

    if (lowerType === 'wallpaper' || lowerType === 'paint') {
      // 석고보드 (하부)
      const lowerSg = findMat(SEOKGO, sf.lowerSeokgoId, customMaterials, 'seokgo') || SEOKGO[0]
      if (lowerSg) {
        const lowerLayers = lowerType === 'paint' ? 2 : 1
        const unitPrice = ep(lowerSg, 'pricePerSheet', priceOverrides)
        const { sheets, cost } = calcSeokgo(lowerArea, lowerLayers, unitPrice)
        items.push({ name: lowerSg.name, spec: `${lowerSpec}${lowerLayers > 1 ? ` ${lowerLayers}겹` : ''}`, qty: sheets, unit: '장', unitPrice, cost })
      }
    }

    if (lowerType === 'film') {
      // 필름 구간 (하부)
      const lowerSections = sf.lowerFilmSections || []
      const lowerDefaultPrice = sf.lowerFilmPricePerM || 0
      const { sectionResults: lowerResults } = calcFilmSections(lowerSections, lowerHMm, lowerDefaultPrice)
      const lFilmGroups = {}
      lowerResults.forEach(sec => {
        const key = sec.filmName || '인테리어필름'
        if (!lFilmGroups[key]) lFilmGroups[key] = { filmName: key, sections: [], totalM: 0, cost: 0, pricePerM: sec.pricePerM }
        lFilmGroups[key].sections.push(sec)
        lFilmGroups[key].totalM = Math.round((lFilmGroups[key].totalM + sec.sectionM) * 10) / 10
        lFilmGroups[key].cost += sec.sectionCost
      })
      Object.values(lFilmGroups).forEach(group => {
        const displayName = group.filmName === '인테리어필름' ? '인테리어필름' : `인테리어필름(${group.filmName})`
        items.push({ name: displayName, spec: lowerSpec, surfaceLabel: sf.label, sections: group.sections, qty: group.totalM, unit: 'm', unitPrice: group.pricePerM, cost: group.cost, isFilm: true })
      })
      if (lowerResults.length === 0) {
        items.push({ name: '인테리어필름', spec: lowerSpec, surfaceLabel: sf.label, sections: [], qty: 0, unit: 'm', unitPrice: sf.lowerFilmPricePerM || 0, cost: 0, isFilm: true })
      }
    }

    if (lowerType === 'wallpaper') {
      // 도배 (하부)
      const wp = findMat(WALLPAPER, sf.lowerWallpaperId, customMaterials, 'wallpaper') || WALLPAPER.find(w => !w.forCeiling) || WALLPAPER[0]
      if (wp) {
        const unitPrice = ep(wp, 'pricePerRoll', priceOverrides)
        const { rolls, cost } = calcWallpaper(lowerArea, unitPrice, wp.pyungPerRoll)
        items.push({ name: wp.name, spec: `${lowerSpec} ${rolls}롤`, qty: rolls, unit: '롤', unitPrice, cost })
      }
    }

    if (lowerType === 'paint') {
      // 도장 (하부)
      items.push({
        name: '도장(페인트)',
        spec: `${lowerSpec} ${Math.round(lowerArea * 10) / 10}㎡`,
        qty: Math.round(lowerArea * 10) / 10,
        unit: '㎡',
        unitPrice: sf.lowerPaintPricePerSqm || 0,
        cost: (sf.lowerPaintPricePerSqm || 0) * lowerArea,
      })
    }
  }

  const total = items.reduce((s, i) => s + i.cost, 0)
  return { items, total }
}
