/**
 * [INPUT]: 依赖 store.ts 状态（角色/属性/全局属性）
 * [OUTPUT]: 对外提供 TabCharacter 组件
 * [POS]: 人物Tab：全局属性 + SVG关系图 + 角色网格 + 全屏档案
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGameStore,
  GLOBAL_STATS,
  getWorldCharacters,
  getStatLevel,
  type Character,
} from '@/lib/store'
import { X } from '@phosphor-icons/react'

const P = 'kc'

// ── Relation Graph (SVG) ────────────────────────────

function RelationGraph({
  characters,
  characterStats,
  playerName,
  onSelect,
}: {
  characters: Character[]
  characterStats: Record<string, Record<string, number>>
  playerName: string
  onSelect: (id: string) => void
}) {
  const cx = 150
  const cy = 150
  const radius = 110

  return (
    <div className={`${P}-relation-wrap`}>
      <div className={`${P}-relation-svg`}>
        <svg viewBox="0 0 300 300">
          {/* Center node */}
          <circle cx={cx} cy={cy} r={28} fill="var(--bg-card)" stroke="var(--primary)" strokeWidth={2} />
          <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--primary)" fontSize={12} fontWeight={600}>
            {playerName || '我'}
          </text>

          {characters.map((char, i) => {
            const angle = (i / characters.length) * Math.PI * 2 - Math.PI / 2
            const nx = cx + radius * Math.cos(angle)
            const ny = cy + radius * Math.sin(angle)
            const aff = characterStats[char.id]?.affection ?? 0
            const relation = getStatLevel(aff)

            return (
              <g key={char.id} onClick={() => onSelect(char.id)} style={{ cursor: 'pointer' }}>
                <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={char.themeColor} strokeWidth={1.5} opacity={0.4} />
                <text x={(cx + nx) / 2} y={(cy + ny) / 2 - 6} textAnchor="middle" fill={char.themeColor} fontSize={9} fontWeight={500}>
                  {relation.name}
                </text>
                <circle cx={nx} cy={ny} r={22} fill="var(--bg-card)" stroke={char.themeColor} strokeWidth={2} />
                <clipPath id={`clip-${char.id}`}>
                  <circle cx={nx} cy={ny} r={20} />
                </clipPath>
                <image
                  href={char.portrait}
                  x={nx - 20} y={ny - 20}
                  width={40} height={40}
                  clipPath={`url(#clip-${char.id})`}
                  preserveAspectRatio="xMidYMin slice"
                />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── Character Dossier (Full-screen) ─────────────────

function CharacterDossier({
  char,
  stats,
  onClose,
}: {
  char: Character
  stats: Record<string, number>
  onClose: () => void
}) {
  const aff = stats.affection ?? 0
  const trust = stats.trust ?? 0
  const favorStage = getStatLevel(aff)

  return (
    <motion.div
      className={`${P}-dossier-overlay`}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Portrait */}
      <div className={`${P}-dossier-portrait`}>
        <img src={char.portrait} alt={char.name} />
        <div className={`${P}-dossier-gradient`} />
        <button className={`${P}-dossier-close`} onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className={`${P}-dossier-content`}>
        <div className={`${P}-dossier-name`}>{char.name}</div>
        <div className={`${P}-dossier-subtitle`}>{char.title} · {char.age}岁</div>

        {/* Favor stage */}
        <div className={`${P}-dossier-stage`}>
          <div className={`${P}-dossier-stage-label`}>关系阶段</div>
          <div className={`${P}-dossier-stage-name`}>{favorStage.name}</div>
        </div>

        {/* Stat bars */}
        <div className={`${P}-dossier-stats`}>
          <div className={`${P}-dossier-stat-row`}>
            <span className={`${P}-dossier-stat-label`}>好感</span>
            <div className={`${P}-dossier-stat-track`}>
              <div className={`${P}-dossier-stat-fill`} style={{ width: `${aff}%` }} />
            </div>
            <span className={`${P}-dossier-stat-val`}>{aff}</span>
          </div>
          <div className={`${P}-dossier-stat-row`}>
            <span className={`${P}-dossier-stat-label`}>信任</span>
            <div className={`${P}-dossier-stat-track`}>
              <div className={`${P}-dossier-stat-fill`} style={{ width: `${trust}%` }} />
            </div>
            <span className={`${P}-dossier-stat-val`}>{trust}</span>
          </div>
        </div>

        {/* Description */}
        <div className={`${P}-dossier-desc`}>{char.description}</div>

        {/* Tags */}
        <div className={`${P}-dossier-tags`}>
          {char.personality.split('，').slice(0, 4).map((tag, i) => (
            <span key={i} className={`${P}-dossier-tag`}>{tag.replace(/[、,]/g, '')}</span>
          ))}
        </div>

        {/* Secret (unlocked at high favor) */}
        {aff >= 60 && (
          <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: 'rgba(var(--primary-rgb), 0.06)',
            border: '1px solid rgba(var(--primary-rgb), 0.15)',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>🔓 隐藏秘密</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
              {char.secret}
            </div>
          </div>
        )}

        {/* Speaking style */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: 'rgba(var(--primary-rgb), 0.04)',
          border: '1px solid rgba(var(--primary-rgb), 0.08)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>说话风格</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {char.speakingStyle}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════════════

export default function TabCharacter() {
  const currentWorld = useGameStore((s) => s.currentWorld)
  const playerName = useGameStore((s) => s.playerName)
  const playerStats = useGameStore((s) => s.playerStats)
  const characterStats = useGameStore((s) => s.characterStats)
  const selectCharacter = useGameStore((s) => s.selectCharacter)

  const [dossierCharId, setDossierCharId] = useState<string | null>(null)

  const worldChars = currentWorld ? Object.values(getWorldCharacters(currentWorld)) : []

  const handleSelectChar = (id: string) => {
    setDossierCharId(id)
  }

  const handleCloseDossier = () => {
    setDossierCharId(null)
  }

  const handleNavToChat = (id: string) => {
    setDossierCharId(null)
    selectCharacter(id)
  }

  const dossierChar = worldChars.find((c) => c.id === dossierCharId)

  return (
    <div className={`${P}-scrollbar`} style={{ height: '100%', overflow: 'auto', padding: 12 }}>

      {/* ── 全局属性 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
        玩家属性
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
        {GLOBAL_STATS.map((stat) => {
          const val = (playerStats as unknown as Record<string, number>)[stat.key] ?? stat.initial
          return (
            <div key={stat.key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 16 }}>{stat.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stat.label}</div>
                <div style={{
                  height: 4, borderRadius: 2, marginTop: 3,
                  background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${val}%`, background: stat.color,
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: stat.color }}>{val}</span>
            </div>
          )
        })}
      </div>

      {/* ── SVG 关系图 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
        人物关系
      </h4>
      <RelationGraph
        characters={worldChars}
        characterStats={characterStats}
        playerName={playerName}
        onSelect={handleSelectChar}
      />

      {/* ── 角色网格 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, marginTop: 8 }}>
        当前世界角色
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {worldChars.map((char) => {
          const aff = characterStats[char.id]?.affection ?? 0
          return (
            <div key={char.id} onClick={() => handleSelectChar(char.id)}
              style={{
                borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                transition: 'all 0.2s',
              }}>
              <img src={char.portrait} alt={char.name}
                style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'center top' }} />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: char.themeColor, marginBottom: 2 }}>
                  {char.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {char.title}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, color: 'var(--text-secondary)',
                }}>
                  <span>❤️ {aff}</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>{getStatLevel(aff).name}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Chat with character button ── */}
      {worldChars.map((char) => (
        <button key={char.id} onClick={() => handleNavToChat(char.id)}
          style={{
            display: 'none', // Hidden — characters accessed via dossier or click
          }}>
          Chat with {char.name}
        </button>
      ))}

      <div style={{ height: 16 }} />

      {/* ── Dossier ── */}
      <AnimatePresence>
        {dossierChar && (
          <CharacterDossier
            char={dossierChar}
            stats={characterStats[dossierChar.id] || { affection: 0, trust: 0 }}
            onClose={handleCloseDossier}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
