// ─────────────────────────────────────────────
// 자재 단가 DB (251212_자재단가.xlsx 기준)
// ─────────────────────────────────────────────

// 각재 (28×28, 단위: 단)
export const GAKJAE = [
  { id: 'gak_2400', name: '각재 28×28×2400', length: 2400, pricePerDan: 27500, countPerDan: 20 },
  { id: 'gak_2700', name: '각재 28×28×2700', length: 2700, pricePerDan: 31000, countPerDan: 20 },
  { id: 'gak_3000', name: '각재 28×28×3000', length: 3000, pricePerDan: 35000, countPerDan: 20 },
  { id: 'gak_3600', name: '각재 28×28×3600', length: 3600, pricePerDan: 25500, countPerDan: 12 },
]

// 석고보드 (단위: 장, 1장=1.62㎡)
export const SEOKGO = [
  { id: 'sg_normal',    name: '일반석고보드 900×1800×9.5T',  areaPerSheet: 1.62, pricePerSheet: 4000 },
  { id: 'sg_waterproof',name: '방수석고보드 900×1800×9.5T',  areaPerSheet: 1.62, pricePerSheet: 7000 },
  { id: 'sg_fire',      name: '방화석고보드 900×1800×12.5T', areaPerSheet: 1.62, pricePerSheet: 7500 },
  { id: 'sg_cement',    name: '시멘트보드 900×1800×6T',       areaPerSheet: 1.62, pricePerSheet: 10500 },
]

// 합판 (단위: 장, 1장=2.977㎡)
export const HAPAN = [
  // 일반합판
  { id: 'hp_normal_4',  name: '일반합판 4.6T',  type: '일반', thickness: 4.6,  areaPerSheet: 2.977, pricePerSheet: 8500 },
  { id: 'hp_normal_8',  name: '일반합판 8.5T',  type: '일반', thickness: 8.5,  areaPerSheet: 2.977, pricePerSheet: 15000 },
  { id: 'hp_normal_11', name: '일반합판 11.5T', type: '일반', thickness: 11.5, areaPerSheet: 2.977, pricePerSheet: 20000 },
  { id: 'hp_normal_14', name: '일반합판 14.5T', type: '일반', thickness: 14.5, areaPerSheet: 2.977, pricePerSheet: 26500 },
  { id: 'hp_normal_17', name: '일반합판 17.5T', type: '일반', thickness: 17.5, areaPerSheet: 2.977, pricePerSheet: 32000 },
  // 코어합판
  { id: 'hp_core_18',   name: '코어합판 18T',   type: '코어', thickness: 18,   areaPerSheet: 2.977, pricePerSheet: 26500 },
  // 오징어합판
  { id: 'hp_squid_4',   name: '오징어합판 4T',  type: '오징어', thickness: 4,  areaPerSheet: 2.977, pricePerSheet: 18500 },
  // 내수합판
  { id: 'hp_water_12',  name: '내수합판 12T',   type: '내수', thickness: 12,   areaPerSheet: 2.977, pricePerSheet: 34000 },
  { id: 'hp_water_15',  name: '내수합판 15T',   type: '내수', thickness: 15,   areaPerSheet: 2.977, pricePerSheet: 45500 },
  { id: 'hp_water_18',  name: '내수합판 18T',   type: '내수', thickness: 18,   areaPerSheet: 2.977, pricePerSheet: 52000 },
  // 자작합판
  { id: 'hp_birch_6',   name: '자작합판 6T',    type: '자작', thickness: 6,    areaPerSheet: 2.977, pricePerSheet: 33000 },
  { id: 'hp_birch_9',   name: '자작합판 9T',    type: '자작', thickness: 9,    areaPerSheet: 2.977, pricePerSheet: 54000 },
  { id: 'hp_birch_12',  name: '자작합판 12T',   type: '자작', thickness: 12,   areaPerSheet: 2.977, pricePerSheet: 66000 },
  { id: 'hp_birch_15',  name: '자작합판 15T',   type: '자작', thickness: 15,   areaPerSheet: 2.977, pricePerSheet: 81000 },
  { id: 'hp_birch_18',  name: '자작합판 18T',   type: '자작', thickness: 18,   areaPerSheet: 2.977, pricePerSheet: 91000 },
]

// MDF (단위: 장, 1장=2.977㎡)
export const MDF = [
  { id: 'mdf_3',   name: 'MDF 3T',   thickness: 3,  areaPerSheet: 2.977, pricePerSheet: 5500 },
  { id: 'mdf_6',   name: 'MDF 6T',   thickness: 6,  areaPerSheet: 2.977, pricePerSheet: 9000 },
  { id: 'mdf_9',   name: 'MDF 9T',   thickness: 9,  areaPerSheet: 2.977, pricePerSheet: 10000 },
  { id: 'mdf_12',  name: 'MDF 12T',  thickness: 12, areaPerSheet: 2.977, pricePerSheet: 14000 },
  { id: 'mdf_15',  name: 'MDF 15T',  thickness: 15, areaPerSheet: 2.977, pricePerSheet: 18000 },
  { id: 'mdf_18',  name: 'MDF 18T',  thickness: 18, areaPerSheet: 2.977, pricePerSheet: 22000 },
  { id: 'mdf_hd_9',  name: '고밀도MDF 9T',  thickness: 9,  areaPerSheet: 2.977, pricePerSheet: 16500 },
  { id: 'mdf_hd_12', name: '고밀도MDF 12T', thickness: 12, areaPerSheet: 2.977, pricePerSheet: 21000 },
]

// 벽지 (단위: 롤, 1롤=5평)
export const WALLPAPER = [
  { id: 'wp_silk_j',    name: '실크벽지(제이)',   pyungPerRoll: 5, pricePerRoll: 33000, forCeiling: false },
  { id: 'wp_silk_b',    name: '실크벽지(베이직)', pyungPerRoll: 5, pricePerRoll: 30000, forCeiling: false },
  { id: 'wp_hanji',     name: '장폭합지',          pyungPerRoll: 5, pricePerRoll: 17500, forCeiling: false },
  { id: 'wp_fire',      name: '방염벽지',           pyungPerRoll: 5, pricePerRoll: 55000, forCeiling: false },
  { id: 'wp_ceil_silk', name: '실크천정지',         pyungPerRoll: 10, pricePerRoll: 38000, forCeiling: true },
  { id: 'wp_ceil_hanji',name: '장폭합지천정지',     pyungPerRoll: 10, pricePerRoll: 27000, forCeiling: true },
]

// 타일 (단위: BOX, tileW/tileH: mm 단위 타일 크기, tilesPerBox: 박스당 장수)
export const TILE = [
  { id: 'tile_1200_600', name: '타일 1200×600', size: '1200×600', tileW: 1200, tileH: 600, tilesPerBox:  2, areaPerBox: 1.44, pricePerBox: 60000 },
  { id: 'tile_600_600',  name: '타일 600×600',  size: '600×600',  tileW:  600, tileH: 600, tilesPerBox:  4, areaPerBox: 1.44, pricePerBox: 30000 },
  { id: 'tile_300_600',  name: '타일 300×600',  size: '300×600',  tileW:  300, tileH: 600, tilesPerBox:  8, areaPerBox: 1.44, pricePerBox: 30000 },
  { id: 'tile_250_400',  name: '타일 250×400',  size: '250×400',  tileW:  250, tileH: 400, tilesPerBox: 14, areaPerBox: 1.44, pricePerBox: 14000 },
  { id: 'tile_300_300_c',name: '타일 300×300(중국산)', size: '300×300', tileW: 300, tileH: 300, tilesPerBox: 16, areaPerBox: 1.44, pricePerBox: 14000 },
  { id: 'tile_300_300_k',name: '타일 300×300(국산)',   size: '300×300', tileW: 300, tileH: 300, tilesPerBox: 16, areaPerBox: 1.44, pricePerBox: 20000 },
  { id: 'tile_200_200',  name: '타일 200×200',  size: '200×200',  tileW:  200, tileH: 200, tilesPerBox: 36, areaPerBox: 1.44, pricePerBox: 25000 },
  { id: 'tile_100_300',  name: '타일 100×300',  size: '100×300',  tileW:  100, tileH: 300, tilesPerBox: 33, areaPerBox: 1.00, pricePerBox: 15000 },
  { id: 'tile_100_200',  name: '타일 100×200',  size: '100×200',  tileW:  100, tileH: 200, tilesPerBox: 50, areaPerBox: 1.00, pricePerBox: 20000 },
  { id: 'tile_pabrick',  name: '파벽돌',          size: '기타',                                               areaPerBox: 1.00, pricePerBox: 25000 },
]

// 바닥재 (단위: ㎡ 또는 BOX)
export const FLOORING = [
  // 장판 (단위: ㎡)
  { id: 'fl_jangpan_18', name: '장판(KCC) 1.8T', unit: '㎡', areaPerUnit: 1.8, pricePerUnit: 10000 },
  { id: 'fl_jangpan_22', name: '장판(KCC) 2.2T', unit: '㎡', areaPerUnit: 1.8, pricePerUnit: 16000 },
  { id: 'fl_jangpan_27', name: '장판(KCC) 2.7T', unit: '㎡', areaPerUnit: 1.8, pricePerUnit: 26000 },
  { id: 'fl_jangpan_32', name: '장판(KCC) 3.2T', unit: '㎡', areaPerUnit: 1.8, pricePerUnit: 30000 },
  // 데코타일 (단위: BOX, 1BOX=3.24㎡)
  { id: 'fl_deco_450',  name: '데코타일(KCC) 450×450',  unit: 'BOX', areaPerUnit: 3.24, pricePerUnit: 25200 },
  { id: 'fl_deco_600',  name: '데코타일(KCC) 600×600',  unit: 'BOX', areaPerUnit: 3.24, pricePerUnit: 25200 },
  { id: 'fl_wood_tile', name: '우드타일(KCC) 186×940',   unit: 'BOX', areaPerUnit: 3.24, pricePerUnit: 25200 },
  // 원목 후로링
  { id: 'fl_lauan',    name: '라왕후로링 80×15T',   unit: 'BOX', areaPerUnit: 3.24, pricePerUnit: 60000 },
  { id: 'fl_rubber',   name: '고무나무후로링 150×15T', unit: 'BOX', areaPerUnit: 3.24, pricePerUnit: 110000 },
  { id: 'fl_merbau',   name: '멀바우후로링 150×15T',  unit: 'BOX', areaPerUnit: 3.24, pricePerUnit: 130000 },
]

// 루바 (단위: 팩, 1팩=2.4㎡)
export const LUBA = [
  { id: 'luba_cedar', name: '편백나무 루바 100×2400×9T', areaPerPack: 2.4, pricePerPack: 74000 },
]

// 인테리어필름 (단위: m, 롤 폭 선택)
export const FILM_WIDTHS = [
  { id: 'fw_90',  label: '90cm',  widthMm: 900 },
  { id: 'fw_100', label: '100cm', widthMm: 1000 },
  { id: 'fw_122', label: '122cm', widthMm: 1220 },
]
// 필름 단가는 현장마다 달라 수동입력 (기본값 제공)
export const FILM_DEFAULT_PRICE_PER_M = 5000 // 원/m (사용자 수정 가능)

// 집성목류
export const WOOD_PANEL = [
  { id: 'wp_merbau_18',  name: '멀바우집성목 18T', areaPerSheet: 2.07, pricePerSheet: 73000 },
  { id: 'wp_merbau_15',  name: '멀바우집성목 15T', areaPerSheet: 2.07, pricePerSheet: 64000 },
  { id: 'wp_radia_12',   name: '라디에이터파인 12T', areaPerSheet: 2.88, pricePerSheet: 38500 },
  { id: 'wp_radia_15',   name: '라디에이터파인 15T', areaPerSheet: 2.88, pricePerSheet: 48000 },
  { id: 'wp_radia_18',   name: '라디에이터파인 18T', areaPerSheet: 2.88, pricePerSheet: 53000 },
  { id: 'wp_lauan_18',   name: '라왕집성목 18T',     areaPerSheet: 2.184, pricePerSheet: 61000 },
]

// 흡음재 (단위: ㎡)
export const INSULATION = [
  { id: 'gw_24k_50',  name: '글라스울 24K 50T',  pricePerSqm: 3500 },
  { id: 'gw_32k_50',  name: '글라스울 32K 50T',  pricePerSqm: 5000 },
  { id: 'gw_32k_75',  name: '글라스울 32K 75T',  pricePerSqm: 7000 },
  { id: 'gw_32k_100', name: '글라스울 32K 100T', pricePerSqm: 9000 },
  { id: 'rw_50',      name: '락울 50T',           pricePerSqm: 8500 },
  { id: 'rw_75',      name: '락울 75T',           pricePerSqm: 12000 },
]

// 텍스 천장재 (단위: BOX)
export const TEX = [
  { id: 'tex_300_600', name: '텍스 300×600', tileW: 300, tileH: 600, areaPerTile: 0.18, tilesPerBox: 20, areaPerBox: 3.6, pricePerBox: 0 },
  { id: 'tex_600_600', name: '텍스 600×600', tileW: 600, tileH: 600, areaPerTile: 0.36, tilesPerBox: 10, areaPerBox: 3.6, pricePerBox: 0 },
]

// 각관 (단위: EA, 6000mm)
export const KAKGWAN = [
  { id: 'kg_50x50', name: '칼라각관 50×50×2T (6000)', length: 6000, pricePerEa: 18600 },
  { id: 'kg_30x30', name: '칼라각관 30×30×2T (6000)', length: 6000, pricePerEa: 11600 },
]

// 기타목재
export const ETC_WOOD = [
  { id: 'ew_temba_fire',   name: '템바보드(방염) 1000×2400×12T',  pricePerSheet: 230000 },
  { id: 'ew_temba_normal', name: '템바보드(비방염) 1000×2400×12T', pricePerSheet: 130000 },
  { id: 'ew_design_fire',  name: '디자인월(방염) 790×325×9T',      areaPerBox: 1.542, pricePerBox: 37500 },
  { id: 'ew_design_normal',name: '디자인월(비방염) 790×325×9T',    areaPerBox: 1.542, pricePerBox: 37500 },
]

// 래핑평판 (단위: EA, 길이 2400mm 기준)
export const WRAPPING = [
  { id: 'wrap_30',  name: '래핑평판 30mm',  widthMm: 30,  lengthMm: 2400, pricePerEa: 2000 },
  { id: 'wrap_45',  name: '래핑평판 45mm',  widthMm: 45,  lengthMm: 2400, pricePerEa: 2500 },
  { id: 'wrap_60',  name: '래핑평판 60mm',  widthMm: 60,  lengthMm: 2400, pricePerEa: 3000 },
  { id: 'wrap_80',  name: '래핑평판 80mm',  widthMm: 80,  lengthMm: 2400, pricePerEa: 3500 },
  { id: 'wrap_100', name: '래핑평판 100mm', widthMm: 100, lengthMm: 2400, pricePerEa: 4000 },
  { id: 'wrap_120', name: '래핑평판 120mm', widthMm: 120, lengthMm: 2400, pricePerEa: 5000 },
  { id: 'wrap_150', name: '래핑평판 150mm', widthMm: 150, lengthMm: 2400, pricePerEa: 6000 },
  { id: 'wrap_200', name: '래핑평판 200mm', widthMm: 200, lengthMm: 2400, pricePerEa: 8000 },
  { id: 'wrap_250', name: '래핑평판 250mm', widthMm: 250, lengthMm: 2400, pricePerEa: 10000 },
  { id: 'wrap_300', name: '래핑평판 300mm', widthMm: 300, lengthMm: 2400, pricePerEa: 12000 },
  { id: 'wrap_400', name: '래핑평판 400mm', widthMm: 400, lengthMm: 2400, pricePerEa: 16000 },
  { id: 'wrap_600', name: '래핑평판 600mm', widthMm: 600, lengthMm: 2400, pricePerEa: 24000 },
]

// 인테리어필름 제품 (단위: m, 롤 기준)
export const FILM = [
  { id: 'film_white_mat',    name: '화이트무광',      pricePerM: 5000,  widthMm: 1220 },
  { id: 'film_white_gloss',  name: '화이트유광',      pricePerM: 5000,  widthMm: 1220 },
  { id: 'film_wood_light',   name: '우드라이트',      pricePerM: 7000,  widthMm: 1220 },
  { id: 'film_wood_dark',    name: '우드다크',        pricePerM: 7000,  widthMm: 1220 },
  { id: 'film_concrete',     name: '콘크리트',        pricePerM: 8000,  widthMm: 1220 },
  { id: 'film_marble',       name: '대리석',          pricePerM: 10000, widthMm: 1220 },
  { id: 'film_metal',        name: '메탈',            pricePerM: 12000, widthMm: 1220 },
]

// 도어 (단위: 짝)
export const DOOR = [
  { id: 'door_abs',       name: 'ABS도어',       pricePerEa: 150000 },
  { id: 'door_room',      name: '방문',           pricePerEa: 180000 },
  { id: 'door_glass',     name: '강화도어',       pricePerEa: 350000 },
  { id: 'door_double',    name: '양문형도어',     pricePerEa: 400000 },
  { id: 'door_entrance',  name: '현관문',         pricePerEa: 500000 },
  { id: 'door_sliding',   name: '미서기문',       pricePerEa: 300000 },
  { id: 'door_folding',   name: '폴딩도어',       pricePerEa: 450000 },
  { id: 'door_jungmun',   name: '중문',           pricePerEa: 600000 },
]

// 조명 (단위: EA)
export const LIGHTING = [
  { id: 'light_3in',       name: '매입등 3"',          pricePerEa: 8000 },
  { id: 'light_4in',       name: '매입등 4"',          pricePerEa: 12000 },
  { id: 'light_6in',       name: '매입등 6"',          pricePerEa: 18000 },
  { id: 'light_t5',        name: '라인조명 T5',        pricePerEa: 15000, perM: true },
  { id: 'light_t7',        name: '라인조명 T7',        pricePerEa: 20000, perM: true },
  { id: 'light_panel_3x12',name: '평판등 300×1200',    pricePerEa: 35000 },
  { id: 'light_panel_6x6', name: '평판등 600×600',     pricePerEa: 30000 },
  { id: 'light_pendant',   name: '펜던트',             pricePerEa: 50000 },
  { id: 'light_wall',      name: '벽등',               pricePerEa: 30000 },
  { id: 'light_indirect',  name: '간접조명',           pricePerEa: 20000, perM: true },
]

// 가구 (단위: EA)
export const FURNITURE = [
  { id: 'fur_shoe',     name: '신발장',       pricePerEa: 0 },
  { id: 'fur_closet',   name: '붙박이장',     pricePerEa: 0 },
  { id: 'fur_storage',  name: '수납장',       pricePerEa: 0 },
  { id: 'fur_kitchen',  name: '주방가구',     pricePerEa: 0 },
  { id: 'fur_vanity',   name: '세면대/화장대', pricePerEa: 0 },
  { id: 'fur_desk',     name: '데스크',       pricePerEa: 0 },
  { id: 'fur_shelf',    name: '선반',         pricePerEa: 0 },
]

export const LIGHTING_TYPES = [
  '매입등 3"', '매입등 4"', '매입등 6"',
  '라인조명 T5', '라인조명 T7',
  '평판등 300×1200', '평판등 600×600',
  '펜던트', '벽등', '기타',
]

export const WRAPPING_WIDTHS = [30, 45, 60, 80, 100, 120, 150, 200, 250, 300, 400, 600]
export const WRAPPING_BOARD_LENGTH_M = 2.4   // 랩핑평판 1EA 길이 (2400mm)

// ─────────────────────────────────────────────
// 마감재 타입별 자동 레이어 규칙
// ─────────────────────────────────────────────
export const FINISH_TYPES = [
  { id: 'wallpaper',  label: '벽지',          layers: ['각재', '석고보드×1', '벽지'] },
  { id: 'paint',      label: '도장(페인트)',   layers: ['각재', '석고보드×2', '도장'] },
  { id: 'film',       label: '인테리어필름',   layers: ['각재', '석고보드×1', 'MDF', '필름'] },
  { id: 'tile',       label: '타일',           layers: ['각재', '방수석고보드', '타일'] },
  { id: 'luba',       label: '루바',           layers: ['각재', '석고보드×1', '루바'] },
  { id: 'tex',        label: '텍스(천장)',      layers: ['각재', '텍스'] },
  { id: 'flooring',   label: '바닥재',         layers: ['바닥재'] },
  { id: 'wood',       label: '목재마감',       layers: ['각재', '목재'] },
  { id: 'none',       label: '없음/직접설정',  layers: [] },
]
