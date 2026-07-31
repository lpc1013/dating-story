// js/backpack.js — 背包交互系统：底部 slim 栏 + 常驻道具(AI/主题)降级
(function(){
  'use strict';

  var backpackEl = null;
  var backpackItems = {};

  // 物品注册表 — 事件获得的道具
  var ITEMS = {
    // ===== 沿用：暖心实用物 =====
    powerbank: {
      id: 'powerbank', name: '充电宝', icon: '🔋',
      color: '#4ade80', bg: 'linear-gradient(135deg,#4ade80,#10b981)',
      desc: '贴心地为她准备了充电宝，再也不用担心手机没电啦。'
    },
    // ===== 沿用：剧情信物 =====
    plush: {
      id: 'plush', name: '毛绒玩偶', icon: '🧸',
      color: '#fbbf24', bg: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
      desc: '商场抽奖中的毛绒玩偶，她抱着笑弯了眼，又塞给你：当我的替身陪着你～'
    },
    hat: {
      id: 'hat', name: '同款帽子', icon: '🧢',
      color: '#22d3ee', bg: 'linear-gradient(135deg,#22d3ee,#38bdf8)',
      desc: '被风吹跑又被你追回的帽子，她踮脚往你头上一扣：追了这么远，算你赢。'
    },
    mirror: {
      id: 'mirror', name: '古董小镜', icon: '🪞',
      color: '#60a5fa', bg: 'linear-gradient(135deg,#60a5fa,#818cf8)',
      desc: '雾天古董摊买下的小镜子，摊主说能照出真心。你收着，因为镜里那抹笑，你舍不得丢。'
    },
    // ===== 沿用（彩蛋）：全库唯一吉伊小八相关道具 =====
    chick: {
      id: 'chick', name: '吉伊小八挂件', icon: '🐤',
      color: '#fb7185', bg: 'linear-gradient(135deg,#fb7185,#f472b6)',
      desc: '从她包上摘下一枚吉伊小八，别在自己外套上。她说要你好好照顾它——于是它每天陪你晃悠。（彩蛋）'
    },
    // ===== 沿用（ relocated 自 骑士与公主·B → 谷子与文创·A，非吉伊小八） =====
    keychain: {
      id: 'keychain', name: '猫咪钥匙扣', icon: '🔑',
      color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
      desc: '她手里那只猫咪钥匙扣，你顺手系在了自己包上——说是护身符，其实是想多带一点她。'
    },
    // ===== 新增：剧情信物 =====
    ticket_stub: {
      id: 'ticket_stub', name: '电影票根', icon: '🎟️',
      color: '#f472b6', bg: 'linear-gradient(135deg,#f472b6,#fb7185)',
      desc: '两张电影票根被你小心夹进钱包，说等以后老了，还要拉着她重看一遍。'
    },
    ginkgo_bookmark: {
      id: 'ginkgo_bookmark', name: '银杏书签', icon: '🍂',
      color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
      desc: '书店里顺手捎的银杏书签，她说夹在最爱那页，就像把今天的时光也留住了。'
    },
    vintage_fan: {
      id: 'vintage_fan', name: '古风折扇', icon: '🪭',
      color: '#a78bfa', bg: 'linear-gradient(135deg,#a78bfa,#c4b5fd)',
      desc: '雾里古建筑前她替你收的那把古风折扇，展开是远山，合上是她笑的样子。'
    },
    dried_flower: {
      id: 'dried_flower', name: '干花书签', icon: '🌸',
      color: '#f9a8d4', bg: 'linear-gradient(135deg,#f9a8d4,#f472b6)',
      desc: '雨中花摊那枝玫瑰，被你压成了干花书签，她说比鲜花更经放，像你们的日子。'
    },
    scarf: {
      id: 'scarf', name: '围巾', icon: '🧣',
      color: '#fb923c', bg: 'linear-gradient(135deg,#fb923c,#f97316)',
      desc: '她亲手织的小猫围巾，绕成两圈一人一半，雪天里你们共用着同一颗心跳。'
    },
    snow_postcard: {
      id: 'snow_postcard', name: '雪景明信片', icon: '📮',
      color: '#60a5fa', bg: 'linear-gradient(135deg,#60a5fa,#818cf8)',
      desc: '雪中那张合影，被你印成了明信片，背面写“今年初雪，身边是你”。'
    },
    // ===== 新增：暖心实用物 =====
    handmade_snack: {
      id: 'handmade_snack', name: '手作点心', icon: '🍡',
      color: '#fb7185', bg: 'linear-gradient(135deg,#fb7185,#f472b6)',
      desc: '她偷偷塞给你的手作点心，甜得不像话，你说这是今天最划算的“投资”。'
    },
    clear_umbrella: {
      id: 'clear_umbrella', name: '透明伞', icon: '☂️',
      color: '#38bdf8', bg: 'linear-gradient(135deg,#38bdf8,#22d3ee)',
      desc: '雨天你撑着的那把透明伞，雨丝落在上面，却把你们俩护在清亮的小世界里。'
    },
    windproof_cape: {
      id: 'windproof_cape', name: '防风披风', icon: '🧥',
      color: '#64748b', bg: 'linear-gradient(135deg,#64748b,#94a3b8)',
      desc: '台风天他披在你肩上的防风披风，风再大，也被挡在了你们之外。'
    },
    emergency_light: {
      id: 'emergency_light', name: '应急手电', icon: '🔦',
      color: '#facc15', bg: 'linear-gradient(135deg,#facc15,#fde047)',
      desc: '停电时你摸黑找出的应急手电，一束光，就把慌乱的她稳住了。'
    },
    hand_warmer: {
      id: 'hand_warmer', name: '暖手宝', icon: '🔥',
      color: '#f97316', bg: 'linear-gradient(135deg,#f97316,#ef4444)',
      desc: '雪地里他塞给你的暖手宝，小小一团，却把冰凉的指尖焐成了春天。'
    },
    // ===== 新增：稀有掉落（替代原隐藏款盲盒） =====
    limited_postcard: {
      id: 'limited_postcard', name: '限定明信片', icon: '💌',
      color: '#e879f9', bg: 'linear-gradient(135deg,#e879f9,#c084fc)',
      desc: '抽奖一发入魂抽中的限定明信片，她笑你欧皇附体，说这幸运得归她一半。'
    },
    // ===== Wave 2A 升格：原 8 件随机掉落物 → 剧情信物 =====
    candy: {
      id: 'candy', name: '幸运糖果', icon: '🍬',
      color: '#f472b6', bg: 'linear-gradient(135deg,#f472b6,#fb7185)',
      desc: '野餐那天你揣着、直到看夕阳才递给她的那颗糖。她说留给对的人，才叫甜。'
    },
    flower: {
      id: 'flower', name: '路边小花', icon: '🌼',
      color: '#facc15', bg: 'linear-gradient(135deg,#facc15,#fde047)',
      desc: '阳光花摊墙角掐下的不知名小花，被你别进她鬓角，又陪她进了复古照相馆。'
    },
    sticker: {
      id: 'sticker', name: '可爱贴纸', icon: '🏷️',
      color: '#34d399', bg: 'linear-gradient(135deg,#34d399,#10b981)',
      desc: '街角拍照时贴在她手机壳背面，后来被你揭下来，贴上了自己的咖啡杯沿。'
    },
    shell: {
      id: 'shell', name: '海螺', icon: '🐚',
      color: '#38bdf8', bg: 'linear-gradient(135deg,#38bdf8,#a5f3fc)',
      desc: '雾天走错路才捡到的海螺，壳口盛过一点雾水。她说贴着听，里头是那天的海。'
    },
    clover: {
      id: 'clover', name: '四叶草', icon: '🍀',
      color: '#4ade80', bg: 'linear-gradient(135deg,#4ade80,#22c55e)',
      desc: '台风过后砖缝里钻出的四叶草，被她夹进随身的书里，说带着这运气。'
    },
    origami: {
      id: 'origami', name: '千纸鹤', icon: '🕊️',
      color: '#a78bfa', bg: 'linear-gradient(135deg,#a78bfa,#c4b5fd)',
      desc: '雪中漫步时折的千纸鹤，每个褶子都藏一个愿望，后来被她摆上雪地心愿。'
    },
    ribbon: {
      id: 'ribbon', name: '丝绸缎带', icon: '🎀',
      color: '#fb7185', bg: 'linear-gradient(135deg,#fb7185,#f472b6)',
      desc: '共伞时系过伞柄和她手腕的绸缎，分别时又被你解下，重新系回她腕上。'
    },
    key: {
      id: 'key', name: '心之钥匙', icon: '🗝️',
      color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
      desc: '你说这把专门开她那扇总躲镜头的心门；临别晃了晃，替她把「舍不得」说出了口。'
    }
  };
  window.ITEMS = ITEMS;

  // 常驻系统道具（天生在背包里，不可删除）：AI 顾问 + 主题配色
  var PERMANENT = [
    { id: 'ai_orb', cls: 'bp-ai',    icon: '🤖', title: 'AI 恋爱顾问', hint: true },
    { id: 'theme',  cls: 'bp-theme', icon: '🎨', title: '主题配色' }
  ];

  function ensureBackpack() {
    if (!backpackEl) {
      backpackEl = document.createElement('div');
      backpackEl.className = 'backpack-bar';
      backpackEl.id = 'backpack-bar';
      backpackEl.innerHTML =
        '<span class="bp-label" id="bp-open" title="打开背包">🎒</span>' +
        '<span class="bp-permanent" id="bp-permanent"></span>' +
        '<span class="bp-slots" id="bp-slots"></span>' +
        '<div class="ai-quick-menu" id="ai-quick-menu">' +
          '<div class="ai-quick-opt" onclick="aiWeather();toggleAiMenu(event)">🌤️ 气象干预 (-20💓)</div>' +
          '<div class="ai-quick-opt" onclick="aiGiftGen();toggleAiMenu(event)">🎁 生成礼物 (-10💓)</div>' +
          '<div class="ai-quick-opt" onclick="aiRandomTip();toggleAiMenu(event)">💡 恋爱秘籍 (-15💓)</div>' +
          '<div class="ai-quick-opt" onclick="showMoodInfo();toggleAiMenu(event)">🔍 心情分析</div>' +
        '</div>' +
        '<div class="theme-expand" id="theme-expand">' +
          '<button class="theme-dot t-parchment" data-set-theme="parchment" title="羊皮古卷">羊</button>' +
          '<button class="theme-dot t-cinnabar" data-set-theme="cinnabar" title="朱砂古卷">砂</button>' +
          '<button class="theme-dot t-rosegold" data-set-theme="rosegold" title="柔粉暖金">粉</button>' +
          '<button class="theme-dot t-dusk" data-set-theme="dusk" title="暮色梦境">暮</button>' +
        '</div>';
      var container = document.getElementById('game-container');
      if (container) container.appendChild(backpackEl);

      // 事件委托：🎒 打开详情；AI 开菜单；主题开色板；普通道具也开详情
      backpackEl.addEventListener('click', function(e){
        var t = e.target;
        if (t.closest('#bp-open')) { if (typeof showInventory === 'function') showInventory(); return; }
        if (t.closest('.bp-ai'))   { toggleAiMenu(e); return; }
        if (t.closest('.bp-theme')){ toggleThemeExpand(); return; }
        if (t.closest('.bp-item[data-item]')) { if (typeof showInventory === 'function') showInventory(); return; }
      });
    }
    return backpackEl;
  }

  // 获得物品 — 弹出动画到背包
  // 统一库存格式：inventory[itemId] = { icon, count, description, quote }
  // 与 inventory.js 的礼物格式一致，底部小图标(bp-item)与详情面板共用同一份数据
  // 跨周目持久化：记录已获得的独特道具 id（localStorage 'collected-items'）
  // 与 achievements.js 内的同名助手相互独立、不共享，避免跨文件依赖。
  function getCollectedItems() {
    try { return new Set(JSON.parse(localStorage.getItem('collected-items') || '[]')); }
    catch (e) { return new Set(); }
  }
  function addCollectedItem(id) {
    try {
      var s = getCollectedItems();
      s.add(id);
      localStorage.setItem('collected-items', JSON.stringify([...s]));
    } catch (e) {}
  }

  window.acquireItem = function(itemId) {
    var item = ITEMS[itemId];
    if (!item) {
      console.warn('[backpack] reward 引用了未注册道具 "' + itemId + '"，已用兜底图标显示——请在 js/backpack.js 的 ITEMS 中补登记。');
      item = { id: itemId, name: itemId, icon: '📦', color: '#94a3b8', bg: 'linear-gradient(135deg,#94a3b8,#cbd5e1)', desc: '(未登记道具：请在 ITEMS 注册)' };
    }
    if (!window.gameState) { console.warn('[backpack] gameState not ready'); return; }
    if (!window.gameState.inventory) window.gameState.inventory = {};

    var inv = window.gameState.inventory;
    if (!inv[itemId]) {
      inv[itemId] = { icon: item.icon, count: 0, description: item.desc, quote: '' };
    }
    inv[itemId].count += 1;
    backpackItems[itemId] = true;

    addCollectedItem(itemId); // 跨周目持久化，供「收藏家」成就统计独特道具数

    ensureBackpack();
    updateBackpackDisplay();

    // 弹出获得动画
    spawnItemPopup(item);
    showToast(item.icon + ' 获得「' + item.name + '」！' + item.desc, 'reward');
    // A-07：接上此前零调用的 SFX.coin（1200+1600 Hz 双音）。
    // acquireItem 是全项目"获得道具"的唯一收口（choice.reward / event.giveItem 都经此），
    // 挂这里一处即可覆盖所有 reward 路径。
    if (typeof SFX !== 'undefined' && SFX.coin) SFX.coin();
  };

  // 使用物品 — 从背包中移除（减 count，归零则删除）
  window.useItem = function(itemId) {
    var item = ITEMS[itemId];
    if (!item || !backpackItems[itemId]) return;
    var inv = window.gameState && window.gameState.inventory;
    if (!inv || !inv[itemId] || inv[itemId].count <= 0) return;

    inv[itemId].count -= 1;
    if (inv[itemId].count <= 0) {
      delete backpackItems[itemId];
      delete inv[itemId];
    }

    updateBackpackDisplay();
    // 使用动画：给对应的 bp-item 添加 used 类触发弹飞
    var slotItems = document.querySelectorAll('.bp-item');
    slotItems.forEach(function(el) {
      if (el.title === item.name) { el.classList.add('used'); setTimeout(function(){ el.remove(); }, 500); }
    });
    // 消失动画
    showToast(item.icon + '「' + item.name + '」已使用', 'reward');
    spawnItemUseEffect(item);
  };

  function updateBackpackDisplay() {
    var perm = document.getElementById('bp-permanent');
    var slots = document.getElementById('bp-slots');
    if (!perm || !slots) return;

    // 常驻系统道具（开局即展示，固定在左侧不参与滑动）
    var seen = false;
    try { seen = !!localStorage.getItem('ai-hint-seen'); } catch (e) {}
    perm.innerHTML = PERMANENT.map(function(p) {
      var dot = (p.hint && !seen) ? '<span class="ai-red-dot" id="ai-red-dot"></span>' : '';
      return '<span class="bp-item ' + p.cls + '" title="' + p.title + '">' + p.icon + dot + '</span>';
    }).join('');

    // 事件获得道具（右侧可横向滑动浏览）
    var keys = Object.keys(backpackItems);
    if (keys.length === 0) {
      slots.innerHTML = '<span class="bp-empty">还没有道具</span>';
    } else {
      slots.innerHTML = keys.map(function(k) {
        var item = ITEMS[k] || { icon: '📦', name: k };
        return '<span class="bp-item" data-item="' + k + '" style="background:' + (item.bg || '#ccc') + ';" title="' + item.name + '">' + item.icon + '</span>';
      }).join('');
    }
  }

  // 物品获得飘入动画
  function spawnItemPopup(item) {
    var pop = document.createElement('div');
    pop.className = 'bp-popup';
    pop.innerHTML = '<span class="bp-pop-icon" style="background:' + item.bg + '">' + item.icon + '</span>';
    document.body.appendChild(pop);
    setTimeout(function() { pop.classList.add('fly'); }, 50);
    setTimeout(function() { pop.remove(); }, 1200);
  }

  // 物品使用消失动画
  function spawnItemUseEffect(item) {
    var el = document.createElement('div');
    el.className = 'bp-use-effect';
    el.textContent = item.icon;
    el.style.color = item.color;
    document.body.appendChild(el);
    setTimeout(function() { el.classList.add('fadeout'); }, 100);
    setTimeout(function() { el.remove(); }, 800);
  }

  // 检查事件是否触发物品获得（从 story.json 的 choice/item 字段）
  window.checkEventItem = function(event, choice, choiceIdx) {
    // 示例：如果选项有 reward 字段，自动获得
    if (choice && choice.reward) {
      acquireItem(choice.reward);
    }
    // 也可以从 event 层面触发
    if (event && event.giveItem) {
      acquireItem(event.giveItem);
    }
  };

  // 在游戏开始时重置
  window.resetBackpack = function() {
    backpackItems = {};
    updateBackpackDisplay();
  };

  // 开局即展示底部栏（含常驻 AI/主题道具），不再等获得物品才出现
  ensureBackpack();
  updateBackpackDisplay();

})();
