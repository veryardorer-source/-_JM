import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const defaultSurface = (label, direction) => ({
  id: `${direction}_${Date.now()}_${Math.random()}`,
  label,
  direction,
  finishType: 'none',
  finishMaterialId: '',
  seokgoType: 'sg_normal',
  mdfId: 'mdf_9',
  filmPricePerM: 5000,
  filmSections: [],
  insulationType: 'none',
  customItems: [],
  noneSeokgoType: 'none',
  noneHapanId: 'none',
  enabled: true,
  lowerEnabled: false,
  lowerHeightMm: 900,
  lowerFinishType: 'film',
  lowerMdfId: 'mdf_9',
  lowerFilmSections: [],
  lowerFilmPricePerM: 5000,
  lowerSeokgoId: 'sg_normal',
  lowerWallpaperId: '',
  lowerPaintPricePerSqm: 0,
  paintPricePerSqm: 0,
  texPricePerBox: 0,
  gakjaeRows: null,
  wallThickness: 'normal',
  extraWidthM: 0,
  extraHeightM: 0,
})

const createRoom = (name) => ({
  id: `room_${Date.now()}_${Math.random()}`,
  name,
  widthM: 0,
  depthM: 0,
  heightM: 2.4,
  slabHeightM: 0,
  doors: [],
  extras: [],
  surfaces: [
    defaultSurface('바닥', 'floor'),
    defaultSurface('천장', 'ceiling'),
    defaultSurface('벽A', 'wallA'),
    defaultSurface('벽B', 'wallB'),
    defaultSurface('벽C', 'wallC'),
    defaultSurface('벽D', 'wallD'),
  ],
})

export const useStore = create(
  persist(
    (set, get) => ({
      rooms: [],
      priceOverrides: {},
      customMaterials: [],

      addRoom: () => set(s => ({ rooms: [...s.rooms, createRoom(`공간 ${s.rooms.length + 1}`)] })),
      deleteRoom: (id) => set(s => ({ rooms: s.rooms.filter(r => r.id !== id) })),
      duplicateRoom: (id) => set(s => {
        const room = s.rooms.find(r => r.id === id)
        if (!room) return s
        const newRoom = { ...JSON.parse(JSON.stringify(room)), id: `room_${Date.now()}_${Math.random()}`, name: room.name + ' 복사' }
        return { rooms: [...s.rooms, newRoom] }
      }),
      updateRoom: (id, fields) => set(s => ({ rooms: s.rooms.map(r => r.id === id ? { ...r, ...fields } : r) })),

      updateSurface: (roomId, sfId, fields) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === sfId ? { ...sf, ...fields } : sf) }
          : r)
      })),
      addWall: (roomId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: [...r.surfaces, defaultSurface(`벽${r.surfaces.filter(sf => sf.direction === 'wallExtra').length + 5}`, 'wallExtra')] }
          : r)
      })),
      deleteSurface: (roomId, sfId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.filter(sf => sf.id !== sfId) }
          : r)
      })),

      addDoor: (roomId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, doors: [...(r.doors || []), { id: `door_${Date.now()}`, type: '방문', widthM: 0.9, heightM: 2.1, qty: 1, unitPrice: 0, modelNo: '', color: '', glass: '없음' }] }
          : r)
      })),
      updateDoor: (roomId, doorId, fields) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, doors: (r.doors || []).map(d => d.id === doorId ? { ...d, ...fields } : d) }
          : r)
      })),
      deleteDoor: (roomId, doorId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, doors: (r.doors || []).filter(d => d.id !== doorId) }
          : r)
      })),

      addWrapping: (roomId, sfId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === sfId
              ? { ...sf, wrappings: [...(sf.wrappings || []), { id: `wr_${Date.now()}_${Math.random()}`, purpose: '걸레받이', wrappingId: 'wrap_60', lengthOverrideMm: 0 }] }
              : sf) }
          : r)
      })),
      updateWrapping: (roomId, sfId, wrId, fields) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === sfId
              ? { ...sf, wrappings: (sf.wrappings || []).map(wr => wr.id === wrId ? { ...wr, ...fields } : wr) }
              : sf) }
          : r)
      })),
      deleteWrapping: (roomId, sfId, wrId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === sfId
              ? { ...sf, wrappings: (sf.wrappings || []).filter(wr => wr.id !== wrId) }
              : sf) }
          : r)
      })),

      addLighting: (roomId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, lightings: [...(r.lightings || []), { id: `lit_${Date.now()}_${Math.random()}`, name: '', spec: '', qty: 1, unitPrice: 0 }] }
          : r)
      })),
      updateLighting: (roomId, litId, fields) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, lightings: (r.lightings || []).map(l => l.id === litId ? { ...l, ...fields } : l) }
          : r)
      })),
      deleteLighting: (roomId, litId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, lightings: (r.lightings || []).filter(l => l.id !== litId) }
          : r)
      })),

      addExtra: (roomId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, extras: [...(r.extras || []), { id: `ext_${Date.now()}_${Math.random()}`, name: '', spec: '', qty: 1, unit: 'EA', unitPrice: 0 }] }
          : r)
      })),
      updateExtra: (roomId, extId, fields) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, extras: (r.extras || []).map(e => e.id === extId ? { ...e, ...fields } : e) }
          : r)
      })),
      deleteExtra: (roomId, extId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, extras: (r.extras || []).filter(e => e.id !== extId) }
          : r)
      })),

      addFilmSection: (roomId, sfId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === sfId
              ? { ...sf, filmSections: [...(sf.filmSections || []), { id: `fs_${Date.now()}_${Math.random()}`, label: `구간${(sf.filmSections || []).length + 1}`, widthMm: 600, patternRepeatMm: 0, heightOverrideMm: 0, filmName: '', pricePerM: 0 }] }
              : sf) }
          : r)
      })),
      updateFilmSection: (roomId, sfId, sectionId, fields) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === sfId
              ? { ...sf, filmSections: (sf.filmSections || []).map(sec => sec.id === sectionId ? { ...sec, ...fields } : sec) }
              : sf) }
          : r)
      })),
      deleteFilmSection: (roomId, sfId, sectionId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === sfId
              ? { ...sf, filmSections: (sf.filmSections || []).filter(sec => sec.id !== sectionId) }
              : sf) }
          : r)
      })),

      addCustomItem: (roomId, surfaceId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === surfaceId
              ? { ...sf, customItems: [...(sf.customItems || []), { id: `ci_${Date.now()}_${Math.random()}`, name: '', spec: '', qty: 0, unit: '식', unitPrice: 0 }] }
              : sf) }
          : r)
      })),
      updateCustomItem: (roomId, surfaceId, itemId, fields) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === surfaceId
              ? { ...sf, customItems: (sf.customItems || []).map(ci => ci.id === itemId ? { ...ci, ...fields } : ci) }
              : sf) }
          : r)
      })),
      deleteCustomItem: (roomId, surfaceId, itemId) => set(s => ({
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, surfaces: r.surfaces.map(sf => sf.id === surfaceId
              ? { ...sf, customItems: (sf.customItems || []).filter(ci => ci.id !== itemId) }
              : sf) }
          : r)
      })),

      // 자재 단가 관리
      setPriceOverride: (id, price) => set(s => {
        const next = { ...s.priceOverrides }
        if (price === undefined) { delete next[id] } else { next[id] = price }
        return { priceOverrides: next }
      }),

      // 커스텀 자재 관리
      addCustomMaterial: (mat) => set(s => ({ customMaterials: [...s.customMaterials, mat] })),
      updateCustomMaterial: (id, fields) => set(s => ({
        customMaterials: s.customMaterials.map(m => m.id === id ? { ...m, ...fields } : m)
      })),
      deleteCustomMaterial: (id) => set(s => ({
        customMaterials: s.customMaterials.filter(m => m.id !== id)
      })),

      clearAll: () => set({ rooms: [] }),
    }),
    { name: 'qty-calc-store-v1' }
  )
)
