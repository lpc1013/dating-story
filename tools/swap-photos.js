var fs=require('fs');
var files=fs.readdirSync('assets/photo');
var album=fs.readFileSync('js/album.js','utf8');

var m=album.match(/var albumPhotos = \[([\s\S]*?)\];/);
var items=eval('['+m[1]+']');

// Build title → path mapping
var titleToPath={};
files.forEach(function(f){
  items.forEach(function(item){
    if(f.indexOf(item.title)>=0) titleToPath[item.title]='assets/photo/'+f;
  });
});

// Replace all picsum URLs
album=album.replace(/https:\/\/picsum\.photos\/[^\'"]+/g, function(match, offset){
  // Find which item this URL belongs to by looking backward for the title
  var before=album.substring(Math.max(0,offset-300), offset);
  items.forEach(function(item){
    if(before.indexOf(item.title)>=0) match=titleToPath[item.title]||match;
  });
  return match;
});

fs.writeFileSync('js/album.js', album, 'utf8');
var rem=(album.match(/picsum/g)||[]).length;
console.log('Done. Remaining picsum: '+rem);
