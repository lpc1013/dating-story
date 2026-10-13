import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(() => {
  globalThis.selectData = { difficulty: '普通', weather: '晴天', isChallenge: false };
  globalThis.difficultyModifiers = { '普通': { pos: 1, neg: 1 } };
  globalThis.weatherModifiers = { '晴天': { pos: 1, neg: 1 } };
  globalThis.devMode = {};
  globalThis.gameState = {
    like: 40, heart: 40, money: 100,
    minLike: 40, maxLike: 40, journalEntries: [],
    isReplaying: false, choicesMade: {}
  };
});

describe('clampGameStats（P1-02 / P1-05 边界防护）', () => {
  it('把 like/heart 钳制到 0–100，并把 NaN/负数 money 修复为 0', () => {
    globalThis.gameState.like = 150;
    globalThis.gameState.heart = -20;
    globalThis.gameState.money = NaN;
    clampGameStats();
    expect(globalThis.gameState.like).toBe(100);
    expect(globalThis.gameState.heart).toBe(0);
    expect(globalThis.gameState.money).toBe(0);
  });
});

describe('commitStats（P1-05 统一状态写入入口）', () => {
  it('经单一入口提交并钳制', () => {
    commitStats({ money: -10, like: 8, heart: 5 });
    expect(globalThis.gameState.money).toBe(90);
    expect(globalThis.gameState.like).toBe(48);
    expect(globalThis.gameState.heart).toBe(45);
  });
  it('越界写入被钳制到 100', () => {
    commitStats({ like: 200 });
    expect(globalThis.gameState.like).toBe(100);
  });
});

describe('grantReward（P1-02 #2 一次性奖励去重）', () => {
  it('同一 rewardId 仅结算一次', () => {
    globalThis.gameState.claimedRewards = [];
    const first = grantReward('r1', { like: 5 });
    const again = grantReward('r1', { like: 5 });
    expect(first).toBe(true);
    expect(again).toBe(false);
    expect(globalThis.gameState.like).toBe(45); // beforeEach 重置 like=40，+5 仅结算一次
  });
});

describe('makeChoice 统一结算（P1-05）', () => {
  it('单次结算好感，倍率=1 时不重复累加', () => {
    const before = globalThis.gameState.like;
    makeChoice({ text: 't', like: 8, money: 0, heart: 0, feedback: 'ok', emotion: 'happy' }, { title: 'e', choices: [] });
    expect(globalThis.gameState.like - before).toBe(8);
    expect(globalThis.gameState.like).toBe(48);
  });
  it('导入数据数值字段缺失不产生 NaN（状态不变量）', () => {
    makeChoice({ text: 't', like: undefined, money: undefined, heart: undefined, feedback: '', emotion: 'normal' }, { title: 'e', choices: [] });
    expect(Number.isFinite(globalThis.gameState.money)).toBe(true);
    expect(Number.isFinite(globalThis.gameState.like)).toBe(true);
  });
  it('困难难度对正向好感打折（0.7）', () => {
    globalThis.selectData.difficulty = '困难';
    globalThis.difficultyModifiers = { '困难': { pos: 0.7, neg: 1 } };
    const before = globalThis.gameState.like;
    makeChoice({ text: 't', like: 10, money: 0, heart: 0, feedback: '', emotion: 'normal' }, { title: 'e', choices: [] });
    expect(globalThis.gameState.like - before).toBe(7); // 10 * 0.7
  });
  it('难度倍率仅单次应用（防双重惩罚回归）：困难 pos=0.6 → 好感 10 得 6', () => {
    globalThis.selectData.difficulty = '困难';
    globalThis.difficultyModifiers = { '困难': { pos: 0.6, neg: 1.2 } };
    const before = globalThis.gameState.like;
    makeChoice({ text: 't', like: 10, money: 0, heart: 0, feedback: '', emotion: 'normal' }, { title: 'e', choices: [] });
    expect(globalThis.gameState.like - before).toBe(6); // 10 * 0.6，而非 0.6*0.7=4
  });
});
