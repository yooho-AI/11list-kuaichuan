# 快穿：千面情缘 — 四世界快穿恋爱交互叙事游戏

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Pages

## 架构

```
11list-kuaichuan/
├── worker/index.js              - ☆ CF Worker API 代理（备用，未部署）
├── public/
│   ├── audio/bgm.mp3            - 背景音乐
│   ├── characters/              - 16 角色立绘 jpg (4世界×4角色)
│   └── scenes/                  - 13 场景背景 jpg (1灰色空间+12世界场景)
├── src/
│   ├── main.tsx                 - ☆ React 入口
│   ├── vite-env.d.ts            - Vite 类型声明
│   ├── App.tsx                  - 根组件: 开场(StartScreen+WorldSelection) + AppShell + EndingModal(双按钮) + MenuOverlay
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型 + 16角色(makeChar工厂) + 13场景 + 20道具 + 5章节 + 3事件 + 4结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand+Immer + 富消息插入 + 双轨解析 + 链式反应 + Tab架构 + 存档v2
│   │   ├── parser.ts            - AI 回复解析（16角色着色 + extractChoices + marked渲染）
│   │   ├── analytics.ts         - Umami 埋点（kc_ 前缀，已集成到 store/App）
│   │   ├── stream.ts            - ☆ SSE 流式通信
│   │   ├── bgm.ts               - 背景音乐（useBgm hook + toggleBGM/isBGMPlaying 独立函数）
│   │   └── hooks.ts             - ☆ useMediaQuery / useIsMobile
│   ├── styles/
│   │   ├── globals.css          - 全局基础样式（kc- 前缀，暗紫主题 #8b5cf6）
│   │   ├── opening.css          - 开场样式：StartScreen + WorldSelection（灰色空间）
│   │   └── rich-cards.css       - 富UI组件：场景卡 + 日期卡 + 世界卡 + NPC气泡 + DashboardDrawer + RecordSheet + CharacterDossier + RelationGraph + Toast + InventorySheet
│   └── components/game/
│       ├── app-shell.tsx        - 游戏主框架: Header + Tab路由 + TabBar(5键) + 三向手势 + DashboardDrawer + RecordSheet + Toast
│       ├── dashboard-drawer.tsx - 灵魂手帐(左抽屉)：扉页+灵魂状态+角色轮播+场景缩略图+目标+道具格+属性+音乐。Reorder拖拽排序
│       ├── tab-dialogue.tsx     - 对话Tab：富消息路由(SceneCard/DayCard/WorldCard/NPC头像气泡) + 可折叠选项面板 + 背包 + 输入区
│       ├── tab-scene.tsx        - 场景Tab：9:16大图 + 描述 + 当前世界地点列表
│       └── tab-character.tsx    - 人物Tab：全局属性 + SVG RelationGraph + 角色网格 + CharacterDossier全屏档案
├── index.html
├── package.json
├── vite.config.ts               - ☆
├── tsconfig*.json               - ☆
└── wrangler.toml                - ☆
```

★ = 种子文件 ☆ = 零修改模板

## 核心设计

- **四世界快穿 + 恋爱线**：palace(权谋深宫)/academy(学院奇缘)/xianmen(仙门传说)/apocalypse(末世求生)
- **灵魂碎片机制**：每世界回收1碎片，代价失去1段记忆。4碎片全收集触发最终抉择
- **双轨数值**：5 全局属性（颜值/智慧/体力/魅力/运气）+ NPC 好感/信任（16角色共用 RELATION_STATS）
- **暗紫主题**：深紫底(#0f0a1a)+灵魂紫(#8b5cf6)，暗色毛玻璃，kc- CSS 前缀
- **6 时段制**：清晨/上午/中午/下午/傍晚/深夜，每世界30天
- **剧本直通**：script.md 存五模块原文，?raw import 注入 prompt
- **4 结局**：BE(消散) + TE(重逢) + HE(新生) + NE(轮回之镜)，优先级 BE→TE→HE→NE

## 富UI组件系统

| 组件 | 位置 | 触发 | 视觉风格 |
|------|------|------|----------|
| DashboardDrawer | dashboard-drawer | Header📓+右滑手势 | 毛玻璃左抽屉：扉页+灵魂状态(碎片/记忆)+角色轮播+场景缩略+目标+道具+属性+音乐。Reorder拖拽排序 |
| RecordSheet | app-shell | Header📜+左滑手势 | 右侧滑入事件记录：时间线倒序+紫色圆点 |
| SceneTransitionCard | tab-dialogue | selectScene | 场景背景+Ken Burns(8s)+渐变遮罩+角标 |
| DayCard | tab-dialogue | 换天 | 日历撕页风弹簧落入+章节名 |
| WorldChangeCard | tab-dialogue | selectWorld | 世界图标+名称+描述 |
| RelationGraph | tab-character | 始终可见 | SVG环形布局：中心"我"+当前世界4NPC立绘节点+连线+关系标签 |
| CharacterDossier | tab-character | 点击角色 | 全屏右滑入+50vh立绘+好感阶段+affection/trust双条+秘密(≥60解锁) |
| CollapsibleChoices | tab-dialogue | AI回复后 | 收起态横条+展开态A/B/C/D卡片，isTyping时自动收起 |
| InventorySheet | tab-dialogue | 背包按钮 | 底部弹出，世界过滤道具 |
| Toast | app-shell | saveGame | TabBar上方弹出2s消失 |

## 三向手势导航

- **右滑**（任意主Tab内容区）→ 左侧灵魂手帐
- **左滑**（任意主Tab内容区）→ 右侧事件记录
- Header 按钮（📓/📜）同等触发
- 手帐内组件支持拖拽排序（Reorder + localStorage `kc-dash-order` 持久化）

## TabBar 5 键

Notebook(手帐) | ChatCircleDots(对话) | MapTrifold(场景) | Users(人物) | Scroll(记录)

## Store 状态

- `activeTab: 'dialogue' | 'scene' | 'character'` — 三Tab切换
- `choices: string[]` — AI生成的选项（extractChoices解析）
- `showDashboard: boolean` — 左抽屉开关
- `showRecords: boolean` — 右抽屉开关
- `storyRecords: StoryRecord[]` — 事件记录（sendMessage和advanceTime自动追加）
- `selectCharacter` 末尾自动跳转 dialogue Tab

## 富消息机制

Message 类型扩展 `type` 字段路由渲染：
- `scene-transition` → SceneTransitionCard（selectScene 触发）
- `episode-change` → DayCard（advanceTime 换天时触发）
- `world-change` → WorldChangeCard
- NPC 消息带 `character` 字段 → 28px 圆形立绘头像

## Analytics 集成

- `trackGameStart` / `trackPlayerCreate` → store.ts initGame
- `trackGameContinue` → store.ts loadGame
- `trackTimeAdvance` / `trackChapterEnter` → store.ts advanceTime
- `trackEndingReached` → store.ts checkEnding
- `trackStaminaCrisis` → store.ts applyChainReactions
- `trackSceneUnlock` → store.ts selectScene/advanceTime

[PROTOCOL]: 变更时更新此头部
