/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供游戏全部类型定义、常量、4世界角色/场景/道具/章节/事件/结局数据
 * [POS]: lib 核心数据层，被 store.ts 消费，是整个四世界快穿系统的数据基石
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 类型定义
// ============================================================

export interface TimePeriod {
  index: number
  name: string
  icon: string
  hours: string
}

export interface StatMeta {
  key: string
  label: string
  color: string
  icon: string
  category?: 'relation' | 'status' | 'skill'
}

export type CharacterStats = Record<string, number>

export interface Character {
  id: string
  worldId: string
  name: string
  avatar: string
  fullImage: string
  gender: 'female' | 'male'
  age: number
  title: string
  description: string
  personality: string
  speakingStyle: string
  secret: string
  triggerPoints: string[]
  behaviorPatterns: string
  themeColor: string
  joinDay: number
  statMetas: StatMeta[]
  initialStats: CharacterStats
}

export interface World {
  id: string
  name: string
  icon: string
  description: string
  background: string
  atmosphere: string
}

export interface Scene {
  id: string
  worldId: string
  name: string
  icon: string
  description: string
  background: string
  atmosphere: string
  tags: string[]
  unlockCondition?: {
    event?: string
    stat?: { charId: string; key: string; min: number }
  }
}

export interface GameItem {
  id: string
  worldId: string | 'universal'
  name: string
  icon: string
  type: 'consumable' | 'collectible' | 'quest' | 'social'
  description: string
  maxCount?: number
}

export interface Chapter {
  id: number
  name: string
  dayRange: [number, number]
  description: string
  objectives: string[]
  atmosphere: string
}

export interface ForcedEvent {
  id: string
  name: string
  triggerDay: number
  triggerPeriod?: number
  description: string
}

export interface Ending {
  id: string
  name: string
  type: 'TE' | 'HE' | 'NE' | 'BE'
  description: string
  condition: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  character?: string
  timestamp: number
}

// ============================================================
// 常量
// ============================================================

export const PERIODS: TimePeriod[] = [
  { index: 0, name: '清晨', icon: '🌅', hours: '05:00-08:59' },
  { index: 1, name: '上午', icon: '☀️', hours: '09:00-11:59' },
  { index: 2, name: '中午', icon: '🌞', hours: '12:00-13:59' },
  { index: 3, name: '下午', icon: '⛅', hours: '14:00-16:59' },
  { index: 4, name: '傍晚', icon: '🌇', hours: '17:00-19:59' },
  { index: 5, name: '深夜', icon: '🌙', hours: '20:00-04:59' },
]

export const MAX_DAYS = 30
export const MAX_ACTION_POINTS = 6

// ============================================================
// 共享 StatMeta 模板（所有角色: 好感度 + 信任度）
// ============================================================

const RELATION_STATS: StatMeta[] = [
  { key: 'affection', label: '好感', color: '#ff6b9d', icon: '❤️', category: 'relation' },
  { key: 'trust', label: '信任', color: '#4fc3f7', icon: '🤝', category: 'relation' },
]

// ============================================================
// 四个世界
// ============================================================

export const WORLDS: World[] = [
  {
    id: 'palace',
    name: '权谋深宫',
    icon: '🏯',
    description: '大胤王朝，天启十三年。你是一名身份低微的宫女，被卷入后宫争斗的漩涡。',
    background: '/scenes/palace.jpg',
    atmosphere: '金碧辉煌的宫殿，暗流涌动的权力博弈',
  },
  {
    id: 'academy',
    name: '学院奇缘',
    icon: '🏫',
    description: '星辉学院，精英云集的私立高中。你是一名转学生，四位性格迥异的男生闯入你的生活。',
    background: '/scenes/academy.jpg',
    atmosphere: '阳光明媚的校园，青春洋溢的气息',
  },
  {
    id: 'xianmen',
    name: '仙门传说',
    icon: '⛰️',
    description: '玄天大陆，修仙盛世。你是资质平庸的外门弟子，因奇遇获得上古传承。',
    background: '/scenes/xianmen.jpg',
    atmosphere: '云雾缭绕的仙山，剑气纵横的修仙世界',
  },
  {
    id: 'apocalypse',
    name: '末世求生',
    icon: '🏚️',
    description: '病毒爆发后的第三年，人类文明濒临崩溃。你是一名幸存者，在废墟中寻找生机。',
    background: '/scenes/apocalypse.jpg',
    atmosphere: '废墟遍地的末世，危机四伏的求生之路',
  },
]

// ============================================================
// 角色工厂
// ============================================================

function makeChar(
  worldId: string, id: string, name: string, themeColor: string,
  age: number, title: string, desc: string, personality: string,
  speakingStyle: string, secret: string, triggers: string[],
  behavior: string, initAff: number, initTrust: number,
): Character {
  return {
    id, worldId, name, themeColor, gender: 'male', age, title,
    description: desc, personality, speakingStyle, secret,
    triggerPoints: triggers, behaviorPatterns: behavior,
    avatar: `/characters/${id}.jpg`, fullImage: `/characters/${id}.jpg`,
    joinDay: 1, statMetas: RELATION_STATS,
    initialStats: { affection: initAff, trust: initTrust },
  }
}

// ── 权谋深宫 ──────────────────────────────────────────────

const CHAR_PALACE = {
  jingheng: makeChar('palace', 'jingheng', '萧景珩', '#4a90d9',
    22, '太子·储君',
    '皇帝嫡长子，母后早逝，在宫廷斗争中成长。表面温润如玉，实则城府极深，为夺皇位不择手段。',
    '完美主义，隐忍克制，责任感极强，内心孤独渴望被理解',
    '语速不急不缓，音量适中低沉有磁性，多用陈述句，常说"应当""必须"，紧张时摩挲玉佩',
    '母后并非病逝，而是被后宫嫔妃毒害。他知道真相，但为大局隐忍不发',
    ['不要提他母亲', '不要质疑他的能力', '不要说他不配得到爱'],
    '低好感疏离礼貌，中好感偶尔露出笑容暗中关注，高好感温柔体贴愿意分享心事',
    20, 10,
  ),
  jingyan: makeChar('palace', 'jingyan', '萧景琰', '#e74c3c',
    25, '摄政王',
    '先帝幼弟，权倾朝野。表面冷酷无情，实则为保护年幼侄子不被权臣所害。',
    '冷酷桀骜，占有欲强，内心脆弱用强硬外表掩盖伤痕',
    '语速较快透着不耐烦，声音低沉，常用"啧""哼""切"，紧张时摩挲眉骨疤痕',
    '并非真心想摄政，只是为保护年幼侄子。一直想还政于皇帝，但时机未到',
    ['不要提他的家庭', '不要说他是坏人', '不要离开他'],
    '低好感冷嘲热讽挑衅，中好感嘴硬心软暗中帮忙，高好感霸道占有想把你留在身边',
    10, 5,
  ),
  wujiu: makeChar('palace', 'wujiu', '谢无咎', '#27ae60',
    24, '禁军统领',
    '武将世家出身，父亲战死沙场。忠诚耿直，守护皇室，却藏着不为人知的过去。',
    '忠诚正直，温柔体贴，内心自卑觉得自己不够好，守护欲极强',
    '语速适中温柔清晰，常说"没关系""我来帮你""别担心"，紧张时整理衣服或头发',
    '曾暗中保护太子多次，但太子并不知情。一直觉得自己配不上太子的信任',
    ['不要说他没用', '不要拒绝他的帮助', '不要让他觉得不被需要'],
    '低好感友善温和主动关心，中好感无条件满足展现脆弱面，高好感为你牺牲一切',
    30, 20,
  ),
  qingci: makeChar('palace', 'qingci', '沈清辞', '#f39c12',
    23, '太医院首席太医',
    '医学世家出身，祖父是前朝御医。温润如玉，医术高超，似乎知道你的秘密。',
    '温润洞察，游戏人间，看似玩世不恭实则看透一切，内心深沉孤独',
    '语速适中带着玩味，常说"随便""无所谓""看心情"，紧张时喝酒或把玩药瓶',
    '知道皇后死亡的真相，一直在等待时机为皇后报仇',
    ['不要试图束缚他', '不要说他不负责任', '不要让他感到失去自由'],
    '低好感玩味调侃试探，中好感卸下面具真诚温柔，高好感愿意为你停留放弃自由',
    25, 15,
  ),
}

// ── 学院奇缘 ──────────────────────────────────────────────

const CHAR_ACADEMY = {
  linyuan: makeChar('academy', 'linyuan', '江临渊', '#4a90d9',
    18, '学生会主席',
    '江氏集团独子，成绩优异的完美学长。父母常年在国外，表面朋友众多实则孤独。',
    '完美主义，隐忍克制，害怕黑暗因童年被绑架经历，患有严重失眠症',
    '语速不急不缓，简洁明了，多用陈述句，紧张时摩挲钢笔',
    '患有严重失眠症，每晚靠安眠药入睡。害怕黑暗，因童年被绑架',
    ['不要提他的父母', '不要质疑他的能力', '不要说他不配被爱'],
    '低好感礼貌疏离公事公办，中好感关注你暗中帮助，高好感深情体贴放下完美伪装',
    20, 10,
  ),
  luye: makeChar('academy', 'luye', '陆野', '#e74c3c',
    18, '校霸',
    '单亲家庭，母亲早逝父亲酗酒家暴。桀骜不驯打架斗殴，却在你被欺负时挺身而出。',
    '冷酷桀骜，占有欲强，内心渴望被爱被接受，用强硬外表保护自己',
    '语速较快不耐烦，常用"滚""别烦我""关你什么事"，紧张时摩挲眉骨疤痕',
    '并非真想当校霸，只是为保护自己不被欺负。其实成绩很好但故意考差',
    ['不要提他的家庭', '不要说他是坏人', '不要离开他'],
    '低好感冷嘲热讽找茬，中好感嘴上拒绝暗中帮忙，高好感霸道深情把你拉进怀里',
    10, 5,
  ),
  mobai: makeChar('academy', 'mobai', '苏墨白', '#27ae60',
    16, '天才少年·跳级生',
    '书香门第，父母都是教授。智商超群的跳级生，因年龄差距被孤立，不懂人情世故。',
    '忠诚正直，温柔体贴，内心自卑渴望交朋友，羡慕正常同龄人',
    '语速适中温柔清晰，常说"没关系""我来帮你"，紧张时整理书本或眼镜',
    '很想交朋友但因年龄差距被孤立。羡慕那些能正常上学的同龄人',
    ['不要说他没用不够好', '不要拒绝他的帮助', '不要让他觉得不被需要'],
    '低好感友善感激主动关心，中好感脸红展现脆弱面，高好感深情守护为你牺牲一切',
    30, 20,
  ),
  yanxi: makeChar('academy', 'yanxi', '顾言希', '#f39c12',
    18, '艺术生·画家',
    '艺术世家，父母都是画家。温柔体贴擅长绘画，似乎能看透你的内心。',
    '温润洞察，游戏人间，用艺术表达内心，渴望有人看懂他的画',
    '语速适中带着玩味，常说"随便""看心情"，紧张时画画或抚摸画笔',
    '画作中隐藏着他对世界的看法，但无人理解。渴望有人能看懂他的画',
    ['不要试图束缚他', '不要说他不负责任', '不要让他感到被控制'],
    '低好感挑眉玩味试探，中好感收起面具真诚温柔，高好感愿意为你停留安定下来',
    25, 15,
  ),
}

// ── 仙门传说 ──────────────────────────────────────────────

const CHAR_XIANMEN = {
  lingxiao: makeChar('xianmen', 'lingxiao', '凌霄', '#4a90d9',
    25, '天剑宗首席大弟子',
    '孤儿被掌门收养，剑道天才。冷峻孤傲却对你格外关注，下一任掌门继承人。',
    '完美主义，隐忍克制，害怕被发现修为来源的秘密，孤独渴望理解',
    '语速从容，简洁精准，多用陈述句，紧张时握紧佩剑剑柄',
    '修为并非完全靠修炼，幼时误食上古仙丹。害怕被发现被当成异类',
    ['不要提他的身世', '不要质疑他的修为', '不要说他不配被爱'],
    '低好感疏离冷峻点头示意，中好感关注你破例帮助，高好感温柔深情卸下孤傲',
    20, 10,
  ),
  wushang: makeChar('xianmen', 'wushang', '夜无殇', '#e74c3c',
    28, '魔尊·魔界之主',
    '孤儿被前任魔尊收养，亦正亦邪。表面与正道为敌，实为保护魔界子民。',
    '冷酷桀骜，占有欲强，曾救过正道弟子无人知晓，内心孤独',
    '语速较快带着压迫感，声音低沉危险，常用"有趣""大胆"，紧张时握紧魔剑',
    '并非想与正道为敌，只想保护魔界子民不被正道欺凌',
    ['不要提他的过去', '不要说他是邪魔', '不要离开他'],
    '低好感危险审视充满压迫，中好感另眼相看暗中庇护，高好感霸道深情将你囚在身边',
    10, 5,
  ),
  wuchen: makeChar('xianmen', 'wuchen', '白无尘', '#27ae60',
    22, '药王谷少主',
    '药王谷谷主独子，医术通神。温润如玉总在关键时刻出现，对你格外温柔。',
    '忠诚正直，温柔体贴，内心自卑觉得医术来路不正，守护欲极强',
    '语速适中温柔如水，常说"别担心""我来"，紧张时整理药囊',
    '医术并非完全靠学习，幼时误食药王谷至宝。害怕被发现被当成异类',
    ['不要说他没用', '不要拒绝他的帮助', '不要让他觉得不被需要'],
    '低好感温柔关心主动帮助，中好感展现脆弱面深深依赖，高好感为你牺牲一切',
    30, 20,
  ),
  xinghe: makeChar('xianmen', 'xinghe', '楚星河', '#f39c12',
    24, '散修·游侠',
    '孤儿被散修收养，三教九流朋友众多。潇洒不羁游戏人间，却愿意为你停留。',
    '温润洞察，游戏人间，实则在寻找前世恋人的转世，内心孤独',
    '语速随意带着笑意，常说"随缘""天涯何处不相逢"，紧张时喝酒',
    '并非真的游戏人间，在寻找前世恋人的转世。他一直在等那个人',
    ['不要束缚他', '不要说他不负责任', '不要让他失去自由感'],
    '低好感洒脱玩味调侃，中好感认真卸下面具，高好感为你停留放弃浪迹天涯',
    25, 15,
  ),
}

// ── 末世求生 ──────────────────────────────────────────────

const CHAR_APOCALYPSE = {
  chenzhou: makeChar('apocalypse', 'chenzhou', '霍沉舟', '#4a90d9',
    28, '基地最高指挥官',
    '军人世家，父母在病毒爆发初期牺牲。铁血冷酷掌握生杀大权，为达目的不择手段。',
    '完美主义，隐忍克制，亲手结束被感染好友的生命一直自责',
    '语速干脆利落如军令，简洁精准，多用命令句，紧张时握紧配枪',
    '在病毒爆发初期亲手结束了被感染好友的生命。一直觉得自己不配活着',
    ['不要提他的好友', '不要质疑他的决策', '不要说他冷血无情'],
    '低好感公事公办不带感情，中好感暗中关注破例帮助，高好感深情温柔卸下铠甲',
    20, 10,
  ),
  jianghan: makeChar('apocalypse', 'jianghan', '江寒', '#e74c3c',
    26, '狙击手·精英战士',
    '孤儿院长大，沉默寡言枪法如神。曾救过一个女孩但被背叛，对你格外温柔。',
    '冷酷桀骜，占有欲强，被背叛后封闭内心，对你是例外',
    '语速极慢极简，能不说话就不说，紧张时擦拭狙击枪',
    '在病毒爆发初期救过一个女孩，但女孩后来背叛了他。无法释怀',
    ['不要提那个女孩', '不要说他冷血', '不要离开他'],
    '低好感沉默警惕冷漠，中好感沉默但行动关心，高好感用行动证明爱霸道守护',
    10, 5,
  ),
  mubai: makeChar('apocalypse', 'mubai', '沈慕白', '#27ae60',
    27, '首席医生·病毒研究专家',
    '医学世家，父母在病毒爆发初期牺牲。温润如玉救死扶伤，似乎知道病毒真相。',
    '忠诚正直，温柔体贴，发现病毒真相不敢公开，觉得救不了所有人而自责',
    '语速温和从容，常说"没事的""交给我"，紧张时整理白大褂或听诊器',
    '在病毒研究中发现了病毒的真相，但不敢公开。一直自责救不了所有人',
    ['不要说他无能', '不要拒绝他的治疗', '不要让他觉得不被需要'],
    '低好感温柔关心专业尽职，中好感展现脆弱面分享秘密，高好感为你牺牲研究成果',
    30, 20,
  ),
  guye: makeChar('apocalypse', 'guye', '顾野', '#f39c12',
    25, '机械师·技术天才',
    '机械世家出身，在机械中找到安慰因为机械不会背叛。玩世不恭却总在关键时刻出现。',
    '温润洞察，游戏人间，害怕与人建立深厚关系，用幽默掩饰孤独',
    '语速随意带着玩笑，常说"小意思""交给本天才"，紧张时拆装机械零件',
    '在机械中找到安慰，害怕与人建立深厚关系。曾失去重要的人',
    ['不要束缚他', '不要说他不认真', '不要让他觉得被控制'],
    '低好感嬉皮笑脸搞怪，中好感收起玩笑认真对待，高好感为你放下防备愿意安定',
    25, 15,
  ),
}

// ── 角色汇总 ──────────────────────────────────────────────

const ALL_CHARACTERS: Record<string, Character> = {
  ...CHAR_PALACE, ...CHAR_ACADEMY, ...CHAR_XIANMEN, ...CHAR_APOCALYPSE,
}

export function buildCharacters(
  _playerGender: 'male' | 'female' | 'unspecified',
  worldId?: string,
): Record<string, Character> {
  if (!worldId) return ALL_CHARACTERS
  return Object.fromEntries(
    Object.entries(ALL_CHARACTERS).filter(([, c]) => c.worldId === worldId)
  )
}

export function getWorldCharacters(worldId: string): Record<string, Character> {
  return Object.fromEntries(
    Object.entries(ALL_CHARACTERS).filter(([, c]) => c.worldId === worldId)
  )
}

// ============================================================
// 场景
// ============================================================

export const SCENES: Record<string, Scene> = {
  // ── 灰色空间（跨世界） ──
  grayspace: {
    id: 'grayspace', worldId: 'universal', name: '灰色空间', icon: '🪞',
    description: '介于生死之间的虚空，一面古老的轮回之镜悬浮在眼前',
    background: '/scenes/grayspace.jpg',
    atmosphere: '空灵寂静，时间在此凝固，只有镜面的涟漪在微微荡漾',
    tags: ['灰色空间', '轮回之镜'],
  },
  // ── 权谋深宫 ──
  palace_study: {
    id: 'palace_study', worldId: 'palace', name: '东宫书房', icon: '📜',
    description: '紫檀书架环绕，黄花梨书案上文房四宝整齐，龙涎香袅袅',
    background: '/scenes/palace_study.jpg',
    atmosphere: '沉稳庄重，龙涎香混合墨香，透着权力与责任的压抑',
    tags: ['太子', '政务', '密谈'],
  },
  palace_regent: {
    id: 'palace_regent', worldId: 'palace', name: '摄政王府', icon: '⚔️',
    description: '玄色墙壁刻着暗纹，玄铁书案上铺着兵书地图，长剑悬于壁上',
    background: '/scenes/palace_regent.jpg',
    atmosphere: '危险压抑，檀香混合淡淡血腥味，透着权力与孤独',
    tags: ['摄政王', '密谋', '危险'],
  },
  palace_garden: {
    id: 'palace_garden', worldId: 'palace', name: '御花园', icon: '🌸',
    description: '四季花开不败，九曲桥横跨清溪，雕梁画栋精美绝伦',
    background: '/scenes/palace_garden.jpg',
    atmosphere: '宁静美好，各种花香醉人，美好与危险并存',
    tags: ['偶遇', '散步', '花园'],
  },
  // ── 学院奇缘 ──
  academy_office: {
    id: 'academy_office', worldId: 'academy', name: '学生会办公室', icon: '🏢',
    description: '落地窗外是学院花园，长桌皮椅，角落咖啡机飘香',
    background: '/scenes/academy_office.jpg',
    atmosphere: '忙碌有序，咖啡香混合墨香，透着完美与孤独',
    tags: ['学生会', '会长', '工作'],
  },
  academy_rooftop: {
    id: 'academy_rooftop', worldId: 'academy', name: '天台', icon: '🌆',
    description: '四周护栏，角落旧桌椅，远处城市天际线，夕阳格外美丽',
    background: '/scenes/academy_rooftop.jpg',
    atmosphere: '孤独自由，清风混合淡淡烟草味，透着叛逆与自由',
    tags: ['校霸', '独处', '自由'],
  },
  academy_art: {
    id: 'academy_art', worldId: 'academy', name: '美术教室', icon: '🎨',
    description: '墙上挂满画作，画架画板林立，颜料与松节油香气弥漫',
    background: '/scenes/academy_art.jpg',
    atmosphere: '自由艺术，金色阳光洒入，透着创作灵感与忧郁',
    tags: ['艺术', '绘画', '创作'],
  },
  // ── 仙门传说 ──
  xianmen_peak: {
    id: 'xianmen_peak', worldId: 'xianmen', name: '剑峰修炼场', icon: '⚔️',
    description: '高耸入云的剑峰，青石平台上数百柄长剑组成剑阵，千年古松屹立',
    background: '/scenes/xianmen_peak.jpg',
    atmosphere: '清冷高洁，剑气与松香交织，透着孤独与超脱',
    tags: ['修炼', '剑道', '大师兄'],
  },
  xianmen_demon: {
    id: 'xianmen_demon', worldId: 'xianmen', name: '魔宫大殿', icon: '👿',
    description: '玄色殿堂刻满魔纹，玄铁王座铺着皮毛，漆黑镜面吞噬一切',
    background: '/scenes/xianmen_demon.jpg',
    atmosphere: '危险压抑，血腥与玄铁冷香交织，透着权力与孤独',
    tags: ['魔界', '魔尊', '危险'],
  },
  xianmen_herbs: {
    id: 'xianmen_herbs', worldId: 'xianmen', name: '药王谷药园', icon: '🌿',
    description: '珍稀药材遍布，清溪灌溉，小亭供人休憩，药香清新治愈',
    background: '/scenes/xianmen_herbs.jpg',
    atmosphere: '宁静治愈，各种药香混合清泉，透着温馨与宁静',
    tags: ['药园', '采药', '治愈'],
  },
  // ── 末世求生 ──
  apocalypse_hq: {
    id: 'apocalypse_hq', worldId: 'apocalypse', name: '指挥中心', icon: '📡',
    description: '巨大帐篷内设备林立，地图上插满标记，无线电嗡嗡作响',
    background: '/scenes/apocalypse_hq.jpg',
    atmosphere: '紧张忙碌，金属与汗味交织，透着责任与压力',
    tags: ['指挥', '作战', '决策'],
  },
  apocalypse_sniper: {
    id: 'apocalypse_sniper', worldId: 'apocalypse', name: '狙击点', icon: '🎯',
    description: '高楼伪装网下，狙击枪架在支架上，远处废墟中偶有丧尸游荡',
    background: '/scenes/apocalypse_sniper.jpg',
    atmosphere: '危险孤独，硝烟与血腥气交织，透着冷静与守护',
    tags: ['狙击', '瞭望', '守护'],
  },
  apocalypse_med: {
    id: 'apocalypse_med', worldId: 'apocalypse', name: '医疗中心', icon: '🏥',
    description: '病床医疗设备排列，手术台旁器械齐备，药品柜存满药物',
    background: '/scenes/apocalypse_med.jpg',
    atmosphere: '严肃紧张，消毒水与药味交织，透着生命与希望',
    tags: ['医疗', '研究', '治愈'],
  },
}

// ============================================================
// 道具
// ============================================================

export const ITEMS: Record<string, GameItem> = {
  // ── 通用道具 ──
  detector: {
    id: 'detector', worldId: 'universal', name: '灵魂碎片探测器', icon: '🪞',
    type: 'quest', description: '古朴铜镜，镜面如水波荡漾，可探测灵魂碎片位置',
  },
  memory_stone: {
    id: 'memory_stone', worldId: 'universal', name: '记忆之石', icon: '💎',
    type: 'consumable', description: '晶莹水晶内有光晕流动，可暂时恢复一段失去的记忆', maxCount: 4,
  },
  potion: {
    id: 'potion', worldId: 'universal', name: '恢复药水', icon: '🧪',
    type: 'consumable', description: '红色药水，恢复体力值', maxCount: 10,
  },
  candy: {
    id: 'candy', worldId: 'universal', name: '心情糖果', icon: '🍬',
    type: 'social', description: '彩色糖果，赠送可提升角色心情',
  },
  // ── 权谋深宫 ──
  jade_pendant: {
    id: 'jade_pendant', worldId: 'palace', name: '羊脂白玉佩', icon: '🟢',
    type: 'quest', description: '温润如脂刻着凤凰图案，太子母后遗物',
  },
  tally: {
    id: 'tally', worldId: 'palace', name: '玄铁兵符', icon: '🔱',
    type: 'quest', description: '刻着"摄政王令"的令牌，可调动禁军',
  },
  military_tag: {
    id: 'military_tag', worldId: 'palace', name: '禁军军牌', icon: '🏷️',
    type: 'quest', description: '铜牌刻着禁军标志，谢无咎的身份象征',
  },
  silver_needles: {
    id: 'silver_needles', worldId: 'palace', name: '太医银针', icon: '💉',
    type: 'quest', description: '精致银针插在锦缎针囊中，沈清辞的医术工具',
  },
  // ── 学院奇缘 ──
  badge: {
    id: 'badge', worldId: 'academy', name: '学生会徽章', icon: '📛',
    type: 'quest', description: '金色徽章刻着星辉学院校徽，江临渊的身份象征',
  },
  lighter: {
    id: 'lighter', worldId: 'academy', name: '复古打火机', icon: '🔥',
    type: 'quest', description: '银色打火机刻着狼的图案，陆野的私人物品',
  },
  notebook: {
    id: 'notebook', worldId: 'academy', name: '精装笔记本', icon: '📓',
    type: 'quest', description: '皮面精装笔记本，苏墨白用来记录知识',
  },
  brushes: {
    id: 'brushes', worldId: 'academy', name: '专业油画笔', icon: '🖌️',
    type: 'quest', description: '专业油画笔套装各型号齐全，顾言希的创作工具',
  },
  // ── 仙门传说 ──
  xuanxiao_sword: {
    id: 'xuanxiao_sword', worldId: 'xianmen', name: '玄霄剑', icon: '🗡️',
    type: 'quest', description: '古朴长剑泛着银光，剑柄刻"玄霄"二字',
  },
  demon_sword: {
    id: 'demon_sword', worldId: 'xianmen', name: '无殇魔剑', icon: '⚔️',
    type: 'quest', description: '漆黑长剑泛着暗红光芒，魔界至宝',
  },
  herb_pouch: {
    id: 'herb_pouch', worldId: 'xianmen', name: '药王谷药囊', icon: '🎒',
    type: 'quest', description: '绣着药草纹的锦囊，装着珍稀药材',
  },
  wine_gourd: {
    id: 'wine_gourd', worldId: 'xianmen', name: '醉仙酒葫芦', icon: '🍶',
    type: 'quest', description: '古朴酒葫芦刻着"醉仙"二字，楚星河的标志',
  },
  // ── 末世求生 ──
  pistol: {
    id: 'pistol', worldId: 'apocalypse', name: '军用配枪', icon: '🔫',
    type: 'quest', description: '黑色军用配枪保养精良，霍沉舟多年伙伴',
  },
  sniper_rifle: {
    id: 'sniper_rifle', worldId: 'apocalypse', name: '高精度狙击枪', icon: '🎯',
    type: 'quest', description: '高精度狙击枪刻着编号，江寒的生命',
  },
  medkit: {
    id: 'medkit', worldId: 'apocalypse', name: '急救医疗箱', icon: '🩺',
    type: 'quest', description: '白色医疗箱装着各种急救用品，沈慕白的使命',
  },
  toolbox: {
    id: 'toolbox', worldId: 'apocalypse', name: '机械工具箱', icon: '🔧',
    type: 'quest', description: '银色工具箱装满机械工具，顾野的世界',
  },
}

// ============================================================
// 章节（每个世界通用结构）
// ============================================================

export const CHAPTERS: Chapter[] = [
  {
    id: 1, name: '初入世界', dayRange: [1, 5],
    description: '适应新世界的身份，与四位男主建立初步联系',
    objectives: ['了解世界背景', '与四位男主初遇', '建立初步联系'],
    atmosphere: '新奇与迷茫交织，充满未知的期待',
  },
  {
    id: 2, name: '渐生情愫', dayRange: [6, 12],
    description: '深入了解男主们的性格与秘密，好感逐步萌芽',
    objectives: ['与至少两位男主好感达到40', '发现世界的隐藏线索'],
    atmosphere: '关系逐渐升温，暗涌开始浮现',
  },
  {
    id: 3, name: '心意相通', dayRange: [13, 20],
    description: '感情升温至关键节点，男主们的秘密逐渐浮出水面',
    objectives: ['与一位男主好感达到70', '解锁心结剧情'],
    atmosphere: '感情加速升温，真相即将揭晓',
  },
  {
    id: 4, name: '抉择时刻', dayRange: [21, 27],
    description: '真相揭露后的艰难抉择，帮助男主解开心结',
    objectives: ['帮助男主解开心结', '好感度达到90'],
    atmosphere: '矛盾激化，抉择的重压笼罩一切',
  },
  {
    id: 5, name: '灵魂回收', dayRange: [28, 30],
    description: '爱意满盈的最后时刻，回收灵魂碎片的终章',
    objectives: ['好感度达到100', '回收灵魂碎片'],
    atmosphere: '一切走向终局，离别与新生交织',
  },
]

// ============================================================
// 强制事件
// ============================================================

export const FORCED_EVENTS: ForcedEvent[] = [
  {
    id: 'world_entry', name: '初入世界',
    triggerDay: 1, triggerPeriod: 0,
    description: '你穿越到了新世界，获得了新的身份。四位命运交织的男子即将出现在你面前。',
  },
  {
    id: 'midpoint_crisis', name: '信任危机',
    triggerDay: 15,
    description: '一个突发事件动摇了你与男主们的关系，你必须做出关键抉择来证明自己。',
  },
  {
    id: 'secret_reveal', name: '秘密浮现',
    triggerDay: 22,
    description: '男主最深处的秘密终于浮出水面。你如何回应，将决定一切的走向。',
  },
]

// ============================================================
// 结局
// ============================================================

export const ENDINGS: Ending[] = [
  {
    id: 'te-reunion', name: '重逢', type: 'TE',
    description: '你保留了所有记忆复活，那些被你治愈的灵魂以不同身份出现在新世界。真爱超越轮回。',
    condition: '集齐四个灵魂碎片 + 触发所有记忆碎片事件 + 最终选择"相信缘分"',
  },
  {
    id: 'he-rebirth', name: '新生', type: 'HE',
    description: '你复活了，回到原来的世界。不记得那些男主，但灵魂已完整。温馨中带着遗憾。',
    condition: '集齐四个灵魂碎片 + 选择复活',
  },
  {
    id: 'ne-mirror', name: '轮回之镜', type: 'NE',
    description: '你成为新的轮回之镜器灵，永远困在灰色空间。记得一切，却再也无法触碰他们。',
    condition: '集齐四个灵魂碎片 + 选择保留记忆放弃复活',
  },
  {
    id: 'be-dissolve', name: '消散', type: 'BE',
    description: '时间耗尽，灵魂彻底消散。没有痛苦，没有恐惧，只是归于虚无。',
    condition: '未在规定时间内完成当前世界目标',
  },
]

// ============================================================
// 故事信息
// ============================================================

export const STORY_INFO = {
  title: '快穿：千面情缘',
  subtitle: '穿越四世，收集灵魂碎片，找回自我',
  description: '你死了。在灰色空间中与轮回之镜签订契约，穿越四个世界收集灵魂碎片以复活。每收集一个碎片就会失去一段记忆。当你终于集齐所有碎片，你还记得自己是谁吗？',
  goal: '进入四个世界，让男主们真心爱上你，回收灵魂碎片。在爱与记忆之间做出最终抉择。',
}

// ============================================================
// 工具函数
// ============================================================

export function getStatLevel(value: number) {
  if (value >= 81) return { level: 4, name: '倾心', color: '#fbbf24' }
  if (value >= 61) return { level: 3, name: '接纳', color: '#10b981' }
  if (value >= 31) return { level: 2, name: '好奇', color: '#3b82f6' }
  return { level: 1, name: '疏离', color: '#94a3b8' }
}

export function getAvailableCharacters(
  day: number, characters: Record<string, Character>,
): Record<string, Character> {
  return Object.fromEntries(
    Object.entries(characters).filter(([, c]) => c.joinDay <= day)
  )
}

export function getCurrentChapter(day: number): Chapter {
  return CHAPTERS.find((ch) => day >= ch.dayRange[0] && day <= ch.dayRange[1]) ?? CHAPTERS[0]
}

export function getDayEvents(day: number, triggeredEvents: string[]): ForcedEvent[] {
  return FORCED_EVENTS.filter(
    (e) => e.triggerDay === day && !triggeredEvents.includes(e.id)
  )
}

export function getWorldScenes(worldId: string): Record<string, Scene> {
  return Object.fromEntries(
    Object.entries(SCENES).filter(
      ([, s]) => s.worldId === worldId || s.worldId === 'universal'
    )
  )
}

export function getWorldItems(worldId: string): Record<string, GameItem> {
  return Object.fromEntries(
    Object.entries(ITEMS).filter(
      ([, i]) => i.worldId === worldId || i.worldId === 'universal'
    )
  )
}
