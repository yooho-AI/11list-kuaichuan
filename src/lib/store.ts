/**
 * [INPUT]: 依赖 script.md(?raw), stream.ts, data.ts, parser.ts, analytics.ts
 * [OUTPUT]: 对外提供 useGameStore + re-export data.ts
 * [POS]: 状态中枢：Zustand+Immer，四世界快穿+灵魂碎片+记忆丧失+富消息+双轨解析+链式反应+存档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import GAME_SCRIPT from './script.md?raw'
import { streamChat, type Message as StreamMessage } from './stream'
import {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  type PlayerStats,
  PERIODS,
  MAX_DAYS,
  MAX_ACTION_POINTS,
  GLOBAL_STATS,
  WORLDS,
  SCENES,
  ITEMS,
  FORCED_EVENTS,
  STORY_INFO,
  getWorldCharacters,
  getWorldScenes,
  getWorldItems,
  getCurrentChapter,
  getStatLevel,
} from './data'
import { parseStoryParagraph, extractChoices } from './parser'
import {
  trackGameStart,
  trackPlayerCreate,
  trackGameContinue,
  trackTimeAdvance,
  trackChapterEnter,
  trackEndingReached,
  trackSceneUnlock,
  trackStaminaCrisis,
} from './analytics'

// ── Re-export data.ts ────────────────────────────────
export {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  type PlayerStats,
  type TimePeriod,
  type Scene,
  type GameItem,
  type Chapter,
  type World,
  type ForcedEvent,
  type Ending,
  type StatMeta,
  PERIODS,
  MAX_DAYS,
  MAX_ACTION_POINTS,
  GLOBAL_STATS,
  WORLDS,
  SCENES,
  ITEMS,
  CHAPTERS,
  FORCED_EVENTS,
  ENDINGS,
  ENDING_TYPE_MAP,
  STORY_INFO,
  buildCharacters,
  getWorldCharacters,
  getWorldScenes,
  getWorldItems,
  getStatLevel,
  getAvailableCharacters,
  getCurrentChapter,
  getDayEvents,
} from './data'
export { parseStoryParagraph, extractChoices } from './parser'

// ── Helpers ──────────────────────────────────────────

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'kuaichuan-save-v2'
const HISTORY_COMPRESS_THRESHOLD = 15

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

// ── State / Actions ──────────────────────────────────

interface GameState {
  gameStarted: boolean
  playerGender: 'male' | 'female' | 'unspecified'
  playerName: string

  // World system
  currentWorld: string | null
  completedWorlds: string[]
  soulFragments: number
  lostMemories: string[]

  // Player stats (global across worlds)
  playerStats: PlayerStats

  // Current world state
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

  messages: Message[]
  historySummary: string
  isTyping: boolean
  streamingContent: string

  endingType: string | null

  // Tab architecture
  activeTab: 'dialogue' | 'scene' | 'character'
  choices: string[]
  showDashboard: boolean
  showRecords: boolean
  storyRecords: StoryRecord[]
}

interface GameActions {
  setPlayerInfo: (gender: 'male' | 'female' | 'unspecified', name: string) => void
  initGame: () => void
  selectWorld: (worldId: string) => void
  selectCharacter: (id: string) => void
  selectScene: (id: string) => void
  setActiveTab: (tab: 'dialogue' | 'scene' | 'character') => void
  toggleDashboard: () => void
  toggleRecords: () => void
  sendMessage: (content: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  completeWorld: () => void
  checkEnding: () => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => boolean
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

// ── Dual-track parseStatChanges ──────────────────────

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

  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
    // Support surname shorthand
    if (char.name.length >= 2) nameToId[char.name.slice(0, 1)] = id
  }

  const GLOBAL_ALIASES: Record<string, string> = {
    '颜值': 'beauty', '智慧': 'wisdom', '体力': 'stamina',
    '魅力': 'charm', '运气': 'luck',
  }

  // Track 1: Character stat changes — 【角色名 好感+N】 or 【角色名 信任+N】
  const charRegex = /[【\[]([^\]】]+?)\s+(好感度?|好感|信任度?|信任)([+-])(\d+)[】\]]/g
  let match
  while ((match = charRegex.exec(content))) {
    const [, charName, statLabel, sign, numStr] = match
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)
    const charId = nameToId[charName]
    if (charId) {
      const stat = statLabel.startsWith('信任') ? 'trust' : 'affection'
      charChanges.push({ charId, stat, delta })
    }
  }

  // Track 2: Global stat changes — 【颜值+N】
  const globalRegex = /[【\[]([^\s\]】+-]+?)([+-])(\d+)[】\]]/g
  let gMatch
  while ((gMatch = globalRegex.exec(content))) {
    const [, label, sign, numStr] = gMatch
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)
    const globalKey = GLOBAL_ALIASES[label]
    if (globalKey) {
      globalChanges.push({ key: globalKey, delta })
    }
  }

  return { charChanges, globalChanges }
}

// ── buildSystemPrompt — Script-through ───────────────

function buildStatsSnapshot(state: GameState): string {
  const ps = state.playerStats
  const globals = GLOBAL_STATS.map(
    (m) => `${m.icon} ${m.label}: ${ps[m.key as keyof PlayerStats]}`,
  ).join('\n')

  const npcs = Object.entries(state.characterStats)
    .map(([charId, stats]) => {
      const char = state.characters[charId]
      if (!char) return ''
      const level = getStatLevel(stats.affection ?? 0)
      return `${char.name}: 好感 ${stats.affection ?? 0}/100 (${level.name}) · 信任 ${stats.trust ?? 0}/100`
    })
    .filter(Boolean)
    .join('\n')

  return `玩家属性:\n${globals}\n\nNPC关系:\n${npcs}`
}

function buildSystemPrompt(state: GameState): string {
  const world = WORLDS.find((w) => w.id === state.currentWorld)
  const char = state.currentCharacter
    ? state.characters[state.currentCharacter]
    : null
  const chapter = getCurrentChapter(state.currentDay)
  const scene = SCENES[state.currentScene]
  const period = PERIODS[state.currentPeriodIndex] || PERIODS[0]
  const ps = state.playerStats
  const genderLabel = state.playerGender === 'male' ? '男' : state.playerGender === 'female' ? '女' : '未指定'

  return `你是《${STORY_INFO.title}》的AI叙述者。

## 游戏剧本
${GAME_SCRIPT}

## 世界观
你是轮回之镜的器灵，引导玩家完成灵魂契约。玩家死后灵魂碎裂成四片，散落在四个世界。
当前世界：${world?.name ?? '灰色空间'} — ${world?.atmosphere ?? ''}

## 核心设定
- 四位男主是因执念困在轮回边缘的灵魂，玩家让他们真心爱上自己才能回收碎片
- 每回收一个碎片，玩家失去一段记忆（已失去${state.lostMemories.length}段）
- 已收集灵魂碎片：${state.soulFragments}/4

## 玩家信息
「${state.playerName}」，性别${genderLabel}
属性：颜值${ps.beauty} 智慧${ps.wisdom} 体力${ps.stamina} 魅力${ps.charm} 运气${ps.luck}

## 当前状态
第${state.currentDay}天/${MAX_DAYS}天 · ${period.name}
第${chapter.id}章「${chapter.name}」— ${chapter.description}
当前场景：${scene?.name || '未知'}
${char ? `当前交互角色：${char.name}（${char.title}）` : ''}
行动点：${state.actionPoints}/${MAX_ACTION_POINTS}

${char ? `## 当前交互角色详情
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
- 0-30疏离期：冷漠戒备，保持距离，礼貌疏离
- 31-60好奇期：开始关注，偶尔主动接近，以各种借口帮忙
- 61-80接纳期：接纳进入生活，展现真实一面，愿意分享秘密
- 81-100倾心期：深爱，情绪因玩家波动，为玩家可以做任何事` : ''}

## 当前数值
${buildStatsSnapshot(state)}

## 背包
${Object.entries(state.inventory).filter(([, v]) => v > 0).map(([k, v]) => {
  const item = ITEMS[k]
  return item ? `${item.icon} ${item.name} x${v}` : ''
}).filter(Boolean).join('、') || '空'}

## 已触发事件
${state.triggeredEvents.join('、') || '无'}

## 历史摘要
${state.historySummary || '旅程刚刚开始'}

## 叙述风格
- 每段回复 200-400 字（关键剧情 500-800 字），文学性描写，营造沉浸感
- 角色对话格式：【角色名】"对话内容"（语气动作描写）
- 数值变化必须在回复末尾标注：【角色名 好感+N】【角色名 信任+N】
- 玩家属性变化：【颜值+N】【智慧+N】【体力+N】【魅力+N】【运气+N】
- 环境描写用（括号）标注
- 严格遵循剧本中的角色性格、隐藏关系和事件触发条件

## 选项系统（必须严格遵守）
每次回复末尾必须给出恰好4个行动选项，格式严格如下：
1. 选项文本（简洁，15字以内）
2. 选项文本
3. 选项文本
4. 选项文本
规则：
- 必须恰好4个，不能多也不能少
- 选项前不要加"你的选择"等标题行
- 选项应涵盖不同的情感策略和行动方向
- 每个选项要具体、有剧情推动力，不要笼统`
}

// ── Chain Reactions ──────────────────────────────────

function applyChainReactions(state: GameState): void {
  const ps = state.playerStats

  // Stamina crisis warning
  if (ps.stamina <= 20) {
    trackStaminaCrisis(ps.stamina)
  }

  // All stats above 60 → luck bonus
  if (ps.beauty > 60 && ps.wisdom > 60 && ps.stamina > 60 && ps.charm > 60) {
    ps.luck = Math.min(100, ps.luck + 3)
  }
}

// ── Store ────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── Initial state ──
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

    activeTab: 'dialogue',
    choices: [],
    showDashboard: false,
    showRecords: false,
    storyRecords: [],

    // ── Actions ──

    setPlayerInfo: (gender, name) => {
      set((s) => {
        s.playerGender = gender
        s.playerName = name
      })
    },

    initGame: () => {
      const state = get()
      trackGameStart()
      trackPlayerCreate(state.playerGender, state.playerName)

      set((s) => {
        s.gameStarted = true

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你缓缓睁开眼睛，四周是一片灰白色的虚空。一面古老的铜镜悬浮在面前，镜面泛起涟漪...\n\n「${s.playerName}，你死了。但你的灵魂还没有完全消散——它碎裂成了四片，散落在四个不同的世界。」\n\n「与我签订契约，穿越这四个世界，让那里的灵魂真心爱上你，你就能回收碎片，重获新生。」\n\n「但代价是——每回收一个碎片，你将失去一段珍贵的记忆。」`,
          timestamp: Date.now(),
        })

        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          day: 1,
          period: '清晨',
          title: '灵魂契约',
          content: `${s.playerName}在灰色空间中醒来，与轮回之镜签订契约。`,
        })

        s.choices = ['查看四个世界', '询问更多细节', '检查自身状态', '观察轮回之镜']
      })
    },

    selectWorld: (worldId) => {
      const chars = getWorldCharacters(worldId)
      const scenes = getWorldScenes(worldId)
      const sceneIds = Object.keys(scenes)
      const firstScene = sceneIds.find((sid) => sid !== 'grayspace') ?? sceneIds[0]
      const world = WORLDS.find((w) => w.id === worldId)

      // Initialize character stats
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
        s.historySummary = ''
        s.endingType = null

        // World items initialization
        const worldItems = getWorldItems(worldId)
        s.inventory = { detector: 1 }
        for (const item of Object.values(worldItems)) {
          if (item.type === 'consumable' && item.worldId === 'universal') {
            s.inventory[item.id] = s.inventory[item.id] ?? 0
          }
        }

        // System welcome message
        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你踏入了「${world?.name}」的世界...\n${world?.description}\n\n灵魂碎片探测器微微震动，碎片就在这个世界中。你有 ${MAX_DAYS} 天的时间。`,
          timestamp: Date.now(),
        })

        // Scene transition rich message for first scene
        const scene = SCENES[firstScene]
        if (scene) {
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `你来到了${scene.name}。${scene.atmosphere}`,
            timestamp: Date.now(),
            type: 'scene-transition',
            sceneId: firstScene,
          })
        }

        // Story record
        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          day: 1,
          period: PERIODS[0].name,
          title: `进入「${world?.name}」`,
          content: world?.description ?? '踏入新世界',
        })

        s.choices = [
          '环顾四周',
          '寻找线索',
          '查看碎片探测器',
          '向前走走',
        ]
      })

      trackChapterEnter(1)
    },

    selectCharacter: (charId) => {
      set((s) => {
        s.currentCharacter = charId
        s.activeTab = 'dialogue'
      })
    },

    selectScene: (sceneId) => {
      const state = get()
      if (!state.unlockedScenes.includes(sceneId)) return
      if (state.currentScene === sceneId) return

      trackSceneUnlock(sceneId)

      set((s) => {
        s.currentScene = sceneId
        s.activeTab = 'dialogue'

        const scene = SCENES[sceneId]
        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你来到了${scene?.name}。${scene?.atmosphere}`,
          timestamp: Date.now(),
          type: 'scene-transition',
          sceneId,
        })
      })
    },

    setActiveTab: (tab) => {
      set((s) => {
        s.activeTab = tab
        s.showDashboard = false
        s.showRecords = false
      })
    },

    toggleDashboard: () => {
      set((s) => {
        s.showDashboard = !s.showDashboard
        if (s.showDashboard) s.showRecords = false
      })
    },

    toggleRecords: () => {
      set((s) => {
        s.showRecords = !s.showRecords
        if (s.showRecords) s.showDashboard = false
      })
    },

    sendMessage: async (content) => {
      const state = get()
      if (state.isTyping || state.endingType) return

      // Push user message
      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'user',
          content,
          timestamp: Date.now(),
        })
        s.isTyping = true
        s.streamingContent = ''
      })

      // Compress history if needed
      const currentState = get()
      if (currentState.messages.length > HISTORY_COMPRESS_THRESHOLD) {
        const oldMessages = currentState.messages.slice(0, -10)
        const summary = oldMessages
          .filter((m) => m.role !== 'system' || m.type)
          .map((m) => `[${m.role}] ${m.content.slice(0, 80)}`)
          .join('\n')

        set((s) => {
          s.historySummary = (s.historySummary + '\n' + summary).slice(-2000)
          s.messages = s.messages.slice(-10)
        })
      }

      // Build prompt and stream
      const promptState = get()
      const systemPrompt = buildSystemPrompt(promptState)
      const recentMessages = promptState.messages
        .filter((m) => !m.type)
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      let fullContent = ''

      try {
        const chatMessages: StreamMessage[] = [
          { role: 'system', content: systemPrompt },
          ...recentMessages,
        ]

        await streamChat(
          chatMessages,
          (chunk: string) => {
            fullContent += chunk
            set((s) => {
              s.streamingContent = fullContent
            })
          },
          () => {},
        )

        // Parse stat changes
        const afterState = get()
        const { charChanges, globalChanges } = parseStatChanges(fullContent, afterState.characters)

        // Detect character for NPC bubble
        const { charColor } = parseStoryParagraph(fullContent)
        let detectedChar: string | null = null
        if (charColor) {
          for (const [id, char] of Object.entries(afterState.characters)) {
            if (char.themeColor === charColor) {
              detectedChar = id
              break
            }
          }
        }

        // Extract choices from AI response
        const { cleanContent, choices: parsedChoices } = extractChoices(fullContent)

        // Fallback: if AI didn't return enough choices, generate context-aware ones
        const finalChoices = parsedChoices.length >= 2 ? parsedChoices : (() => {
          const currentState2 = get()
          const char = currentState2.currentCharacter
            ? currentState2.characters[currentState2.currentCharacter]
            : null
          if (char) {
            return [
              `继续和${char.name}聊天`,
              `向${char.name}表达好感`,
              `试探${char.name}的真实想法`,
              '换个话题聊聊',
            ]
          }
          const scene = SCENES[currentState2.currentScene]
          return [
            `探索${scene?.name || '周围'}`,
            '与角色交谈',
            '查看碎片探测器',
            '自由行动',
          ]
        })()

        set((s) => {
          // Apply character stat changes
          for (const change of charChanges) {
            if (s.characterStats[change.charId]) {
              const curr = (s.characterStats[change.charId][change.stat] as number) ?? 0
              ;(s.characterStats[change.charId] as Record<string, number>)[change.stat] =
                Math.max(0, Math.min(100, curr + change.delta))
            }
          }

          // Apply global stat changes
          for (const change of globalChanges) {
            const key = change.key as keyof PlayerStats
            if (key in s.playerStats) {
              const meta = GLOBAL_STATS.find((m) => m.key === key)
              const min = meta?.min ?? 0
              const max = meta?.max ?? 100
              s.playerStats[key] = Math.max(min, Math.min(max, s.playerStats[key] + change.delta))
            }
          }

          // Chain reactions
          applyChainReactions(s)

          // Push assistant message (with clean content, choices stored separately)
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: cleanContent,
            timestamp: Date.now(),
            character: detectedChar || undefined,
          })

          s.choices = finalChoices.slice(0, 4)

          // Story record
          const period = PERIODS[s.currentPeriodIndex] || PERIODS[0]
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            day: s.currentDay,
            period: period.name,
            title: content.slice(0, 20) + (content.length > 20 ? '...' : ''),
            content: cleanContent.slice(0, 100) + '...',
          })

          s.isTyping = false
          s.streamingContent = ''
        })

        // Check ending
        get().checkEnding()

        // Auto-save
        get().saveGame()
      } catch (err) {
        set((s) => {
          s.isTyping = false
          s.streamingContent = ''
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `请求失败: ${err instanceof Error ? err.message : '时空裂隙波动，连接中断，请重试。'}`,
            timestamp: Date.now(),
          })
        })
      }
    },

    advanceTime: () => {
      set((s) => {
        s.actionPoints -= 1
        s.currentPeriodIndex += 1

        // Cross-day boundary
        if (s.currentPeriodIndex >= PERIODS.length) {
          s.currentPeriodIndex = 0
          s.currentDay += 1
          s.actionPoints = MAX_ACTION_POINTS

          // Natural decay: stamina -3/day
          s.playerStats.stamina = Math.max(0, s.playerStats.stamina - 3)

          const period = PERIODS[0]
          trackTimeAdvance(s.currentDay, period.name)

          // Day-change rich message (episode-change)
          const chapter = getCurrentChapter(s.currentDay)
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `第${s.currentDay}天 · ${period.name}`,
            timestamp: Date.now(),
            type: 'episode-change',
            dayInfo: { day: s.currentDay, period: period.name, chapter: chapter.name },
          })

          // Chapter progression
          if (chapter.id !== s.currentChapter) {
            s.currentChapter = chapter.id
            trackChapterEnter(chapter.id)

            s.messages.push({
              id: makeId(),
              role: 'system',
              content: `— 第${chapter.id}章「${chapter.name}」${chapter.description} —`,
              timestamp: Date.now(),
            })
          }

          // Story record
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            day: s.currentDay,
            period: period.name,
            title: `进入第${s.currentDay}天`,
            content: `${getCurrentChapter(s.currentDay).name} · ${period.name}`,
          })

          // Scene unlocks based on progress (world-specific)
          if (s.currentWorld && s.currentDay >= 3) {
            const worldScenes = getWorldScenes(s.currentWorld)
            for (const sceneId of Object.keys(worldScenes)) {
              if (!s.unlockedScenes.includes(sceneId)) {
                s.unlockedScenes.push(sceneId)
                trackSceneUnlock(sceneId)
              }
            }
          }
        } else {
          const period = PERIODS[s.currentPeriodIndex]
          trackTimeAdvance(s.currentDay, period.name)
        }

        // Check forced events
        const currentPeriod = PERIODS[s.currentPeriodIndex]
        for (const event of FORCED_EVENTS) {
          if (s.triggeredEvents.includes(event.id)) continue
          if (event.triggerDay !== s.currentDay) continue
          if (event.triggerPeriod !== undefined && event.triggerPeriod !== s.currentPeriodIndex) continue

          s.triggeredEvents.push(event.id)
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `${event.name}\n${event.description}`,
            timestamp: Date.now(),
          })
          s.storyRecords.push({
            id: `sr-${Date.now()}-evt`,
            day: s.currentDay,
            period: currentPeriod.name,
            title: event.name,
            content: event.description,
          })
        }
      })

      // Check ending after state update
      get().checkEnding()

      // Auto-save
      get().saveGame()
    },

    useItem: (itemId) => {
      set((s) => {
        const count = s.inventory[itemId]
        if (!count || count <= 0) return

        const item = ITEMS[itemId]
        if (!item) return

        if (itemId === 'memory_stone' && s.lostMemories.length > 0) {
          s.inventory[itemId] -= 1
          const recovered = s.lostMemories[s.lostMemories.length - 1]
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `记忆之石发出柔光...你暂时想起了：「${recovered}」`,
            timestamp: Date.now(),
          })
        } else if (itemId === 'potion') {
          s.inventory[itemId] -= 1
          s.playerStats.stamina = Math.min(100, s.playerStats.stamina + 30)
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: '温暖的液体涌遍全身，体力恢复了。',
            timestamp: Date.now(),
          })
        } else if (itemId === 'candy' && s.currentCharacter) {
          s.inventory[itemId] -= 1
          const char = s.characters[s.currentCharacter]
          if (s.characterStats[s.currentCharacter]) {
            s.characterStats[s.currentCharacter].affection = Math.min(
              100, (s.characterStats[s.currentCharacter]?.affection ?? 0) + 5,
            )
          }
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `你将心情糖果递给${char?.name}，对方开心地笑了。`,
            timestamp: Date.now(),
          })
        } else {
          s.inventory[itemId] -= 1
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `使用了「${item.name}」。`,
            timestamp: Date.now(),
          })
        }
      })
    },

    completeWorld: () => {
      const state = get()
      if (!state.currentWorld) return

      // Randomly lose a memory
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
        s.choices = []
      })

      get().addSystemMessage(
        `灵魂碎片回收成功！(${get().soulFragments}/4)\n代价...你失去了一段记忆：「${lostMemory}」\n\n你回到了灰色空间，轮回之镜在等待你的下一个选择。`,
      )

      // Check if all 4 collected
      if (get().soulFragments >= 4) {
        get().checkEnding()
      }

      get().saveGame()
    },

    checkEnding: () => {
      const state = get()
      if (state.endingType) return

      let ending: string | null = null

      // BE: Time expired in a world
      if (state.currentWorld && state.currentDay > MAX_DAYS) {
        ending = 'be-dissolve'
      }
      // TE: 4 fragments + very few lost memories (memory_stone usage)
      else if (state.soulFragments >= 4 && state.lostMemories.length <= 2) {
        ending = 'te-reunion'
      }
      // HE / NE: 4 fragments, will be resolved via final choice prompt
      else if (state.soulFragments >= 4 && !state.currentWorld) {
        get().addSystemMessage(
          '四个灵魂碎片全部回收。轮回之镜泛起涟漪...\n\n"你已集齐所有碎片。现在，做出你的选择："\n\n1. 复活 — 回到原来的世界，但失去所有记忆\n2. 保留记忆 — 放弃复活，成为轮回之镜的新器灵\n3. 相信缘分 — 带着所有记忆复活（需要足够的信念）',
        )
        // Ending will be set based on player's reply in sendMessage
        return
      }

      if (ending) {
        trackEndingReached(ending)
        set((s) => {
          s.endingType = ending
        })
      }
    },

    addSystemMessage: (content) => {
      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'system',
          content,
          timestamp: Date.now(),
        })
      })
    },

    resetGame: () => {
      set((s) => {
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
        s.activeTab = 'dialogue'
        s.choices = []
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []
      })
    },

    saveGame: () => {
      const state = get()
      const save = {
        version: 2,
        playerGender: state.playerGender,
        playerName: state.playerName,
        currentWorld: state.currentWorld,
        completedWorlds: state.completedWorlds,
        soulFragments: state.soulFragments,
        lostMemories: state.lostMemories,
        playerStats: state.playerStats,
        currentDay: state.currentDay,
        currentPeriodIndex: state.currentPeriodIndex,
        actionPoints: state.actionPoints,
        currentScene: state.currentScene,
        currentCharacter: state.currentCharacter,
        characterStats: state.characterStats,
        unlockedScenes: state.unlockedScenes,
        currentChapter: state.currentChapter,
        triggeredEvents: state.triggeredEvents,
        inventory: state.inventory,
        messages: state.messages.slice(-30),
        historySummary: state.historySummary,
        storyRecords: state.storyRecords.slice(-50),
        endingType: state.endingType,
      }
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save))
      } catch { /* silent */ }
    },

    loadGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        // Also try v1 save key
        const rawV1 = !raw ? localStorage.getItem('kuaichuan-save-v1') : null
        const saveRaw = raw || rawV1
        if (!saveRaw) return false
        const save = JSON.parse(saveRaw)

        set((s) => {
          s.gameStarted = true
          s.playerGender = save.playerGender ?? 'unspecified'
          s.playerName = save.playerName
          s.currentWorld = save.currentWorld
          s.completedWorlds = save.completedWorlds ?? []
          s.soulFragments = save.soulFragments ?? 0
          s.lostMemories = save.lostMemories ?? []
          s.playerStats = save.playerStats ?? { beauty: 80, wisdom: 85, stamina: 70, charm: 85, luck: 50 }
          s.currentDay = save.currentDay
          s.currentPeriodIndex = save.currentPeriodIndex
          s.actionPoints = save.actionPoints
          s.currentScene = save.currentScene
          s.currentCharacter = save.currentCharacter
          s.characterStats = save.characterStats ?? {}
          s.unlockedScenes = save.unlockedScenes ?? []
          s.currentChapter = save.currentChapter
          s.triggeredEvents = save.triggeredEvents ?? []
          s.inventory = save.inventory ?? { detector: 1 }
          s.messages = save.messages || []
          s.historySummary = save.historySummary || ''
          s.storyRecords = save.storyRecords || []
          s.endingType = save.endingType

          // Rebuild characters from world if in a world
          if (s.currentWorld) {
            s.characters = getWorldCharacters(s.currentWorld)
          } else {
            s.characters = save.characters ?? {}
          }

          // Graceful defaults for new fields (v1 → v2 migration)
          s.activeTab = 'dialogue'
          s.choices = []
          s.showDashboard = false
          s.showRecords = false
          s.isTyping = false
          s.streamingContent = ''
        })

        trackGameContinue()
        return true
      } catch {
        return false
      }
    },

    hasSave: () => {
      try {
        return !!localStorage.getItem(SAVE_KEY) || !!localStorage.getItem('kuaichuan-save-v1')
      } catch {
        return false
      }
    },

    clearSave: () => {
      try {
        localStorage.removeItem(SAVE_KEY)
        localStorage.removeItem('kuaichuan-save-v1')
      } catch { /* silent */ }
    },
  })),
)
