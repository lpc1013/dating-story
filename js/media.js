// js/media.js — 从 achievements.js 拆分（功能：相机/CG）

async function triggerCamera(photoId) {
            if (!photoId) return;
            const flash = document.getElementById('camera-flash');
            // 轻量快门：仅一瞬白闪，不再弹全屏倒计时/成功层，避免打断游戏节奏
            if (flash) {
                flash.classList.add('active');
                setTimeout(() => flash.classList.remove('active'), 160);
            }
            if (typeof SFX !== 'undefined' && SFX.click) SFX.click(); // 咔嚓一声轻反馈
            unlockPhoto(photoId);
            const photo = albumPhotos.find(p => p.id === photoId);
            showToast(`📸 记录瞬间: ${photo ? photo.title : '新照片'}`, 'reward');
        }

var cgLightboxEl = null;

function showCgLightbox(src, alt) {
            if (!cgLightboxEl) {
                cgLightboxEl = document.createElement('div');
                cgLightboxEl.id = 'cg-lightbox';
                cgLightboxEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;z-index:2000;padding:20px;cursor:zoom-out;';
                cgLightboxEl.onclick = () => { cgLightboxEl.style.display = 'none'; };
                const img = document.createElement('img');
                img.style.cssText = 'max-width:100%;max-height:90%;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.5);';
                cgLightboxEl.appendChild(img);
                img.onclick = function (e) { e.stopPropagation(); };  // 点图片本身不关闭，仅点遮罩关闭
                cgLightboxEl._img = img;
                document.body.appendChild(cgLightboxEl);
            }
            cgLightboxEl._img.src = src;
            cgLightboxEl._img.alt = alt || '';
            cgLightboxEl.style.display = 'flex';
        }
