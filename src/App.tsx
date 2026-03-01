/**
 * [INPUT]: 依赖 zustand store, framer-motion, @phosphor-icons/react, AppShell
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 根组件，开场/世界选择/游戏/结局四态路由
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MusicNotes, SpeakerSlash, X, FloppyDisk, FolderOpen, ArrowsClockwise, Globe, Diamond, GameController } from '@phosphor-icons/react'
import { useGameStore, WORLDS, STORY_INFO, ENDINGS, ENDING_TYPE_MAP } from '@/lib/store'
import type { World } from '@/lib/store'
import { useBgm } from '@/lib/bgm'
import '@/styles/globals.css'
import '@/styles/opening.css'
import '@/styles/rich-cards.css'

import AppShell from '@/components/game/app-shell'

// ============================================================
// StartScreen
// ============================================================

function StartScreen() {
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>('unspecified')
  const [name, setName] = useState('')
  const { setPlayerInfo, initGame, loadGame, hasSave } = useGameStore()
  const { isPlaying, toggle } = useBgm()
  const canContinue = hasSave()

  const handleStart = () => {
    if (!name.trim()) return
    setPlayerInfo(gender, name.trim())
    initGame()
  }

  const handleContinue = () => {
    loadGame()
  }

  return (
    <div className="kc-start-bg">
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 520, margin: '0 auto', padding: '40px 20px' }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }} className="kc-mirror-ripple">🪞</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {STORY_INFO.title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {STORY_INFO.subtitle}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
            {STORY_INFO.description}
          </p>
        </div>

        {/* 性别选择 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>选择性别</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([['male', '♂ 男性'], ['female', '♀ 女性'], ['unspecified', '✦ 其他']] as const).map(([g, label]) => (
              <button key={g} onClick={() => setGender(g)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${gender === g ? 'var(--primary)' : 'var(--border)'}`,
                  background: gender === g ? 'rgba(139,92,246,0.15)' : 'rgba(26,16,48,0.5)',
                  color: gender === g ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: 14, fontWeight: gender === g ? 600 : 400,
                  transition: 'all 0.2s',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 姓名 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>你的名字</div>
          <input className="kc-input" placeholder="输入你在这个故事中的名字..."
            value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()} />
        </div>

        {/* 世界预览 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>四个世界等待你的到来</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {WORLDS.map((w) => (
              <div key={w.id} className="kc-card" style={{ padding: 12 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{w.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{w.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {w.description.slice(0, 30)}...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="kc-send-btn" onClick={handleStart}
            disabled={!name.trim()}
            style={{ width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 600 }}>
            签订契约，开始穿越
          </button>
          {canContinue && (
            <button className="kc-send-btn" onClick={handleContinue}
              style={{ width: '100%', padding: '10px 0', fontSize: 14, background: 'transparent', border: '1px solid var(--primary-border)' }}>
              继续旅程
            </button>
          )}
        </div>

        {/* 音乐 */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            {isPlaying ? <MusicNotes size={16} /> : <SpeakerSlash size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// WorldSelection
// ============================================================

function WorldSelection() {
  const { selectWorld, completedWorlds, soulFragments, lostMemories } = useGameStore()

  return (
    <div className="kc-start-bg">
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }} className="kc-mirror-ripple">🪞</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>灰色空间</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            灵魂碎片：{soulFragments}/4 · 失去的记忆：{lostMemories.length}段
          </p>
          {lostMemories.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              已遗失：{lostMemories.map((m, i) => <span key={i}>「{m}」</span>)}
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>选择你要前往的世界</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {WORLDS.map((w: World) => {
            const done = completedWorlds.includes(w.id)
            return (
              <motion.div key={w.id} whileHover={{ scale: done ? 1 : 1.01 }} whileTap={{ scale: done ? 1 : 0.99 }}
                className={`kc-world-card ${done ? 'completed' : ''}`}
                onClick={() => !done && selectWorld(w.id)}>
                <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ fontSize: 32, flexShrink: 0 }}>{w.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {w.name}
                      {done && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>✓ 已完成</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{w.description}</div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// EndingModal
// ============================================================

function EndingModal() {
  const { endingType, resetGame } = useGameStore()
  if (!endingType) return null
  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null
  const meta = ENDING_TYPE_MAP[ending.type] ?? { label: '结局', gradient: 'linear-gradient(135deg, #0a0a1a, #101030)' }

  const handleContinue = () => {
    useGameStore.setState({ endingType: null })
  }

  return (
    <motion.div className="kc-ending-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="kc-ending-modal"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ background: meta.gradient }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🪞</div>
        <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 8 }}>{meta.label}</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>{ending.name}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>{ending.description}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="kc-send-btn" onClick={resetGame} style={{ padding: '10px 28px' }}>
            重新开始
          </button>
          <button className="kc-send-btn" onClick={handleContinue}
            style={{ padding: '10px 28px', background: 'transparent', border: '1px solid var(--primary-border)' }}>
            继续探索
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// MenuOverlay
// ============================================================

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const { saveGame, loadGame, resetGame, completeWorld, currentWorld, characterStats, characters } = useGameStore()

  const canComplete = currentWorld && Object.entries(characterStats).some(
    ([id, stats]) => characters[id]?.worldId === currentWorld && (stats.affection ?? 0) >= 100
  )

  return (
    <motion.div className="kc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="kc-modal" onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>菜单</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="kc-send-btn" style={{ width: '100%', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
            onClick={() => { saveGame(); onClose() }}>
            <FloppyDisk size={16} weight="fill" style={{ marginRight: 6 }} /> 保存游戏
          </button>
          <button className="kc-send-btn" style={{ width: '100%', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
            onClick={() => { loadGame(); onClose() }}>
            <FolderOpen size={16} weight="fill" style={{ marginRight: 6 }} /> 读取存档
          </button>
          {canComplete && (
            <button className="kc-send-btn" style={{ width: '100%', background: 'rgba(139,92,246,0.3)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.3)' }}
              onClick={() => { completeWorld(); onClose() }}>
              <Diamond size={16} weight="fill" style={{ marginRight: 6 }} /> 回收灵魂碎片
            </button>
          )}
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          <button className="kc-send-btn" style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
            onClick={() => { resetGame(); onClose() }}>
            <ArrowsClockwise size={16} style={{ marginRight: 6 }} /> 重新开始
          </button>
          <button className="kc-send-btn" style={{ width: '100%', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
            onClick={() => window.open('https://yooho.ai/', '_blank')}>
            <Globe size={16} style={{ marginRight: 6 }} /> 返回主页
          </button>
          <button className="kc-send-btn" style={{ width: '100%', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onClick={onClose}>
            <GameController size={16} style={{ marginRight: 6 }} /> 继续游戏
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// App
// ============================================================

export default function App() {
  const { gameStarted, currentWorld, endingType } = useGameStore()
  const [showMenu, setShowMenu] = useState(false)

  // 未开始 → 开场页
  if (!gameStarted) return <StartScreen />

  // 未选世界 → 世界选择页
  if (!currentWorld) return <WorldSelection />

  return (
    <>
      <AppShell onMenuOpen={() => setShowMenu(true)} />

      <AnimatePresence>
        {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
        {endingType && <EndingModal />}
      </AnimatePresence>
    </>
  )
}
