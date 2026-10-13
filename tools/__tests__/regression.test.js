import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('回归防护：赠礼不再直接累加好感（P1-01）', () => {
  it('event-render.js 不含「gameState.like = Math.min(100, gameState.like + def.like)」', () => {
    const code = readFileSync(join(ROOT, 'js/event-render.js'), 'utf8');
    expect(code).not.toMatch(/gameState\.like\s*=\s*Math\.min\(\s*100\s*,\s*gameState\.like\s*\+\s*def\.like\s*\)/);
  });
});

describe('回归防护：剧情渲染对未就绪数据不崩溃（P0-02）', () => {
  it('event-render.js 的 showEvent 含空数据防御分支', () => {
    const code = readFileSync(join(ROOT, 'js/event-render.js'), 'utf8');
    expect(code).toMatch(/游戏数据未就绪|events\.length\s*===\s*0|!\s*Array\.isArray\s*\(\s*events\s*\)/);
  });
});

describe('回归防护：选择反馈走 textContent 而非 innerHTML（P1-03）', () => {
  it('choice.js 使用 fb.textContent 渲染反馈', () => {
    const code = readFileSync(join(ROOT, 'js/choice.js'), 'utf8');
    expect(code).toMatch(/fb\.textContent\s*=\s*choice\.feedback/);
    expect(code).not.toMatch(/fb\.innerHTML\s*=\s*choice\.feedback/);
  });
});
