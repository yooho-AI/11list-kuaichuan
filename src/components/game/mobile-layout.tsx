/**
 * [INPUT]: 依赖 store, parser, bgm
 * [OUTPUT]: 对外提供 MobileLayout 组件
 * [POS]: 移动端全屏布局，替代桌面三栏，被 App.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, Menu, Music, VolumeX, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { useGameStore, SCENES, WORLDS, PERIODS, MAX_DAYS, ITEMS, ENDINGS } from '@/lib/store'
import type { Character, StatMeta } from '@/lib/store'
import { parseStoryParagraph } from '@/lib/parser'
import { useBgm } from '@/lib/bgm'

const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '⭐ True Ending', color: '#ffd700', icon: '👑' },
  HE: { label: '🎉 Happy Ending', color: '#8b5cf6', icon: '🌟' },
  NE: { label: '🌙 Normal Ending', color: '#eab308', icon: '🪞' },
  BE: { label: '💀 Bad Ending', color: '#64748b', icon: '💔' },
}

// ── 移动端头部 ──

function MobileHeader({ onMenu, onChar, onScene }: { onMenu: () => void; onChar: () => void; onScene: () => void }) {
  const { currentDay, currentPeriodIndex, actionPoints, soulFragments, currentWorld, currentCharacter, characters } = useGameStore()
  const { isPlaying, toggle } = useBgm()
  const world = WORLDS.find((w) => w.id === currentWorld)
  const char = currentCharacter ? characters[currentCharacter] : null

  return (
    <div className="mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{world?.icon} {world?.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>D{currentDay}/{MAX_DAYS}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{PERIODS[currentPeriodIndex].icon}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>⚡{actionPoints}</span>
          <span style={{ fontSize: 10, color: '#8b5cf6' }} className="kc-soul-pulse">💎{soulFragments}/4</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={toggle} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 2, cursor: 'pointer' }}>
            {isPlaying ? <Music size={14} /> : <VolumeX size={14} />}
          </button>
          <button onClick={onMenu} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 2, cursor: 'pointer' }}>
            <Menu size={16} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button onClick={onChar} style={{
          flex: 1, padding: '4px 8px', borderRadius: 6, fontSize: 11,
          background: char ? `${char.themeColor}20` : 'rgba(139,92,246,0.08)',
          border: `1px solid ${char ? char.themeColor + '40' : 'var(--border)'}`,
          color: char ? char.themeColor : 'var(--text-muted)',
          cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <ChevronLeft size={12} />
          {char ? `${char.name} · ${char.title}` : '选择角色'}
        </button>
        <button onClick={onScene} style={{
          padding: '4px 8px', borderRadius: 6, fontSize: 11,
          background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          场景 <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ── 角色 Sheet ──

function CharacterSheet({ onClose }: { onClose: () => void }) {
  const { characters, characterStats, selectCharacter, currentCharacter } = useGameStore()

  return (
    <>
      <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="mobile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
        <div className="mobile-sheet-handle" />
        <div className="mobile-sheet-title">选择角色</div>
        <div className="mobile-char-grid">
          {Object.entries(characters).map(([id, char]: [string, Character]) => {
            const stats = characterStats[id]
            return (
              <div key={id} className={`mobile-char-card ${currentCharacter === id ? 'active' : ''}`}
                onClick={() => { selectCharacter(id); onClose() }}>
                <div className="mobile-char-name" style={{ color: char.themeColor }}>{char.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{char.title}</div>
                <div className="mobile-char-stats">
                  {char.statMetas.map((m: StatMeta) => (
                    <span key={m.key} style={{ color: m.color }}>{m.icon}{stats?.[m.key] ?? 0}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </>
  )
}

// ── 背包 Sheet ──

function InventorySheet({ onClose }: { onClose: () => void }) {
  const { inventory, useItem } = useGameStore()
  const items = Object.entries(inventory).filter(([, c]) => c > 0).map(([id, count]) => ({ ...ITEMS[id], count })).filter(Boolean)

  return (
    <>
      <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="mobile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
        <div className="mobile-sheet-handle" />
        <div className="mobile-sheet-title">🎒 背包</div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 ? <div className="kc-placeholder"><div>背包空空</div></div> : items.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, background: 'rgba(26,16,48,0.5)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name} {item.count > 1 && `x${item.count}`}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.description}</div>
              </div>
              {item.type === 'consumable' && (
                <button onClick={() => useItem(item.id)} style={{ padding: '4px 8px', fontSize: 11, background: 'rgba(139,92,246,0.15)', border: '1px solid var(--primary-border)', borderRadius: 6, color: 'var(--primary)', cursor: 'pointer' }}>
                  使用
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </>
  )
}

// ── 菜单 ──

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { saveGame, loadGame, resetGame, completeWorld, currentWorld, characterStats, characters } = useGameStore()
  const canComplete = currentWorld && Object.entries(characterStats).some(
    ([id, stats]) => characters[id]?.worldId === currentWorld && (stats.affection ?? 0) >= 100
  )

  return (
    <motion.div className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>🪞 菜单</h3>
      <button className="mobile-menu-btn" onClick={() => { saveGame(); onClose() }}>💾 保存</button>
      <button className="mobile-menu-btn" onClick={() => { loadGame(); onClose() }}>📂 读档</button>
      {canComplete && (
        <button className="mobile-menu-btn" style={{ borderColor: 'rgba(255,215,0,0.3)', color: '#ffd700' }}
          onClick={() => { completeWorld(); onClose() }}>💎 回收灵魂碎片</button>
      )}
      <button className="mobile-menu-btn" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
        onClick={() => { resetGame(); onClose() }}>🔄 重置</button>
      <button className="mobile-menu-btn" onClick={() => window.open('https://yooho.ai/', '_blank')}>🌐 返回主页</button>
      <button className="mobile-menu-btn" onClick={onClose}>继续游戏</button>
    </motion.div>
  )
}

// ── 结局 Sheet ──

function EndingSheet() {
  const { endingType, resetGame } = useGameStore()
  if (!endingType) return null
  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null
  const meta = ENDING_TYPE_MAP[ending.type] ?? ENDING_TYPE_MAP.NE

  return (
    <motion.div className="kc-ending-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{meta.icon}</div>
        <div style={{ fontSize: 12, color: meta.color, fontWeight: 600, marginBottom: 8 }}>{meta.label}</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: meta.color }}>{ending.name}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>{ending.description}</p>
        <button className="kc-send-btn" onClick={resetGame} style={{ padding: '10px 28px' }}>重新开始</button>
      </div>
    </motion.div>
  )
}

// ── 主布局 ──

export default function MobileLayout() {
  const { messages, isTyping, streamingContent, sendMessage, endingType } = useGameStore()
  const [input, setInput] = useState('')
  const [showChar, setShowChar] = useState(false)
  const [showInv, setShowInv] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showScene, setShowScene] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, streamingContent])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    sendMessage(text)
  }

  return (
    <div className="mobile-game">
      <MobileHeader onMenu={() => setShowMenu(true)} onChar={() => setShowChar(true)} onScene={() => setShowScene(true)} />

      {/* 对话区 */}
      <div ref={scrollRef} className="mobile-dialogue kc-scrollbar">
        {messages.length === 0 && (
          <div className="mobile-letter-card">
            <div style={{ fontSize: 28, marginBottom: 8 }}>🪞</div>
            <div style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 4 }}>灵魂契约</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>在这个世界里，你的故事即将开始...</div>
          </div>
        )}
        {messages.map((msg) => {
          if (msg.role === 'system') return <div key={msg.id} className="mobile-msg-system">{msg.content}</div>
          if (msg.role === 'user') return <div key={msg.id} className="mobile-bubble-user">{msg.content}</div>
          const { narrative, statHtml } = parseStoryParagraph(msg.content)
          return (
            <div key={msg.id} className="mobile-bubble-ai kc-story-paragraph">
              <div dangerouslySetInnerHTML={{ __html: narrative }} />
              {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
            </div>
          )
        })}
        {isTyping && (
          streamingContent ? (
            <div className="mobile-bubble-ai kc-story-paragraph">
              <div dangerouslySetInnerHTML={{ __html: parseStoryParagraph(streamingContent).narrative }} />
            </div>
          ) : (
            <div className="mobile-typing">
              <div className="mobile-typing-dot" />
              <div className="mobile-typing-dot" />
              <div className="mobile-typing-dot" />
            </div>
          )
        )}
      </div>

      {/* 输入栏 */}
      <div className="mobile-input-bar">
        <div className="mobile-input-form">
          <button onClick={() => setShowInv(true)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
            <Package size={14} />
          </button>
          <textarea className="mobile-input" rows={1} value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="你想做什么..."
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          />
          <button className="mobile-send-btn" onClick={handleSend} disabled={!input.trim() || isTyping}>
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Sheets */}
      <AnimatePresence>
        {showChar && <CharacterSheet onClose={() => setShowChar(false)} />}
        {showInv && <InventorySheet onClose={() => setShowInv(false)} />}
        {showScene && <SceneSheet onClose={() => setShowScene(false)} />}
        {showMenu && <MobileMenu onClose={() => setShowMenu(false)} />}
      </AnimatePresence>
      {endingType && <EndingSheet />}
    </div>
  )
}

// ── 场景 Sheet ──

function SceneSheet({ onClose }: { onClose: () => void }) {
  const { currentScene, selectScene, currentWorld } = useGameStore()
  const scenes = Object.values(SCENES).filter((s) => s.worldId === currentWorld && s.id !== 'grayspace')

  return (
    <>
      <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="mobile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
        <div className="mobile-sheet-handle" />
        <div className="mobile-sheet-title">选择场景</div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scenes.map((s) => (
            <div key={s.id} onClick={() => { selectScene(s.id); onClose() }}
              style={{
                padding: 12, borderRadius: 10, cursor: 'pointer',
                background: s.id === currentScene ? 'rgba(139,92,246,0.15)' : 'rgba(26,16,48,0.5)',
                border: `1px solid ${s.id === currentScene ? 'var(--primary)' : 'var(--border)'}`,
                transition: 'all 0.2s',
              }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.icon} {s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.atmosphere}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
