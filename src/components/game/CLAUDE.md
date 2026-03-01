# components/game/ — 游戏 UI 组件

L2 | 父级: /11list-kuaichuan/CLAUDE.md

## 成员清单

- `app-shell.tsx`: 游戏主框架：430px居中壳 + Header(世界/天数/时段/碎片/音乐/菜单) + Tab路由(AnimatePresence) + TabBar(5键：手帐/对话/场景/人物/记录) + 三向手势 + DashboardDrawer + RecordSheet(右滑抽屉) + Toast
- `dashboard-drawer.tsx`: 灵魂手帐(左抽屉)：Reorder拖拽排序8段(front/soul/cast/scenes/objectives/items/stats/music) + localStorage持久化 + 世界过滤角色/场景/道具
- `tab-dialogue.tsx`: 对话Tab：富消息路由(SceneCard/DayCard/WorldCard/NPC头像气泡/LetterCard/SystemBubble) + StreamingMessage + CollapsibleChoices(A/B/C/D卡片) + InventorySheet(底部弹出) + InputArea(背包+输入+发送)
- `tab-scene.tsx`: 场景Tab：SceneHero(9:16大图+渐变遮罩) + 场景描述 + 当前世界地点列表(解锁/锁定/当前状态)
- `tab-character.tsx`: 人物Tab：全局属性网格(2列) + SVG RelationGraph(中心"我"+4NPC) + 角色网格(2×2) + CharacterDossier(全屏右滑，50vh立绘+好感阶段+双条+秘密≥60解锁)

## 依赖关系

- 全部依赖 `@/lib/store` 的 useGameStore 及 re-export 的常量/类型
- `app-shell.tsx` 额外依赖 `@/lib/bgm` 的 toggleBGM
- `dashboard-drawer.tsx` 额外依赖 `@/lib/bgm` 的 toggleBGM / isBGMPlaying
- `tab-dialogue.tsx` 额外依赖 `@/lib/store` re-export 的 SCENES / ITEMS / WORLDS / parseStoryParagraph / getWorldItems

## 样式约定

- CSS class 前缀: `kc-`
- 主题色: #8b5cf6 (灵魂紫), 暗色背景 #0f0a1a
- 动画: kcPulse (呼吸脉冲), kcMirrorRipple (镜面涟漪), kcTypingBounce (打字弹跳)
- Phosphor Icons (@phosphor-icons/react): 所有功能性图标
- emoji 仅用于内容展示（道具icon、灵魂碎片💎、记忆💔）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
