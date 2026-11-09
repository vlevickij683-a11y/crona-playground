'use strict';
(() => {
  const core = window.BriefCore, storageKey = 'crona:playground:brief:v1';
  const meta = {
    space:{category:'scene', use:'Базовая сцена для первого экрана, технологичного лендинга или презентации.'},
    cursorgrid:{category:'background', use:'Интерактивный фон для портфолио, IT-продукта или блока с преимуществами.'},
    waveskry:{category:'background', use:'Реакция на касания и клики в промо-блоках, игровых проектах и интерактивных историях.'},
    aeroshards:{category:'background', use:'Объёмный фон первого экрана для цифрового продукта или презентации бренда.'},
    formulas:{category:'object', use:'Абстрактный 3D-объект рядом с заголовком или в демонстрации технологии.'},
    particles:{category:'object', use:'Орбитальные частицы для акцента на объекте в промо-сцене.'},
    glowbutton:{category:'button', use:'Кнопка заказа или заявки: мягкое свечение появляется при наведении и фокусе.'},
    liftbutton:{category:'button', use:'Кнопка с объёмным основанием для игровых, творческих и дружелюбных сайтов.'}
  };
  const buttonState = {
    glowbutton:{color:'#9c70ff', strength:0.6, radius:16, duration:250, text:'Обсудить проект'},
    liftbutton:{color:'#b79aff', depth:7, radius:16, duration:180, text:'Начать проект'}
  };
  const shared = ['light','lightCol','gridOn','gridScale'];
  const keys = {space:[...shared,'rotSpeed'],formulas:[...shared,'rotSpeed'],particles:[...shared,'particle','particleSpeed','rotSpeed'],waveskry:['light','lightCol','ringAmp','ringSpeed','sparks','sparkSpeed','sparkReact','attract']};
  function config(id){
    if(buttonState[id]) return core.clone(buttonState[id]);
    if(id === 'cursorgrid') return core.clone(cgSet);
    if(id === 'aeroshards') return core.clone(asSet);
    const result = Object.fromEntries(keys[id].map(k => [k,core.clone(state.u[k])]));
    if(['space','formulas','particles'].includes(id)) result.shape = mod4(state.shapeTarget);
    return result;
  }
  const defaults = {};
  let data;
  let pendingStorageWarning = false;
  try {data = core.decode(localStorage.getItem(storageKey));} catch { data = core.decode(null); pendingStorageWarning = true; }
  let tabMode = '2d', editing = null, toastTimer;
  const dialog = $('#briefDialog');
  function toast(message){ $('#toast').textContent=message; $('#toast').classList.add('on'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('on'),3500); }
  function persist(){
    try {localStorage.setItem(storageKey,JSON.stringify(data));}
    catch {toast('Браузер не сохранил подборку. Скачай бриф перед закрытием.');}
    $('#favCount').textContent=data.entries.length;
  }
  function uid(){return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
  function saveVariant(){
    if(!state.active) return;
    const m = byId(state.active);
    data.entries.push({key:uid(),module:m.id,name:m.name,mode:state.mode,version:1,settings:config(m.id),defaults:core.clone(defaults[m.id]),note:'',use:meta[m.id].use});
    persist(); toast('Вариант сохранён в избранное '+state.mode.toUpperCase());
  }
  function restore(e){
    if(!byId(e.module)) {toast('Этот модуль пока недоступен в каталоге.');return;}
    editing = e.key;
    setMode(e.mode);
    // Apply only known keys with matching types. Stored text is never interpreted as markup.
    const safe = {};
    for(const [k,v] of Object.entries(defaults[e.module])) {
      const next=e.settings[k];
      safe[k]=typeof next===typeof v && (!Array.isArray(v) || (Array.isArray(next) && next.length===v.length && next.every(Number.isFinite))) ? core.clone(next) : core.clone(v);
    }
    if(buttonState[e.module]) Object.assign(buttonState[e.module],safe);
    else if(e.module==='cursorgrid') Object.assign(cgSet,safe);
    else if(e.module==='aeroshards') Object.assign(asSet,safe);
    else { for(const k of keys[e.module]) state.u[k]=safe[k]; if('shape' in safe) state.shapeTarget=state.shapeCur=safe.shape; }
    if(state.active===e.module) {openPanel(byId(e.module));syncCursorGrid();syncAero();syncStageAct();}
    else activate(e.module);
    dialog.close(); syncDemo();
  }
  function renderSaved(){
    document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.tab===tabMode);b.setAttribute('aria-pressed',b.dataset.tab===tabMode);b.querySelector('span').textContent=data.entries.filter(e=>e.mode===b.dataset.tab).length;});
    const list=$('#savedList');list.replaceChildren();
    const entries=data.entries.filter(e=>e.mode===tabMode);
    if(!entries.length) list.append(el('<div class="empty-saved"><b>Здесь появятся твои идеи</b><p>Открой модуль, настрой его и нажми «Сохранить вариант».</p></div>'));
    entries.forEach((e,i)=>{
      const card=el('<article class="saved-card"><div class="saved-top"><h3></h3><button class="remove-saved" aria-label="Удалить вариант">×</button></div><p class="saved-meta"></p><details><summary>Изменённые настройки</summary><pre></pre></details><label>Твоё пожелание<textarea maxlength="5000" placeholder="Где использовать? Что изменить или добавить?"></textarea></label><button class="secondary restore">Открыть этот вариант ↗</button></article>');
      card.querySelector('h3').textContent=String(i+1).padStart(2,'0')+' / '+e.name;
      const delta=core.diff(e.settings,e.defaults);
      card.querySelector('.saved-meta').textContent=Object.keys(delta).length+' изменений · версия '+e.version;
      card.querySelector('pre').textContent=Object.keys(delta).length?JSON.stringify(delta,null,2):'Стандартные настройки';
      const note=card.querySelector('textarea');note.value=e.note;note.setAttribute('aria-label','Комментарий: '+e.name+' '+(i+1));note.addEventListener('input',()=>{e.note=note.value;persist();});
      card.querySelector('.restore').addEventListener('click',()=>restore(e));
      card.querySelector('.remove-saved').addEventListener('click',()=>{data.entries=data.entries.filter(x=>x.key!==e.key);if(editing===e.key)editing=null;persist();renderSaved();});
      list.append(card);
    });
    $('#projectNote').value=data.note;
    const designs=window.SiteBuilder?.getSaved()||[];
    let summary=$('#designSummary');
    if(!summary){summary=el('<div class="design-summary" id="designSummary"><span></span><button class="secondary">Открыть примерку ↗</button></div>');$('#savedList').after(summary);summary.querySelector('button').addEventListener('click',()=>{dialog.close();window.SiteBuilder.open();});}
    summary.querySelector('span').textContent='Композиции сайта в брифе: '+designs.length;
    summary.hidden=!designs.length;
    $('#showExport').disabled=!data.entries.length&&!designs.length;
  }
  function filter(){
    const category=$('#category').value;
    MODULES.forEach(m=>getModNode(m.id)?.classList.toggle('is-hidden',!!state.mode&&!m.dims.includes(state.mode) || category!=='all'&&meta[m.id].category!==category));
    document.querySelectorAll('.category-heading').forEach(h=>{
      h.hidden=!MODULES.some(m=>meta[m.id].category===h.dataset.category&&!getModNode(m.id).classList.contains('is-hidden'));
    });
  }
  function describe(m, container){
    $('#moduleSummary').textContent=meta[m.id].use;
    $('#saveVariant').disabled=false;
    const area=el('<div class="variant-controls"><button class="primary">☆ Сохранить новый вариант</button><button class="secondary update-variant" hidden>Обновить открытый вариант</button><button class="secondary reset-config">Сбросить настройки</button></div>');
    area.querySelector('.primary').addEventListener('click',saveVariant);
    const update=area.querySelector('.update-variant');
    const saved=data.entries.find(e=>e.key===editing&&e.module===m.id&&e.mode===state.mode);
    if(saved){update.hidden=false;update.addEventListener('click',()=>{saved.settings=config(m.id);persist();toast('Настройки открытого варианта обновлены.');});}
    area.querySelector('.reset-config').addEventListener('click',()=>{
      const temp={key:editing,module:m.id,mode:state.mode,settings:defaults[m.id]};
      restore(temp);
    });
    container.append(area);
  }
  function syncDemo(){
    const root=$('#buttonDemo'), settings=buttonState[state.active];
    if(state.active!=='aeroshards') $('#aeroStatus').hidden=true;
    $('#saveVariant').disabled=!state.active;
    root.hidden=!settings;
    if(!settings) return;
    root.replaceChildren();
    const content=el('<div class="demo-content"><span class="eyebrow">НАВЕДИ · НАЖМИ · ПОПРОБУЙ</span><h2>Маленькая деталь.<br>Большое впечатление.</h2><button class="demo-button"></button><p>Пример взаимодействия — без перехода на другую страницу.</p></div>');
    const button=content.querySelector('button');button.textContent=settings.text;
    button.classList.add(state.active==='glowbutton'?'glow-demo':'lift-demo');
    root.style.setProperty('--button-color',settings.color);root.style.setProperty('--button-radius',settings.radius+'px');root.style.setProperty('--button-time',settings.duration+'ms');root.style.setProperty('--button-strength',settings.strength||0);root.style.setProperty('--button-depth',(settings.depth||0)+'px');
    button.addEventListener('click',()=>toast('Так будет ощущаться нажатие на сайте клиента.'));
    root.append(content);
  }
  let aeroLoading=null;
  function aeroError(){const message=$('#aeroStatus');message.hidden=false;message.textContent='Этот 3D-эффект требует WebGPU. Если сцена не появилась, попробуй актуальный Chrome или Edge с аппаратным ускорением. Другие модули доступны.';}
  function loadAero(){
    if(aeroLoading) return;
    const status=$('#aeroStatus');status.hidden=false;status.textContent='Загружаем 3D-сцену…';
    aeroLoading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='vendor/aero.bundle.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});
    aeroLoading.then(()=>{status.hidden=true;syncAero();}).catch(()=>{if(state.active==='aeroshards'){status.hidden=false;status.textContent='Не удалось загрузить 3D-модуль. Проверь подключение и открой его ещё раз.';}aeroLoading=null;});
  }
  function openExport(){
    $('#exportText').value=core.exportText(data)+(window.SiteBuilder?.exportBrief()||'');
    $('#exportDialog').showModal();
  }
  let sceneSuspended=false;
  function suspendScene(){if(sceneSuspended)return;sceneSuspended=true;cancelAnimationFrame(rafId);rafId=null;hidePeek();if(cg)cg.setVisible(false);if(aero)aero.update({paused:true});}
  function resumeScene(){if(!sceneSuspended)return;sceneSuspended=false;lastT=performance.now();rafId=requestAnimationFrame(frame);syncCursorGrid();syncAero();}
  window.Playground={filter,describe,syncDemo,loadAero,aeroError,openExport,suspendScene,resumeScene,refreshBrief:()=>{if(dialog.open)renderSaved();}};
  for(const [id,name] of [['glowbutton','Мягкое свечение'],['liftbutton','Объёмная кнопка']]){
    ICONS[id]=ICONS.space;
    const m={id,name,dims:['2d'],custom:true,desc:id==='glowbutton'?'Подсветка кнопки при наведении и работе с клавиатуры.':'Пружинистое нажатие и цветное объёмное основание.'};
    MODULES.push(m);
    PANELS[id]=()=>{
      const b=el('<div></div>'), s=buttonState[id];
      b.append(colorOn(s,'Цвет','color',syncDemo),sliderOn(s,'Скругление','radius',0,40,1,v=>v+' px',syncDemo),sliderOn(s,'Длительность','duration',80,600,10,v=>v+' мс',syncDemo));
      b.append(id==='glowbutton'?sliderOn(s,'Сила свечения','strength',0,1,0.05,undefined,syncDemo):sliderOn(s,'Глубина','depth',2,14,1,v=>v+' px',syncDemo));
      const label=el('<label class="button-text-label">Текст кнопки<input type="text" maxlength="60"></label>');const input=label.querySelector('input');input.value=s.text;input.addEventListener('input',()=>{s.text=input.value;syncDemo();});b.append(label);return b;
    };
    const node=el(`<button class="mod revealed" data-id="${id}"><span class="mod-ico">${ICONS[id]}</span><span class="mod-name"><span class="nm">${name}</span><canvas class="nm-fx"></canvas></span><span class="mod-dot"></span></button>`);
    node.addEventListener('click',()=>activate(id));modList.append(node);
  }
  for(const m of MODULES) defaults[m.id]=config(m.id);
  // Preserve old starred modules once; the old format never stored configurations.
  try {
    if(!localStorage.getItem(storageKey)){
      const legacy=JSON.parse(localStorage.getItem('catspace:favs')||'[]');
      if(Array.isArray(legacy)) for(const id of new Set(legacy)){
        const m=byId(id);if(!m)continue;
        data.entries.push({key:uid(),module:id,name:m.name,mode:m.dims[0],version:1,settings:core.clone(defaults[id]),defaults:core.clone(defaults[id]),note:'Перенесено из старого избранного. Настройки в старой версии не сохранялись.',use:meta[id].use});
      }
    }
  } catch {}
  const categories={background:'Фоны',button:'Кнопки',object:'3D-объекты',scene:'Пространство'};
  for(const [category,title] of Object.entries(categories)){
    const heading=el(`<div class="category-heading" data-category="${category}">${title}</div>`);modList.append(heading);
    MODULES.filter(m=>meta[m.id].category===category).forEach(m=>{modList.append(getModNode(m.id));reveal(m.id);});
  }
  $('#category').addEventListener('change',filter);
  $('#saveVariant').addEventListener('click',saveVariant);
  $('#favBtn').addEventListener('click',()=>{tabMode=state.mode||'2d';renderSaved();dialog.showModal();});
  $('#closeBrief').addEventListener('click',()=>dialog.close());
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tabMode=b.dataset.tab;renderSaved();}));
  $('#projectNote').addEventListener('input',e=>{data.note=e.target.value;persist();});
  $('#showExport').addEventListener('click',openExport);
  $('#closeExport').addEventListener('click',()=>$('#exportDialog').close());
  $('#copyBrief').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('#exportText').value);toast('Бриф скопирован.');}
    catch{$('#exportText').focus();$('#exportText').select();toast('Выделили текст. Нажми Ctrl+C или скачай TXT.');}
  });
  $('#downloadBrief').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob(['\ufeff'+$('#exportText').value],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='crona-playground-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  document.addEventListener('visibilitychange',()=>{if((document.hidden||sceneSuspended)&&aero)aero.update({paused:true});else syncAero();});
  filter();persist();
  if(pendingStorageWarning)toast('Хранилище недоступно или повреждено. Сохраняй бриф в TXT.');
})();
