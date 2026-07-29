// js/mood.js — 从 achievements.js 拆分（功能：心情弹窗）

function showMoodInfo() {
            const modal = document.getElementById('mood-info-modal');
            const desc = document.getElementById('mood-info-desc');
            let info = "";
            let encouragement = "";
            
            if (gameState.like < 20) {
                info = "【生气】她现在对你很不满，说话要小心哦。如果好感度归零，约会就会失败。";
                encouragement = "💡 建议：试着送她一些小礼物，或者在对话中表现得更体贴一些。";
            } else if (gameState.like < 40) {
                info = "【一般】你们的关系还算平稳，但似乎缺少一些火花。";
                encouragement = "💡 建议：多关注她的兴趣爱好，寻找共同话题。";
            } else if (gameState.like < 60) {
                info = "【开心】她现在心情不错，是个增进感情的好机会！";
                encouragement = "💡 建议：保持这种状态，带她去一些浪漫的地方吧。";
            } else if (gameState.like < 80) {
                info = "【喜欢】她对你很有好感，你们的距离正在飞速拉近。";
                encouragement = "💡 建议：勇敢一点，适度的亲密举动能让感情升温。";
            } else {
                info = "【心花怒放】她已经彻底迷上你了，这真是一场完美的约会！";
                encouragement = "💡 建议：享受这一刻，你是最棒的！";
            }
            
            desc.innerHTML = `<strong>${info}</strong><br><br>${encouragement}<br><br><small style="color: #999;">提示：好感度受天气、对话选择和礼物影响。</small>`;
            modal.classList.add('show');
        }

function hideMoodInfo() {
            document.getElementById('mood-info-modal').classList.remove('show');
        }
