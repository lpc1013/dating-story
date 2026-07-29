// js/backpack.js — 背包交互系统：物品获得/使用动画
(function(){
  'use strict';

  var backpackEl = null;
  var backpackItems = {};

  // 物品注册表 — 每个物品有 icon(emoji/CSS)、名称、使用动画
  var ITEMS = {
    powerbank: {
      name: '充电宝',
      icon: '🔋',
      color: '#4ade80',
      bg: 'linear-gradient(135deg,#4ade80,#10b981)',
      desc: '贴心地为她准备了充电宝，再也不用担心手机没电啦。'
    }
  };

  function ensureBackpack() {
    if (!backpackEl) {
      backpackEl = document.createElement('div');
      backpackEl.className = 'backpack-bar';
      backpackEl.innerHTML = '<span class="bp-label">🎒</span><span class="bp-slots" id="bp-slots"></span>';
      var container = document.getElementById('game-container');
      if (container) container.appendChild(backpackEl);
    }
    return backpackEl;
  }

  // 获得物品 — 弹出动画到背包
  window.acquireItem = function(itemId) {
    var item = ITEMS[itemId];
    if (!item) return;
    if (!window.gameState) { console.warn('[backpack] gameState not ready'); return; }
    if (!window.gameState.inventory) window.gameState.inventory = {};

    // 添加到 inventory
    window.gameState.inventory[itemId] = (window.gameState.inventory[itemId] || 0) + 1;
    backpackItems[itemId] = true;

    ensureBackpack();
    updateBackpackDisplay();

    // 弹出获得动画
    spawnItemPopup(item);
    showAchievementToast(item.icon + ' 获得「' + item.name + '」！' + item.desc);
  };

  // 使用物品 — 从背包中移除
  window.useItem = function(itemId) {
    var item = ITEMS[itemId];
    if (!item || !backpackItems[itemId]) return;
    if (!window.gameState || !window.gameState.inventory) return;

    window.gameState.inventory[itemId] = Math.max(0, (window.gameState.inventory[itemId] || 1) - 1);
    if (window.gameState.inventory[itemId] <= 0) {
      delete backpackItems[itemId];
      delete window.gameState.inventory[itemId];
    }

    updateBackpackDisplay();
    // 使用动画：给对应的 bp-item 添加 used 类触发弹飞
    var slotItems = document.querySelectorAll('.bp-item');
    slotItems.forEach(function(el) {
      if (el.title === item.name) { el.classList.add('used'); setTimeout(function(){ el.remove(); }, 500); }
    });
    // 消失动画
    showAchievementToast(item.icon + '「' + item.name + '」已使用');
    spawnItemUseEffect(item);
  };

  function updateBackpackDisplay() {
    var slots = document.getElementById('bp-slots');
    if (!slots) return;
    var keys = Object.keys(backpackItems);
    if (keys.length === 0) {
      slots.innerHTML = '<span style="color:#999;font-size:11px;">空</span>';
    } else {
      slots.innerHTML = keys.map(function(k) {
        var item = ITEMS[k] || {icon:'📦'};
        return '<span class="bp-item" style="background:'+(item.bg||'#ccc')+';" title="'+item.name+'">'+item.icon+'</span>';
      }).join('');
    }
  }

  // 物品获得飘入动画
  function spawnItemPopup(item) {
    var pop = document.createElement('div');
    pop.className = 'bp-popup';
    pop.innerHTML = '<span class="bp-pop-icon" style="background:'+item.bg+'">'+item.icon+'</span>';
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

})();
