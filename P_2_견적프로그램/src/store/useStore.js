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

      clearAll: () => set({ rooms: [] }),
    }),
    { name: 'qty-calc-store-v1' }
  )
)
