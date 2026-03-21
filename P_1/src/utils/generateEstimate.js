import { calcSurfaceCost, getSurfaceDimensions } from './surfaceCost.js'
import { calcMoldingLengthM, calcMoldingEA } from './molding.js'

const FINISH_TRADE_MAP = {
  wallpaper: '도배공사',
  paint: '도장공사',
  tile: '타일공사',
  flooring: '바닥공사',
  film: '필름공사',
  luba: '수장공사',
  tex: '수장공사',
  wood: '수장공사',
}

export const TRADE_ORDER = [
  '가설작업', '목공사', '도배공사', '도장공사', '타일공사', '바닥공사',
  '필름공사', '수장공사', '도어/창호공사', '조명공사',
  '설비작업', '전기통신작업', '소방작업', '기타',
]

const STRUCTURE_KW = ['각재', '석고보드', 'MDF', '합판', 'M-BAR', '글라스울', '록울', '흡음재']
function isStructureItem(name) {
  return STRUCTURE_KW.some(kw => name.includes(kw))
}

let _seq = 0
function newId() { return `ei_${Date.now()}_${++_seq}` }

function blankItem(trade, name, spec, unit, qty) {
  return { id: newId(), trade, name, spec: spec || '', unit, qty: Math.round((qty || 0) * 100) / 100, matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0, autoGen: true }
}

const LABOR_TEMPLATES = {
  wallpaper: [
    { name: '도배 부자재', spec: '풀, 이음매테이프 등', unit: '식', qtyFixed: 1 },
    { name: '도배 노무비', spec: '', unit: '㎡', qtyFromArea: true },
  ],
  paint: [
    { name: '도장 부자재', spec: '마스킹, 롤러 등', unit: '식', qtyFixed: 1 },
    { name: '도장 노무비', spec: '', unit: '㎡', qtyFromArea: true },
  ],
  tile: [
    { name: '타일 접착제', spec: '', unit: '㎡', qtyFromArea: true },
    { name: '줄눈재', spec: '', unit: '㎡', qtyFromArea: true },
    { name: '타일 부자재', spec: '', unit: '식', qtyFixed: 1 },
    { name: '타일 시공 노무비', spec: '', unit: '㎡', qtyFromArea: true },
  ],
  flooring: [
    { name: '바닥재 접착제', spec: '', unit: '㎡', qtyFromArea: true },
    { name: '자재소운반', spec: '', unit: '식', qtyFixed: 1 },
    { name: '바닥재 시공 노무비', spec: '', unit: '㎡', qtyFromArea: true },
  ],
  film: [
    { name: '필름 시공 노무비', spec: '', unit: '㎡', qtyFromArea: true },
  ],
  luba: [
    { name: '루바 부자재', spec: '핀, 접착제 등', unit: '식', qtyFixed: 1 },
    { name: '루바 시공 노무비', spec: '', unit: '㎡', qtyFromArea: true },
  ],
  tex: [
    { name: '텍스 시공 노무비', spec: '', unit: '㎡', qtyFromArea: true },
  ],
  wood: [
    { name: '원목 부자재', spec: '', unit: '식', qtyFixed: 1 },
    { name: '원목 시공 노무비', spec: '', unit: '㎡', qtyFromArea: true },
  ],
}

export function generateEstimateItems(rooms, globalItems, matOpts = {}, prevItems = []) {
  // Price carry-over map: "trade|||name|||unit" → {matUnitPrice, labUnitPrice, expUnitPrice}
  const priceMap = {}
  prevItems.forEach(it => {
    const key = `${it.trade}|||${it.name}|||${it.unit}`
    if (!priceMap[key]) priceMap[key] = { matUnitPrice: it.matUnitPrice || 0, labUnitPrice: it.labUnitPrice || 0, expUnitPrice: it.expUnitPrice || 0 }
  })
  function carryPrices(item) {
    const key = `${item.trade}|||${item.name}|||${item.unit}`
    const prev = priceMap[key]
    if (prev) Object.assign(item, prev)
    return item
  }

  const result = []
  const structMap = {}  // name → item
  const finishMap = {}  // finishType → { trade, matItems: {key→item}, totalArea }

  for (const room of rooms) {
    for (const sf of room.surfaces) {
      if (!sf.enabled || !sf.finishType || sf.finishType === 'none') continue
      const dims = getSurfaceDimensions(room, sf)
      if (dims.areaSqm <= 0) continue
      const ft = sf.finishType
      if (!finishMap[ft]) finishMap[ft] = { trade: FINISH_TRADE_MAP[ft] || '기타공사', matItems: {}, totalArea: 0 }
      finishMap[ft].totalArea += dims.areaSqm

      // Lower finish area tracking
      if (sf.lowerEnabled && sf.lowerFinishType && sf.lowerFinishType !== 'none' && sf.lowerHeightMm > 0) {
        const lft = sf.lowerFinishType
        const lowerArea = (dims.widthMm * Math.min(sf.lowerHeightMm, dims.heightMm)) / 1e6
        if (lowerArea > 0) {
          if (!finishMap[lft]) finishMap[lft] = { trade: FINISH_TRADE_MAP[lft] || '기타공사', matItems: {}, totalArea: 0 }
          finishMap[lft].totalArea += lowerArea
        }
      }

      const sfResult = calcSurfaceCost(room, sf, matOpts)
      for (const item of sfResult.items) {
        if (isStructureItem(item.name)) {
          if (!structMap[item.name]) {
            structMap[item.name] = { id: newId(), trade: '목공사', name: item.name, spec: '', unit: item.unit, qty: 0, matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0, autoGen: true }
          }
          structMap[item.name].qty = Math.round((structMap[item.name].qty + item.qty) * 100) / 100
        } else {
          // Determine which finishType this item belongs to
          let itemFt = ft
          if (item.spec && item.spec.includes('하부') && sf.lowerFinishType) itemFt = sf.lowerFinishType
          if (!finishMap[itemFt]) finishMap[itemFt] = { trade: FINISH_TRADE_MAP[itemFt] || '기타공사', matItems: {}, totalArea: 0 }
          const key = `${item.name}|||${item.unit}`
          if (!finishMap[itemFt].matItems[key]) {
            finishMap[itemFt].matItems[key] = { id: newId(), trade: finishMap[itemFt].trade, name: item.name, spec: '', unit: item.unit, qty: 0, matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0, autoGen: true }
          }
          finishMap[itemFt].matItems[key].qty = Math.round((finishMap[itemFt].matItems[key].qty + item.qty) * 100) / 100
        }
      }
    }
  }

  // Add structure items + labor
  const structItems = Object.values(structMap)
  if (structItems.length > 0) {
    structItems.forEach(it => result.push(carryPrices(it)))
    result.push(carryPrices(blankItem('목공사', '목공 노무비', '', '㎡', 0)))
  }

  // Add finish items + labor templates
  for (const ft of Object.keys(finishMap)) {
    const { trade, matItems, totalArea } = finishMap[ft]
    const area = Math.round(totalArea * 100) / 100
    Object.values(matItems).forEach(it => { it.trade = trade; result.push(carryPrices(it)) })
    const templates = LABOR_TEMPLATES[ft] || []
    for (const tmpl of templates) {
      const qty = tmpl.qtyFromArea ? area : (tmpl.qtyFixed || 1)
      result.push(carryPrices(blankItem(trade, tmpl.name, tmpl.spec, tmpl.unit, qty)))
    }
  }

  // Doors
  const doorMap = {}
  for (const room of rooms) {
    for (const door of (room.doors || [])) {
      const type = door.type || '방문'
      doorMap[type] = (doorMap[type] || 0) + (door.qty || 1)
    }
  }
  const doorEntries = Object.entries(doorMap)
  doorEntries.forEach(([type, qty]) => result.push(carryPrices(blankItem('도어/창호공사', type, '', 'EA', qty))))
  if (doorEntries.length > 0) result.push(carryPrices(blankItem('도어/창호공사', '도어 설치 노무비', '', '식', 1)))

  // Lightings
  const lightMap = {}
  for (const room of rooms) {
    for (const light of (room.lightings || [])) {
      const type = light.type || '조명'
      lightMap[type] = (lightMap[type] || 0) + (light.qty || 1)
    }
  }
  Object.entries(lightMap).forEach(([type, qty]) => result.push(carryPrices(blankItem('조명공사', type, '', 'EA', qty))))

  // Moldings (랩핑평판)
  const moldMap = {}
  for (const room of rooms) {
    for (const sf of room.surfaces) {
      for (const mold of (sf.moldings || [])) {
        const lengthM = calcMoldingLengthM(mold, room)
        const ea = calcMoldingEA(lengthM)
        const key = `${mold.moldType}_${mold.widthMm}mm`
        if (!moldMap[key]) moldMap[key] = { name: `랩핑평판 ${mold.moldType} ${mold.widthMm}mm`, unit: 'EA', qty: 0 }
        moldMap[key].qty += ea
      }
    }
  }
  Object.values(moldMap).forEach(m => result.push(carryPrices(blankItem('수장공사', m.name, '', m.unit, Math.round(m.qty)))))

  // Global items
  for (const gi of (globalItems || [])) {
    if (!gi.enabled || !gi.name) continue
    result.push({
      id: newId(), trade: gi.trade || '기타', name: gi.name, spec: gi.spec || '', unit: gi.unit,
      qty: gi.qty || 0, matUnitPrice: gi.matUnitPrice || 0, labUnitPrice: gi.labUnitPrice || 0,
      expUnitPrice: gi.expUnitPrice || 0, autoGen: true,
    })
  }

  // Sort by trade order
  result.sort((a, b) => {
    const ai = TRADE_ORDER.indexOf(a.trade)
    const bi = TRADE_ORDER.indexOf(b.trade)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return result
}
