const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/\r\n/g,'\n');
function object(name,end){return vm.runInNewContext('('+app.split('const '+name+' = ')[1].split(end)[0]+')');}
const state=object('state',';\n');
const cg=object('cgSet',';\n');
const aero=object('asSet',';\n');
const shared=['light','lightCol','gridOn','gridScale'];
const pick=(keys,shape=false)=>({...Object.fromEntries(keys.map(k=>[k,state.u[k]])),...(shape?{shape:0}:{})});
const defaults={schema:1,catalogVersion:1,modules:{
  space:pick([...shared,'rotSpeed'],true),formulas:pick([...shared,'rotSpeed'],true),particles:pick([...shared,'particle','particleSpeed','rotSpeed'],true),
  waveskry:pick(['light','lightCol','ringAmp','ringSpeed','sparks','sparkSpeed','sparkReact','attract']),cursorgrid:cg,aeroshards:aero,
  glowbutton:{color:'#9c70ff',strength:0.6,radius:16,duration:250,text:'Обсудить проект'},
  liftbutton:{color:'#b79aff',depth:7,radius:16,duration:180,text:'Начать проект'}
}};
// Keep this baseline available at a stable versioned URL for compact client briefs.
const baseline=path.join(root,'catalog-v1.json');
if(fs.existsSync(baseline)){
  if(JSON.stringify(JSON.parse(fs.readFileSync(baseline,'utf8')))!==JSON.stringify(defaults)) throw Error('Defaults changed: publish a new catalog version instead of overwriting v1.');
} else fs.writeFileSync(baseline,JSON.stringify(defaults,null,2)+'\n');
const template=path.join(root,'site-template-v1.json');
const templateDefaults=require('./builder-core.js').defaults;
if(fs.existsSync(template)){
  if(JSON.stringify(JSON.parse(fs.readFileSync(template,'utf8')))!==JSON.stringify(templateDefaults))throw Error('Site template v1 changed: release a new template version.');
}else fs.writeFileSync(template,JSON.stringify(templateDefaults,null,2)+'\n');
fs.mkdirSync(path.join(root,'dist','vendor'),{recursive:true});
for(const file of ['index.html','style.css','playground.css','app.js','brief-core.js','playground.js','catalog-v1.json','builder-core.js','site-builder.js','site-builder.css','builder-preview.html','builder-preview.js','builder-preview.css','site-template-v1.json'])fs.copyFileSync(path.join(root,file),path.join(root,'dist',file));
fs.copyFileSync(path.join(root,'vendor','aero.bundle.js'),path.join(root,'dist','vendor','aero.bundle.js'));
console.log('Static site built in dist/');
