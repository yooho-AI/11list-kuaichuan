/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 track* 系列函数
 * [POS]: lib 的 Umami 埋点模块，被 store.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const PREFIX = 'kc_'

function trackEvent(name: string, data?: Record<string, string | number>) {
  try {
    ;(window as never as Record<string, { track: (n: string, d?: Record<string, string | number>) => void }>).umami?.track(PREFIX + name, data)
  } catch { /* 静默 */ }
}

// ── 通用事件 ──
export const trackGameStart = () => trackEvent('game_start')
export const trackGameContinue = () => trackEvent('game_continue')
export const trackTimeAdvance = (day: number, period: string) =>
  trackEvent('time_advance', { day, period })
export const trackChapterEnter = (chapter: number) =>
  trackEvent('chapter_enter', { chapter })
export const trackEndingReached = (ending: string) =>
  trackEvent('ending_reached', { ending })

// ── 快穿专属事件 ──
export const trackPlayerCreate = (gender: string, name: string) =>
  trackEvent('player_create', { gender, name })
export const trackWorldSelect = (world: string) =>
  trackEvent('world_select', { world })
export const trackWorldComplete = (world: string, fragments: number) =>
  trackEvent('world_complete', { world, fragments })
export const trackMemoryLost = (count: number) =>
  trackEvent('memory_lost', { count })
