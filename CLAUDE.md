# 快穿：千面情缘 — 四世界快穿恋爱交互叙事游戏

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Workers

## 核心设定

- 主题色: `#8b5cf6` (神秘紫) | 视觉: 暗色灵魂系
- CSS 前缀: `kc-` | 项目代号: `kuaichuan`
- 时间系统: 天制 (每世界 30 天, 6 时段/天, MAX_DAYS=30)
- 全局资源: `soulFragments` (灵魂碎片 0-4) + `lostMemories` (失去的记忆)
- 玩家属性: beauty/wisdom/stamina/charm/luck (全局跨世界)
- 四世界: palace(权谋深宫) / academy(学院奇缘) / xianmen(仙门传说) / apocalypse(末世求生)
- 每世界 4 角色, 共 16 NPC, 共享 StatMeta (affection + trust)
- 性别: 三选 (男/女/其他)
- 四态路由: StartScreen → WorldSelection → GameScreen → EndingModal

## 目录结构

```
worker/index.js          - CF Worker API 代理 (☆零修改)
public/
  audio/bgm.mp3          - 背景音乐
  characters/             - 角色立绘 (jpg): 16 角色 × 4 世界
  scenes/                 - 场景背景 (jpg): 1 灰色空间 + 12 世界场景
src/
  main.tsx               - React 入口 (☆零修改)
  App.tsx                - 根组件: 开场/世界选择/游戏/结局四态
  lib/                   - 核心逻辑层 (2种子 + 4辅助 + 3零修改)
  styles/globals.css     - 全局样式: kc- 前缀, 暗色灵魂系主题
  components/game/       - 游戏组件 (5文件)
```

## 关键架构决策

- `data.ts` 四世界架构: `World` 接口 + `worldId` 过滤 + `makeChar()` 工厂函数
- `data.ts` 共享 StatMeta: 所有 16 角色共用 `RELATION_STATS` (affection + trust)
- `store.ts` 世界切换: `selectWorld()` 初始化世界角色/场景, `completeWorld()` 收集碎片+失去记忆
- `store.ts` 双轨解析: `parseStatChanges` → `{ charChanges, globalChanges }`
- `store.ts` 结局优先级: BE(超时) → TE(4碎片+少失忆) → HE(3碎片) → NE(兜底)
- `parser.ts` 16 角色颜色映射, 零 data.ts 依赖

[PROTOCOL]: 变更时更新此头部
