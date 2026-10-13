/**
 * tools/__tests__/chat-dedup.test.js
 * 固化 P1-02 #2「聊天一次性奖励去重」行为：同一聊天节点本局仅首次执行 onEnter 的数值副作用。
 * 通过加载真实 js/chat.js 并调用真实 loadChatNode 验证（非副本）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// 在模块加载阶段一次性注入真实源码（顶层 var/function 会挂到 globalThis）。
// 顺序：先 game-rules.js（提供 commitStats），再 chat.js（其 onEnter 使用 commitStats）。
// 必须早于 beforeEach——否则首个测试时脚本才加载，会覆盖测试设置的 chatData。
(function loadOnce() {
  vm.runInThisContext(readFileSync(join(ROOT, 'js', 'game-rules.js'), 'utf8'), { filename: 'js/game-rules.js' });
  vm.runInThisContext(readFileSync(join(ROOT, 'js', 'chat.js'), 'utf8'), { filename: 'js/chat.js' });
  // 保存真实节点表快照，供 beforeEach 合并测试节点时使用
  globalThis.__realChatData = globalThis.chatData;
})();

beforeEach(() => {
  // 最小 DOM：loadChatNode 读取的节点
  document.body.innerHTML =
    '<div id="chat-messages"></div><div id="chat-options"></div>' +
    '<div id="typing-indicator"></div><div id="chat-contact-avatar"></div>' +
    '<div id="chat-contact-status"></div>';

  // 游戏状态与依赖的全局
  globalThis.selectData = { weather: '晴天' };
  globalThis.currentContactId = 'girlfriend';
  globalThis.currentChatNodeId = null;
  globalThis.contacts = [{ id: 'girlfriend', status: '在线' }];
  globalThis.gameState = {
    like: 40, heart: 40, money: 100,
    chatHistory: {}, chatProgress: {}, chatEntered: []
  };
  // 聊天节点表：保留真实 chatData（含 gf_sunny_lunch_2 等），并追加测试用节点
  globalThis.chatData = Object.assign({}, globalThis.__realChatData || globalThis.chatData, {
    nodeWithReward: { messages: ['在吗？'], options: [], onEnter: () => { globalThis.gameState.like += 5; } },
    plainNode: { messages: ['嗨~'], options: [] }
  });
  // loadChatNode 尾部会调用（仅在这些路径才会触发，这里桩掉即可）
  globalThis.showContactList = () => {};
  globalThis.updateStats = () => {};
  globalThis.unlockPhoto = () => {};
});

describe('聊天节点一次性奖励去重（P1-02 #2）', () => {
  it('首次进入节点执行 onEnter 并加成', () => {
    vi.useFakeTimers();
    globalThis.loadChatNode('nodeWithReward');
    expect(globalThis.gameState.like).toBe(45); // 40 + 5
    expect(globalThis.gameState.chatEntered).toContain('nodeWithReward');
    vi.useRealTimers();
  });

  it('重复进入同一节点不再重复加成', () => {
    vi.useFakeTimers();
    globalThis.loadChatNode('nodeWithReward');
    globalThis.loadChatNode('nodeWithReward');
    globalThis.loadChatNode('nodeWithReward');
    expect(globalThis.gameState.like).toBe(45); // 仍只加一次
    vi.useRealTimers();
  });

  it('无 onEnter 的节点不报错、不污染状态', () => {
    vi.useFakeTimers();
    const before = globalThis.gameState.like;
    globalThis.loadChatNode('plainNode');
    expect(globalThis.gameState.like).toBe(before);
    vi.useRealTimers();
  });

  it('onEnter 加成越界时被钳制到 100（P1-02 边界）', () => {
    globalThis.chatData.overReward = { messages: ['哇'], options: [], onEnter: () => { globalThis.gameState.like += 999; } };
    vi.useFakeTimers();
    globalThis.loadChatNode('overReward');
    expect(globalThis.gameState.like).toBe(100);
    vi.useRealTimers();
  });
});

describe('真实节点数值经 commitStats 统一结算（P1-05 迁移验证）', () => {
  it('gf_sunny_lunch_2：money -20 / like +5 正确结算', () => {
    vi.useFakeTimers();
    const { money, like } = globalThis.gameState;
    globalThis.loadChatNode('gf_sunny_lunch_2');
    expect(globalThis.gameState.money).toBe(money - 20);
    expect(globalThis.gameState.like).toBe(like + 5);
    vi.useRealTimers();
  });

  it('gf_sunny_lunch_2 重复进入不重复结算', () => {
    vi.useFakeTimers();
    globalThis.loadChatNode('gf_sunny_lunch_2');
    const after = globalThis.gameState.money;
    globalThis.loadChatNode('gf_sunny_lunch_2');
    expect(globalThis.gameState.money).toBe(after); // 未再次扣钱
    vi.useRealTimers();
  });
});
