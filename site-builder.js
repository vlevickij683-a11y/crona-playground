'use strict';
(() => {
  const core=BuilderCore,key='crona:playground:site-builder:v1';let storageFailed=false;
  let data;try{data=core.decode(localStorage.getItem(key));}catch{data=core.decode();storageFailed=true;}
  let current=data.current,selected='primary',editing=true,device='desktop',tab='site',loaded=false,activeSaved=null;
  let history=[],future=[];
  const buttonNames={nav:'Кнопка в шапке',primary:'Главная кнопка',secondary:'Вторая кнопка',card:'Кнопка карточки',footer:'Контактная кнопка'};
  const textNames={brand:'Название бренда',eyebrow:'Надзаголовок',title:'Главный заголовок',subtitle:'Описание на первом экране',cardTitle:'Заголовок карточки',cardText:'Текст карточки',contactTitle:'Контактный заголовок',contactText:'Контактное описание'};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const modal=document.createElement('dialog');modal.id='siteBuilder';modal.setAttribute('aria-labelledby','builderTitle');
  modal.innerHTML=`<header class="builder-top"><div><span class="eyebrow">CRONA / ПРИМЕРОЧНАЯ</span><h2 id="builderTitle">Твой сайт. Твой характер.</h2></div><div class="builder-devices" aria-label="Размер превью"><button data-device="desktop" aria-pressed="true">Компьютер</button><button data-device="mobile" aria-pressed="false">Телефон</button></div><button id="builderClose" aria-label="Закрыть примерку">✕</button></header>
  <div class="builder-body"><aside class="builder-controls"><div class="builder-tabs"><button data-builder-tab="site">Сайт</button><button data-builder-tab="element">Элемент</button><button data-builder-tab="saved">Варианты <span id="designCount"></span></button></div><div id="builderControls"></div></aside><section class="builder-preview-area"><div class="builder-preview-tools"><span id="builderHint">Нажми на кнопку или текст, чтобы изменить их</span><button id="builderInteract" class="secondary" aria-pressed="false">Проверить взаимодействие</button></div><div class="builder-frame-wrap" id="builderFrameWrap"><iframe title="Пример сайта FORMA" id="builderFrame" src="about:blank"></iframe></div></section></div>
  <footer class="builder-bottom"><div class="builder-history"><button id="builderUndo" class="secondary" aria-label="Отменить изменение">↶</button><button id="builderRedo" class="secondary" aria-label="Повторить изменение">↷</button><span id="builderSaveStatus" role="status">Черновик сохраняется автоматически</span></div><div><button id="builderSave" class="secondary">☆ Сохранить композицию</button><button id="builderExport" class="primary">Сохранить и собрать бриф ↗</button></div></footer>`;
  document.body.append(modal);
  const $b=s=>modal.querySelector(s), frame=$b('#builderFrame'),controls=$b('#builderControls');
  function sizePreview(){
    const wrap=$b('#builderFrameWrap'),width=device==='mobile'?390:1100;
    const scale=Math.min(1,wrap.clientWidth/width);
    if(!scale)return;
    Object.assign(frame.style,{width:width+'px',maxWidth:'none',height:wrap.clientHeight/scale+'px',position:'absolute',left:(wrap.clientWidth-width*scale)/2+'px',top:'0',transformOrigin:'top left',transform:`scale(${scale})`});
  }
  new ResizeObserver(sizePreview).observe($b('#builderFrameWrap'));
  const entry=document.createElement('button');entry.id='openSiteBuilder';entry.className='try-site';entry.innerHTML='<span>ПРИМЕРЬ ВМЕСТЕ</span><b>Собрать пример сайта ↗</b><small>Фоны, кнопки, тема и композиция</small>';
  document.querySelector('.brand').after(entry);entry.addEventListener('click',open);
  function persist(){data.current=current;try{localStorage.setItem(key,JSON.stringify(data));storageFailed=false;}catch{storageFailed=true;}$b('#builderSaveStatus').textContent=storageFailed?'Не удалось сохранить в браузере — скачай бриф':'Черновик сохранён в этом браузере';$b('#designCount').textContent=data.saved.length;window.Playground?.refreshBrief?.();}
  function send(){if(loaded)frame.contentWindow.postMessage({type:'crona:render',config:current,selected,editing},location.origin);$b('#builderUndo').disabled=!history.length;$b('#builderRedo').disabled=!future.length;}
  function change(fn){history.push(core.copy(current));if(history.length>60)history.shift();future=[];fn(current);current=core.normalize(current);persist();send();}
  function choices(field,label,items){const value=field.startsWith('buttons.')?current.buttons[selected][field.split('.').pop()]:current[field];return `<label class="builder-label">${label}<select data-field="${field}">${items.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${t}</option>`).join('')}</select></label>`;}
  function range(field,label,min,max,value){return `<label class="builder-label">${label}<span class="builder-range"><input aria-label="${label}" type="range" min="${min}" max="${max}" value="${value}" data-field="${field}"><output>${value}</output></span></label>`;}
  function colors(field,label,value){return `<label class="builder-label builder-color">${label}<input aria-label="${label}" type="color" value="${value}" data-field="${field}"></label>`;}
  const align=[['left','Слева'],['center','По центру'],['right','Справа']];
  function renderControls(){
    modal.querySelectorAll('[data-builder-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.builderTab===tab);b.setAttribute('aria-pressed',b.dataset.builderTab===tab);});
    if(tab==='site'){
      controls.innerHTML=`<div class="builder-section"><span class="eyebrow">01 / КОМПОЗИЦИЯ</span><div class="layout-options">${[['split','◧','Разделённый'],['center','▤','По центру'],['editorial','◨','Журнальный']].map(([v,icon,t])=>`<button data-layout="${v}" aria-pressed="${current.layout===v}" class="${current.layout===v?'selected':''}"><i>${icon}</i>${t}</button>`).join('')}</div>${choices('heroAlign','Выравнивание первого экрана',align)}${choices('heroButtons','Кнопки на первом экране',[['row','В одну строку'],['stack','Друг под другом']])}</div>
      <div class="builder-section"><span class="eyebrow">02 / АТМОСФЕРА</span>${choices('theme','Тема',[['dark','Тёмная'],['light','Светлая']])}${colors('accent','Акцентный цвет',current.accent)}<div class="accent-swatches">${['#ac87fa','#34bca3','#ed9a56','#ed7196','#608eee'].map(c=>`<button data-accent="${c}" style="--swatch:${c}" aria-label="Акцент ${c}"></button>`).join('')}</div>${choices('background','Фон',[['mesh','Мягкие градиенты'],['grid','Сетка с подсветкой'],['orbits','Орбитальные линии']])}${range('intensity','Интенсивность фона',0,100,current.intensity)}<label class="builder-check"><input type="checkbox" data-field="motion" ${current.motion?'checked':''}> Анимация фона и объекта</label></div>
      <div class="builder-section"><span class="eyebrow">03 / ДЕТАЛИ</span>${choices('font','Шрифт',[['sans','Современный'],['serif','С засечками'],['mono','Моноширинный']])}${choices('cardStyle','Карточки',[['glass','Матовое стекло'],['solid','Сплошная заливка'],['outline','Только рамка']])}${range('radius','Скругление карточек',0,40,current.radius)}${choices('density','Отступы',[['compact','Компактные'],['comfortable','Сбалансированные'],['airy','Больше воздуха']])}${choices('headerSide','Кнопки в шапке',[['right','Справа от логотипа'],['left','Слева от логотипа']])}${choices('cardAlign','Выравнивание карточки',align)}${choices('footerAlign','Выравнивание контактов',align)}</div><button class="secondary builder-reset" id="builderReset">Вернуть исходный шаблон</button>`;
    }else if(tab==='element'){
      const text=selected.startsWith('text:');const field=text?selected.slice(5):null;
      controls.innerHTML=`<div class="builder-section"><span class="eyebrow">ВЫБРАННЫЙ ЭЛЕМЕНТ</span><label class="builder-label">Что редактируем<select id="builderElement">${Object.entries(buttonNames).map(([v,t])=>`<option value="${v}" ${selected===v?'selected':''}>${t}</option>`).join('')}${Object.entries(textNames).map(([v,t])=>`<option value="text:${v}" ${field===v?'selected':''}>${t}</option>`).join('')}</select></label>${text?`<label class="builder-label">${textNames[field]}<textarea data-field="${field}" maxlength="${field==='brand'?32:400}" rows="6">${esc(current[field])}</textarea></label><p class="builder-tip">Переносы строк сохраняются. Размер текста подстраивается под ширину экрана.</p>`:buttonControls()}</div>`;
    }else renderSaved();
    $b('#designCount').textContent=data.saved.length;
  }
  function buttonControls(){const b=current.buttons[selected];return `<label class="builder-label">Текст кнопки<input type="text" data-field="buttons.text" value="${esc(b.text)}" maxlength="60"></label>${choices('buttons.style','Внешний вид',[['solid','Заливка'],['outline','Контур'],['glow','Свечение'],['lift','Объёмное нажатие'],['text','Текстовая']])}${choices('buttons.placement','Расположение',[['header','В шапке'],['hero','На первом экране'],['card','В карточке'],['footer','В контактном блоке']])}${choices('buttons.color','Цвет кнопки',[['auto','Акцент темы — автоматически'],['neutral','Нейтральный — по теме'],['custom','Свой цвет']])}${b.color==='custom'?colors('buttons.customColor','Свой цвет',b.customColor):''}${range('buttons.radius','Скругление кнопки',0,40,b.radius)}${choices('buttons.size','Размер кнопки',[['small','Маленькая'],['medium','Средняя'],['large','Большая']])}<label class="builder-check"><input type="checkbox" data-field="buttons.visible" ${b.visible?'checked':''}> Показывать кнопку</label><p class="builder-tip">Цвет надписи адаптируется для контраста. Скрытую кнопку можно вернуть через этот список.</p>`;}
  function renderSaved(){controls.innerHTML=`<div class="builder-section"><span class="eyebrow">СОХРАНЁННЫЕ КОМПОЗИЦИИ</span><p class="builder-tip">Каждый вариант — полный снимок страницы. В бриф попадут только изменённые настройки.</p><div id="builderSavedList"></div></div>`;
    const list=$b('#builderSavedList');if(!data.saved.length)list.innerHTML='<p class="builder-empty">Пока пусто. Настрой сайт и нажми «Сохранить композицию».</p>';
    data.saved.forEach(item=>{const card=document.createElement('article');card.className='builder-saved';card.innerHTML=`<label class="builder-label">Название<input value="${esc(item.name)}" maxlength="80" data-name="${esc(item.id)}"></label><label class="builder-label">Пожелание<textarea rows="3" maxlength="5000" data-note="${esc(item.id)}">${esc(item.note)}</textarea></label><div><button class="secondary" data-restore="${esc(item.id)}">Открыть</button><button class="secondary" data-remove="${esc(item.id)}" aria-label="Удалить композицию ${esc(item.name)}">×</button></div>`;list.append(card);});
  }
  function open(){if(!modal.open){modal.showModal();window.Playground.suspendScene();}if(!loaded&&frame.src.endsWith('about:blank'))frame.src='builder-preview.html';renderControls();send();sizePreview();if(storageFailed)$b('#builderSaveStatus').textContent='Хранилище недоступно — сохрани бриф в TXT';}
  function save(){
    const id=crypto.randomUUID();const name='Композиция '+(data.saved.length+1);
    data.saved.push({id,name,note:'',config:core.copy(current)});activeSaved=id;persist();tab='saved';renderControls();$b('#builderSaveStatus').textContent='Композиция сохранена и добавлена в бриф';
  }
  modal.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.builderTab){tab=b.dataset.builderTab;renderControls();}
    if(b.dataset.layout){change(s=>{s.layout=b.dataset.layout;s.heroAlign=s.layout==='center'?'center':'left';});renderControls();}
    if(b.dataset.accent){change(s=>s.accent=b.dataset.accent);renderControls();}
    if(b.dataset.device){device=b.dataset.device;$b('#builderFrameWrap').dataset.device=device;modal.querySelectorAll('[data-device]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.device===device));sizePreview();}
    if(b.dataset.restore){const item=data.saved.find(x=>x.id===b.dataset.restore);if(item){change(s=>Object.assign(s,core.copy(item.config)));activeSaved=item.id;tab='site';renderControls();}}
    if(b.dataset.remove){data.saved=data.saved.filter(x=>x.id!==b.dataset.remove);if(activeSaved===b.dataset.remove)activeSaved=null;persist();renderSaved();}
    if(b.id==='builderReset'){change(s=>Object.assign(s,core.copy(core.defaults)));renderControls();}
  });
  controls.addEventListener('input',e=>{
    const t=e.target;if(t.dataset.name){data.saved.find(x=>x.id===t.dataset.name).name=t.value;persist();return;}
    if(t.dataset.note){data.saved.find(x=>x.id===t.dataset.note).note=t.value;persist();return;}
    if(!t.dataset.field)return;
    const value=t.type==='checkbox'?t.checked:t.type==='range'?Number(t.value):t.value;
    change(s=>{if(t.dataset.field.startsWith('buttons.'))s.buttons[selected][t.dataset.field.split('.').pop()]=value;else s[t.dataset.field]=value;});
    if(t.type==='range')t.nextElementSibling.value=value;
    if(t.tagName==='SELECT'&&t.dataset.field==='buttons.color')renderControls();
  });
  controls.addEventListener('change',e=>{if(e.target.id==='builderElement'){selected=e.target.value;renderControls();send();}});
  $b('#builderClose').addEventListener('click',()=>modal.close());
  $b('#builderInteract').addEventListener('click',()=>{editing=!editing;$b('#builderInteract').textContent=editing?'Проверить взаимодействие':'Вернуться к редактированию';$b('#builderInteract').setAttribute('aria-pressed',!editing);$b('#builderHint').textContent=editing?'Нажми на кнопку или текст, чтобы изменить их':'Наводи и нажимай — кнопки работают как на настоящем сайте';send();});
  $b('#builderSave').addEventListener('click',save);
  $b('#builderExport').addEventListener('click',()=>{
    if(!data.saved.some(x=>JSON.stringify(x.config)===JSON.stringify(current)))save();
    window.Playground.openExport();
  });
  $b('#builderUndo').addEventListener('click',()=>{if(!history.length)return;future.push(core.copy(current));current=history.pop();persist();renderControls();send();});
  $b('#builderRedo').addEventListener('click',()=>{if(!future.length)return;history.push(core.copy(current));current=future.pop();persist();renderControls();send();});
  window.addEventListener('message',e=>{
    if(e.source!==frame.contentWindow||e.origin!==location.origin)return;
    if(e.data?.type==='crona:ready'){loaded=true;send();}
    if(e.data?.type==='crona:select'&&typeof e.data.key==='string'&&(buttonNames[e.data.key]||e.data.key.startsWith('text:')&&textNames[e.data.key.slice(5)])){
      selected=e.data.key;tab='element';renderControls();send();
    }
  });
  window.SiteBuilder={open,getSaved:()=>core.copy(data.saved),exportBrief:()=>core.exportDesigns(data.saved)};
  // Pause the preview's animations whenever its editor is closed.
  modal.addEventListener('close',()=>{window.Playground.resumeScene();if(loaded)frame.contentWindow.postMessage({type:'crona:render',config:{...current,motion:false},selected,editing:false},location.origin);});
})();
