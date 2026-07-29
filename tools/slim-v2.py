#!/usr/bin/env python3
"""slim-v2.py — 精确切除 index.html 内联脚本冗余代码（重建整块）"""
import sys, os

html_path = os.path.join(os.path.dirname(__file__), '..', 'index.html')
bak_path = html_path + '.pre-slim'

# 备份
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()
with open(bak_path, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'已备份至 index.html.pre-slim ({len(html)} bytes)')

lines = html.split('\n')

# 定位 <script> 块 — 直接用行号 469（1-based）
script_open = 468  # 0-based
# 验证
if lines[script_open].strip() != '<script>' or '游戏数据' not in lines[script_open + 1]:
    print(f'ERROR: 行 {script_open+1} 不是预期的内联 <script> 块')
    print(f'  内容: {lines[script_open][:80]}')
    print(f'  下一行: {lines[script_open+1][:80]}')
    sys.exit(1)

# 确认 script_open 所在的行确实是我们的大脚本块
print(f'内联 <script> 在行 {script_open+1}')

# 找到 </script> 结束
script_close = -1
for i in range(script_open, len(lines)):
    if lines[i].strip() == '</script>' and '主题切换器' in (lines[i+1] if i+1 < len(lines) else ''):
        script_close = i
        break

if script_close < 0:
    print('ERROR: 找不到 </script> 结束标签')
    sys.exit(1)

print(f'</script> 在行 {script_close+1}')

# 保留的行号范围（0-based，不含 script_open 和 script_close 标签本身）
keep_ranges = [
    # SoundManager (1-based: 3049-3155)
    (3048, 3154),
    # bootstrap (1-based: 3391-3419)
    (3390, 3418),
    # weather effects (1-based: 3463-3560)
    (3462, 3559),
    # gfPhoneCheck (1-based: 4456)
    (4455, 4455),
    # 小工具: updateSettingsUI → handleImportFile (1-based: 4791-4827)
    (4790, 4826),
    # loadSavedTheme (1-based: 4957)
    (4956, 4956),
    # 启动代码 (1-based: 6307-6310)
    (6306, 6309),
]

# 构建保留行的集合
keep_set = set()
for start, end in keep_ranges:
    for i in range(start, end + 1):
        keep_set.add(i)

# 构建新脚本内容
new_script_lines = []

# 先加 gameData 最小化 stub
game_data_stub = '        var gameData = {}; // 由 bootstrapStoryData 从 story.json 加载'
new_script_lines.append(game_data_stub)

# 遍历内联脚本的所有行，只保留标记的
for i in range(script_open + 1, script_close):
    if i in keep_set:
        new_script_lines.append(lines[i])

# 移除连续空行
cleaned = []
prev_empty = False
for line in new_script_lines:
    stripped = line.strip()
    if stripped == '':
        if not prev_empty:
            cleaned.append(line)
        prev_empty = True
    else:
        cleaned.append(line)
        prev_empty = False

# 构建新 HTML
new_script_block = '\n'.join(cleaned)
old_start = script_open  # <script> 的索引
old_end = script_close   # </script> 的索引

# 替换
new_lines = lines[:script_open + 1]  # 保留到 <script>
new_lines.append(new_script_block)
new_lines.extend(lines[script_close:])  # 从 </script> 开始

new_html = '\n'.join(new_lines)

# 写入
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

old_kb = len(html) / 1024
new_kb = len(new_html) / 1024
print(f'\n完成！{old_kb:.0f}KB → {new_kb:.0f}KB (减少 {old_kb - new_kb:.0f}KB, {(1 - new_kb/old_kb)*100:.0f}%)')
print(f'内联脚本从 {script_close - script_open - 1} 行缩减到 {len(cleaned)} 行')
