/**
 * [INPUT]: 依赖 zustand, immer, ./stream, ./data
 * [OUTPUT]: 对外提供 useGameStore hook 及 data.ts 全部导出
 * [POS]: lib 状态管理中枢，驱动四世界快穿系统的状态流转
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { streamChat, chat } from './stream'
import {
  type Character, type CharacterStats, type Message,
  WORLDS, SCENES, ITEMS,
  MAX_ACTION_POINTS, MAX_DAYS, PERIODS,
  getWorldCharacters, getStatLevel,
  getCurrentChapter, getDayEvents, getWorldScenes, getWorldItems,
} from './data'
import {
  trackGameStart, trackGameContinue, trackPlayerCreate,
  trackChapterEnter, trackEndingReached,
} from './analytics'

// ============================================================
// 类型
// ============================================================

interface PlayerStats {
  beauty: number
  wisdom: number
  stamina: number
  charm: number
  luck: number
}

interface GameState {
  gameStarted: boolean
  playerGender: 'male' | 'female' | 'unspecified'
  playerName: string

  // 世界系统
  currentWorld: string | null
  completedWorlds: string[]
  soulFragments: number
  lostMemories: string[]

  // 玩家属性
  playerStats: PlayerStats

  // 当前世界状态
  characters: Record<string, Character>
  currentDay: number
  currentPeriodIndex: number
  actionPoints: number
  currentScene: string
  currentCharacter: string | null
  characterStats: Record<string, CharacterStats>
  unlockedScenes: string[]

  currentChapter: number
  triggeredEvents: string[]
  inventory: Record<string, number>

  // 消息
  messages: Message[]
  historySummary: string
  isTyping: boolean
  streamingContent: string

  // 结局
  endingType: string | null
  activePanel: 'inventory' | 'relations' | null
}

interface GameActions {
  setPlayerInfo: (gender: 'male' | 'female' | 'unspecified', name: string) => void
  initGame: () => void
  selectWorld: (worldId: string) => void
  selectCharacter: (id: string | null) => void
  selectScene: (id: string) => void
  togglePanel: (panel: 'inventory' | 'relations') => void
  closePanel: () => void
  sendMessage: (text: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  checkEnding: () => void
  completeWorld: () => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => boolean
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

// ============================================================
// 辅助
// ============================================================

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'kuaichuan-save-v1'

const MEMORY_POOL = [
  '童年夏天在院子里追蝴蝶的午后',
  '第一次学会骑自行车时的欢笑',
  '某个人温暖的微笑，但你想不起那是谁',
  '雨天窗边读书的宁静时光',
  '一首曾经很喜欢的歌，旋律已经模糊',
  '毕业典礼上朋友们的拥抱',
  '深夜与某人通话时的心跳加速',
  '最喜欢的那道菜的味道',
]

// ============================================================
// 数值解析（双轨模式）
// ============================================================

interface StatChangeResult {
  charChanges: Array<{ charId: string; stat: string; delta: number }>
  globalChanges: Array<{ key: string; delta: number }>
}

function parseStatChanges(
  content: string,
  characters: Record<string, Character>,
): StatChangeResult {
  const charChanges: StatChangeResult['charChanges'] = []
  const globalChanges: StatChangeResult['globalChanges'] = []

  // 名称→ID 映射
  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
    // 支持姓氏简写
    if (char.name.length >= 2) nameToId[char.name.slice(0, 1)] = id
  }

  // 标签→key 映射
  const labelToKey: Record<string, { charId: string; key: string }[]> = {}
  for (const [charId, char] of Object.entries(characters)) {
    for (const meta of char.statMetas) {
      const labels = [meta.label, meta.label + '度', meta.label + '值']
      for (const label of labels) {
        if (!labelToKey[label]) labelToKey[label] = []
        labelToKey[label].push({ charId, key: meta.key })
      }
    }
  }

  // 全局资源别名
  const GLOBAL_ALIASES: Record<string, string> = {
    '颜值': 'beauty', '智慧': 'wisdom', '体力': 'stamina',
    '魅力': 'charm', '运气': 'luck',
    '灵魂碎片': 'soulFragments',
  }

  const regex = /[【\[]([^\]】]+)[】\]]\s*(\S+?)([+-])(\d+)/g
  let match
  while ((match = regex.exec(content))) {
    const [, context, statLabel, sign, numStr] = match
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)

    const globalKey = GLOBAL_ALIASES[statLabel] || GLOBAL_ALIASES[context]
    if (globalKey) {
      globalChanges.push({ key: globalKey, delta })
      continue
    }

    const charId = nameToId[context]
    if (charId) {
      const entries = labelToKey[statLabel]
      const entry = entries?.find((e) => e.charId === charId) || entries?.[0]
      if (entry) {
        charChanges.push({ charId: entry.charId, stat: entry.key, delta })
      }
    }
  }

  return { charChanges, globalChanges }
}

// ============================================================
// System Prompt 构建
// ============================================================

function buildSystemPrompt(state: GameState): string {
  const world = WORLDS.find((w) => w.id === state.currentWorld)
  const char = state.currentCharacter ? state.characters[state.currentCharacter] : null
  const chapter = getCurrentChapter(state.currentDay)
  const sceneObj = SCENES[state.currentScene]
  const ps = state.playerStats

  const genderLabel = state.playerGender === 'male' ? '男' : state.playerGender === 'female' ? '女' : '未指定'

  return `## 世界观
你是轮回之镜的器灵，引导玩家完成灵魂契约。玩家死后灵魂碎裂成四片，散落在四个世界。
当前世界：${world?.name ?? '灰色空间'} — ${world?.atmosphere ?? ''}

## 核心设定
- 四位男主是因执念困在轮回边缘的灵魂，玩家让他们真心爱上自己才能回收碎片
- 每回收一个碎片，玩家失去一段记忆（已失去${state.lostMemories.length}段）
- 已收集灵魂碎片：${state.soulFragments}/4

## 叙述风格
- 在世界中你是客观旁白，描述场景/动作/心理，不直接参与剧情
- 每段回复 200-400 字，文学性描写，营造沉浸感
- 角色对话格式：【角色名】"对话内容"（语气动作描写）
- 数值变化必须在回复末尾标注：【角色名 好感+N】【角色名 信任+N】
- 玩家属性变化：【颜值+N】【智慧+N】【体力+N】【魅力+N】【运气+N】
- 环境描写用（括号）标注

## 玩家信息
「${state.playerName}」，性别${genderLabel}
属性：颜值${ps.beauty} 智慧${ps.wisdom} 体力${ps.stamina} 魅力${ps.charm} 运气${ps.luck}

## 当前章节
第${chapter.id}章「${chapter.name}」(第${chapter.dayRange[0]}-${chapter.dayRange[1]}天)
${chapter.description}
目标：${chapter.objectives.join('、')}

## 当前场景
${sceneObj?.name ?? '未知'}: ${sceneObj?.atmosphere ?? ''}

${char ? `## 当前交互角色
${char.name}（${char.title}）— ${char.themeColor}
性格：${char.personality}
说话风格：${char.speakingStyle}
行为模式：${char.behaviorPatterns}
秘密：${char.secret}
雷点：${char.triggerPoints.join('、')}

当前数值：
${char.statMetas.map((m) => {
  const val = state.characterStats[char.id]?.[m.key] ?? 0
  const level = getStatLevel(val)
  return `${m.icon} ${m.label}: ${val}/100 (${level.name})`
}).join('\n')}

## 好感度等级行为准则
- 0-30疏离期：${char.id.includes('jingyan') || char.id.includes('luye') || char.id.includes('wushang') || char.id.includes('jianghan') ? '冷漠戒备，冷嘲热讽，直接拒绝' : char.id.includes('wujiu') || char.id.includes('mobai') || char.id.includes('wuchen') || char.id.includes('mubai') ? '友善温和，主动关心帮助' : char.id.includes('qingci') || char.id.includes('yanxi') || char.id.includes('xinghe') || char.id.includes('guye') ? '玩味调侃，好奇试探' : '礼貌疏离，保持距离'}
- 31-60观察/好奇期：开始关注，偶尔主动接近，以各种借口帮忙
- 61-80接纳/守护期：接纳进入生活，展现真实一面，愿意分享秘密
- 81-100倾心/占有期：深爱，情绪因玩家波动，为玩家可以做任何事` : ''}

## 时间
第${state.currentDay}天/${MAX_DAYS}天 · ${PERIODS[state.currentPeriodIndex].name}
剩余行动点：${state.actionPoints}/${MAX_ACTION_POINTS}`
}

// ============================================================
// Store
// ============================================================

export const useGameStore = create<GameStore>()(immer((set, get) => ({
  // ── 初始状态 ──
  gameStarted: false,
  playerGender: 'unspecified' as const,
  playerName: '',

  currentWorld: null,
  completedWorlds: [],
  soulFragments: 0,
  lostMemories: [],

  playerStats: { beauty: 80, wisdom: 85, stamina: 70, charm: 85, luck: 50 },

  characters: {},
  currentDay: 1,
  currentPeriodIndex: 0,
  actionPoints: MAX_ACTION_POINTS,
  currentScene: 'grayspace',
  currentCharacter: null,
  characterStats: {},
  unlockedScenes: [],

  currentChapter: 1,
  triggeredEvents: [],
  inventory: { detector: 1 },

  messages: [],
  historySummary: '',
  isTyping: false,
  streamingContent: '',
  endingType: null,
  activePanel: null,

  // ── 玩家设置 ──
  setPlayerInfo: (gender, name) => set((s) => {
    s.playerGender = gender
    s.playerName = name
  }),

  // ── 初始化游戏 ──
  initGame: () => {
    const state = get()
    trackGameStart()
    trackPlayerCreate(state.playerGender, state.playerName)
    set((s) => { s.gameStarted = true })
  },

  // ── 选择世界 ──
  selectWorld: (worldId: string) => {
    const chars = getWorldCharacters(worldId)
    const scenes = getWorldScenes(worldId)
    const sceneIds = Object.keys(scenes)
    const firstScene = sceneIds.find((s) => s !== 'grayspace') ?? sceneIds[0]

    // 初始化角色数值
    const stats: Record<string, CharacterStats> = {}
    for (const [id, char] of Object.entries(chars)) {
      stats[id] = { ...char.initialStats }
    }

    set((s) => {
      s.currentWorld = worldId
      s.characters = chars
      s.characterStats = stats
      s.currentScene = firstScene
      s.currentCharacter = null
      s.unlockedScenes = sceneIds
      s.currentDay = 1
      s.currentPeriodIndex = 0
      s.actionPoints = MAX_ACTION_POINTS
      s.currentChapter = 1
      s.triggeredEvents = []
      s.messages = []
      s.historySummary = ''
      s.endingType = null

      // 世界道具初始化
      const worldItems = getWorldItems(worldId)
      s.inventory = { detector: 1 }
      for (const item of Object.values(worldItems)) {
        if (item.type === 'consumable' && item.worldId === 'universal') {
          s.inventory[item.id] = s.inventory[item.id] ?? 0
        }
      }
    })

    const world = WORLDS.find((w) => w.id === worldId)
    get().addSystemMessage(
      `🌀 你踏入了「${world?.name}」的世界...\n${world?.description}\n\n灵魂碎片探测器微微震动，碎片就在这个世界中。你有 ${MAX_DAYS} 天的时间。`
    )
    trackChapterEnter(1)
  },

  // ── 角色/场景选择 ──
  selectCharacter: (id) => set((s) => { s.currentCharacter = id }),
  selectScene: (id) => set((s) => { s.currentScene = id; s.currentCharacter = null }),

  // ── 面板切换 ──
  togglePanel: (panel) => set((s) => {
    s.activePanel = s.activePanel === panel ? null : panel
  }),
  closePanel: () => set((s) => { s.activePanel = null }),

  // ── 发送消息 ──
  sendMessage: async (text: string) => {
    set((s) => {
      s.messages.push({ id: makeId(), role: 'user', content: text, timestamp: Date.now() })
      s.isTyping = true
      s.streamingContent = ''
    })

    try {
      // 历史压缩
      const state = get()
      if (state.messages.length > 15 && !state.historySummary) {
        const summary = await chat([
          { role: 'system', content: '将以下对话压缩为200字以内的摘要，保留关键剧情和数值变化：' },
          ...state.messages.slice(0, -5).map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
        ])
        set((s) => { s.historySummary = summary })
      }

      // 构建 API 消息
      const systemPrompt = buildSystemPrompt(get())
      const apiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...(get().historySummary ? [{ role: 'system' as const, content: `历史摘要: ${get().historySummary}` }] : []),
        ...get().messages.slice(-10).map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      ]

      // 流式请求
      let fullContent = ''
      await streamChat(apiMessages, (chunk) => {
        fullContent += chunk
        set((s) => { s.streamingContent = fullContent })
      }, () => {})

      // 解析数值变化
      const { charChanges, globalChanges } = parseStatChanges(fullContent, get().characters)
      set((s) => {
        for (const change of charChanges) {
          const stats = s.characterStats[change.charId]
          if (stats) {
            stats[change.stat] = Math.max(0, Math.min(100, (stats[change.stat] ?? 0) + change.delta))
          }
        }
        for (const change of globalChanges) {
          const key = change.key as keyof PlayerStats
          if (key in s.playerStats) {
            s.playerStats[key] = Math.max(0, Math.min(100, s.playerStats[key] + change.delta))
          }
        }
      })

      // 推入 AI 消息
      set((s) => {
        s.messages.push({ id: makeId(), role: 'assistant', content: fullContent, timestamp: Date.now() })
        s.isTyping = false
        s.streamingContent = ''
      })

      get().advanceTime()
      get().saveGame()
    } catch {
      set((s) => { s.isTyping = false; s.streamingContent = '' })
      get().addSystemMessage('⚠️ 时空裂隙波动，连接中断，请重试。')
    }
  },

  // ── 时间推进 ──
  advanceTime: () => {
    set((s) => {
      s.actionPoints -= 1
      s.currentPeriodIndex += 1

      if (s.currentPeriodIndex >= PERIODS.length) {
        s.currentPeriodIndex = 0
        s.currentDay += 1
        s.actionPoints = MAX_ACTION_POINTS

        // 章节推进
        const newChapter = getCurrentChapter(s.currentDay)
        if (newChapter.id !== s.currentChapter) {
          s.currentChapter = newChapter.id
        }
      }
    })

    const state = get()

    // 时间提示
    get().addSystemMessage(
      `⏳ 第 ${state.currentDay} 天 · ${PERIODS[state.currentPeriodIndex].name} · 行动点 ${state.actionPoints}/${MAX_ACTION_POINTS}`
    )

    // 章节切换通知
    const chapter = getCurrentChapter(state.currentDay)
    if (chapter.id !== state.currentChapter) {
      get().addSystemMessage(`📖 进入第${chapter.id}章「${chapter.name}」— ${chapter.description}`)
      trackChapterEnter(chapter.id)
    }

    // 强制事件检查
    const events = getDayEvents(state.currentDay, state.triggeredEvents)
    for (const event of events) {
      if (event.triggerPeriod === undefined || event.triggerPeriod === state.currentPeriodIndex) {
        set((s) => { s.triggeredEvents.push(event.id) })
        get().addSystemMessage(`🎬 【${event.name}】${event.description}`)
      }
    }

    // 时间耗尽检查
    if (state.currentDay > MAX_DAYS) {
      get().checkEnding()
    }
  },

  // ── 使用道具 ──
  useItem: (itemId: string) => {
    const state = get()
    const count = state.inventory[itemId] ?? 0
    if (count <= 0) return

    const item = ITEMS[itemId]
    if (!item) return

    if (itemId === 'memory_stone' && state.lostMemories.length > 0) {
      const recovered = state.lostMemories[state.lostMemories.length - 1]
      set((s) => { s.inventory[itemId] = count - 1 })
      get().addSystemMessage(`💎 记忆之石发出柔光...你暂时想起了：「${recovered}」`)
    } else if (itemId === 'potion') {
      set((s) => {
        s.inventory[itemId] = count - 1
        s.playerStats.stamina = Math.min(100, s.playerStats.stamina + 30)
      })
      get().addSystemMessage('🧪 温暖的液体涌遍全身，体力恢复了。')
    } else if (itemId === 'candy' && state.currentCharacter) {
      const char = state.characters[state.currentCharacter]
      set((s) => {
        s.characterStats[state.currentCharacter!].affection = Math.min(
          100, (s.characterStats[state.currentCharacter!]?.affection ?? 0) + 5
        )
      })
      get().addSystemMessage(`🍬 你将心情糖果递给${char?.name}，对方开心地笑了。`)
    } else {
      get().addSystemMessage(`📦 使用了${item.name}。`)
    }
  },

  // ── 完成当前世界 ──
  completeWorld: () => {
    const state = get()
    if (!state.currentWorld) return

    // 随机失去一段记忆
    const availableMemories = MEMORY_POOL.filter((m) => !state.lostMemories.includes(m))
    const lostMemory = availableMemories[Math.floor(Math.random() * availableMemories.length)]
      ?? '一段模糊的温暖回忆'

    set((s) => {
      s.soulFragments += 1
      s.lostMemories.push(lostMemory)
      s.completedWorlds.push(s.currentWorld!)
      s.currentWorld = null
      s.currentScene = 'grayspace'
      s.currentCharacter = null
      s.characters = {}
      s.characterStats = {}
      s.messages = []
      s.historySummary = ''
    })

    get().addSystemMessage(
      `🪞 灵魂碎片回收成功！(${get().soulFragments}/4)\n💔 代价...你失去了一段记忆：「${lostMemory}」\n\n你回到了灰色空间，轮回之镜在等待你的下一个选择。`
    )

    // 全部收集完毕
    if (get().soulFragments >= 4) {
      get().checkEnding()
    }
  },

  // ── 结局检查 ──
  checkEnding: () => {
    const state = get()

    // BE: 时间耗尽
    if (state.currentWorld && state.currentDay > MAX_DAYS) {
      set((s) => { s.endingType = 'be-dissolve' })
      trackEndingReached('be-dissolve')
      return
    }

    // 碎片不足（不在世界中且碎片不够）
    if (!state.currentWorld && state.soulFragments < 4) return

    // TE: 集齐碎片 + 记忆碎片全部触发（简化为 lostMemories 有对应 memory_stone 使用记录）
    if (state.soulFragments >= 4 && state.lostMemories.length <= 2) {
      set((s) => { s.endingType = 'te-reunion' })
      trackEndingReached('te-reunion')
      return
    }

    // HE / NE 将通过最终抉择 sendMessage 触发
    // 这里设置为等待最终选择状态
    if (state.soulFragments >= 4) {
      get().addSystemMessage(
        '🪞 四个灵魂碎片全部回收。轮回之镜泛起涟漪...\n\n"你已集齐所有碎片。现在，做出你的选择："\n\n1️⃣ 复活 — 回到原来的世界，但失去所有记忆\n2️⃣ 保留记忆 — 放弃复活，成为轮回之镜的新器灵\n3️⃣ 相信缘分 — 带着所有记忆复活（需要足够的信念）'
      )
    }
  },

  // ── 系统消息 ──
  addSystemMessage: (content: string) => set((s) => {
    s.messages.push({ id: makeId(), role: 'system', content, timestamp: Date.now() })
  }),

  // ── 重置游戏 ──
  resetGame: () => set((s) => {
    s.gameStarted = false
    s.playerGender = 'unspecified'
    s.playerName = ''
    s.currentWorld = null
    s.completedWorlds = []
    s.soulFragments = 0
    s.lostMemories = []
    s.playerStats = { beauty: 80, wisdom: 85, stamina: 70, charm: 85, luck: 50 }
    s.characters = {}
    s.currentDay = 1
    s.currentPeriodIndex = 0
    s.actionPoints = MAX_ACTION_POINTS
    s.currentScene = 'grayspace'
    s.currentCharacter = null
    s.characterStats = {}
    s.unlockedScenes = []
    s.currentChapter = 1
    s.triggeredEvents = []
    s.inventory = { detector: 1 }
    s.messages = []
    s.historySummary = ''
    s.isTyping = false
    s.streamingContent = ''
    s.endingType = null
    s.activePanel = null
  }),

  // ── 存档系统 ──
  saveGame: () => {
    const s = get()
    const data = {
      version: 1,
      playerGender: s.playerGender,
      playerName: s.playerName,
      currentWorld: s.currentWorld,
      completedWorlds: s.completedWorlds,
      soulFragments: s.soulFragments,
      lostMemories: s.lostMemories,
      playerStats: s.playerStats,
      characters: s.characters,
      currentDay: s.currentDay,
      currentPeriodIndex: s.currentPeriodIndex,
      actionPoints: s.actionPoints,
      currentScene: s.currentScene,
      currentCharacter: s.currentCharacter,
      characterStats: s.characterStats,
      unlockedScenes: s.unlockedScenes,
      currentChapter: s.currentChapter,
      triggeredEvents: s.triggeredEvents,
      inventory: s.inventory,
      messages: s.messages.slice(-30),
      historySummary: s.historySummary,
      endingType: s.endingType,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return false
      const data = JSON.parse(raw)
      if (data.version !== 1) return false
      set((s) => Object.assign(s, data, { gameStarted: true, isTyping: false, streamingContent: '', activePanel: null }))
      trackGameContinue()
      return true
    } catch { return false }
  },

  hasSave: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      return raw !== null && JSON.parse(raw).version === 1
    } catch { return false }
  },

  clearSave: () => localStorage.removeItem(SAVE_KEY),
})))

// ============================================================
// Re-export data.ts
// ============================================================

export {
  WORLDS, SCENES, ITEMS, PERIODS, CHAPTERS,
  MAX_DAYS, MAX_ACTION_POINTS,
  STORY_INFO, FORCED_EVENTS, ENDINGS,
  buildCharacters, getWorldCharacters, getStatLevel,
  getAvailableCharacters, getCurrentChapter, getWorldScenes, getWorldItems,
} from '@/lib/data'

export type {
  Character, CharacterStats, Scene, GameItem, Chapter, World,
  ForcedEvent, Ending, TimePeriod, Message, StatMeta,
} from '@/lib/data'
