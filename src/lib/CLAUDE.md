# lib/ — 核心逻辑层

L2 | 父级: /11list-kuaichuan/CLAUDE.md

## 成员清单

- `data.ts`: ★种子文件，四世界全部类型定义 + 常量 + 16角色(makeChar工厂)/13场景/20道具/5章节/3事件/4结局，`World` 接口 + `getWorldCharacters/Scenes/Items` 过滤器（返回 Record）
- `script.md`: ★剧本直通，五模块原文（故事线/机制/人物/场景/道具），?raw import 注入 prompt
- `store.ts`: ★种子文件，Zustand+Immer 状态管理，Tab架构 + 世界切换 + 灵魂碎片收集 + 记忆丧失 + 双轨数值解析 + SSE 流式通信 + extractChoices + 链式反应 + storyRecords，SAVE_KEY='kuaichuan-save-v2'，兼容 v1
- `parser.ts`: AI 回复解析，16角色名着色 + extractChoices + marked渲染，零 data.ts 依赖
- `analytics.ts`: Umami 埋点，`kc_` 前缀，世界选择/碎片收集/记忆丧失/场景解锁/体力危机事件
- `stream.ts`: ☆零修改，SSE 流式通信
- `bgm.ts`: 背景音乐控制（useBgm hook + toggleBGM/isBGMPlaying 独立函数）
- `hooks.ts`: ☆零修改，useMediaQuery / useIsMobile

## 依赖关系

```
data.ts ← store.ts ← [所有组件]
              ↑
          stream.ts
          script.md (?raw import)
parser.ts (独立，零 data.ts 依赖)
analytics.ts ← store.ts
bgm.ts (独立)
```

## 关键架构决策

- `getWorldCharacters/Scenes/Items` 返回 `Record<string, T>`，组件中需要 `Object.values()` 转数组
- `getStatLevel` 返回 `{ level, name, color }`，渲染时用 `.name`
- `buildSystemPrompt` 注入 `GAME_SCRIPT`(script.md ?raw) + 动态状态快照
- `extractChoices` 从 AI 回复末尾分离 1-4 编号选项，不足 2 个时 fallback 上下文选项
- `parseStatChanges` 双轨：角色【名 好感+N】 + 全局【属性+N】

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
