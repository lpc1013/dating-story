var fs=require('fs'),h=fs.readFileSync('D:/朝花夕拾 闲暇随笔/李沁玲/大一下/约会小故事/index.html','utf8');
var m=[...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
var ok=0,errs=[];
m.forEach(function(x,i){try{new Function(x[1]);ok++}catch(y){errs.push('S'+(i+1)+':'+y.message.slice(0,60))}});
console.log('Syntax:',ok+'/'+m.length,errs.length?'FAIL':'OK');

var funcs='toggleDevMode renderDevPanel devSelW devTgtOpt devTgtEvt devTgtEnd devTgtHide deleteDevChain deleteDevJump resetDevJumps exportDevJumps'.split(' ');
var missing=funcs.filter(function(f){return !h.includes('function '+f)});
console.log('Functions:',missing.length?'MISSING:'+missing:'All 11 OK');

console.log('Display: byWeather='+h.includes('byWeather')+' showWx='+h.includes('showWx.forEach')+' chain='+h.includes('var ch = {}')+' solo='+h.includes('so.forEach'));
console.log('Hide: srcCnt='+h.includes('srcCnt = devMode.hideSources')+' setTimeout='+(h.match(/setTimeout.*renderDevPanel/g)||[]).length);
console.log('268003 hardcoded:',!h.includes('>⛅ '));
console.log('Size:',h.length,'bytes');
