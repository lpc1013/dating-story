/*
 * story-loader.js — 主线剧情外部加载框架
 * ------------------------------------------------------------------
 * 职责：把「外部 JSON 数据源」加载并归一化成游戏运行时需要的结构：
 *
 *     gameData = { '晴天': [event, ...], '多云': [...], '雨天': [...], '雪天': [...] }
 *     event    = { title, description, choices: [choice, ...] }
 *     choice   = { text, money, like, heart, feedback, emotion, achievement?, photo? }
 *
 * 设计要点（应对「数据还在改」+「一种天气多条剧情线」）：
 *   1. 支持两种输入 schema（两个「端口」）：
 *        A. game-native ：{ meta?, weathers: { '晴天':[...] } } 或直接 { '晴天':[...] }
 *        B. rich(story.json)：{ meta:{weatherGroups}, weathers:{ sunny:{name,emoji,events:[{options}]} } }
 *      加载器自动识别并适配。
 *   2. 天气变体分组：一个中文天气可对应多条剧情线（如 晴天 = [sunny, sunny2]）。
 *      - 优先用 meta.weatherGroups（英文变体键 → 中文）来分组；
 *      - 缺失时用内置 WEATHER_KEY_CN 推断。
 *      - 加载后 StoryLoader.variants = { '晴天': [[事件线1], [事件线2]], ... }
 *      - StoryLoader.pickWeather('晴天') 每次随机返回其中一条线（实现「进入时二选一」）。
 *   3. 数值 money/like/heart 允许：定值(number) / 区间{min,max} / rich的{type,value|min,max} / null。
 *   4. 容错：坏事件跳过并 warn；fetch 失败（如 file:// 直接打开）返回 options.fallback。
 * ------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  // 英文天气键 → 中文键（当数据没提供 weatherGroups 时的兜底推断）
  const WEATHER_KEY_CN = {
    sunny: '晴天', sunny2: '晴天',
    cloudy: '多云', cloudy2: '多云',
    rainy: '雨天', rainy2: '雨天',
    snowy: '雪天', foggy: '多云'
  };

  const MOOD_TO_EMOTION = {
    happy: 'happy', 开心: 'happy',
    neutral: 'normal', normal: 'normal', 一般: 'normal',
    angry: 'angry', 生气: 'angry'
  };

  // 模块级：最近一次加载得到的「中文天气 → 变体事件线数组」与成就注册表
  let lastVariants = {};
  let lastRegistry = {};
  let lastVariantKeys = {};   // 各中文天气下，每条变体线对应的英文子键（与 lines 同序）
  let lastPickedKey = {};     // 本次开局实际选中的英文子键

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // 把「定值 / {min,max} / {type,value|min,max} / null」解析成一个整数
  function resolveValue(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return Math.round(v);
    if (typeof v === 'object') {
      if (v.min != null && v.max != null) return randInt(Math.round(v.min), Math.round(v.max));
      if (v.value != null) return Math.round(v.value);
    }
    return 0;
  }

  function toEmotion(x) {
    return MOOD_TO_EMOTION[x] || 'normal';
  }

  // ---------- 归一化：单个选项 ----------
  function normalizeChoice(raw) {
    if (!raw || typeof raw !== 'object') return null;

    // game-native：已有 text/feedback/emotion
    // rich       ：label(选项文案) / result(反馈) / mood / achievement:[]
    let text = raw.text;
    if (text == null) text = raw.label != null ? String(raw.label) : '（未命名选项）';

    const feedback = raw.feedback != null ? raw.feedback
                   : (raw.result != null ? raw.result : '');

    const emotion = raw.emotion ? toEmotion(raw.emotion) : toEmotion(raw.mood);

    // 完整成就数组（rich 是数组，如 ["我懂你"]；game-native 可能是单值）
    let achievements = [];
    if (Array.isArray(raw.achievement)) achievements = raw.achievement.slice();
    else if (raw.achievement) achievements = [raw.achievement];
    // 兼容字段名 achievements
    if (Array.isArray(raw.achievements)) achievements = achievements.concat(raw.achievements);

    // 主成就：取首个（保持旧逻辑兼容）
    const achievement = achievements.length ? achievements[0] : undefined;

    const choice = {
      text: String(text),
      money: resolveValue(raw.money),
      like: resolveValue(raw.like),
      heart: resolveValue(raw.heart),
      feedback: String(feedback),
      emotion: emotion
    };
    if (achievement) choice.achievement = achievement;
    if (achievements.length) choice.achievements = achievements; // 完整列表（餐厅三连判定用）
    if (raw.photo) choice.photo = raw.photo;
    if (raw.reqLike != null) choice.reqLike = raw.reqLike; // 好感度锁（引擎按累计 like≥阈值判定）
    // 餐厅三连等跨事件判定所需的显式分支标记（good/bad/null）
    if (raw.branch === 'good' || raw.branch === 'bad') choice.branch = raw.branch;
    // 物品相关：reward(获得) / useItem(消耗) / requireItem(未持有则隐藏该选项)
    // 这些字段由背包系统（backpack.js）与选项渲染（event-render.js）消费，必须随归一化透传
    if (raw.reward) choice.reward = raw.reward;
    if (raw.useItem) choice.useItem = raw.useItem;
    if (raw.requireItem) choice.requireItem = raw.requireItem;
    return choice;
  }

  // ---------- 归一化：单个事件 ----------
  function normalizeEvent(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const title = raw.title != null ? raw.title : (raw.name != null ? raw.name : '');
    const description = raw.description != null ? raw.description
                      : (raw.prompt != null ? raw.prompt : '');
    const rawChoices = raw.choices || raw.options || [];
    const choices = rawChoices.map(normalizeChoice).filter(Boolean);
    if (!choices.length) {
      console.warn('[story-loader] 事件缺少有效选项，已跳过：', title || raw.id || '(无标题)');
      return null;
    }
    return { title: String(title), description: String(description), choices };
  }

  // ---------- 分组：中文天气 → [{ key, events(原始) }, ...] ----------
  function buildGroups(json) {
    if (!json || typeof json !== 'object') return {};

    // 变体键 → 中文（优先 meta.weatherGroups）
    const variantToCn = {};
    const wg = json.meta && json.meta.weatherGroups;
    if (wg) {
      for (const [cn, keys] of Object.entries(wg)) {
        (keys || []).forEach(k => { variantToCn[k] = cn; });
      }
    }
    const cnOf = (key, fallbackName) =>
      variantToCn[key] || WEATHER_KEY_CN[key] || fallbackName || key;

    const groups = {};
    const push = (cn, key, events) => {
      (groups[cn] = groups[cn] || []).push({ key, events });
    };

    if (json.weathers && typeof json.weathers === 'object') {
      for (const [key, val] of Object.entries(json.weathers)) {
        if (Array.isArray(val)) push(cnOf(key), key, val);                 // game-native
        else if (val && Array.isArray(val.events)) push(cnOf(key, val.name), key, val.events); // rich
      }
    } else {
      for (const [key, val] of Object.entries(json)) {
        if (key === 'meta') continue;
        if (Array.isArray(val)) push(cnOf(key), key, val);                 // 顶层直接是 {中文:[...]}
      }
    }
    return groups;
  }

  // ---------- 归一化整张表 → { 中文: [ [事件线1], [事件线2], ... ] } ----------
  function normalizeGroups(json) {
    const rawGroups = buildGroups(json);
    const out = {};
    const variantKeys = {};  // cn -> [英文子键, ...] 与 lines 同序
    const achRegistry = {}; // 收集 story.json 里所有成就定义（供成就面板显示）
    for (const [cn, variants] of Object.entries(rawGroups)) {
      const lines = [];
      const keys = [];
      for (const v of variants) {
        const evs = (v.events || []).map(normalizeEvent).filter(Boolean);
        if (evs.length) { lines.push(evs); keys.push(v.key); }
        else console.warn('[story-loader] 变体「' + v.key + '」无有效事件，已忽略。');
      }
      if (lines.length) { out[cn] = lines; variantKeys[cn] = keys; }
    }
    lastVariantKeys = variantKeys;
    global.StoryLoader.variantKeys = variantKeys;  // 同步全局引用
    // 剧情成就按「难易程度」定档：
    // 默认归 进阶(蓝) —— 完成特定剧情分支本就是中等难度，不该全是稀有；
    // 下面这批「招牌高光时刻」（告白/接吻/同淋雪白头等）才是稀有(紫)，逐个覆盖。
    const STORY_ACH_RARITY = {
      '摩天轮之吻': 'rare',
      '日落告白': 'rare',
      '他朝若是同淋雪 也许人间共白头': 'rare',
      '他朝若是同淋雪 也许人间共白头II': 'rare',
      '雨中情话': 'rare',
      '雾中告白': 'rare',
      '雾中真心': 'rare',
      '雷霆告白': 'rare',
      '甜蜜告白': 'rare',
      '发于情，止于礼': 'rare',
      '雾中许愿': 'rare',
      '执子之手': 'rare',
      // 第二批：温暖/陪伴/浪漫关怀类高光瞬间，进阶之上提一级到稀有(紫)
      '雪中温暖': 'rare',
      '雨中守护': 'rare',
      '雨后彩虹': 'rare',
      '大雨让整座城市倾倒': 'rare',
      '完美的倾听者': 'rare',
      '伞下倾心': 'rare',
      '雪地浪漫': 'rare',
      '雪中滑冰': 'rare',
      '雪地心愿': 'rare',
      '与子偕老': 'rare',
      '雾中守护': 'rare',
      '雾中漫步': 'rare',
      '及时救援': 'rare',
      '绅士风度': 'rare',
      '最佳听众': 'rare',
      '贴心搬运工': 'rare',
      '深情凝望': 'rare'
    };
    // 遍历所有事件/选项，登记成就（id 用中文名；story.json 未提供 icon/rarity，给默认）
    const walk = (events) => {
      for (const e of events) {
        for (const c of (e.choices || [])) {
          const arr = c.achievements || (c.achievement ? [c.achievement] : []);
          for (const a of arr) {
            if (!achRegistry[a]) achRegistry[a] = {
              id: a, title: a, name: a,
              description: '在约会剧情中达成特殊时刻解锁',
              icon: '🌟', rarity: STORY_ACH_RARITY[a] || 'common', isEvent: true
            };
          }
        }
      }
    };
    for (const lines of Object.values(out)) for (const line of lines) walk(line);
    lastRegistry = achRegistry;
    global.StoryLoader.achievementRegistry = achRegistry;
    return out;
  }

  // 每个中文天气随机选一条剧情线 → 扁平 gameData
  function pickFlat(groups) {
    const gd = {};
    for (const [cn, lines] of Object.entries(groups)) {
      gd[cn] = lines[Math.floor(Math.random() * lines.length)];
    }
    return gd;
  }

  // 旧签名保留：直接把 json 归一化成扁平 gameData（随机选变体）
  function normalize(json) {
    return pickFlat(normalizeGroups(json));
  }

  // 对外：为某个中文天气重新随机挑一条剧情线（开局时调用）
  function pickWeather(cn) {
    const lines = lastVariants[cn];
    if (!lines || !lines.length) return null;
    const idx = Math.floor(Math.random() * lines.length);
    const keys = lastVariantKeys[cn] || [];
    lastPickedKey[cn] = keys[idx];   // 记录本次选中的英文子键（供配图索引）
    return lines[idx];
  }

  // 取回本次开局实际选中的英文天气子键（sunny/cloudy2/...），无则返回 null
  function getVariantKey(cn) {
    return lastPickedKey[cn] || null;
  }

  // ---------- 对外主入口 ----------
  // load(url, { fallback, merge }) → Promise<gameData>
  async function load(url, options) {
    options = options || {};
    const fallback = options.fallback || {};
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const preCheck = validateStoryJson(json);
      if (!preCheck.ok) {
        console.error('[story-loader] 数据契约校验未通过（仍尝试加载，无效部分会被跳过）：', preCheck.errors);
      } else if (preCheck.warnings.length) {
        console.warn('[story-loader] 数据契约告警：', preCheck.warnings);
      }
      const groups = normalizeGroups(json);
      if (!Object.keys(groups).length) {
        console.warn('[story-loader] 外部数据为空，使用内置回退。');
        lastVariants = {}; lastPickedKey = {}; global.StoryLoader.variants = {};
        return fallback;
      }
      lastVariants = groups;
      lastPickedKey = {};   // 重置，避免上一局残留的子键泄漏
      global.StoryLoader.variants = groups;
      const flat = pickFlat(groups);
      const info = Object.entries(groups)
        .map(([cn, l]) => cn + '×' + l.length).join(' ');
      console.info('[story-loader] 已加载外部主线：' + url + '  变体分布：' + info);
      if (options.merge) return Object.assign({}, fallback, flat);
      return flat;
    } catch (err) {
      console.warn('[story-loader] 加载「' + url + '」失败，使用内置回退：', err.message);
      // 清空变体缓存，防止上一次 http 会话的旧数据污染本次 file:// 会话
      // （fetch 失败时不更新 variants，会导致 pickWeather 使用过期英文子键）
      lastVariants = {};
      lastPickedKey = {};
      global.StoryLoader.variants = {};
      return fallback;
    }
  }

  // ---------- 数据契约校验（审计 P1-05 / P0-02 三层校验之一）----------
  // 对导入或主线 JSON 做深层校验，返回 { ok, errors, warnings, stats }。
  // 不修改数据，只报告；供 bootstrapStoryData 与 CI 门禁复用。
  function validateStoryJson(json) {
    const errors = [];
    const warnings = [];
    const stats = { weathers: 0, variants: 0, events: 0, choices: 0 };

    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      errors.push('根节点不是对象');
      return { ok: false, errors, warnings, stats };
    }

    const groups = buildGroups(json);
    const cnList = Object.keys(groups);
    if (!cnList.length) {
      errors.push('未找到任何天气分组（期望 weathers.{key}.events 或顶层 {天气:[事件]}）');
      return { ok: false, errors, warnings, stats };
    }
    stats.weathers = cnList.length;

    const isFiniteNum = (v) => typeof v === 'number' && isFinite(v);
    const validRange = (v) =>
      v && typeof v === 'object' && !Array.isArray(v) && (
        (isFiniteNum(v.min) && isFiniteNum(v.max)) ||
        isFiniteNum(v.value)
      );

    for (const cn of cnList) {
      for (const v of groups[cn]) {
        stats.variants++;
        const evs = v.events || [];
        if (!evs.length) { warnings.push('天气「' + cn + '」变体「' + v.key + '」无事件'); continue; }
        for (const e of evs) {
          stats.events++;
          if (e == null) { errors.push('存在空事件（null）'); continue; }
          // 与 normalizeEvent 保持一致：title 可回退到 name，description 可回退到 prompt
          const evTitle = e.title != null ? e.title : e.name;
          const evDesc = e.description != null ? e.description : e.prompt;
          if (evTitle == null || evTitle === '') warnings.push('事件缺少 title/name（位置 ' + cn + '）');
          if (evDesc == null || evDesc === '') warnings.push('事件缺少 description/prompt（' + (evTitle || '?') + '）');
          const rawChoices = e.choices || e.options || [];
          if (!rawChoices.length) { errors.push('事件「' + (e.title || '?') + '」无选项'); continue; }
          for (const c of rawChoices) {
            stats.choices++;
            if (!c || (c.text == null && c.label == null)) {
              errors.push('选项缺少 text/label（事件「' + (e.title || '?') + '」）');
              continue;
            }
            // 数值字段：定值(有限数) / 区间对象 / null 合法；其余报错
            for (const f of ['money', 'like', 'heart']) {
              const val = c[f];
              if (val == null) continue;
              if (!isFiniteNum(val) && !validRange(val)) {
                errors.push('选项「' + (c.text || c.label) + '」字段 ' + f + ' 非法（非有限数值/区间）：' + JSON.stringify(val));
              }
            }
            if (c.reqLike != null && !isFiniteNum(c.reqLike)) {
              errors.push('选项「' + (c.text || c.label) + '」reqLike 非法：' + JSON.stringify(c.reqLike));
            }
          }
        }
      }
    }

    return { ok: errors.length === 0, errors, warnings, stats };
  }

  global.StoryLoader = {
    load, normalize, normalizeGroups, pickWeather, getVariantKey, validate: validateStoryJson,
    resolveValue, normalizeEvent, normalizeChoice,
    achievementRegistry: lastRegistry,
    variants: lastVariants,
    variantKeys: lastVariantKeys
  };
})(typeof window !== 'undefined' ? window : this);
