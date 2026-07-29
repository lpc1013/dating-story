var fs=require('fs');

var rules=JSON.parse(fs.readFileSync('data/game-rules.json','utf8'));
console.log('Rules count:',rules.rules.length);

var story=JSON.parse(fs.readFileSync('data/story.json','utf8'));

var lookups={};
for(var vk in story.weathers){
  var evts=story.weathers[vk].events||[];
  var evtMap={},optMap={};
  evts.forEach(function(e,ei){
    evtMap[e.name]=ei;
    var om={};
    (e.options||[]).forEach(function(o,ci){om[o.label]=ci;});
    optMap[e.name]=om;
  });
  lookups[vk]={events:evtMap,options:optMap,count:evts.length};
}

var errors=[];
rules.rules.forEach(function(rule){
  if(!rule||!rule.at)return;
  var found=false;
  var weatherFilter=rule.weather;
  for(var vk in lookups){
    if(weatherFilter&&vk!==weatherFilter)continue;
    var lk=lookups[vk];
    if(lk.events[rule.at.event]!=null){
      // 如果规则有选项匹配要求，必须在同一变体中验证
      if(rule.at.when){
        if(!lk.options[rule.at.event]||lk.options[rule.at.event][rule.at.when]==null){
          continue; // 该变体事件存在但选项不匹配，跳过继续找
        }
      }
      found=true;
      if(rule.then&&rule.then.goToEvent){
        if(lk.events[rule.then.goToEvent]==null)
          errors.push('目标事件未匹配: '+vk+' \"'+rule.then.goToEvent+'\"');
      }
      if(rule.type==='require'){
        (rule.anyOf||[]).forEach(function(opt){
          if(!lk.options[rule.at.event]||lk.options[rule.at.event][opt]==null)
            errors.push('require选项未匹配: '+vk+' '+rule.at.event+' / \"'+opt+'\"');
        });
        (rule.orHide||[]).forEach(function(tgt){
          if(lk.events[tgt.event]==null)errors.push('orHide事件未匹配: '+vk+' \"'+tgt.event+'\"');
          else if(!lk.options[tgt.event]||lk.options[tgt.event][tgt.choice]==null)
            errors.push('orHide选项未匹配: '+vk+' \"'+tgt.event+'\" / \"'+tgt.choice+'\"');
        });
      }
      break;
    }
  }
  if(!found)errors.push('事件未匹配: \"'+rule.at.event+'\"'+(weatherFilter?' (限定weather='+weatherFilter+')':''));
});

if(errors.length){
  console.log('ERRORS:');
  errors.forEach(function(e){console.log('  ❌ '+e);});
}else{
  console.log('✅ 所有规则的事件名和选项文案均匹配正确');
}

console.log('');
var snowy=lookups['snowy'];
if(snowy){
  console.log('snowy 手机充电 选项:');
  Object.entries(snowy.options['手机充电']||{}).forEach(function(e){console.log('  ['+e[1]+'] '+e[0]);});
  console.log('snowy 雪中拍照 选项:');
  Object.entries(snowy.options['雪中拍照']||{}).forEach(function(e){console.log('  ['+e[1]+'] '+e[0]);});
}
