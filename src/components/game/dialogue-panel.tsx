/**
 * [INPUT]: 依赖 store (messages, isTyping, streamingContent, sendMessage)
 * [OUTPUT]: 对外提供 DialoguePanel 组件
 * [POS]: 中栏对话面板，消息列表+输入区，被 App.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Package } from 'lucide-react'
import { useGameStore, STORY_INFO, PERIODS, MAX_DAYS } from '@/lib/store'
import { parseStoryParagraph } from '@/lib/parser'

// ── 介绍信卡片 ──

function LetterCard() {
  return (
    <div className="kc-card" style={{ padding: 24, textAlign: 'center', margin: '40px auto', maxWidth: 400 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🪞</div>
      <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500, marginBottom: 8 }}>灵魂契约</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{STORY_INFO.title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{STORY_INFO.goal}</p>
    </div>
  )
}

// ── 消息项 ──

function MessageItem({ msg }: { msg: { role: string; content: string } }) {
  if (msg.role === 'system') {
    return (
      <div style={{ textAlign: 'center', padding: '6px 16px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(139,92,246,0.06)', padding: '4px 12px', borderRadius: 12, lineHeight: 1.6, display: 'inline-block', whiteSpace: 'pre-line' }}>
          {msg.content}
        </span>
      </div>
    )
  }

  if (msg.role === 'user') {
    return <div className="kc-player-bubble">{msg.content}</div>
  }

  // assistant
  const { narrative, statHtml } = parseStoryParagraph(msg.content)
  return (
    <div className="kc-story-paragraph" style={{ padding: '4px 0' }}>
      <div dangerouslySetInnerHTML={{ __html: narrative }} />
      {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
    </div>
  )
}

// ── 流式消息 ──

function StreamingMessage({ content }: { content: string }) {
  if (!content) {
    return (
      <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 6, height: 6, background: 'var(--primary)', borderRadius: '50%',
            animation: `kcTypingBounce 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    )
  }
  const { narrative, statHtml } = parseStoryParagraph(content)
  return (
    <div className="kc-story-paragraph">
      <div dangerouslySetInnerHTML={{ __html: narrative }} />
      {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
    </div>
  )
}

// ── 主面板 ──

export default function DialoguePanel() {
  const { messages, isTyping, streamingContent, sendMessage, actionPoints, currentDay, currentPeriodIndex, togglePanel, inventory } = useGameStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const itemCount = Object.values(inventory).reduce((s, n) => s + n, 0)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    sendMessage(text)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 消息区 */}
      <div ref={scrollRef} className="kc-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && <LetterCard />}
        {messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)}
        {isTyping && <StreamingMessage content={streamingContent} />}
      </div>

      {/* 底部信息条 */}
      <div style={{ padding: '4px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
        <span>第{currentDay}/{MAX_DAYS}天 · {PERIODS[currentPeriodIndex].name} · ⚡{actionPoints}</span>
        <span style={{ color: 'var(--primary)', fontSize: 10 }}>每次发言推进一个时段</span>
      </div>

      {/* 输入区 */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <button onClick={() => togglePanel('inventory')}
          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, position: 'relative' }}>
          <Package size={16} />
          {itemCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: 'var(--primary)', color: 'white', borderRadius: '50%', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {itemCount}
            </span>
          )}
        </button>
        <textarea className="kc-input" rows={1} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="在这个世界里，你想做什么..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          style={{ resize: 'none', maxHeight: 80 }}
        />
        <button className="kc-send-btn" onClick={handleSend} disabled={!input.trim() || isTyping}
          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
