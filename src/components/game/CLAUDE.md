# components/game/ — 游戏 UI 组件

L2 | 父级: /11list-kuaichuan/CLAUDE.md

## 成员清单

- `character-panel.tsx`: PC 端左侧面板，场景卡片/场景选择(worldId 过滤)/角色立绘/角色信息(StatMeta 驱动)/PlayerStatsBar(5属性)/角色列表
- `dialogue-panel.tsx`: PC 端中间对话面板，LetterCard 介绍信/消息列表/流式消息/输入区+背包入口
- `side-panel.tsx`: PC 端右侧面板，背包(道具使用)/关系总览(好感排序)/导航按钮
- `mobile-layout.tsx`: 移动端自适应布局，MobileHeader/CharacterSheet/InventorySheet/SceneSheet/MobileMenu/EndingSheet
- `highlight-modal.tsx`: 高光时刻弹窗，5阶段(分析→选择→风格→生成→结果)，主色 #8b5cf6，暗色主题

## 依赖关系

- 全部依赖 `@/lib/store` 的 useGameStore
- `highlight-modal.tsx` 额外依赖 `@/lib/highlight` 全部导出
- `dialogue-panel.tsx` 额外依赖 `@/lib/parser` 的 parseStoryParagraph
- `mobile-layout.tsx` 额外依赖 `@/lib/parser` + `@/lib/bgm`

## 样式约定

- CSS class 前缀: `kc-`
- 主题色: #8b5cf6 (紫色), 暗色背景 #0f0a1a/#1a1030
- 动画: kcSoulPulse (灵魂脉冲), kcMirrorRipple (镜面涟漪), kcTypingBounce (打字弹跳)

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
