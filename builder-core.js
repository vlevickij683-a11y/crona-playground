(function(root){
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const button = (text,style,placement) => ({text,style,placement,color:'auto',customColor:'#9060d0',radius:14,size:'medium',visible:true});
  const defaults = {
    version:1, layout:'split', theme:'dark', accent:'#ac87fa', background:'mesh', intensity:55,
    motion:true, font:'sans', cardStyle:'glass', radius:24, density:'comfortable',
    brand:'FORMA', eyebrow:'НЕЗАВИСИМАЯ СТУДИЯ', title:'Хорошие идеи\nзаслуживают формы.',
    subtitle:'Создаём цифровые пространства, в которых хочется остаться. От первой мысли до последней детали.',
    cardTitle:'Внимание к деталям', cardText:'Ясная структура. Выразительный характер. Опыт, который запоминается.',
    contactTitle:'Создадим что-то вместе?', contactText:'Расскажи о своей идее. Мы поможем ей обрести форму.',
    heroAlign:'left',heroButtons:'row',cardAlign:'left',footerAlign:'center', headerSide:'right',
    buttons:{nav:button('Обсудить проект','outline','header'),primary:button('Начать проект','glow','hero'),secondary:button('Посмотреть работы','outline','hero'),card:button('Узнать больше','text','card'),footer:button('Давай обсудим','lift','footer')}
  };
  const options={layout:['split','center','editorial'],theme:['dark','light'],background:['mesh','grid','orbits'],font:['sans','serif','mono'],cardStyle:['glass','solid','outline'],density:['compact','comfortable','airy'],heroAlign:['left','center','right'],heroButtons:['row','stack'],cardAlign:['left','center','right'],footerAlign:['left','center','right'],headerSide:['left','right']};
  const styles=['solid','outline','glow','lift','text'];
  const placements=['header','hero','card','footer'];
  const isColor=v=>typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v);
  const bounded=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
  function normalize(raw){
    const r=raw&&typeof raw==='object'?raw:{};const s=copy(defaults);
    for(const [k,values] of Object.entries(options))if(values.includes(r[k]))s[k]=r[k];
    for(const k of ['brand','eyebrow','title','subtitle','cardTitle','cardText','contactTitle','contactText'])if(typeof r[k]==='string')s[k]=r[k].slice(0,k==='brand'?32:400);
    if(isColor(r.accent))s.accent=r.accent;
    if(typeof r.motion==='boolean')s.motion=r.motion;
    s.intensity=bounded(r.intensity,0,100,s.intensity);s.radius=bounded(r.radius,0,40,s.radius);
    for(const key of Object.keys(s.buttons)){
      const b=r.buttons?.[key];if(!b||typeof b!=='object')continue;const target=s.buttons[key];
      if(typeof b.text==='string')target.text=b.text.slice(0,60);
      if(styles.includes(b.style))target.style=b.style;
      if(placements.includes(b.placement))target.placement=b.placement;
      if(['auto','neutral','custom'].includes(b.color))target.color=b.color;
      if(isColor(b.customColor))target.customColor=b.customColor;
      if(['small','medium','large'].includes(b.size))target.size=b.size;
      if(typeof b.visible==='boolean')target.visible=b.visible;
      target.radius=bounded(b.radius,0,40,target.radius);
    }
    return s;
  }
  function flatten(o,prefix='',out={}){for(const [k,v] of Object.entries(o)){const key=prefix?prefix+'.'+k:k;if(v&&typeof v==='object'&&!Array.isArray(v))flatten(v,key,out);else out[key]=v;}return out;}
  function diff(s){const a=flatten(normalize(s)),b=flatten(defaults);return Object.fromEntries(Object.entries(a).filter(([k,v])=>v!==b[k]));}
  function luminance(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
  function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function ink(bg){const preferred=contrast(bg,'#ffffff')>contrast(bg,'#17121f')?'#ffffff':'#17121f';return contrast(bg,preferred)>=4.5?preferred:'#000000';}
  function readable(accent,background){
    if(contrast(accent,background)>=4.5)return accent;
    const target=luminance(background)<.4?255:0;
    const channels=[1,3,5].map(i=>parseInt(accent.slice(i,i+2),16));
    for(let step=1;step<=20;step++){
      const color='#'+channels.map(c=>Math.round(c+(target-c)*step/20).toString(16).padStart(2,'0')).join('');
      if(contrast(color,background)>=4.5)return color;
    }
    return ink(background);
  }
  function decode(raw){
    try{const d=JSON.parse(raw||'null');return {current:normalize(d?.current),saved:Array.isArray(d?.saved)?d.saved.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.config?.version===1).map(x=>({id:x.id,name:x.name.slice(0,80),note:typeof x.note==='string'?x.note.slice(0,5000):'',config:normalize(x.config)})):[]};}
    catch{return {current:normalize(),saved:[]};}
  }
  function exportDesigns(saved){
    if(!saved.length)return '';
    const lines=['','=== ПРИМЕРКА САЙТА / '+saved.length+' ===','Шаблон: forma-site | Версия: 1','Базовая схема: https://vlevickij683-a11y.github.io/crona-playground/site-template-v1.json','Цвет текста, поверхностей и кнопок адаптируется к теме; auto использует общий акцент.','Расположение кнопок: header — шапка, hero — первый экран, card — карточка, footer — контактный блок.'];
    for(const [i,item] of saved.entries())lines.push('',`${i+1}. ${item.name}`, 'ID варианта: '+item.id,'Изменения: '+(Object.keys(diff(item.config)).length?JSON.stringify(diff(item.config),null,2):'Стандартные настройки'),'Комментарий клиента: '+JSON.stringify(item.note));
    return lines.join('\n');
  }
  const api={defaults,normalize,diff,decode,contrast,ink,readable,exportDesigns,copy};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BuilderCore=api;
})(typeof window==='undefined'?globalThis:window);
