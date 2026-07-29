// js/backpack.js — 背包交互系统：底部 slim 栏 + 常驻道具(AI/主题)降级
(function(){
  'use strict';

  var backpackEl = null;
  var backpackItems = {};

  // 物品注册表 — 事件获得的道具
  var ITEMS = {
    powerbank: {
      name: '充电宝',
      icon: '🔋',
      color: '#4ade80',
      bg: 'linear-gradient(135deg,#4ade80,#10b981)',
      desc: '贴心地为她准备了充电宝，再也不用担心手机没电啦。'
    },
    // ===== 内容 pass 新增道具（追加到 ITEMS 对象内，powerbank 已存在） =====
    keychain: {
      id: 'keychain', name: '猫咪钥匙扣', icon: '🔑',
      color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
      desc: '她手里那只猫咪钥匙扣，你顺手系在了自己包上——说是护身符，其实是想多带一点她。'
    },
    chick: {
      id: 'chick', name: '吉伊小八挂件', icon: '🐤',
      color: '#fb7185', bg: 'linear-gradient(135deg,#fb7185,#f472b6)',
      desc: '从她包上摘下一枚吉伊小八，别在自己外套上。她说要你好好照顾它——于是它每天陪你晃悠。'
    },
    blindbox: {
      id: 'blindbox', name: '吉伊小八盲盒', icon: '📦',
      color: '#a78bfa', bg: 'linear-gradient(135deg,#a78bfa,#c4b5fd)',
      desc: '普通款吉伊小八盲盒，她嫌不够隐藏款，你却当宝贝收着——收藏家眼里没有废卡。'
    },
    blindbox_hidden: {
      id: 'blindbox_hidden', name: '吉伊小八隐藏款', icon: '🎁',
      color: '#f472b6', bg: 'linear-gradient(135deg,#f472b6,#e879f9)',
      desc: '一发入魂抽中的吉伊小八隐藏款！她欢呼着塞给你：这可是欧皇附体。'
    },
    badge: {
      id: 'badge', name: '专属徽章', icon: '🎖️',
      color: '#34d399', bg: 'linear-gradient(135deg,#34d399,#10b981)',
      desc: '她亲手别在你衣领的吉伊小八徽章，说这是她的专属标记。从此它常驻你身上。'
    },
    mirror: {
      id: 'mirror', name: '古董小镜', icon: '🪞',
      color: '#60a5fa', bg: 'linear-gradient(135deg,#60a5fa,#818cf8)',
      desc: '雾天古董摊买下的小镜子，摊主说能照出真心。你收着，因为镜里那抹笑，你舍不得丢。'
    },
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
    wallet: {
      id: 'wallet', name: '拾得钱包', icon: '👛',
      color: '#facc15', bg: 'linear-gradient(135deg,#facc15,#fde047)',
      desc: '雨中水洼里拾得的钱包，你当“意外探险纪念品”揣进背包，约定一起物归原主。'
    },
    photo: {
      id: 'photo', name: '约会合照', icon: '📸',
      color: '#f472b6', bg: 'linear-gradient(135deg,#f472b6,#fb7185)',
      desc: '一次次按下快门的瞬间：雾里、地铁站、雪地……每张合照，都是你们舍不得删的回忆。'
    },
    guzi: {
      id: 'guzi', name: '吉伊小八谷子', icon: '🎴',
      color: '#c084fc', bg: 'linear-gradient(135deg,#c084fc,#e879f9)',
      desc: '文创店里她悄悄塞给你的吉伊小八谷子：算你眼光好，这个归你收藏。'
    },
    pindou: {
      id: 'pindou', name: '猫咪拼豆', icon: '🧩',
      color: '#38bdf8', bg: 'linear-gradient(135deg,#38bdf8,#22d3ee)',
      desc: '拼豆店她亲手做的小猫咪，末了塞给你：这只归你，我是猫咪，你是我缩小版。'
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
