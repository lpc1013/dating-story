var fs=require('fs'),path=require('path');

function walk(dir,list){
  fs.readdirSync(dir).forEach(function(f){
    var fp=path.join(dir,f).replace(/\\/g,'/');
    if(fs.statSync(fp).isDirectory()) walk(fp,list);
    else list.push(fp);
  });
}

var actual=[]; walk('video',actual);

var pl=JSON.parse(fs.readFileSync('video/playlist.json','utf8'));
var plFiles=pl.songs.map(function(s){return s.file;});

var missing=plFiles.filter(function(f){return actual.indexOf(f)<0;});
if(missing.length){console.log('IN PLAYLIST BUT MISSING ('+missing.length+'):');missing.forEach(function(f){console.log('  '+f);});}

var extra=actual.filter(function(f){return plFiles.indexOf(f)<0;});
if(extra.length){console.log('ON DISK BUT NOT IN PLAYLIST ('+extra.length+'):');extra.forEach(function(f){console.log('  '+f);});}

if(!missing.length&&!extra.length) console.log('OK: Playlist perfectly matches disk ('+plFiles.length+')');

// Now check title extraction quality for root songs
console.log('\n=== Root song title parsing ===');
var rootSongs=pl.songs.filter(function(s){return s.file.indexOf('纯音乐')<0;});
rootSongs.forEach(function(s){
  var fn=path.basename(s.file);
  console.log('FILE: '+fn+' => TITLE: '+s.title+' | ARTIST: '+s.artist);
});
