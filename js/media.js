// js/media.js — 从 achievements.js 拆分（功能：相机/CG）

async function triggerCamera(photoId) {
            const flash = document.getElementById('camera-flash');
            const overlay = document.getElementById('camera-overlay');
            const countdownEl = document.getElementById('camera-countdown');
            const successEl = document.getElementById('camera-success');
            
            // 倒计时提示
            countdownEl.style.display = 'flex';countdownEl.style.alignItems='center';countdownEl.style.justifyContent='center';
            for (let i = 3; i > 0; i--) {
                countdownEl.textContent = i;
                countdownEl.style.transform = 'translate(-50%, -50%) scale(1.5)';
                countdownEl.style.opacity = '1';
                await new Promise(r => setTimeout(r, 100));
                countdownEl.style.transform = 'translate(-50%, -50%) scale(1)';
                countdownEl.style.opacity = '0.5';
                await new Promise(r => setTimeout(r, 700));
            }
            countdownEl.style.display = 'none';

            // 拍照瞬间
            flash.classList.add('active');
            overlay.classList.add('active');
            SoundManager.playSfx('choice'); 
            
            setTimeout(() => {
                flash.classList.remove('active');
                setTimeout(() => overlay.classList.remove('active'), 500);
                
                if (photoId) {
                    unlockPhoto(photoId);
                    const photo = albumPhotos.find(p => p.id === photoId);
                    
                    // 成功提示动画
                    successEl.classList.add('active');
                    setTimeout(() => successEl.classList.remove('active'), 1000);
                    
                    showToast(`📸 记录瞬间: ${photo ? photo.title : '新照片'}`, 'reward');
                }
            }, 100);
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
