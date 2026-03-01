/**
 * [INPUT]: 依赖 store.ts 状态（世界/角色/场景/道具/灵魂碎片/记忆）
 * [OUTPUT]: 对外提供 DashboardDrawer 组件
 * [POS]: 灵魂手帐(左抽屉)：扉页+灵魂状态+角色轮播+场景缩略图+章节目标+道具格+属性+音乐
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import {
  useGameStore,
  PERIODS,
  GLOBAL_STATS,
  WORLDS,
  getWorldCharacters,
  getWorldScenes,
  getWorldItems,
  getCurrentChapter,
} from '@/lib/store'
import { toggleBGM, isBGMPlaying } from '@/lib/bgm'
import { DotsSixVertical, X, Play, Pause } from '@phosphor-icons/react'

const P = 'kc'
const STORAGE_KEY = 'kc-dash-order'

const DEFAULT_SECTIONS = ['front', 'soul', 'cast', 'scenes', 'objectives', 'items', 'stats', 'music']

function loadOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_SECTIONS
}

export default function DashboardDrawer() {
  const showDashboard = useGameStore((s) => s.showDashboard)
  const toggleDashboard = useGameStore((s) => s.toggleDashboard)
  const currentDay = useGameStore((s) => s.currentDay)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const actionPoints = useGameStore((s) => s.actionPoints)
  const currentWorld = useGameStore((s) => s.currentWorld)
  const currentScene = useGameStore((s) => s.currentScene)
  const soulFragments = useGameStore((s) => s.soulFragments)
  const lostMemories = useGameStore((s) => s.lostMemories)
  const playerStats = useGameStore((s) => s.playerStats)
  const characterStats = useGameStore((s) => s.characterStats)
  const unlockedScenes = useGameStore((s) => s.unlockedScenes)
  const inventory = useGameStore((s) => s.inventory)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const selectScene = useGameStore((s) => s.selectScene)

  const [order, setOrder] = useState(loadOrder)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  }, [order])

  if (!showDashboard) return null

  const period = PERIODS[currentPeriodIndex] || PERIODS[0]
  const world = WORLDS.find((w) => w.id === currentWorld)
  const chapter = getCurrentChapter(currentDay)
  const worldChars = currentWorld ? Object.values(getWorldCharacters(currentWorld)) : []
  const worldScenes = currentWorld ? Object.values(getWorldScenes(currentWorld)) : []
  const worldItems = currentWorld ? Object.values(getWorldItems(currentWorld)) : []

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'front':
        return (
          <div className={`${P}-dash-front`} key="front">
            <div className={`${P}-dash-front-left`}>
              <div className={`${P}-dash-front-badge`}>{currentDay}</div>
              <div className={`${P}-dash-front-meta`}>
                <div className={`${P}-dash-front-period`}>{period.icon} {period.name}</div>
                <div className={`${P}-dash-front-chapter`}>
                  {world?.icon} {world?.name} · {chapter?.name || ''}
                </div>
              </div>
            </div>
            <div className={`${P}-dash-front-right`}>
              <div className={`${P}-dash-front-ap`}>⚡ {actionPoints}</div>
              <div className={`${P}-dash-front-ap-label`}>行动点</div>
            </div>
          </div>
        )

      case 'soul':
        return (
          <div className={`${P}-dash-section`} key="soul">
            <div className={`${P}-dash-section-header`}>
              <span className={`${P}-dash-section-title`}>灵魂状态</span>
              <DragHandle />
            </div>
            <div className={`${P}-dash-soul-grid`}>
              <span className={`${P}-dash-soul-item ${P}-dash-soul-fragment`}>💎 碎片 {soulFragments}/4</span>
              <span className={`${P}-dash-soul-item ${P}-dash-soul-memory`}>💔 失忆 {lostMemories.length}段</span>
            </div>
            {lostMemories.length > 0 && (
              <div className={`${P}-dash-memory-list`}>
                {lostMemories.map((m, i) => <div key={i}>「{m}」</div>)}
              </div>
            )}
          </div>
        )

      case 'cast':
        return (
          <div className={`${P}-dash-section`} key="cast">
            <div className={`${P}-dash-section-header`}>
              <span className={`${P}-dash-section-title`}>角色</span>
              <DragHandle />
            </div>
            <div className={`${P}-dash-cast-scroll`}>
              {worldChars.map((char) => {
                const aff = characterStats[char.id]?.affection ?? 0
                return (
                  <div key={char.id} className={`${P}-dash-cast-card`} onClick={() => selectCharacter(char.id)}>
                    <img className={`${P}-dash-cast-img`} src={char.portrait} alt={char.name} style={{ borderColor: char.themeColor }} />
                    <div className={`${P}-dash-cast-name`}>{char.name}</div>
                    <div className={`${P}-dash-cast-bar`}>
                      <div className={`${P}-dash-cast-fill`} style={{ width: `${aff}%`, background: char.themeColor }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 'scenes':
        return (
          <div className={`${P}-dash-section`} key="scenes">
            <div className={`${P}-dash-section-header`}>
              <span className={`${P}-dash-section-title`}>场景</span>
              <DragHandle />
            </div>
            <div className={`${P}-dash-scene-scroll`}>
              {worldScenes.map((sc) => {
                const locked = !unlockedScenes.includes(sc.id)
                const active = sc.id === currentScene
                return (
                  <button key={sc.id}
                    className={`${P}-dash-scene-thumb ${active ? `${P}-dash-scene-active` : ''} ${locked ? `${P}-dash-scene-locked` : ''}`}
                    onClick={() => !locked && selectScene(sc.id)}>
                    <img src={sc.background} alt={sc.name} />
                    <div className={`${P}-dash-scene-label`}>{sc.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 'objectives':
        return (
          <div className={`${P}-dash-section`} key="objectives">
            <div className={`${P}-dash-section-header`}>
              <span className={`${P}-dash-section-title`}>目标</span>
              <DragHandle />
            </div>
            {chapter?.objectives ? chapter.objectives.map((obj, i) => (
              <div key={i} className={`${P}-dash-objective`}>
                <div className={`${P}-dash-objective-check`} />
                <span>{obj}</span>
              </div>
            )) : (
              <div className={`${P}-dash-empty`}>暂无目标</div>
            )}
          </div>
        )

      case 'items':
        return (
          <div className={`${P}-dash-section`} key="items">
            <div className={`${P}-dash-section-header`}>
              <span className={`${P}-dash-section-title`}>道具</span>
              <DragHandle />
            </div>
            <div className={`${P}-dash-item-grid`}>
              {worldItems.filter((item) => (inventory[item.id] || 0) > 0).map((item) => (
                <div key={item.id} className={`${P}-dash-item-cell`}>
                  <div className={`${P}-dash-item-count`}>x{inventory[item.id]}</div>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.name}</span>
                </div>
              ))}
              {worldItems.filter((item) => (inventory[item.id] || 0) > 0).length === 0 && (
                <div className={`${P}-dash-empty`} style={{ gridColumn: '1 / -1' }}>暂无道具</div>
              )}
            </div>
          </div>
        )

      case 'stats':
        return (
          <div className={`${P}-dash-section`} key="stats">
            <div className={`${P}-dash-section-header`}>
              <span className={`${P}-dash-section-title`}>属性</span>
              <DragHandle />
            </div>
            <div className={`${P}-dash-stat-pills`}>
              {GLOBAL_STATS.map((stat) => {
                const val = (playerStats as unknown as Record<string, number>)[stat.key] ?? stat.initial
                return (
                  <span key={stat.key} className={`${P}-dash-stat-pill`} style={{ color: stat.color, borderColor: `${stat.color}30` }}>
                    {stat.icon} {stat.label} {val}
                  </span>
                )
              })}
            </div>
          </div>
        )

      case 'music':
        return <MiniPlayer key="music" />

      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      {showDashboard && (
        <>
          <motion.div className={`${P}-dash-overlay`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleDashboard} />
          <motion.div className={`${P}-dash-drawer`} initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
            <div className={`${P}-dash-header`}>
              <span className={`${P}-dash-title`}>🪞 灵魂手帐</span>
              <button className={`${P}-dash-close`} onClick={toggleDashboard}><X size={14} /></button>
            </div>

            <div className={`${P}-dash-scroll`}>
              <Reorder.Group axis="y" values={order} onReorder={setOrder} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {order.map((sectionId) => (
                  <Reorder.Item key={sectionId} value={sectionId} style={{ listStyle: 'none' }}>
                    {renderSection(sectionId)}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Drag Handle ──

function DragHandle() {
  return (
    <span className={`${P}-dash-grip`}>
      <DotsSixVertical size={14} />
    </span>
  )
}

// ── Mini Player ──

function MiniPlayer() {
  const [playing, setPlaying] = useState(isBGMPlaying())

  return (
    <div className={`${P}-dash-mini-player`}>
      <span className={`${P}-dash-mini-note`}>♫</span>
      <span className={`${P}-dash-mini-title`}>千面情缘</span>
      <button className={`${P}-dash-mini-btn`} onClick={() => { toggleBGM(); setPlaying(!playing) }}>
        {playing ? <Pause size={12} weight="fill" /> : <Play size={12} weight="fill" />}
      </button>
    </div>
  )
}
