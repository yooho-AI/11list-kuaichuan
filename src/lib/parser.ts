/**
 * [INPUT]: 无外部依赖（避免循环引用）
 * [OUTPUT]: 对外提供 parseStoryParagraph 函数
 * [POS]: lib 的文本解析器，被 dialogue-panel / mobile-layout 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 角色名→主题色映射（硬编码，禁止 import data.ts） ──

const CHARACTER_COLORS: Record<string, string> = {
  // 权谋深宫
  '萧景珩': '#4a90d9', '景珩': '#4a90d9',
  '萧景琰': '#e74c3c', '景琰': '#e74c3c',
  '谢无咎': '#27ae60', '无咎': '#27ae60',
  '沈清辞': '#f39c12', '清辞': '#f39c12',
  // 学院奇缘
  '江临渊': '#4a90d9', '临渊': '#4a90d9',
  '陆野': '#e74c3c',
  '苏墨白': '#27ae60', '墨白': '#27ae60',
  '顾言希': '#f39c12', '言希': '#f39c12',
  // 仙门传说
  '凌霄': '#4a90d9',
  '夜无殇': '#e74c3c', '无殇': '#e74c3c',
  '白无尘': '#27ae60', '无尘': '#27ae60',
  '楚星河': '#f39c12', '星河': '#f39c12',
  // 末世求生
  '霍沉舟': '#4a90d9', '沉舟': '#4a90d9',
  '江寒': '#e74c3c',
  '沈慕白': '#27ae60', '慕白': '#27ae60',
  '顾野': '#f39c12',
}

// ── 数值标签→颜色映射 ──

const STAT_COLORS: Record<string, string> = {
  '好感': '#ff6b9d', '好感度': '#ff6b9d',
  '信任': '#4fc3f7', '信任度': '#4fc3f7',
  '颜值': '#f48fb1', '智慧': '#7986cb',
  '体力': '#81c784', '魅力': '#ce93d8',
  '运气': '#ffd54f', '灵魂碎片': '#8b5cf6',
}

const DEFAULT_COLOR = '#8b5cf6'

// ── 工具 ──

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function parseInlineContent(text: string): string {
  let result = escapeHtml(text)
  for (const [name, color] of Object.entries(CHARACTER_COLORS)) {
    result = result.replaceAll(name,
      `<span class="char-name" style="color:${color};font-weight:600">${name}</span>`)
  }
  return result
}

function colorizeStats(line: string): string {
  return line.replace(/([^\s【】]+?)([+-]\d+)/g, (_, label: string, delta: string) => {
    const color = STAT_COLORS[label] || DEFAULT_COLOR
    const cls = delta.startsWith('+') ? 'stat-up' : 'stat-down'
    return `<span class="stat-change ${cls}" style="color:${color}">${label}${delta}</span>`
  })
}

// ── 主解析函数 ──

export function parseStoryParagraph(content: string): { narrative: string; statHtml: string } {
  const lines = content.split('\n').filter(Boolean)
  const narrativeParts: string[] = []
  const statParts: string[] = []

  for (const raw of lines) {
    const line = raw.trim()

    // 纯数值变化行
    if (/^【[^】]*[+-]\d+[^】]*】$/.test(line)) {
      statParts.push(colorizeStats(line))
      continue
    }

    // 角色对话
    const charMatch = line.match(/^【([^】]+)】(.*)/)
    if (charMatch) {
      const [, charName, dialogue] = charMatch
      const color = CHARACTER_COLORS[charName] || DEFAULT_COLOR
      narrativeParts.push(
        `<p class="dialogue-line"><span class="char-name" style="color:${color}">【${charName}】</span>${parseInlineContent(dialogue)}</p>`
      )
      continue
    }

    // 动作/旁白
    const actionMatch = line.match(/^[（(]([^）)]+)[）)]/) || line.match(/^\*([^*]+)\*/)
    if (actionMatch) {
      narrativeParts.push(`<p class="action">${parseInlineContent(line)}</p>`)
      continue
    }

    // 普通叙述
    narrativeParts.push(`<p class="narration">${parseInlineContent(line)}</p>`)
  }

  return {
    narrative: narrativeParts.join(''),
    statHtml: statParts.length > 0
      ? `<div class="stat-changes">${statParts.join('')}</div>`
      : '',
  }
}
