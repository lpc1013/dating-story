import { describe, it, expect } from 'vitest';

describe('StoryLoader.validate（数据契约 / P1-05）', () => {
  it('合法样本通过', () => {
    const good = {
      weathers: { sunny: { name: '晴天', events: [ { title: 't', description: 'd', options: [ { label: 'a', like: 5 } ] } ] } }
    };
    expect(window.StoryLoader.validate(good).ok).toBe(true);
  });

  it('非法样本（缺选项 / 数值非法 / 空天气）不通过', () => {
    const bad = {
      weathers: { rainy: { name: '雨', events: [
        { title: '', description: 'd', options: [ { label: 'a', like: 'x' } ] },
        { title: 't', description: '', options: [] }
      ] } }
    };
    const r = window.StoryLoader.validate(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('StoryLoader.resolveValue', () => {
  it('定值 / 区间 / 非法', () => {
    expect(window.StoryLoader.resolveValue(5)).toBe(5);
    const r = window.StoryLoader.resolveValue({ min: 2, max: 4 });
    expect(r).toBeGreaterThanOrEqual(2);
    expect(r).toBeLessThanOrEqual(4);
    expect(window.StoryLoader.resolveValue('bad')).toBe(0);
  });
});

describe('StoryLoader.normalizeGroups（状态不变量）', () => {
  it('归一化后所有数值字段均为有限数（无 NaN）', () => {
    const json = {
      weathers: { sunny: { name: '晴', events: [ { title: 't', description: 'd',
        options: [ { label: 'a', like: { min: 1, max: 3 } }, { label: 'b', heart: 5 } ] } ] } }
    };
    const g = window.StoryLoader.normalizeGroups(json);
    const choices = g['晴天'][0][0].choices;
    for (const c of choices) {
      for (const f of ['money', 'like', 'heart']) {
        expect(typeof c[f]).toBe('number');
      }
    }
  });
});
