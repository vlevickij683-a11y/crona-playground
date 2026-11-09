'use strict';
(() => {
  const core=BuilderCore, site=document.getElementById('site');let selected='primary',editing=true;
  function render(raw){
    const s=core.normalize(raw);site.dataset.theme=s.theme;site.dataset.layout=s.layout;site.dataset.background=s.background;site.dataset.motion=s.motion?'on':'off';site.dataset.font=s.font;site.dataset.cards=s.cardStyle;site.dataset.density=s.density;site.dataset.header=s.headerSide;
    const bg=s.theme==='dark'?'#121018':'#f5f2ed';site.style.setProperty('--accent',s.accent);site.style.setProperty('--readable-accent',core.readable(s.accent,bg));site.style.setProperty('--intensity',s.intensity/100);site.style.setProperty('--radius',s.radius+'px');
    for(const button of document.querySelectorAll('[data-text]'))button.textContent=s[button.dataset.text];
    document.querySelector('.hero-copy').style.textAlign=s.heroAlign;
    for(const [zone,align] of [['hero',s.heroAlign],['card',s.cardAlign],['footer',s.footerAlign]]){
      const area=document.querySelector('[data-zone="'+zone+'"]');area.style.justifyContent={left:'flex-start',center:'center',right:'flex-end'}[align];
      if(zone==='hero'){area.style.flexDirection=s.heroButtons==='stack'?'column':'row';area.style.alignItems=s.heroButtons==='stack'?{left:'flex-start',center:'center',right:'flex-end'}[align]:'center';}
    }
    document.querySelector('.feature-copy').style.textAlign=s.cardAlign;document.querySelector('.contact').style.textAlign=s.footerAlign;
    document.querySelectorAll('[data-zone]').forEach(z=>z.replaceChildren());
    for(const [key,b] of Object.entries(s.buttons)){
      if(!b.visible)continue;
      const button=document.createElement('button');button.className='site-button';button.dataset.button=key;button.dataset.style=b.style;button.dataset.size=b.size;button.textContent=b.text||'Кнопка';button.title=editing?'Нажми, чтобы настроить эту кнопку':b.text;
      const color=b.color==='custom'?b.customColor:b.color==='neutral'?(s.theme==='dark'?'#eae3d7':'#272031'):s.accent;
      button.style.setProperty('--button',color);button.style.setProperty('--button-ink',core.ink(color));button.style.setProperty('--button-label',core.readable(color,bg));button.style.setProperty('--button-radius',b.radius+'px');
      document.querySelector('[data-zone="'+b.placement+'"]').append(button);
    }
    highlight();
  }
  function highlight(){site.dataset.editing=editing?'on':'off';document.querySelectorAll('[data-button]').forEach(b=>b.classList.toggle('chosen',editing&&b.dataset.button===selected));document.querySelectorAll('[data-text]').forEach(b=>b.classList.toggle('chosen',editing&&'text:'+b.dataset.text===selected));}
  document.addEventListener('click',e=>{
    const target=e.target.closest('[data-button],[data-text]');if(!target)return;
    if(editing){selected=target.dataset.button||'text:'+target.dataset.text;highlight();parent.postMessage({type:'crona:select',key:selected},location.origin);}
  });
  let pointerFrame=0,px=50,py=40;
  document.addEventListener('pointermove',e=>{px=e.clientX/innerWidth*100;py=(e.clientY+scrollY)/site.offsetHeight*100;if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{site.style.setProperty('--pointer-x',px+'%');site.style.setProperty('--pointer-y',py+'%');pointerFrame=0;});},{passive:true});
  window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='crona:render')return;selected=e.data.selected||'primary';editing=e.data.editing!==false;render(e.data.config);});
  render(core.defaults);parent.postMessage({type:'crona:ready'},location.origin);
})();
