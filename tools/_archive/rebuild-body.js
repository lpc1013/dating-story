var fs=require('fs');
var bak=fs.readFileSync('index.html.bak','utf8');
var cur=fs.readFileSync('index.html','utf8');

// Extract body from backup (start-screen, header, content, weather-panel, etc.)
var bodyStart=bak.indexOf('<body>')+6;
var bodyEnd=bak.indexOf('<div id="root"');
var bakBody=bak.substring(bodyStart, bodyEnd).trim();

// Remove OLD inline script blocks from bak body (keep only HTML)
bakBody=bakBody.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '').trim();

// Current index.html: keep head, replace body
var head=cur.substring(0, cur.indexOf('<body>'));
var scriptStart=cur.indexOf('<script src="js/achievements.js">');
var scripts=cur.substring(scriptStart);

// Build new index.html
var html=head+'<body>\n'+bakBody+'\n'+scripts+'\n<div id="root"></div>\n</body>\n</html>';

// Add TTS button next to warmth-btn
if(html.indexOf('id="tts-float-btn"')<0){
  var ttsBtn='<button id="tts-float-btn" onclick="var s=document.getElementById(\'tts-switch\');if(s){s.checked=!s.checked;s.dispatchEvent(new Event(\'change\'));this.textContent=s.checked?\'🔊 TTS 开\':\'🔇 TTS 关\';}" style="background:var(--bg-chip);border:1px solid var(--border-light);border-radius:16px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--text-muted);margin-left:8px;display:inline-block;">🔇 TTS 关</button>';
  html=html.replace('提供温暖 (5元)</button>','提供温暖 (5元)</button>\n                '+ttsBtn);
}

// Add result elements that bak didn't have
if(html.indexOf('result-her-quote')<0){
  html=html.replace('<div id="rating-stars"','<div id="slideshow-area" class="slideshow-area" style="display:none;margin-bottom:16px;"></div>\n                <div id="rating-stars"');
  html=html.replace('<div class="rating-box"','<div id="result-her-quote" style="font-size:15px;font-style:italic;text-align:center;color:#a8442a;line-height:1.6;padding:8px 0;"></div>\n                <div class="result-grade" id="result-grade"></div>\n                <div id="result-highlight" class="result-highlight"></div>\n                <div id="result-timeline" style="display:none;"></div>\n                <div class="rating-box"');
}

// Add share button if missing
if(html.indexOf('showShareCard')<0 && html.indexOf('查看约会日记')>=0){
  html=html.replace('查看约会日记</button>','查看约会日记</button>\n                    <button class="restart-btn" onclick="showShareCard()">📤 分享战绩</button>\n                    <button class="view-journal-btn" onclick="retrySameSetup()">🔄 再试一次</button>');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Size: '+html.length);

var o=(html.match(/<script[^>]*>/g)||[]).length;
var c=(html.match(/<\/script>/g)||[]).length;
console.log('Scripts: '+o+'/'+c+' '+(o===c?'balanced':'UNBALANCED'));

// Verify key elements
['start-screen','header','game-content','result','weather-panel','warmth-btn'].forEach(function(el){
  console.log(el+': '+(html.indexOf(el)>=0?'YES':'MISSING'));
});
