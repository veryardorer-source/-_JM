import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveProject, loadProject, generateProjectId } from '../utils/projectStorage.js'
import { generateEstimateItems as _generateEstimateItems } from '../utils/generateEstimate.js'

const defaultSurface = (label, direction) => ({
  id: `${direction}_${Date.now()}_${Math.random()}`,
  label,
  direction, // floor | ceiling | wallA | wallB | wallC | wallD | wallExtra
  finishType: 'none',        // 마감재 타입 키
  finishMaterialId: '',      // 선택된 마감재 ID
  seokgoType: 'sg_normal',   // 석고보드 종류
  mdfId: 'mdf_9',            // MDF 종류
  filmPricePerM: 5000,       // 필름 m당 기본 단가
  filmSections: [],          // 필름 구간 목록
  wallType: 'normal',        // 'normal' | 'partition' (칸막이벽)
  hapanId: 'hp_normal_11',   // 합판 종류 (칸막이벽용)
  insulationType: 'none',    // 흡음재 종류
  moldings: [],              // 랩핑평판 (면별)
  customItems: [],           // 직접설정 시 수동 입력 항목
  enabled: true,
})

const createRoom = (name) => {
  const id = `room_${Date.now()}`
  return {
    id,
    name,
    widthM: 0,
    depthM: 0,
    heightM: 2.4,     // 마감 천장 높이
    slabHeightM: 0,   // 기존(슬라브) 높이 (0 = 미입력)
    doors: [],
    lightings: [],
    moldings: [],
    surfaces: [
      defaultSurface('바닥', 'floor'),
      defaultSurface('천장', 'ceiling'),
      defaultSurface('벽A', 'wallA'),
      defaultSurface('벽B', 'wallB'),
      defaultSurface('벽C', 'wallC'),
      defaultSurface('벽D', 'wallD'),
    ],
  }
}

// 전체 항목(실 외) 기본 구성
const DEFAULT_GLOBAL_ITEMS = [
  // 가설작업
  { id: 'gi_setup_1',   trade: '가설작업', name: '먹메김 및 보양',    spec: '',   unit: '㎡',  qty: 0, matUnitPrice: 150,  labUnitPrice: 1800, expUnitPrice: 0,   enabled: true, remark: '자동계산 권장' },
  { id: 'gi_setup_2',   trade: '가설작업', name: '폐기물처리',          spec: '',   unit: '식',  qty: 1, matUnitPrice: 0,    labUnitPrice: 0,    expUnitPrice: 400000, enabled: true, remark: '' },
  { id: 'gi_setup_3',   trade: '가설작업', name: '현장정리 및 정돈',   spec: '',   unit: '㎡',  qty: 0, matUnitPrice: 350,  labUnitPrice: 800,  expUnitPrice: 0,   enabled: true, remark: '자동계산 권장' },
  { id: 'gi_setup_4',   trade: '가설작업', name: '준공청소',             spec: '',   unit: '㎡',  qty: 0, matUnitPrice: 500,  labUnitPrice: 4000, expUnitPrice: 0,   enabled: true, remark: '자동계산 권장' },
  // 설비작업
  { id: 'gi_plumb_1',  trade: '설비작업', name: '배수배관작업',         spec: '',   unit: '식',  qty: 1, matUnitPrice: 0,    labUnitPrice: 0,    expUnitPrice: 0,   enabled: true, remark: '' },
  { id: 'gi_plumb_2',  trade: '설비작업', name: '급수배관작업',         spec: '',   unit: '식',  qty: 1, matUnitPrice: 0,    labUnitPrice: 0,    expUnitPrice: 0,   enabled: true, remark: '' },
  { id: 'gi_plumb_3',  trade: '설비작업', name: '환풍기',               spec: '',   unit: 'EA',  qty: 0, matUnitPrice: 45000, labUnitPrice: 0,   expUnitPrice: 0,   enabled: false, remark: '' },
  // 전기통신작업
  { id: 'gi_elec_1',   trade: '전기통신작업', name: '전선 HIV 2.5SQ',  spec: '',   unit: 'M',   qty: 0, matUnitPrice: 550,  labUnitPrice: 0,    expUnitPrice: 0,   enabled: true, remark: '' },
  { id: 'gi_elec_2',   trade: '전기통신작업', name: '난연CD관 16MM',    spec: '',   unit: 'M',   qty: 0, matUnitPrice: 300,  labUnitPrice: 0,    expUnitPrice: 0,   enabled: true, remark: '' },
  { id: 'gi_elec_3',   trade: '전기통신작업', name: '전열기구(콘센트/스위치)', spec: '', unit: '식', qty: 1, matUnitPrice: 0, labUnitPrice: 0,  expUnitPrice: 0,   enabled: true, remark: '' },
  { id: 'gi_elec_4',   trade: '전기통신작업', name: '분전함',           spec: '',   unit: '식',  qty: 0, matUnitPrice: 0,    labUnitPrice: 0,    expUnitPrice: 0,   enabled: false, remark: '' },
  { id: 'gi_elec_5',   trade: '전기통신작업', name: '부자재',           spec: '',   unit: '식',  qty: 1, matUnitPrice: 0,    labUnitPrice: 0,    expUnitPrice: 0,   enabled: true, remark: '' },
  { id: 'gi_elec_6',   trade: '전기통신작업', name: '노무비',           spec: '인', unit: '인',  qty: 0, matUnitPrice: 0,    labUnitPrice: 280000, expUnitPrice: 20000, enabled: true, remark: '' },
  // 붙박이가구
  { id: 'gi_furn_1',  trade: '붙박이가구', name: '붙박이장',    spec: '', unit: '식', qty: 1, matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0, enabled: true, remark: '' },
  { id: 'gi_furn_2',  trade: '붙박이가구', name: '주방가구',    spec: '', unit: '식', qty: 1, matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0, enabled: true, remark: '' },
  { id: 'gi_furn_3',  trade: '붙박이가구', name: '신발장',      spec: '', unit: '식', qty: 1, matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0, enabled: true, remark: '' },
  // 소방작업
  { id: 'gi_fire_1',   trade: '소방작업', name: '감지기',              spec: '',   unit: 'EA',  qty: 0, matUnitPrice: 6000, labUnitPrice: 0,    expUnitPrice: 0,   enabled: false, remark: '' },
  { id: 'gi_fire_2',   trade: '소방작업', name: 'S/P 헤드',            spec: '',   unit: 'EA',  qty: 0, matUnitPrice: 6500, labUnitPrice: 0,    expUnitPrice: 0,   enabled: false, remark: '' },
  { id: 'gi_fire_3',   trade: '소방작업', name: '피난유도등',          spec: '',   unit: 'EA',  qty: 0, matUnitPrice: 22000, labUnitPrice: 0,   expUnitPrice: 0,   enabled: false, remark: '' },
]

export const useStore = create(
  persist(
    (set, get) => ({
  // ─── 자재 관리 ──────────────────────────────────────
  // 사용자 추가 자재 목록
  customMaterials: [],
  // 기본 자재 단가 덮어쓰기 { materialId: price }
  priceOverrides: {},
  // 도어 종류 목록: [{name, defaultPrice}] (설정창에서 추가/삭제/단가 설정 가능)
  doorTypes: [
    { name: '방문', defaultPrice: 0 },
    { name: 'ABS도어', defaultPrice: 0 },
    { name: '강화도어', defaultPrice: 0 },
    { name: '양문형도어', defaultPrice: 0 },
    { name: '양개문', defaultPrice: 0 },
    { name: '현관문', defaultPrice: 0 },
    { name: '미서기문', defaultPrice: 0 },
    { name: '폴딩도어', defaultPrice: 0 },
    { name: '중문', defaultPrice: 0 },
    { name: '기타', defaultPrice: 0 },
  ],
  setDoorTypes: (list) => set({ doorTypes: list }),

  // 시공방법별 기본 설정
  methodDefaults: {
    wallpaper: { seokgoType: 'sg_normal', mdfId: 'mdf_9', gakjaeRows: null, insulationType: 'none' },
    paint:     { seokgoType: 'sg_normal', mdfId: 'mdf_9', gakjaeRows: null, insulationType: 'none' },
    film:      { seokgoType: 'sg_normal', mdfId: 'mdf_9', gakjaeRows: null, insulationType: 'none' },
    tile:      { seokgoType: 'sg_waterproof', gakjaeRows: null, insulationType: 'none' },
    luba:      { seokgoType: 'sg_normal', gakjaeRows: null, insulationType: 'none' },
    flooring:  { gakjaeRows: null, insulationType: 'none' },
    tex:       { gakjaeRows: null },
    wood:      { gakjaeRows: null, insulationType: 'none' },
  },

  addCustomMaterial: (mat) =>
    set((s) => ({
      customMaterials: [...s.customMaterials, { ...mat, id: `custom_${Date.now()}_${Math.random().toString(36).slice(2,7)}` }],
    })),
  updateCustomMaterial: (id, fields) =>
    set((s) => ({
      customMaterials: s.customMaterials.map((m) => m.id === id ? { ...m, ...fields } : m),
    })),
  deleteCustomMaterial: (id) =>
    set((s) => ({
      customMaterials: s.customMaterials.filter((m) => m.id !== id),
    })),
  setPriceOverride: (matId, price) =>
    set((s) => ({ priceOverrides: { ...s.priceOverrides, [matId]: price } })),
  clearPriceOverride: (matId) =>
    set((s) => {
      const next = { ...s.priceOverrides }
      delete next[matId]
      return { priceOverrides: next }
    }),
  setMethodDefault: (finishType, fields) =>
    set((s) => ({
      methodDefaults: {
        ...s.methodDefaults,
        [finishType]: { ...(s.methodDefaults[finishType] || {}), ...fields },
      },
    })),

  // 현재 프로젝트 ID (null = 미저장 새 프로젝트)
  currentProjectId: null,

  // 프로젝트 저장
  saveCurrentProject: (displayName) => {
    const s = get()
    const id = s.currentProjectId || generateProjectId()
    const snapshot = { project: s.project, rooms: s.rooms, globalItems: s.globalItems }
    saveProject(id, displayName, snapshot)
    set({ currentProjectId: id })
    return id
  },

  // 저장된 프로젝트 불러오기
  loadStoredProject: (id) => {
    const snapshot = loadProject(id)
    if (!snapshot) return false
    set({
      currentProjectId: id,
      project: snapshot.project,
      rooms: snapshot.rooms,
      globalItems: snapshot.globalItems ?? get().globalItems,
    })
    return true
  },

  // 새 프로젝트 시작 (현재 상태 초기화)
  startNewProject: () => {
    set({
      currentProjectId: null,
      project: {
        siteName: '',
        clientName: '',
        manager: '',
        date: new Date().toISOString().slice(0, 10),
      },
      rooms: [],
      globalItems: DEFAULT_GLOBAL_ITEMS,
    })
  },

  // 프로젝트 정보
  project: {
    siteName: '',
    clientName: '',
    manager: '',
    date: new Date().toISOString().slice(0, 10),
  },
  setProject: (fields) =>
    set((s) => ({ project: { ...s.project, ...fields } })),

  // 전체 항목 (실 외 공통 공종)
  globalItems: DEFAULT_GLOBAL_ITEMS,

  addGlobalItem: () =>
    set((s) => ({
      globalItems: [...s.globalItems, {
        id: `gi_custom_${Date.now()}`,
        trade: '기타', name: '', spec: '', unit: '식',
        qty: 1, matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0,
        enabled: true, remark: '',
      }],
    })),

  updateGlobalItem: (id, fields) =>
    set((s) => ({
      globalItems: s.globalItems.map(gi => gi.id === id ? { ...gi, ...fields } : gi),
    })),

  deleteGlobalItem: (id) =>
    set((s) => ({
      globalItems: s.globalItems.filter(gi => gi.id !== id),
    })),

  // 실(Room) 목록
  rooms: [],

  addRoom: () =>
    set((s) => ({
      rooms: [...s.rooms, createRoom(`실 ${s.rooms.length + 1}`)],
    })),

  addRoomWithData: ({ name, widthM, depthM, heightM }) =>
    set((s) => {
      const room = createRoom(name || `실 ${s.rooms.length + 1}`)
      return {
        rooms: [...s.rooms, { ...room, widthM: widthM ?? 0, depthM: depthM ?? 0, heightM: heightM ?? 2.4 }],
      }
    }),

  updateRoom: (roomId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId ? { ...r, ...fields } : r
      ),
    })),

  deleteRoom: (roomId) =>
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== roomId) })),

  duplicateRoom: (roomId) =>
    set((s) => {
      const room = s.rooms.find((r) => r.id === roomId)
      if (!room) return s
      const newRoom = {
        ...JSON.parse(JSON.stringify(room)),
        id: `room_${Date.now()}`,
        name: room.name + ' (복사)',
        surfaces: room.surfaces.map((sf) => ({
          ...sf,
          id: `${sf.direction}_${Date.now()}_${Math.random()}`,
        })),
      }
      const idx = s.rooms.findIndex((r) => r.id === roomId)
      const next = [...s.rooms]
      next.splice(idx + 1, 0, newRoom)
      return { rooms: next }
    }),

  // 추가 벽 추가
  addWall: (roomId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: [...r.surfaces, {
            ...defaultSurface(`벽${String.fromCharCode(69 + r.surfaces.filter(sf => sf.direction === 'wallExtra').length)}`, 'wallExtra'),
            extraWidthM: 0,
            extraHeightM: 0,
          }],
        }
      ),
    })),

  // 면 삭제 (추가 벽용)
  deleteSurface: (roomId, surfaceId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.filter(sf => sf.id !== surfaceId),
        }
      ),
    })),

  // 면(Surface) 업데이트
  updateSurface: (roomId, surfaceId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              surfaces: r.surfaces.map((sf) =>
                sf.id !== surfaceId ? sf : { ...sf, ...fields }
              ),
            }
      ),
    })),

  // 직접설정 항목 관리
  addCustomItem: (roomId, surfaceId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== surfaceId ? sf : {
              ...sf,
              customItems: [...(sf.customItems || []), {
                id: `ci_${Date.now()}_${Math.random()}`,
                name: '', spec: '', qty: 1, unit: '식', unitPrice: 0,
              }],
            }
          ),
        }
      ),
    })),

  updateCustomItem: (roomId, surfaceId, itemId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== surfaceId ? sf : {
              ...sf,
              customItems: (sf.customItems || []).map((ci) =>
                ci.id !== itemId ? ci : { ...ci, ...fields }
              ),
            }
          ),
        }
      ),
    })),

  deleteCustomItem: (roomId, surfaceId, itemId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== surfaceId ? sf : {
              ...sf,
              customItems: (sf.customItems || []).filter((ci) => ci.id !== itemId),
            }
          ),
        }
      ),
    })),

  // 도어 추가/수정/삭제
  addDoor: (roomId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          doors: [...(r.doors || []), {
            id: `door_${Date.now()}_${Math.random()}`,
            type: '방문',
            widthM: 0.9,
            heightM: 2.1,
            qty: 1,
            unitPrice: 0,
            modelNo: '',   // 제품번호·모델
            color: '',     // 색상·무늬
            glass: '없음', // 유리 포함 여부
          }],
        }
      ),
    })),

  updateDoor: (roomId, doorId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          doors: r.doors.map((d) => d.id !== doorId ? d : { ...d, ...fields }),
        }
      ),
    })),

  deleteDoor: (roomId, doorId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          doors: r.doors.filter((d) => d.id !== doorId),
        }
      ),
    })),

  // 조명
  addLighting: (roomId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          lightings: [...(r.lightings || []), {
            id: `light_${Date.now()}_${Math.random()}`,
            type: '매입등 3"',
            spec: '',
            qty: 1,
            lengthM: 0,
          }],
        }
      ),
    })),

  updateLighting: (roomId, lightingId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          lightings: (r.lightings || []).map((l) =>
            l.id !== lightingId ? l : { ...l, ...fields }
          ),
        }
      ),
    })),

  deleteLighting: (roomId, lightingId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          lightings: (r.lightings || []).filter((l) => l.id !== lightingId),
        }
      ),
    })),

  // 랩핑평판 (몰딩) — 면(surface) 단위
  addMolding: (roomId, sfId, moldType) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== sfId ? sf : {
              ...sf,
              moldings: [...(sf.moldings || []), {
                id: `mold_${Date.now()}_${Math.random()}`,
                moldType,
                widthMm: moldType === '걸레받이' ? 80 : moldType === '천정몰딩' ? 30 : 60,
                lengthM: 0,        // 창틀몰딩/유리칠판 수동입력용
                itemWidthM: 0,
                itemHeightM: 0,
                qty: 1,
              }],
            }
          ),
        }
      ),
    })),

  updateMolding: (roomId, sfId, moldingId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== sfId ? sf : {
              ...sf,
              moldings: (sf.moldings || []).map((m) =>
                m.id !== moldingId ? m : { ...m, ...fields }
              ),
            }
          ),
        }
      ),
    })),

  deleteMolding: (roomId, sfId, moldingId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== sfId ? sf : {
              ...sf,
              moldings: (sf.moldings || []).filter((m) => m.id !== moldingId),
            }
          ),
        }
      ),
    })),

  // 개구부 추가/삭제
  addOpening: (roomId, surfaceId, opening) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              surfaces: r.surfaces.map((sf) =>
                sf.id !== surfaceId
                  ? sf
                  : {
                      ...sf,
                      openings: [
                        ...sf.openings,
                        { id: `op_${Date.now()}`, ...opening },
                      ],
                    }
              ),
            }
      ),
    })),

  deleteOpening: (roomId, surfaceId, openingId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              surfaces: r.surfaces.map((sf) =>
                sf.id !== surfaceId
                  ? sf
                  : {
                      ...sf,
                      openings: sf.openings.filter((o) => o.id !== openingId),
                    }
              ),
            }
      ),
    })),

  // 필름 구간 추가
  addFilmSection: (roomId, surfaceId, section) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== surfaceId ? sf : {
              ...sf,
              filmSections: [...sf.filmSections, { id: `fs_${Date.now()}_${Math.random()}`, ...section }],
            }
          ),
        }
      ),
    })),

  // 필름 구간 수정
  updateFilmSection: (roomId, surfaceId, sectionId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== surfaceId ? sf : {
              ...sf,
              filmSections: sf.filmSections.map((sec) =>
                sec.id !== sectionId ? sec : { ...sec, ...fields }
              ),
            }
          ),
        }
      ),
    })),

  // 필름 구간 삭제
  deleteFilmSection: (roomId, surfaceId, sectionId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== surfaceId ? sf : {
              ...sf,
              filmSections: sf.filmSections.filter((sec) => sec.id !== sectionId),
            }
          ),
        }
      ),
    })),

  // 칸막이벽 CRUD
  addPartition: (roomId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          partitions: [...(r.partitions || []), {
            id: `part_${Date.now()}_${Math.random()}`,
            name: `칸막이 ${(r.partitions || []).length + 1}`,
            lengthM: 0,
            heightM: 0,       // 0 = 실 마감높이 사용
            hapanId: 'hp_normal_4',
            finishType: 'none',
            finishMaterialId: '',
            seokgoType: 'sg_normal',
            mdfId: 'mdf_9',
            insulationType: 'none',
            filmPricePerM: 5000,
            moldings: [],
          }],
        }
      ),
    })),

  updatePartition: (roomId, partitionId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          partitions: (r.partitions || []).map((p) =>
            p.id !== partitionId ? p : { ...p, ...fields }
          ),
        }
      ),
    })),

  deletePartition: (roomId, partitionId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          partitions: (r.partitions || []).filter((p) => p.id !== partitionId),
        }
      ),
    })),

  // 면별 노무비/부자재 항목
  addSurfaceLaborItem: (roomId, sfId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== sfId ? sf : {
              ...sf,
              laborItems: [...(sf.laborItems || []), {
                id: `li_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                name: '', unit: '인', qty: 1,
                matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0,
              }],
            }
          ),
        }
      ),
    })),

  updateSurfaceLaborItem: (roomId, sfId, itemId, fields) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== sfId ? sf : {
              ...sf,
              laborItems: (sf.laborItems || []).map((li) =>
                li.id !== itemId ? li : { ...li, ...fields }
              ),
            }
          ),
        }
      ),
    })),

  deleteSurfaceLaborItem: (roomId, sfId, itemId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          surfaces: r.surfaces.map((sf) =>
            sf.id !== sfId ? sf : {
              ...sf,
              laborItems: (sf.laborItems || []).filter((li) => li.id !== itemId),
            }
          ),
        }
      ),
    })),

  // ─── 견적서 상태 ─────────────────────────────────────────────
  estimateItems: [],
  discount: 0,

  generateEstimateItems: (matOpts = {}) => {
    const s = get()
    const newItems = _generateEstimateItems(s.rooms, s.globalItems, matOpts, s.estimateItems)
    set({ estimateItems: newItems })
  },

  updateEstimateItem: (id, fields) =>
    set((s) => ({
      estimateItems: s.estimateItems.map(it => it.id === id ? { ...it, ...fields } : it),
    })),

  addEstimateItemToTrade: (trade) =>
    set((s) => ({
      estimateItems: [...s.estimateItems, {
        id: `ei_manual_${Date.now()}`,
        trade, name: '', spec: '', unit: '식', qty: 1,
        matUnitPrice: 0, labUnitPrice: 0, expUnitPrice: 0, autoGen: false,
      }],
    })),

  deleteEstimateItem: (id) =>
    set((s) => ({ estimateItems: s.estimateItems.filter(it => it.id !== id) })),

  setDiscount: (v) => set({ discount: v }),

  // 테스트 데이터 불러오기
  loadSampleData: () => set(() => ({
    project: {
      siteName: '샘플 현장 (테스트용)',
      clientName: '홍길동',
      manager: '김담당',
      date: new Date().toISOString().slice(0, 10),
    },
    rooms: [
      {
        id: 'sample_room_1',
        name: '사무실',
        widthM: 5,
        depthM: 4,
        heightM: 2.4,
        slabHeightM: 2.7,
        doors: [
          { id: 'sample_door_1', type: '방문', widthM: 0.9, heightM: 2.1, qty: 1, unitPrice: 150000 },
        ],
        lightings: [
          { id: 'sample_light_1', type: '매입등 3"', spec: 'LED 7W', qty: 6, lengthM: 0, totalLengthMm: 0 },
          { id: 'sample_light_2', type: '라인조명 T5', spec: '', qty: 1, lengthM: 2.4 },
        ],
        moldings: [],
        surfaces: [
          { id: 'sf_s1_floor',   label: '바닥',  direction: 'floor',   finishType: 'flooring', finishMaterialId: 'fl_deco_600', seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
          { id: 'sf_s1_ceiling', label: '천장',  direction: 'ceiling', finishType: 'tex',       finishMaterialId: 'tex_600_600', seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
          { id: 'sf_s1_wallA',   label: '벽A',   direction: 'wallA',   finishType: 'wallpaper', finishMaterialId: 'wp_silk_j',  seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [{ id: 'mold_s1_wA_1', moldType: '걸레받이', widthMm: 80, lengthM: 0, itemWidthM: 0, itemHeightM: 0, qty: 1 }], enabled: true },
          { id: 'sf_s1_wallB',   label: '벽B',   direction: 'wallB',   finishType: 'wallpaper', finishMaterialId: 'wp_silk_j',  seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [{ id: 'mold_s1_wB_1', moldType: '걸레받이', widthMm: 80, lengthM: 0, itemWidthM: 0, itemHeightM: 0, qty: 1 }], enabled: true },
          { id: 'sf_s1_wallC',   label: '벽C',   direction: 'wallC',   finishType: 'film',      finishMaterialId: '',           seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [{ id: 'fsc1', widthMm: 1220, patternRepeatMm: 0, lossM: 0.3, sectionM: 2.8, sectionCost: 14000, filmName: '화이트무광' }], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
          { id: 'sf_s1_wallD',   label: '벽D',   direction: 'wallD',   finishType: 'wallpaper', finishMaterialId: 'wp_silk_j',  seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
        ],
      },
      {
        id: 'sample_room_2',
        name: '회의실',
        widthM: 4,
        depthM: 3,
        heightM: 2.4,
        slabHeightM: 0,
        doors: [
          { id: 'sample_door_2', type: '방문', widthM: 0.9, heightM: 2.1, qty: 1, unitPrice: 150000 },
        ],
        lightings: [
          { id: 'sample_light_3', type: '평판등 600×600', spec: 'LED 40W', qty: 4, lengthM: 0, totalLengthMm: 0 },
        ],
        moldings: [],
        surfaces: [
          { id: 'sf_s2_floor',   label: '바닥',  direction: 'floor',   finishType: 'flooring', finishMaterialId: 'fl_deco_600', seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
          { id: 'sf_s2_ceiling', label: '천장',  direction: 'ceiling', finishType: 'wallpaper', finishMaterialId: 'wp_ceil_silk', seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
          { id: 'sf_s2_wallA',   label: '벽A',   direction: 'wallA',   finishType: 'wallpaper', finishMaterialId: 'wp_silk_b',  seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [{ id: 'mold_s2_wA_1', moldType: '걸레받이', widthMm: 80, lengthM: 0, itemWidthM: 0, itemHeightM: 0, qty: 1 }], enabled: true },
          { id: 'sf_s2_wallB',   label: '벽B',   direction: 'wallB',   finishType: 'wallpaper', finishMaterialId: 'wp_silk_b',  seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
          { id: 'sf_s2_wallC',   label: '벽C',   direction: 'wallC',   finishType: 'wallpaper', finishMaterialId: 'wp_silk_b',  seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
          { id: 'sf_s2_wallD',   label: '벽D',   direction: 'wallD',   finishType: 'wallpaper', finishMaterialId: 'wp_silk_b',  seokgoType: 'sg_normal', mdfId: 'mdf_9', filmPricePerM: 5000, filmSections: [], wallType: 'normal', hapanId: 'hp_normal_11', insulationType: 'none', moldings: [], enabled: true },
        ],
      },
    ],
  })),
  }),
  {
    name: 'interior-estimate-store',
    version: 5,
    migrate: (state, version) => {
      if (version < 2) {
        const dirMap   = { wallN: 'wallA', wallS: 'wallB', wallE: 'wallC', wallW: 'wallD' }
        const labelMap = { '벽(북)': '벽A', '벽(남)': '벽B', '벽(동)': '벽C', '벽(서)': '벽D' }
        state.rooms = (state.rooms || []).map(room => ({
          ...room,
          slabHeightM: room.slabHeightM ?? 0,
          surfaces: (room.surfaces || []).map(sf => ({
            ...sf,
            direction: dirMap[sf.direction] ?? sf.direction,
            label: labelMap[sf.label] ?? sf.label,
          })),
        }))
      }
      if (version < 3) {
        // moldings를 room → surface로 이동 (기존 room 단위 몰딩은 초기화)
        state.rooms = (state.rooms || []).map(room => ({
          ...room,
          moldings: undefined,
          surfaces: (room.surfaces || []).map(sf => ({
            ...sf,
            moldings: sf.moldings ?? [],
          })),
        }))
      }
      if (version < 4) {
        // 견적서 상태 초기화
        state.estimateItems = state.estimateItems ?? []
        state.discount = state.discount ?? 0
      }
      if (version < 5) {
        // 붙박이가구 globalItems enabled → true
        state.globalItems = (state.globalItems || []).map(gi =>
          ['gi_furn_1', 'gi_furn_2', 'gi_furn_3'].includes(gi.id) ? { ...gi, enabled: true } : gi
        )
      }
      return state
    },
  }
)
)
