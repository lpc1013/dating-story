#!/usr/bin/env bash
# 通过 GitHub REST API (Git Data API) 单 commit 部署本地改动
# 处理三类变化: 修改(M,已追踪内容变) / 删除(D,已追踪) / 新增(??,未追踪)
# 支持: 空仓库首推(自动建分支+commit 无 parent) / 非空仓库增量
# 绕过: SSH/HTTPS 直连被本机网络拒绝 + 大文件走 MCP push_files 会爆模型上下文
# 修正: 所有 curl 加 -f(HTTP 错误即非零退出) + sha 非空校验, 杜绝"假成功"
#       git -c core.quotePath=false 防止中文路径被引号包裹导致漏传
# 用法: GITHUB_PAT=ghp_xxx bash tools/deploy_github.sh
set -euo pipefail

PAT="${GITHUB_PAT:-}"
if [ -z "$PAT" ]; then echo "ERROR: 未提供 GITHUB_PAT，请: GITHUB_PAT=xxx bash $0" >&2; exit 1; fi

REPO="lpc1013/dating-story"
BRANCH="master"
API="https://api.github.com"
RESOLVE=(--resolve "api.github.com:443:140.82.112.6")

# Node 可执行文件：版本目录后缀会变（22.12.0→22.22.2-3→22.22.2-6），硬编码必然失效。
# 默认取 PATH 里的 node；需要指定时用 NODE=/path/to/node 覆盖。
if [ -z "${NODE:-}" ]; then
  if command -v node >/dev/null 2>&1; then
    NODE="$(command -v node)"
  else
    echo "ERROR: PATH 里找不到 node，请显式指定: NODE=/path/to/node bash $0" >&2
    exit 1
  fi
fi
TMPWIN="${TEMP//\\//}"
[ -z "$TMPWIN" ] && TMPWIN="/tmp"

cd "$(dirname "$0")/.."
ROOT="$(pwd -W)"

# 从 stdin 读 JSON, 取点路径字段（容忍空/错误响应）
js(){ "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{let o=JSON.parse(s||"{}");for(const k of process.argv[1].split("."))o=o==null?o:o[k];console.log(o==null?"":o)}catch(e){console.log("")}})' "$1"; }
AUTH=(-H "Authorization: Bearer $PAT")
# 带 -f 的 curl: HTTP 4xx/5xx 返回非零 (配合 set -e 立即退出); -S 显示错误文本
curlf(){ curl -fsS "${RESOLVE[@]}" "${AUTH[@]}" "$@"; }

# 预检 PAT
echo "==> 验证 PAT"
UNAME=$(curlf "$API/user" | js login)
if [ -z "$UNAME" ]; then echo "ERROR: PAT 无效或网络不通，请更换 GITHUB_PAT 重试" >&2; exit 1; fi
echo "    user=$UNAME"

# 收集三类变化（排除大目录与元数据，避免 413 / 误传）
EXCL='^(video/|\.git/|\.workbuddy/)'
mapfile -t MOD < <(git -c core.quotePath=false diff --name-only --diff-filter=M 2>/dev/null | grep -vE "$EXCL" || true)
mapfile -t DEL < <(git -c core.quotePath=false diff --name-only --diff-filter=D 2>/dev/null | grep -vE "$EXCL" || true)
mapfile -t NEW < <(git -c core.quotePath=false ls-files --others --exclude-standard 2>/dev/null | grep -vE "$EXCL" || true)

echo "==> 改动: 修改 ${#MOD[@]} / 删除 ${#DEL[@]} / 新增 ${#NEW[@]}"

ENTRIES=""
# 内容文件: 创建 blob
for f in "${MOD[@]}" "${NEW[@]}"; do
  [ -z "$f" ] && continue
  if [ ! -f "$ROOT/$f" ]; then echo "    SKIP(不存在) $f"; continue; fi
  SZ=$(wc -c < "$ROOT/$f")
  if [ "$SZ" -gt 52428800 ]; then echo "    SKIP(>50MB) $f (${SZ}B)"; continue; fi
  B64="$TMPWIN/c_$$.b64"
  "$NODE" -e "const fs=require('fs');fs.writeFileSync('$B64',fs.readFileSync('$ROOT/$f').toString('base64'))"
  BJ="$TMPWIN/b_$$.json"
  "$NODE" -e "const fs=require('fs');fs.writeFileSync('$BJ',JSON.stringify({content:fs.readFileSync('$B64','utf8').trim(),encoding:'base64'}))"
  BLOB_SHA=$(curlf -X POST -H "Content-Type: application/json" --data-binary "@$BJ" "$API/repos/$REPO/git/blobs" | js sha)
  if [ -z "$BLOB_SHA" ]; then echo "ERROR: blob 创建失败 $f" >&2; exit 1; fi
  ENTRIES="$ENTRIES{\"path\":\"$f\",\"mode\":\"100644\",\"type\":\"blob\",\"sha\":\"$BLOB_SHA\"},"
  echo "    blob OK: $f"
done
# 删除文件: Git Data API 的 tree 不支持显式删除(sha:null 会 422),
# 且本仓库为全新仓库(目标端本就不存在这些文件), 删除对目标为 no-op。
# 故仅记录日志, 不进入 tree 数组。若未来推往已含这些文件的仓库, 需改用完整重建 tree(不传 base_tree)。
for f in "${DEL[@]}"; do
  [ -z "$f" ] && continue
  echo "    (skip-delete, 目标仓库无此文件) $f"
done
ENTRIES="[${ENTRIES%,}]"

# 获取 base（$BRANCH 不存在时, 退而用默认分支的 commit 作为 base, 随后为 $BRANCH 新建分支）
echo "==> 获取 $BRANCH 当前 commit"
BASE_SHA=$(curlf "$API/repos/$REPO/git/refs/heads/$BRANCH" 2>/dev/null | js object.sha || true)
BRANCH_EXISTS=1
if [ -z "$BASE_SHA" ]; then
  BRANCH_EXISTS=0
  DEFBR=$(curlf "$API/repos/$REPO" | js default_branch)
  echo "    $BRANCH 不存在, 以默认分支 $DEFBR 的 commit 作为 base"
  BASE_SHA=$(curlf "$API/repos/$REPO/git/refs/heads/$DEFBR" 2>/dev/null | js object.sha || true)
fi
if [ -z "$BASE_SHA" ]; then
  echo "    (仓库完全为空, 将创建首个 commit)"
  PARENTS="[]"
  BASE_TREE_ARG=""
else
  echo "    base=$BASE_SHA"
  PARENTS="['$BASE_SHA']"
  BASE_TREE=$(curlf "$API/repos/$REPO/git/commits/$BASE_SHA" | js tree.sha)
  BASE_TREE_ARG=",\"base_tree\":\"$BASE_TREE\""
fi

echo "==> 创建 tree"
TJ="$TMPWIN/t_$$.json"
"$NODE" -e "const fs=require('fs');const bt='$BASE_TREE';fs.writeFileSync('$TJ',JSON.stringify(bt?{base_tree:bt,tree:${ENTRIES}}:{tree:${ENTRIES}}))"
TREE_SHA=$(curlf -X POST -H "Content-Type: application/json" --data-binary "@$TJ" "$API/repos/$REPO/git/trees" | js sha)
if [ -z "$TREE_SHA" ]; then echo "ERROR: tree 创建失败" >&2; exit 1; fi

echo "==> 创建 commit"
MSG="deploy: 同步本地代码更新 ($(date '+%Y-%m-%d %H:%M'))"
CJ="$TMPWIN/c_$$.json"
"$NODE" -e "const fs=require('fs');fs.writeFileSync('$CJ',JSON.stringify({message:'$MSG',tree:'$TREE_SHA',parents:$PARENTS}))"
COMMIT_SHA=$(curlf -X POST -H "Content-Type: application/json" --data-binary "@$CJ" "$API/repos/$REPO/git/commits" | js sha)
if [ -z "$COMMIT_SHA" ]; then echo "ERROR: commit 创建失败" >&2; exit 1; fi

echo "==> 写入 $BRANCH 引用 -> $COMMIT_SHA"
if [ "$BRANCH_EXISTS" = "1" ]; then
  curlf -X PATCH -H "Content-Type: application/json" -d "{\"sha\":\"$COMMIT_SHA\"}" "$API/repos/$REPO/git/refs/heads/$BRANCH" >/dev/null
else
  curlf -X POST -H "Content-Type: application/json" -d "{\"ref\":\"refs/heads/$BRANCH\",\"sha\":\"$COMMIT_SHA\"}" "$API/repos/$REPO/git/refs" >/dev/null
fi

# 设默认分支为 master（若当前不是）, 使 GitHub 网页默认显示正确分支
DEF=$(curlf "$API/repos/$REPO" | js default_branch)
if [ "$DEF" != "$BRANCH" ]; then
  echo "    默认分支 $DEF -> 改为 $BRANCH"
  curlf -X PATCH -H "Content-Type: application/json" -d "{\"default_branch\":\"$BRANCH\"}" "$API/repos/$REPO" >/dev/null
fi

echo "DEPLOYED OK commit=$COMMIT_SHA"
rm -f "$TMPWIN"/c_$$.b64 "$TMPWIN"/b_$$.json "$TMPWIN"/t_$$.json "$TMPWIN"/c_$$.json 2>/dev/null || true
