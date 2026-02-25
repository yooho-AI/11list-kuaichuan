# lib/ — 核心逻辑层

L2 | 父级: /11list-kuaichuan/CLAUDE.md

## 成员清单

- `data.ts`: ★种子文件，四世界全部类型定义 + 常量 + 16角色/13场景/20道具/章节/事件/结局，`World` 接口 + `makeChar()` 工厂 + `getWorldCharacters/Scenes/Items` 过滤器
- `store.ts`: ★种子文件，Zustand+Immer 状态管理，四态路由 + 世界切换 + 灵魂碎片收集 + 记忆丧失 + 双轨数值解析 + SSE 流式通信，SAVE_KEY='kuaichuan-save-v1'
- `parser.ts`: AI 回复解析，16角色名着色 + 数值变化着色，零 data.ts 依赖
- `analytics.ts`: Umami 埋点，`kc_` 前缀，世界选择/碎片收集/记忆丧失事件
- `highlight.ts`: 高光时刻分析 + Ark SeeDream 图片/Seaweed 视频生成
- `stream.ts`: ☆零修改，SSE 流式通信
- `bgm.ts`: ☆零修改，背景音乐控制
- `hooks.ts`: ☆零修改，useMediaQuery / useIsMobile

## 依赖关系

```
data.ts ← store.ts ← [所有组件]
              ↑
          stream.ts
parser.ts (独立，零 data.ts 依赖)
highlight.ts (独立)
analytics.ts ← store.ts
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
