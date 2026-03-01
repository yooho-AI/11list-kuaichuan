/**
 * [INPUT]: 依赖 store.ts 状态, DashboardDrawer, Tab组件
 * [OUTPUT]: 对外提供 AppShell 组件
 * [POS]: 游戏主框架: Header + Tab路由 + TabBar + 三向手势 + 双抽屉
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useGameStore,
  PERIODS,
  MAX_DAYS,
  WORLDS,
} from '@/lib/store'
import type { StoryRecord } from '@/lib/store'
import { toggleBGM } from '@/lib/bgm'
import {
  Notebook, Scroll, MusicNotes,
  List, ChatCircleDots, MapTrifold, Users,
} from '@phosphor-icons/react'
import DashboardDrawer from './dashboard-drawer'
import TabDialogue from './tab-dialogue'
import TabScene from './tab-scene'
import TabCharacter from './tab-character'

const P = 'kc'

export default function AppShell({ onMenuOpen }: { onMenuOpen: () => void }) {
  const activeTab = useGameStore((s) => s.activeTab)
  const setActiveTab = useGameStore((s) => s.setActiveTab)
  const toggleDashboard = useGameStore((s) => s.toggleDashboard)
  const toggleRecords = useGameStore((s) => s.toggleRecords)
  const showRecords = useGameStore((s) => s.showRecords)
  const currentDay = useGameStore((s) => s.currentDay)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const currentWorld = useGameStore((s) => s.currentWorld)
  const soulFragments = useGameStore((s) => s.soulFragments)
  const lostMemories = useGameStore((s) => s.lostMemories)
  const storyRecords = useGameStore((s) => s.storyRecords)

  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const [toastMsg] = useState('')

  // ── Three-way gesture ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = Math.abs(e.changedTouches[0].clientY - touchRef.current.y)
    touchRef.current = null

    if (Math.abs(dx) < 60 || dy > Math.abs(dx) * 1.5) return

    if (dx > 0) toggleDashboard()
    else toggleRecords()
  }, [toggleDashboard, toggleRecords])

  const period = PERIODS[currentPeriodIndex] || PERIODS[0]
  const world = WORLDS.find((w) => w.id === currentWorld)

  const TABS: Array<{ key: 'dialogue' | 'scene' | 'character'; label: string; icon: React.ReactNode }> = [
    { key: 'dialogue', label: '对话', icon: <ChatCircleDots size={20} weight="fill" /> },
    { key: 'scene', label: '场景', icon: <MapTrifold size={20} weight="fill" /> },
    { key: 'character', label: '人物', icon: <Users size={20} weight="fill" /> },
  ]

  return (
    <div className={`${P}-shell`}>
      {/* ── Header ── */}
      <header className={`${P}-header`}>
        <div className={`${P}-header-info`}>
          <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>
            {world?.icon} {world?.name} · 第{currentDay}/{MAX_DAYS}天
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {period.icon}{period.name} · 💎{soulFragments}/4 · 💔{lostMemories.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className={`${P}-header-btn`} onClick={() => toggleBGM()} title="音乐">
            <MusicNotes size={18} weight="fill" />
          </button>
          <button className={`${P}-header-btn`} onClick={onMenuOpen} title="菜单">
            <List size={20} />
          </button>
        </div>
      </header>

      {/* ── Tab Content ── */}
      <div
        className={`${P}-tab-content`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'dialogue' && (
            <motion.div key="dialogue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ height: '100%' }}>
              <TabDialogue />
            </motion.div>
          )}
          {activeTab === 'scene' && (
            <motion.div key="scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ height: '100%' }}>
              <TabScene />
            </motion.div>
          )}
          {activeTab === 'character' && (
            <motion.div key="character" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ height: '100%' }}>
              <TabCharacter />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── TabBar (5 items: 手帐 + 3 tabs + 记录) ── */}
      <nav className={`${P}-tab-bar`}>
        <button className={`${P}-tab-item`} onClick={toggleDashboard}>
          <span><Notebook size={20} weight="fill" /></span>
          <span style={{ fontSize: 10, marginTop: 2 }}>手帐</span>
        </button>
        {TABS.map((tab) => (
          <button key={tab.key} className={`${P}-tab-item ${activeTab === tab.key ? `${P}-tab-active` : ''}`} onClick={() => setActiveTab(tab.key)}>
            <span>{tab.icon}</span>
            <span style={{ fontSize: 10, marginTop: 2 }}>{tab.label}</span>
          </button>
        ))}
        <button className={`${P}-tab-item`} onClick={toggleRecords}>
          <span><Scroll size={20} weight="fill" /></span>
          <span style={{ fontSize: 10, marginTop: 2 }}>记录</span>
        </button>
      </nav>

      {/* ── Dashboard Drawer (Left) ── */}
      <DashboardDrawer />

      {/* ── Record Sheet (Right) ── */}
      <AnimatePresence>
        {showRecords && (
          <>
            <motion.div className={`${P}-records-overlay`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleRecords} />
            <motion.div className={`${P}-records-sheet`} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div className={`${P}-records-header`}>
                <span className={`${P}-records-title`}><Scroll size={16} /> 灵魂印记</span>
                <button className={`${P}-records-close`} onClick={toggleRecords}>✕</button>
              </div>
              <div className={`${P}-records-timeline`}>
                {[...storyRecords].reverse().map((record: StoryRecord) => (
                  <div key={record.id} className={`${P}-records-item`}>
                    <div className={`${P}-records-dot`} />
                    <div className={`${P}-records-body`}>
                      <div className={`${P}-records-meta`}>Day {record.day} · {record.period}</div>
                      <div className={`${P}-records-event-title`}>{record.title}</div>
                      <div className={`${P}-records-content`}>{record.content}</div>
                    </div>
                  </div>
                ))}
                {storyRecords.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                    旅途刚刚开始...
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div className={`${P}-toast`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
