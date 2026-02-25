/**
 * [INPUT]: 依赖 store (inventory, characters, characterStats, activePanel)
 * [OUTPUT]: 对外提供 SidePanel 组件
 * [POS]: 右栏面板，背包+关系导航，被 App.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Package, Heart, X } from 'lucide-react'
import { useGameStore, ITEMS, getStatLevel } from '@/lib/store'
import type { Character, StatMeta } from '@/lib/store'

// ── 背包面板 ──

function InventoryPanel({ onClose }: { onClose: () => void }) {
  const { inventory, useItem } = useGameStore()

  const items = Object.entries(inventory)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ ...ITEMS[id], count }))
    .filter(Boolean)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 12 }} className="kc-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>🎒 背包</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>
      </div>
      {items.length === 0 ? (
        <div className="kc-placeholder"><div>背包空空如也</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => (
            <div key={item.id} className="kc-card" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                  {item.name}
                  {item.count > 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> x{item.count}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.description}</div>
              </div>
              {item.type === 'consumable' && (
                <button onClick={() => useItem(item.id)}
                  style={{ padding: '4px 8px', fontSize: 11, background: 'rgba(139,92,246,0.15)', border: '1px solid var(--primary-border)', borderRadius: 6, color: 'var(--primary)', cursor: 'pointer' }}>
                  使用
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 关系面板 ──

function RelationsPanel({ onClose }: { onClose: () => void }) {
  const { characters, characterStats, selectCharacter } = useGameStore()

  const sorted = Object.entries(characters).sort(([aId], [bId]) => {
    const aVal = characterStats[aId]?.affection ?? 0
    const bVal = characterStats[bId]?.affection ?? 0
    return bVal - aVal
  })

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 12 }} className="kc-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>💕 关系</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(([id, char]: [string, Character]) => {
          const stats = characterStats[id]
          const level = getStatLevel(stats?.affection ?? 0)
          return (
            <div key={id} className="kc-card" style={{ padding: 10, cursor: 'pointer' }}
              onClick={() => selectCharacter(id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: char.themeColor }}>{char.name}</span>
                <span style={{ fontSize: 10, color: level.color, background: 'rgba(139,92,246,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                  {level.name}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{char.title}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {char.statMetas.filter((m: StatMeta) => m.category === 'relation').map((m: StatMeta) => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <span>{m.icon}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    <span style={{ color: m.color, fontWeight: 600 }}>{stats?.[m.key] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 主面板 ──

export default function SidePanel() {
  const { activePanel, togglePanel, closePanel, inventory } = useGameStore()
  const itemCount = Object.values(inventory).reduce((s, n) => s + n, 0)

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* 面板内容 */}
      {activePanel && (
        <div style={{ width: 260, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          {activePanel === 'inventory' && <InventoryPanel onClose={closePanel} />}
          {activePanel === 'relations' && <RelationsPanel onClose={closePanel} />}
        </div>
      )}

      {/* 导航条 */}
      <div className="kc-nav-bar">
        <button className={`kc-nav-btn ${activePanel === 'inventory' ? 'active' : ''}`}
          onClick={() => togglePanel('inventory')} style={{ position: 'relative' }}>
          <Package size={18} />
          {itemCount > 0 && (
            <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, background: 'var(--primary)', color: 'white', borderRadius: '50%', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {itemCount}
            </span>
          )}
        </button>
        <button className={`kc-nav-btn ${activePanel === 'relations' ? 'active' : ''}`}
          onClick={() => togglePanel('relations')}>
          <Heart size={18} />
        </button>
      </div>
    </div>
  )
}
