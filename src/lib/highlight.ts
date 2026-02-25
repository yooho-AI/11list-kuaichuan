/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供高光分析/图片/视频生成函数及类型
 * [POS]: lib 的高光时刻系统，被 highlight-modal.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 高光类型
// ============================================================

export type HighlightType = 'bond' | 'conflict' | 'growth' | 'crisis'

export interface Highlight {
  highlightId: string
  title: string
  summary: string
  type: HighlightType
  characters: Array<{ name: string }>
  emotionalScore: number
}

export const HIGHLIGHT_TYPES: Record<HighlightType, { icon: string; label: string; color: string }> = {
  bond:     { icon: '💕', label: '灵魂共鸣', color: '#8b5cf6' },
  conflict: { icon: '⚡', label: '命运冲突', color: '#ef4444' },
  growth:   { icon: '🌟', label: '记忆蜕变', color: '#ffd700' },
  crisis:   { icon: '🔥', label: '危机时刻', color: '#f97316' },
}

// ============================================================
// 漫画/视频风格
// ============================================================

export type ComicStyle = 'shoujo' | 'shounen' | 'webtoon' | 'doodle'
export type VideoStyle = 'mystical' | 'romantic' | 'dark' | 'cinematic'

export const COMIC_STYLES: Record<ComicStyle, { label: string; desc: string; prompt: string }> = {
  shoujo:  { label: '少女漫画', desc: '花瓣特效、梦幻氛围', prompt: 'Q版少女漫画风格，柔和线条，梦幻花瓣特效，粉色调' },
  shounen: { label: '少年漫画', desc: '硬朗线条、张力构图', prompt: 'Q版少年漫画风格，硬朗线条，动态张力构图，对比强烈' },
  webtoon: { label: '韩漫条漫', desc: '精致上色、网感强', prompt: 'Q版韩漫风格，精致数字上色，清晰线条，竖版分镜' },
  doodle:  { label: '手绘涂鸦', desc: '随性笔触、轻松氛围', prompt: 'Q版手绘涂鸦风格，随性铅笔线条，水彩淡色，温馨感' },
}

export const VIDEO_STYLES: Record<VideoStyle, { label: string; desc: string; prompt: string }> = {
  mystical:  { label: '灵魂空间', desc: '虚幻光影、镜面涟漪', prompt: '灵魂空间氛围，虚幻光影流转，镜面涟漪效果，紫色基调' },
  romantic:  { label: '深情时刻', desc: '暖色柔光、花瓣飘落', prompt: '浪漫唯美氛围，暖色调柔光，花瓣飘落，深情注视' },
  dark:      { label: '暗黑觉醒', desc: '阴影对比、权谋气场', prompt: '暗黑风格，强烈明暗对比，阴影包裹，压迫感十足' },
  cinematic: { label: '电影质感', desc: '宽幅构图、史诗画面', prompt: '电影级画面，宽幅21:9构图，景深虚化，故事张力' },
}

// ============================================================
// 情绪映射
// ============================================================

const EMOTION_MAP: Record<HighlightType, { image: string; video: string }> = {
  bond:     { image: '两人四目相对，温暖光晕环绕，灵魂碎片微微发光', video: '暖色调柔光包裹两人，碎片化的记忆碎片在空中飘舞' },
  conflict: { image: '剑拔弩张的对峙，暗色光影交织，紧张氛围', video: '快节奏剪辑，黑白闪回，情绪张力拉满' },
  growth:   { image: '绽放的光芒中角色觉醒，蜕变画面，闪耀星辉', video: '慢镜头记录蜕变瞬间，光芒从内而外绽放' },
  crisis:   { image: '危急时刻紧握双手，火焰/风暴/黑暗逼近', video: '戏剧性慢动作，危险逼近，保护与被保护' },
}

// ============================================================
// Ark API
// ============================================================

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_API_KEY = '8821c4b7-6a64-44b9-a9d7-de1ffc36ff41'

const arkHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ARK_API_KEY}`,
}

export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: 'POST',
    headers: arkHeaders,
    body: JSON.stringify({
      model: 'doubao-seedream-3-0-t2i-250415',
      prompt,
      size: '1024x1024',
      response_format: 'url',
      guidance_scale: 7.5,
      watermark: false,
    }),
  })
  const data = await res.json()
  return data.data?.[0]?.url ?? ''
}

export async function generateVideo(prompt: string, imageUrl: string): Promise<string> {
  const res = await fetch(`${ARK_BASE}/video/generations`, {
    method: 'POST',
    headers: arkHeaders,
    body: JSON.stringify({
      model: 'doubao-seaweed-241128',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: prompt },
      ],
    }),
  })
  const data = await res.json()
  return data.id ?? ''
}

export async function queryVideoTask(taskId: string): Promise<{ status: string; url: string }> {
  const res = await fetch(`${ARK_BASE}/video/generations/${taskId}`, {
    method: 'GET',
    headers: arkHeaders,
  })
  const data = await res.json()
  return {
    status: data.status ?? 'unknown',
    url: data.data?.[0]?.url ?? '',
  }
}

// ============================================================
// 高光分析
// ============================================================

export async function analyzeHighlights(messages: Array<{ role: string; content: string }>): Promise<Highlight[]> {
  const dialogue = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n')
    .slice(-3000)

  const prompt = `你是一个专业的快穿恋爱叙事分析师。
请分析以下《快穿：千面情缘》的对话，提取2-4个最精彩的高光片段。

## 涉及角色
萧景珩、萧景琰、谢无咎、沈清辞（权谋深宫）
江临渊、陆野、苏墨白、顾言希（学院奇缘）
凌霄、夜无殇、白无尘、楚星河（仙门传说）
霍沉舟、江寒、沈慕白、顾野（末世求生）

## 高光类型
bond(灵魂共鸣), conflict(命运冲突), growth(记忆蜕变), crisis(危机时刻)

## 输出要求
JSON数组: [{ highlightId, title, summary, type, characters: [{name}], emotionalScore(1-10) }]
只输出JSON，不要其他文字。

## 对话内容
${dialogue}`

  try {
    const res = await fetch('https://api.yooho.ai/api/v1/ai/game/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          content += parsed.choices?.[0]?.delta?.content || ''
        } catch { /* skip */ }
      }
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : []
  } catch { return [] }
}

// ============================================================
// Prompt 构建
// ============================================================

export function buildImagePrompt(highlight: Highlight, style: ComicStyle): string {
  const styleInfo = COMIC_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].image
  return `${styleInfo.prompt}。快穿恋爱游戏场景，灵魂碎片与轮回之镜的神秘元素。
角色：${highlight.characters.map((c) => c.name).join('、')}，古风/现代/仙侠/末世服饰。
剧情：${highlight.summary}
情绪：${emotion}
排版：4-6格漫画分镜，黑色分格边框，对话气泡框，高清精致`
}

export function buildVideoPrompt(highlight: Highlight, style: VideoStyle): string {
  const styleInfo = VIDEO_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].video
  return `${styleInfo.prompt}。快穿恋爱叙事，灵魂碎片发光，轮回之镜涟漪。
${highlight.summary}
${emotion}`
}
