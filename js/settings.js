function showSettings() {
            document.getElementById('setting-tts').checked = AppSettings.tts;
            document.getElementById('setting-music').checked = AppSettings.music;
            document.getElementById('setting-sfx').checked = AppSettings.sfx;
            document.getElementById('settings-modal').classList.add('show');
        }
        function hideSettings() {
            document.getElementById('settings-modal').classList.remove('show');
            localStorage.setItem('dating-settings', JSON.stringify(AppSettings));
        }
        window.toggleSetting = function(key) {
            AppSettings[key] = document.getElementById('setting-' + key).checked;
            if (key === 'music') { if (!AppSettings.music && SoundManager.bgm) { SoundManager.bgm.pause(); } else if (AppSettings.music && SoundManager.bgm) { SoundManager.bgm.play().catch(()=>{}); } }
            if (key === 'sfx') { /* SFX 调用处检查 */ }
            localStorage.setItem('dating-settings', JSON.stringify(AppSettings));
        };

        