/**
 * [INPUT]: 依赖 store (characters, scenes, stats, playerStats)
 * [OUTPUT]: 对外提供 CharacterPanel 组件
 * [POS]: 左栏面板，场景+立绘+信息+角色列表，被 App.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useGameStore, SCENES, getStatLevel } from '@/lib/store'
import type { Character, StatMeta } from '@/lib/store'

// ── 数值条 ──

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
      <span style={{ width: 16, textAlign: 'center' }}>{icon}</span>
      <span style={{ width: 28, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'rgba(139,92,246,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ width: 24, textAlign: 'right', color, fontWeight: 500, fontSize: 11 }}>{value}</span>
    </div>
  )
}

// ── 玩家属性区 ──

function PlayerStatsBar() {
  const { playerStats } = useGameStore()
  const stats = [
    { key: 'beauty', label: '颜值', icon: '✨', color: '#f48fb1' },
    { key: 'wisdom', label: '智慧', icon: '📚', color: '#7986cb' },
    { key: 'stamina', label: '体力', icon: '💪', color: '#81c784' },
    { key: 'charm', label: '魅力', icon: '💜', color: '#ce93d8' },
    { key: 'luck', label: '运气', icon: '🍀', color: '#ffd54f' },
  ]
  return (
    <div className="kc-info-card" style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>📊 你的属性</div>
      {stats.map((s) => (
        <StatBar key={s.key} label={s.label} value={playerStats[s.key as keyof typeof playerStats]} color={s.color} icon={s.icon} />
      ))}
    </div>
  )
}

// ── 主面板 ──

export default function CharacterPanel() {
  const { currentScene, currentCharacter, characters, characterStats, selectCharacter, selectScene, currentWorld } = useGameStore()
  const scene = SCENES[currentScene]
  const char = currentCharacter ? characters[currentCharacter] : null

  // 当前世界场景
  const worldScenes = Object.values(SCENES).filter(
    (s) => s.worldId === currentWorld || s.worldId === 'universal'
  )

  return (
    <div className="kc-scrollbar" style={{ flex: 1, overflow: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 场景卡片 */}
      <div className="kc-scene-card">
        <img src={scene?.background} alt={scene?.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="scene-label">
          <span>{scene?.icon}</span>
          <span>{scene?.name}</span>
        </div>
      </div>

      {/* 场景选择 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {worldScenes.filter((s) => s.id !== 'grayspace').map((s) => (
          <button key={s.id} onClick={() => selectScene(s.id)}
            style={{
              padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              border: `1px solid ${s.id === currentScene ? 'var(--primary)' : 'var(--border)'}`,
              background: s.id === currentScene ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: s.id === currentScene ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      {/* 角色立绘 */}
      <div className="kc-portrait-card">
        {char ? (
          <img src={char.fullImage} alt={char.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="kc-placeholder" style={{ height: '100%' }}>
            <div style={{ fontSize: 28 }}>🪞</div>
            <div>选择一位角色开始对话</div>
          </div>
        )}
      </div>

      {/* 角色信息 */}
      {char && (
        <div className="kc-info-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: char.themeColor }}>{char.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(139,92,246,0.1)', padding: '2px 6px', borderRadius: 4 }}>
              {getStatLevel(characterStats[char.id]?.affection ?? 0).name}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            {char.age}岁 · {char.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
            {char.description.slice(0, 60)}...
          </div>
          {/* 数值条 */}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>🤝 关系</div>
          {char.statMetas.map((meta: StatMeta) => (
            <StatBar key={meta.key} label={meta.label} value={characterStats[char.id]?.[meta.key] ?? 0}
              color={meta.color} icon={meta.icon} />
          ))}
        </div>
      )}

      {/* 玩家属性 */}
      <PlayerStatsBar />

      {/* 角色列表 */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>角色列表</div>
      <div className="kc-char-list">
        {Object.entries(characters).map(([id, c]: [string, Character]) => (
          <div key={id} className={`kc-char-item ${currentCharacter === id ? 'active' : ''}`}
            onClick={() => selectCharacter(id)}>
            <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>
              {c.gender === 'male' ? '👤' : '👤'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: c.themeColor }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
              {c.statMetas.filter((m: StatMeta) => m.category === 'relation').map((m: StatMeta) => (
                <span key={m.key} style={{ color: m.color }}>
                  {m.icon}{characterStats[id]?.[m.key] ?? 0}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
