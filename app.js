'use strict';

/* ============================================================
   CatSpace — визуальная мини-игра (portfolio)
   интро с котиком → тёмный UI → модули (2D/3D) → WebGL-сцена
   ============================================================ */

/* ---------------- иконки модулей ---------------- */
const S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  space:    `<svg ${S}><path d="M12 3l7.5 4.3v8.6L12 20.2 4.5 15.9V7.3L12 3z"/><path d="M12 11.6l7.5-4.3M12 11.6v8.6M12 11.6L4.5 7.3"/></svg>`,
  light:    `<svg ${S}><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5 5l1.9 1.9M17.1 17.1L19 19M19 5l-1.9 1.9M6.9 17.1L5 19"/></svg>`,
  grid:     `<svg ${S}><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/></svg>`,
  formulas: `<svg ${S}><path d="M17.5 5.5h-11l5.6 6.5-5.6 6.5h11"/></svg>`,
  particles:`<svg ${S}><path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8L12 3.5z"/><circle cx="18.6" cy="17.6" r="1.6"/><circle cx="6.2" cy="17.2" r="1.2"/></svg>`,
  waves:    `<svg ${S}><path d="M3 13c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/></svg>`,
  iskry:    `<svg ${S}><circle cx="12" cy="12" r="2.3"/><path d="M12 4.6v3M12 16.4v3M4.6 12h3M16.4 12h3M6.9 6.9l2.1 2.1M15 15l2.1 2.1M17.1 6.9L15 9M9 15l-2.1 2.1"/></svg>`,
  waveskry: `<svg ${S}><path d="M3 15.5c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/><circle cx="12" cy="6" r="1.7"/><path d="M12 2.6v1.5M12 7.9v1.5M8.5 6h1.5M14 6h1.5"/></svg>`,
  cursorgrid:`<svg ${S}><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/><circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" opacity=".5"/></svg>`,
  aeroshards:`<svg ${S}><path d="M4 18.5 8.6 5.6l3.3 7.7 2.7-4.4 5.4 9.6z"/><path d="M8.6 5.6l3.3 7.7M14.6 8.9l-2.7 4.4"/></svg>`,
};

/* ---------------- конфиг модулей ---------------- */
const MODULES = [
  // основные
  { id:'space',    name:'Пространство', dims:['2d','3d'], main:true,
    desc:'Выбор размерности сцены: 3D-пространство формул или 2D-плоскость. Здесь же свет и сетка.' },
  { id:'formulas', name:'Формулы', dims:['3d'], main:true,
    desc:'SDF-поверхности: тор, сфера, куб, октаэдр — морфинг между формулами.' },
  { id:'particles',name:'Частицы', dims:['3d'], main:true,
    desc:'Орбитальные световые частицы вокруг объекта.' },
  // модули из ссылок (без эмодзи, отдельный раздел, взаимоисключающие, всегда внизу)
  { id:'waveskry', name:'Волны и искры', dims:['2d'], custom:true,
    desc:'Один модуль: кольца-волны от кликов и интерактивные искры с реакцией на курсор.' },
  { id:'cursorgrid', name:'Сетка курсора', dims:['2d'], custom:true,
    desc:'Ячейки загораются и гаснут за курсором: прожектор, волны от кликов, стили линий. Адаптация React Bits Cursor Grid.' },
  { id:'aeroshards', name:'Aero Shards', dims:['3d'], custom:true,
    desc:'Ленты толстых стеклянных осколков на слоях глубины, блик по рёбрам, маркеры, bloom. Полный порт React Bits Aero Shards.' },
];

const LIGHT_COLORS = [
  ['#9db8ff','Лёд'], ['#ff8fd8','Неон'], ['#7dffcf','Мята'],
  ['#ffc46b','Янтарь'], ['#b697ff','Фиолет'], ['#ffffff','Белый'],
];
const SHAPES = ['Тор','Сфера','Куб','Октаэдр'];

/* ---------------- состояние ---------------- */
const state = {
  mode: null,                       // null | '2d' | '3d'
  active: null,                     // один активный модуль: старый выключается, настройки остаются
  revealed: new Set(),
  reveal: 0,                        // 0..1 — волна-раскрытие сцены
  revealPos: [0, 0],
  revealRun: false,
  waveCount: 0,                     // волн за запуск: максимум 2 (выбор режима + первое переключение)
  u: {
    light: 1.0,
    lightCol: [0.62, 0.74, 1.0],
    gridOn: 1, gridScale: 14,
    rotSpeed: 0.25,
    particle: 1.0, particleSpeed: 1.0,
    ringAmp: 0.9, ringSpeed: 1.3,
    sparks: 1.0, sparkSpeed: 1.0, sparkReact: 0.9,
    attract: 0,
  },
  shapeTarget: 0, shapeCur: 0,
};

/* ---------------- хелперы ---------------- */
const $  = s => document.querySelector(s);
const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const mod4 = v => ((v % 4) + 4) % 4;
const byId = id => MODULES.find(m => m.id === id);
const hex2rgb = h => [1,3,5].map(i => parseInt(h.substr(i,2),16)/255);
const rgb2hex = c => '#' + c.map(v => Math.round(v*255).toString(16).padStart(2,'0')).join('');

/* ---------------- SVG котика ---------------- */
const CAT_SVG = `
<svg class="cat is-awake" viewBox="0 0 300 260" role="img" aria-label="Сидящий фиолетовый кот следит за курсором">
 <ellipse cx="150" cy="242" rx="92" ry="9" fill="#000" opacity=".3"/>
 <path class="cat-tail" d="M205 218 C266 238 280 187 256 176" fill="none" stroke="#7660aa" stroke-width="22" stroke-linecap="round"/>
 <g class="cat-breathe">
  <path d="M106 111 C78 151 71 203 87 232 Q150 251 215 232 C231 205 213 148 194 112Z" fill="#8870bc"/>
  <ellipse cx="151" cy="187" rx="38" ry="47" fill="#b8a0db"/>
  <path d="M114 177 L109 232 M187 177 L192 232" stroke="#6c529d" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="108" cy="232" rx="24" ry="10" fill="#a58ace"/><ellipse cx="193" cy="232" rx="24" ry="10" fill="#a58ace"/>
  <g class="cat-face">
   <path d="M79 91 L79 29 Q82 20 112 48 Q149 34 185 48 Q216 20 221 29 L222 93 C227 132 196 153 150 154 C104 153 74 132 79 91Z" fill="#a58ace"/>
   <path d="M89 68 L89 40 L111 57Z M191 57 L211 40 L211 68Z" fill="#e3a5bf"/>
   <path d="M141 46 L145 61 M158 45 L155 61" stroke="#8870bc" stroke-width="5" stroke-linecap="round"/>
   <g class="cat-eyes">
    <ellipse cx="119" cy="96" rx="20" ry="23" fill="#f5e5b8"/><ellipse cx="181" cy="96" rx="20" ry="23" fill="#f5e5b8"/>
    <g class="pupil"><ellipse cx="119" cy="98" rx="7" ry="14" fill="#272034"/><ellipse cx="181" cy="98" rx="7" ry="14" fill="#272034"/>
    <circle cx="122" cy="92" r="3" fill="white"/><circle cx="184" cy="92" r="3" fill="white"/></g>
   </g>
   <path d="M144 117 Q150 113 156 117 L150 123Z" fill="#eab1c8"/>
   <path d="M150 123 Q142 133 136 125 M150 123 Q158 133 164 125" fill="none" stroke="#59436f" stroke-width="2.5" stroke-linecap="round"/>
   <path d="M102 121 L67 116 M103 129 L68 135 M198 121 L233 116 M197 129 L232 135" stroke="#d5bfe9" stroke-width="2" stroke-linecap="round"/>
  </g>
 </g>
</svg>`;

/* ---------------- построение сайдбара ---------------- */
const modList = $('#modList');
{
  let buildIdx = 0;
  MODULES.forEach(m => {
    const right = `<span class="mod-dot"></span>`;
    const node = el(`
      <button class="mod" data-id="${m.id}" style="--i:${buildIdx++}">
        <span class="mod-ico">${ICONS[m.id]}</span>
        <span class="mod-name"><span class="nm">${m.name}</span><canvas class="nm-fx"></canvas></span>
        ${right}
      </button>`);
    node.addEventListener('click', e => {
      if (e.target.closest('.mod-star')) return;    // звезда — только избранное
      activate(m.id);
    });

    node.addEventListener('contextmenu', e => {
      e.preventDefault();
      reveal(m.id);
      showCtx(e.clientX, e.clientY, m.id);
    });
    if (m.custom){                    // живая миниатюра — только для модулей из ссылок
      node.addEventListener('mouseenter', () => showPeek(m, node));
      node.addEventListener('mouseleave', hidePeek);
    }
    modList.appendChild(node);
  });
}

const getModNode = id => modList.querySelector(`.mod[data-id="${id}"]`);

function reveal(id){
  state.revealed.add(id);
  const n = getModNode(id);
  if (n){ n.classList.add('revealed'); n.title = byId(id).name; }
}
function hideName(id){
  state.revealed.delete(id);
  const n = getModNode(id);
  if (n){ n.classList.remove('revealed'); n.title = ''; }
}

/* ---------------- частицы вместо блюра названий ---------------- */
const nameFX = [];
const namePointer = { f: null, x: 0, y: 0 };   // курсор над нераскрытым названием

function buildNameFX(){
  nameFX.length = 0;
  document.querySelectorAll('.mod').forEach(mod => {
    const nm = mod.querySelector('.nm');
    const canvas = mod.querySelector('.nm-fx');
    const cs = getComputedStyle(nm);
    const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font;
    const w = Math.ceil(meas.measureText(nm.textContent).width) + 8;
    const h = Math.ceil(parseFloat(cs.fontSize) * 1.7) + 6;
    canvas.width  = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    // растеризуем текст и собираем точки-частицы по его пикселям
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const o = off.getContext('2d');
    o.font = font; o.fillStyle = '#fff'; o.textBaseline = 'middle';
    o.fillText(nm.textContent, 4, h / 2 + 0.5);
    const data = o.getImageData(0, 0, w, h).data;

    const pts = [];
    const step = 2;
    for (let y = 0; y < h; y += step){
      for (let x = 0; x < w; x += step){
        if (data[(y * w + x) * 4 + 3] > 110){
          pts.push({
            x, y,
            r: 0.6 + Math.random() * 1.3,
            ph: Math.random() * 6.28,
            sx: (Math.random() - 0.5) * 2.4,
            sy: (Math.random() - 0.5) * 2.0,
            sp: 0.5 + Math.random() * 1.5,
            ox: 0, oy: 0,            // смещение от курсора
          });
        }
      }
    }
    nameFX.push({ mod, canvas, ctx: canvas.getContext('2d'), pts, w, h, dpr, cleared: false });
  });
}

/* курсор в меню: частицы названия разлетаются от указателя (только в меню слева) */
modList.addEventListener('mousemove', e => {
  const node = e.target.closest('.mod');
  const f = node ? nameFX.find(x => x.mod === node) : null;
  if (!f){ namePointer.f = null; return; }
  const r = f.canvas.getBoundingClientRect();
  namePointer.f = f;
  namePointer.x = e.clientX - r.left;
  namePointer.y = e.clientY - r.top;
});
modList.addEventListener('mouseleave', () => { namePointer.f = null; });

function drawNameFX(t){
  for (const f of nameFX){
    if (f.mod.classList.contains('revealed')){
      if (!f.cleared){ f.ctx.clearRect(0, 0, f.w, f.h); f.cleared = true; }
      continue;
    }
    f.cleared = false;
    const c = f.ctx;
    const hover = namePointer.f === f;
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    c.clearRect(0, 0, f.w, f.h);
    for (const q of f.pts){
      const dx = Math.sin(t * q.sp + q.ph) * 1.1 + q.sx;
      const dy = Math.cos(t * q.sp * 0.8 + q.ph * 1.3) * 0.9 + q.sy;
      // реакция на курсор: отталкивание с плавным возвратом
      let tx = 0, ty = 0;
      if (hover){
        const rx = q.x - namePointer.x, ry = q.y - namePointer.y;
        const L = Math.hypot(rx, ry);
        const R = 44;
        if (L < R && L > 0.01){
          const k = 1 - L / R;
          const push = k * k * 15;
          tx = rx / L * push; ty = ry / L * push;
        }
      }
      q.ox += (tx - q.ox) * 0.16;
      q.oy += (ty - q.oy) * 0.16;
      const a = 0.30 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.3 + q.ph * 2));
      c.fillStyle = 'rgba(198,214,255,' + a.toFixed(3) + ')';
      c.fillRect(q.x + dx + q.ox, q.y + dy + q.oy, q.r, q.r);
    }
  }
}

/* ---------------- контролы панелей ---------------- */
function sliderOn(target, label, key, min, max, step, fmt = v => (+v).toFixed(2), onChange){
  const b = el(`
    <div class="ctl">
      <div class="ctl-row"><span>${label}</span><b class="val">${fmt(target[key])}</b></div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${target[key]}">
    </div>`);
  const input = b.querySelector('input'), val = b.querySelector('.val');
  input.setAttribute('aria-label', label);
  input.addEventListener('input', () => {
    target[key] = parseFloat(input.value);
    val.textContent = fmt(target[key]);
    if (onChange) onChange();
  });
  return b;
}
function sliderBlock(label, key, min, max, step, fmt){
  return sliderOn(state.u, label, key, min, max, step, fmt);
}

function toggleOn(target, label, key, onChange){
  const b = el(`
    <div class="ctl">
      <div class="ctl-row"><span>${label}</span>
        <button class="switch ${target[key] ? 'on' : ''}" role="switch"><i></i></button>
      </div>
    </div>`);
  const sw = b.querySelector('.switch');
  sw.setAttribute('aria-label', label);
  sw.setAttribute('aria-checked', !!target[key]);
  sw.addEventListener('click', () => {
    target[key] = target[key] ? 0 : 1;
    sw.classList.toggle('on', !!target[key]);
    sw.setAttribute('aria-checked', !!target[key]);
    if (onChange) onChange();
  });
  return b;
}
function toggleBlock(label, key){
  return toggleOn(state.u, label, key);
}

function chipsOn(target, label, key, options, onChange){
  const b = el(`
    <div class="ctl">
      <div class="ctl-row"><span>${label}</span></div>
      <div class="chips">
        ${options.map((o, i) => `<button class="chip ${target[key] === o.v ? 'sel' : ''}" data-v="${o.v}">${o.t}</button>`).join('')}
      </div>
    </div>`);
  b.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.v;
      target[key] = isNaN(+raw) ? raw : +raw;
      b.querySelectorAll('.chip').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
      if (onChange) onChange();
    });
  });
  return b;
}

function swatchBlock(){
  const cur = rgb2hex(state.u.lightCol);
  const b = el(`
    <div class="ctl">
      <div class="ctl-row"><span>Цвет света</span><b class="val hex">${cur}</b></div>
      <div class="swatches">
        ${LIGHT_COLORS.map(c => `<button class="sw ${c[0].toLowerCase() === cur ? 'sel' : ''}" style="--c:${c[0]}" title="${c[1]}"></button>`).join('')}
      </div>
    </div>`);
  const hexVal = b.querySelector('.hex');
  b.querySelectorAll('.sw').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      state.u.lightCol = hex2rgb(LIGHT_COLORS[i][0]);
      hexVal.textContent = LIGHT_COLORS[i][0];
      b.querySelectorAll('.sw').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
    });
  });
  return b;
}

function shapeBlock(){
  const sel = mod4(state.shapeTarget);
  const b = el(`
    <div class="ctl">
      <div class="ctl-row"><span>Форма (SDF)</span></div>
      <div class="chips">
        ${SHAPES.map((s, i) => `<button class="chip ${i === sel ? 'sel' : ''}" data-i="${i}">${s}</button>`).join('')}
      </div>
    </div>`);
  b.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      setShape(+btn.dataset.i);
      b.querySelectorAll('.chip').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
    });
  });
  return b;
}

/* ---------------- настройки модуля «Сетка курсора» ---------------- */
const cgSet = {
  on: 1,             // слой включён (показывать в 2D)
  cellSize: 60,
  radius: 140,
  falloff: 1,        // 0 линейный, 1 плавный, 2 резкий
  highlight: 0,      // 0 область, 1 ячейка
  holdTime: 400,
  fadeDuration: 800,
  lineWidth: 1,
  maxOpacity: 1,
  fillOpacity: 0.08,
  gridOpacity: 0.14,
  gridStyle: 0,      // 0 линии, 1 пунктир, 2 точки, 3 крестики
  cellRadius: 0,
  cellGap: 0,
  spotlight: 0.6,
  clickPulse: 1,
  pulseSpeed: 600,
  ambient: 0.1,
  edgeFade: 0.2,
  intro: 1,
  color: '#ffffff',
  gridColor: '#ffffff',
  dpr: 2,
};

/* ---------------- настройки модуля «Aero Shards» (из пропсов оригинала) ---------------- */
const asSet = {
  on: 1,                      // слой включён (показывать в 3D)
  shardColor: '#896ABD',
  accentColor: '#A855F7',
  backgroundColor: '#0B0913',
  lightMode: false,
  placement: 'full',          // full | left | right | center
  material: 'glass',          // glass | chrome
  count: 1300,                // 100..6000
  shardSize: 1,               // 0.2..4
  spread: 1,                  // 0..3
  twist: 1,                   // 0..3
  billow: 1,                  // 0..3
  speed: 1,                   // 0..4
  scale: 1,                   // 0.4..2.5
  depthOfField: 0.75,         // 0..1
  glow: 0.35,                 // 0..2
  grain: 0.06,                // 0..0.5
  vignette: 0.3,              // 0..1
  intro: true,
  mouseInteraction: true,
  mouseStrength: 0.6,         // 0..1
  markers: 'plus',            // plus | dots | none
  pulseOnClick: true,
  holdToGather: true,
  parallax: 0.5,              // 0..1
  paused: false,
  dpr: 2,                     // 0.5..2
};

/* контрол выбора цвета */
function colorOn(target, label, key, onChange){
  const cur = target[key] === 'transparent' || !/^#[0-9a-f]{6}$/i.test(target[key]) ? '#0b0913' : target[key];
  const b = el(`
    <div class="ctl">
      <div class="ctl-row"><span>${label}</span><b class="val hex">${target[key]}</b></div>
      <input type="color" value="${cur}">
    </div>`);
  const inp = b.querySelector('input'), val = b.querySelector('.val');
  inp.setAttribute('aria-label', label);
  inp.addEventListener('input', () => {
    target[key] = inp.value;
    val.textContent = inp.value;
    if (onChange) onChange();
  });
  return b;
}

/* ---------------- панели модулей ---------------- */
const PANELS = {
  space(){
    const w = el(`
      <div>
        <div class="dim-cards">
          <button class="dim-card ${state.mode === '3d' ? 'sel' : ''}" data-dim="3d">
            <span class="dim-prev p3d">${ICONS.space}</span>
            <b>3D</b><small>raymarching · SDF</small>
          </button>
          <button class="dim-card ${state.mode === '2d' ? 'sel' : ''}" data-dim="2d">
            <span class="dim-prev p2d">${ICONS.waveskry}</span>
            <b>2D</b><small>искры · волны</small>
          </button>
        </div>
      </div>`);
    w.querySelectorAll('.dim-card').forEach(btn =>
      btn.addEventListener('click', () => setMode(btn.dataset.dim)));

    const lightSec = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.light}</i>Освещение</div></div>`);
    lightSec.appendChild(sliderBlock('Интенсивность', 'light', 0.3, 2, 0.01));
    lightSec.appendChild(swatchBlock());
    w.appendChild(lightSec);

    const gridSec = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.grid}</i>Сетка</div></div>`);
    gridSec.appendChild(toggleBlock('Сетка включена', 'gridOn'));
    gridSec.appendChild(sliderBlock('Плотность линий', 'gridScale', 6, 30, 1, v => String(Math.round(v))));
    w.appendChild(gridSec);

    w.appendChild(el('<p class="panel-note">Свет и сетка — общие настройки пространства (часть будущих модулей может их игнорировать). Режим фильтрует модули меню.</p>'));
    return w;
  },
  cursorgrid(){
    const w = el('<div></div>');
    w.appendChild(toggleOn(cgSet, 'Слой включён', 'on', syncCursorGrid));
    w.appendChild(sliderOn(cgSet, 'Размер ячейки', 'cellSize', 24, 140, 2, v => Math.round(v) + ' px', cgWake));
    w.appendChild(sliderOn(cgSet, 'Радиус подсветки', 'radius', 40, 340, 5, v => Math.round(v) + ' px', cgWake));
    w.appendChild(sliderOn(cgSet, 'Прожектор у курсора', 'spotlight', 0, 1, 0.01, undefined, cgWake));
    w.appendChild(chipsOn(cgSet, 'Стиль сетки', 'gridStyle',
      [{ v:0, t:'Линии' }, { v:1, t:'Пунктир' }, { v:2, t:'Точки' }, { v:3, t:'Крестики' }], cgWake));
    w.appendChild(chipsOn(cgSet, 'Подсветка', 'highlight',
      [{ v:0, t:'Область' }, { v:1, t:'Ячейка' }], cgWake));
    w.appendChild(chipsOn(cgSet, 'Спад яркости', 'falloff',
      [{ v:0, t:'Линейный' }, { v:1, t:'Плавный' }, { v:2, t:'Резкий' }], cgWake));
    w.appendChild(sliderOn(cgSet, 'Яркость сетки', 'gridOpacity', 0, 0.5, 0.01, undefined, cgWake));
    w.appendChild(sliderOn(cgSet, 'Заливка ячейки', 'fillOpacity', 0, 0.5, 0.01, undefined, cgWake));
    w.appendChild(sliderOn(cgSet, 'Толщина линий', 'lineWidth', 0.5, 3, 0.25, v => (+v).toFixed(2) + ' px', cgWake));
    w.appendChild(sliderOn(cgSet, 'Удержание следа', 'holdTime', 0, 1500, 50, v => Math.round(v) + ' мс', cgWake));
    w.appendChild(sliderOn(cgSet, 'Время затухания', 'fadeDuration', 200, 2500, 50, v => Math.round(v) + ' мс', cgWake));
    w.appendChild(toggleOn(cgSet, 'Волна от клика', 'clickPulse', cgWake));
    w.appendChild(sliderOn(cgSet, 'Скорость волны', 'pulseSpeed', 150, 1600, 50, v => Math.round(v), cgWake));
    w.appendChild(sliderOn(cgSet, 'Случайные вспышки', 'ambient', 0, 1, 0.01, undefined, cgWake));
    w.appendChild(sliderOn(cgSet, 'Затухание к краям', 'edgeFade', 0, 0.5, 0.01, undefined, cgWake));
    w.appendChild(el('<p class=\"panel-note\">Ячейки вокруг курсора загораются и плавно гаснут; клик пускает волну по сетке. Слой активен только в режиме 2D.</p>'));
    return w;
  },
  formulas(){
    const w = el('<div></div>');
    w.appendChild(shapeBlock());
    w.appendChild(sliderBlock('Скорость вращения', 'rotSpeed', 0, 0.8, 0.01));
    w.appendChild(el('<p class="panel-note">Форма меняется плавным морфингом расстояний между SDF.</p>'));
    return w;
  },
  particles(){
    const w = el('<div></div>');
    w.appendChild(sliderBlock('Плотность', 'particle', 0, 1.6, 0.01));
    w.appendChild(sliderBlock('Скорость орбит', 'particleSpeed', 0.2, 2, 0.01));
    return w;
  },
  waveskry(){
    const w = el('<div></div>');
    const wv = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.waves}</i>Волны-кольца</div></div>`);
    wv.appendChild(sliderBlock('Амплитуда колец', 'ringAmp', 0, 1.5, 0.01));
    wv.appendChild(sliderBlock('Скорость колец', 'ringSpeed', 0.3, 3, 0.05, v => (+v).toFixed(2)));
    w.appendChild(wv);
    const sk = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.iskry}</i>Искры</div></div>`);
    sk.appendChild(sliderBlock('Количество', 'sparks', 0.2, 1.6, 0.01));
    sk.appendChild(sliderBlock('Скорость дрейфа', 'sparkSpeed', 0.2, 2.5, 0.01));
    sk.appendChild(sliderBlock('Реакция на курсор', 'sparkReact', 0, 1.6, 0.01));
    w.appendChild(sk);
    w.appendChild(el('<p class="panel-note">Клик по сцене — кольцо от точки. Кнопки внизу: импульс, притяжение, отталкивание. Модуль показывает только свои частицы и волны.</p>'));
    return w;
  },
  aeroshards(){
    const w = el('<div></div>');
    const layer = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.aeroshards}</i>Слой</div></div>`);
    layer.appendChild(toggleOn(asSet, 'Слой включён', 'on', syncAero));
    layer.appendChild(chipsOn(asSet, 'Материал', 'material',
      [{ v:'glass', t:'Стекло' }, { v:'chrome', t:'Хром' }], syncAero));
    layer.appendChild(chipsOn(asSet, 'Размещение', 'placement',
      [{ v:'full', t:'Везде' }, { v:'left', t:'Слева' }, { v:'right', t:'Справа' }, { v:'center', t:'Центр' }], syncAero));
    layer.appendChild(chipsOn(asSet, 'Маркеры', 'markers',
      [{ v:'plus', t:'Крестики' }, { v:'dots', t:'Точки' }, { v:'none', t:'Нет' }], syncAero));
    w.appendChild(layer);

    const cols = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.light}</i>Цвета</div></div>`);
    cols.appendChild(colorOn(asSet, 'Цвет осколков', 'shardColor', syncAero));
    cols.appendChild(colorOn(asSet, 'Акцент', 'accentColor', syncAero));
    cols.appendChild(colorOn(asSet, 'Фон', 'backgroundColor', syncAero));
    cols.appendChild(toggleOn(asSet, 'Светлая тема', 'lightMode', syncAero));
    w.appendChild(cols);

    const sh = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.formulas}</i>Осколки</div></div>`);
    sh.appendChild(sliderOn(asSet, 'Количество', 'count', 100, 4000, 50, v => Math.round(v), syncAero));
    sh.appendChild(sliderOn(asSet, 'Размер', 'shardSize', 0.2, 4, 0.05, v => (+v).toFixed(2), syncAero));
    sh.appendChild(sliderOn(asSet, 'Разброс', 'spread', 0, 3, 0.02, undefined, syncAero));
    sh.appendChild(sliderOn(asSet, 'Кручение', 'twist', 0, 3, 0.02, undefined, syncAero));
    sh.appendChild(sliderOn(asSet, 'Взмах', 'billow', 0, 3, 0.02, undefined, syncAero));
    sh.appendChild(sliderOn(asSet, 'Скорость', 'speed', 0, 4, 0.02, undefined, syncAero));
    sh.appendChild(sliderOn(asSet, 'Масштаб', 'scale', 0.4, 2.5, 0.02, undefined, syncAero));
    w.appendChild(sh);

    const fx = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.space}</i>Свет и эффекты</div></div>`);
    fx.appendChild(sliderOn(asSet, 'Глубина резкости', 'depthOfField', 0, 1, 0.01, undefined, syncAero));
    fx.appendChild(sliderOn(asSet, 'Свечение', 'glow', 0, 2, 0.01, undefined, syncAero));
    fx.appendChild(sliderOn(asSet, 'Зерно', 'grain', 0, 0.5, 0.01, undefined, syncAero));
    fx.appendChild(sliderOn(asSet, 'Виньетка', 'vignette', 0, 1, 0.01, undefined, syncAero));
    w.appendChild(fx);

    const mi = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.particles}</i>Интерактив</div></div>`);
    mi.appendChild(toggleOn(asSet, 'Реакция на мышь', 'mouseInteraction', syncAero));
    mi.appendChild(sliderOn(asSet, 'Сила реакции', 'mouseStrength', 0, 1, 0.01, undefined, syncAero));
    mi.appendChild(toggleOn(asSet, 'Пульс от клика', 'pulseOnClick', syncAero));
    mi.appendChild(toggleOn(asSet, 'Зажать — собрать', 'holdToGather', syncAero));
    mi.appendChild(sliderOn(asSet, 'Параллакс', 'parallax', 0, 1, 0.01, undefined, syncAero));
    mi.appendChild(toggleOn(asSet, 'Вступление', 'intro', syncAero));
    w.appendChild(mi);

    const pr = el(`<div class="set-sec"><div class="sec-title"><i>${ICONS.grid}</i>Производительность</div></div>`);
    pr.appendChild(toggleOn(asSet, 'Пауза', 'paused', syncAero));
    pr.appendChild(sliderOn(asSet, 'DPR', 'dpr', 0.5, 2, 0.5, v => (+v).toFixed(1), syncAero));
    w.appendChild(pr);

    w.appendChild(el('<p class="panel-note">Полный порт React Bits Aero Shards (WebGPU). Ленты осколков на слоях глубины, блики по рёбрам, bloom и зерно. Модуль показывает только свой слой.</p>'));
    return w;
  },
};

/* ---------------- открытие/закрытие панели ---------------- */
const panel     = $('#panel');
const wsTitle   = $('#wsTitle');
const stageHint = $('#stageHint');

/* кнопки 2D-сцены не должны уезжать под панель:
   при открытой панели центрируем их в свободной зоне справа */
function layoutStageAct(){
  const act = document.getElementById('stageAct');
  if (!act) return;
  if (!panel.classList.contains('on')){ act.style.left = ''; act.style.right = ''; return; }
  act.style.left = (panel.offsetLeft + panel.offsetWidth + 16) + 'px';   // offset* — без учёта transform
  act.style.right = '20px';
}

function openPanel(mod){
  panel.innerHTML = '';
  const head = el(`
    <div class="panel-head">
      <div class="ph-top">
        <span class="ph-ico">${ICONS[mod.id]}</span>
        <h3>${mod.name}</h3>
        <span class="badge">${mod.dims.map(d => d.toUpperCase()).join(' · ')}</span>
      </div>
      <p>${mod.desc}</p>
    </div>`);
  panel.appendChild(head);
  panel.appendChild(PANELS[mod.id]());
  window.Playground?.describe(mod, panel);
  panel.scrollTop = 0;
  panel.classList.add('on');
  wsTitle.textContent = mod.name;
  layoutStageAct();
}

function closePanel(){
  panel.classList.remove('on');
  state.active = null;
  modList.querySelectorAll('.mod').forEach(n => n.classList.remove('active'));
  wsTitle.textContent = 'ожидание выбора';
  stageHint.classList.remove('hide');
  layoutStageAct();
  syncCursorGrid(); syncAero(); syncStageAct();
}
window.addEventListener('resize', layoutStageAct);

function activate(id){
  const mod = byId(id);
  if (!mod) return;
  if (state.active === id){ closePanel(); return; }
  if (!state.mode || !mod.dims.includes(state.mode)) setMode(mod.dims[0]);
  state.active = id;               // один активный модуль: старый выключается, настройки его остаются
  reveal(id);
  modList.querySelectorAll('.mod').forEach(n => n.classList.toggle('active', n.dataset.id === id));
  openPanel(mod);
  stageHint.classList.add('hide');
  syncCursorGrid(); syncAero(); syncStageAct();   // слои прежнего модуля гаснут
}

/* ---------------- режимы 2D / 3D ---------------- */
function modeUniform(){
  const mod = state.active ? byId(state.active) : null;
  // модуль со своим слоем (не «Волны и искры») — под ним нейтральный фон, ничего лишнего
  if (mod && mod.custom && mod.id !== 'waveskry') return 0;
  return state.mode === '3d' ? 2 : state.mode === '2d' ? 1 : 0;
}

function filterModules(){
  MODULES.forEach(m => {
    const ok = !state.mode || m.dims.includes(state.mode);
    const n = getModNode(m.id);
    if (n) n.classList.toggle('is-hidden', !ok);
  });
  window.Playground?.filter();
  // если активный модуль скрылся — вернуться к «Пространству»
  if (state.active){
    const a = byId(state.active);
    if (state.mode && !a.dims.includes(state.mode)){
      closePanel();
      activate('space');
    }
  }
}

function syncBadges(){
  $('#modeChip').textContent = state.mode ? state.mode.toUpperCase() : '—';
  const sw = $('#modeSwitch');
  sw.className = 'mode-switch' + (state.mode ? ' at-' + state.mode : '');
  sw.querySelectorAll('.ms-seg').forEach(b =>
    b.classList.toggle('sel', b.dataset.dim === state.mode));
}
document.querySelectorAll('#modeSwitch .ms-seg').forEach(b =>
  b.addEventListener('click', () => setMode(b.dataset.dim)));

function flashVeil(){
  const v = $('#veil');
  v.style.transition = 'none';
  v.style.opacity = '1';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    v.style.transition = 'opacity .5s ease';
    v.style.opacity = '0';
  }));
}

function setMode(dim){
  if (state.mode === dim) return;
  state.mode = dim;
  filterModules();
  syncBadges();
  if (state.waveCount < 2){
    // волна-раскрытие от выбора режима: за запуск максимум 2 раза
    // (первый выбор 2D/3D и первое переключение на другой режим)
    state.waveCount++;
    startWaveFromSwitch();
  } else {
    flashVeil();
    syncCursorGrid(); syncAero(); syncStageAct();
  }
  if (state.active === 'space') openPanel(byId('space'));   // обновить галочку
}

/* ---------------- контекстное меню ---------------- */
const ctxMenu = $('#ctxMenu');
let ctxId = null;

function showCtx(x, y, id){
  ctxId = id;
  ctxMenu.classList.add('on');
  const r = ctxMenu.getBoundingClientRect();
  ctxMenu.style.left = Math.min(x, innerWidth  - r.width  - 8) + 'px';
  ctxMenu.style.top  = Math.min(y, innerHeight - r.height - 8) + 'px';
}
function hideCtx(){ ctxMenu.classList.remove('on'); ctxId = null; }

ctxMenu.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn || !ctxId) return;
  const id = ctxId, act = btn.dataset.act;
  hideCtx();
  if (act === 'open')      activate(id);
  if (act === 'settings')  openSettings(id);
  if (act === 'forget')    hideName(id);
});
document.addEventListener('click', e => { if (!e.target.closest('.ctx-menu')) hideCtx(); });
window.addEventListener('blur', hideCtx);

/* ---------------- модалка настроек ---------------- */
const modalBack = $('#modalBack');
const modalBody = $('#modalBody');
let settingsId = null;

function renderSettings(){
  const m = byId(settingsId);
  modalBody.innerHTML = `
    <div class="set-ico">${ICONS[m.id]}</div>
    <h3>${m.name}</h3>
    <p>${m.desc}</p>
    <div class="badges">${m.dims.map(d => `<span class="badge">${d.toUpperCase()}</span>`).join('')}</div>
    <div class="set-block">
      <span>Режим пространства</span>
      <div class="seg">
        <button data-dim="2d" class="${state.mode === '2d' ? 'sel' : ''}">2D</button>
        <button data-dim="3d" class="${state.mode === '3d' ? 'sel' : ''}">3D</button>
      </div>
    </div>
    <p class="panel-note">Режим общий для всей сцены. Модули без поддержки выбранного режима скрываются из меню.</p>`;
  modalBody.querySelectorAll('.seg button').forEach(b =>
    b.addEventListener('click', () => { setMode(b.dataset.dim); renderSettings(); }));
}

function openSettings(id){
  settingsId = id;
  reveal(id);
  renderSettings();
  modalBack.classList.add('on');
}
function closeSettings(){ modalBack.classList.remove('on'); settingsId = null; }

$('#modalClose').addEventListener('click', closeSettings);
modalBack.addEventListener('click', e => { if (e.target === modalBack) closeSettings(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ closeSettings(); hideCtx(); }
});

/* ---------------- шейдеры ---------------- */
const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uMode;          // 0 = пауза, 1 = 2D, 2 = 3D
uniform float uLight;
uniform vec3  uLightCol;
uniform float uGridOn;
uniform float uGridScale;
uniform float uShape;         // 0..4+ (морфинг, mod 4)
uniform float uRotSpeed;
uniform float uParticle;
uniform float uParticleSpeed;
uniform float uRingAmp;       // амплитуда колец от кликов
uniform float uRingSpeed;     // скорость колец
uniform float uSparks;        // количество 2D-искр
uniform float uSparkSpeed;
uniform float uSparkReact;    // разлёт от курсора
uniform float uAttract;       // +1 притяжение, -1 отталкивание, 0 выкл
uniform vec3  uClicks[3];     // xy — точка клика (aspect), z — время
uniform float uReveal;        // стартовая волна 0..1
uniform vec2  uRevealPos;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

/* ---- SDF ---- */
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdSphere(vec3 p, float r){ return length(p) - r; }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdOcta(vec3 p, float s){ p = abs(p); return (p.x + p.y + p.z - s) * 0.57735027; }

float shapeAt(vec3 p, float id){
  float m = mod(id, 4.0);
  if (m < 0.5) return sdTorus(p, vec2(0.8, 0.3));
  if (m < 1.5) return sdSphere(p, 0.92);
  if (m < 2.5) return sdBox(p, vec3(0.62));
  return sdOcta(p, 1.3);
}
float map(vec3 p){
  // наклон: курсор вверх → передняя часть фигуры поднимается; при выходе курсора всё возвращается
  p.yz *= rot(uMouse.y * 0.25 - 0.55 - sin(uTime * 0.35) * 0.10);
  p.xz *= rot(uTime * uRotSpeed + uMouse.x * 1.1);
  float a = floor(uShape);
  float f = smoothstep(0.0, 1.0, fract(uShape));
  return mix(shapeAt(p, a), shapeAt(p, a + 1.0), f);
}
vec3 calcNormal(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}
float march(vec3 ro, vec3 rd, out float glow){
  float t = 0.0; glow = 0.0;
  for (int i = 0; i < 70; i++){
    float d = map(ro + rd * t);
    glow += 0.02 / (1.0 + d * d * 45.0);
    if (d < 0.0018 || t > 20.0) break;
    t += d * 0.92;
  }
  if (t > 20.0) glow = 0.0;
  return t;
}

/* ---- фон ---- */
vec3 bg3(vec2 sp){
  float v = sp.y * 0.5 + 0.5;
  vec3 col = mix(vec3(0.020, 0.022, 0.038), vec3(0.055, 0.045, 0.095), v);
  col += uLightCol * 0.05 * smoothstep(1.1, 0.0, length(sp - vec2(0.35 * sin(uTime * 0.1), 0.2)));
  vec2 cell = (sp + vec2(uTime * 0.004, 0.0)) * 90.0;
  vec2 id = floor(cell);
  float h = hash21(id);
  float star = step(0.996, h) * smoothstep(0.22, 0.0, length(fract(cell) - 0.5));
  float tw = 0.5 + 0.5 * sin(uTime * 2.0 + h * 40.0);
  col += vec3(0.75, 0.8, 1.0) * star * tw * 0.65;
  return col;
}

/* ---- 3D сцена ---- */
vec3 scene3(vec2 uv){
  float aspect = uRes.x / uRes.y;
  vec2 sp = vec2(uv.x * aspect, uv.y);
  vec3 ro = vec3(0.0, 1.5, 4.4);
  vec3 rd = normalize(vec3(sp.x, sp.y - 0.32, -1.75));

  float glow;
  float t = march(ro, rd, glow);
  float tp = 1e9;
  if (rd.y < -0.0001) tp = (-1.35 - ro.y) / rd.y;

  vec3 bgc = bg3(sp);
  vec3 col;
  float tHit;

  if (tp < t){
    /* плоскость-пол со сеткой */
    tHit = tp;
    vec3 pp = ro + rd * tp;
    float dist = length(pp.xz);
    vec3 ground = vec3(0.016, 0.018, 0.030);
    vec2 gc = pp.xz * (0.55 * uGridScale);
    vec2 gf = abs(fract(gc) - 0.5);
    float lw = 0.05 + dist * 0.006;
    float line = smoothstep(lw, 0.0, min(gf.x, gf.y));
    float fade = exp(-dist * 0.16);
    ground += uLightCol * line * fade * 0.6 * uGridOn * uLight;
    ground += uLightCol * 0.10 * exp(-dist * 0.9) * uLight;
    col = ground;
  } else if (t < 20.0){
    /* форма */
    tHit = t;
    vec3 pos = ro + rd * t;
    vec3 n = calcNormal(pos);
    vec3 ld = normalize(vec3(0.55, 0.85, 0.45));
    float diff = max(dot(n, ld), 0.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    float spec = pow(max(dot(reflect(-ld, n), -rd), 0.0), 48.0);
    float bands = 0.5 + 0.5 * sin(pos.y * 7.0 + pos.x * 3.0 + uTime * 1.2);
    col  = vec3(0.13, 0.15, 0.23) * (0.30 + 0.95 * diff * uLight);
    col += uLightCol * spec * 1.1 * uLight;
    col += uLightCol * fres * 0.55 * uLight;
    col += uLightCol * 0.10 * bands * uLight;
  } else {
    tHit = t;
    col = bgc;
  }

  col = mix(col, bgc, smoothstep(6.0, 18.0, tHit));
  col += uLightCol * min(glow, 3.0) * 0.14 * uLight;

  /* орбитальные частицы */
  if (uParticle > 0.001){
    for (int i = 0; i < 12; i++){
      float fi = float(i);
      float rad  = 1.7 + 1.5 * hash21(vec2(fi, 4.2));
      float spd  = (0.15 + 0.35 * hash21(vec2(fi, 7.7))) * uParticleSpeed;
      float ang  = uTime * spd + fi * 2.4;
      vec3 pp = vec3(cos(ang) * rad, sin(ang * 0.7 + fi) * 0.9, sin(ang) * rad);
      vec3 rel = pp - ro;
      if (rel.z < -0.5){
        vec2 scr = rel.xy / (-rel.z) * 1.85;
        float d = length(scr - sp);
        float h = hash21(vec2(fi, 11.3));
        vec3 pc = 0.55 + 0.45 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67)));
        col += pc * exp(-d * d * 3200.0) * 1.5 * uParticle * uLight;
      }
    }
  }
  return col;
}

/* ---- кольца-волны от кликов ---- */
float ringW(vec2 p, vec3 c, float speed){
  if (c.z < -0.5) return 0.0;
  float age = uTime - c.z;
  if (age < 0.0 || age > 3.5) return 0.0;
  float rr = age * speed;
  float d = length(p - c.xy);
  return exp(-abs(d - rr) * 5.0) * exp(-age * 1.0);
}

/* ---- 2D сцена: интерактивные искры, живой фон, волны от кликов ---- */
vec3 scene2(vec2 uv){
  float aspect = uRes.x / uRes.y;
  vec2 p = uv * vec2(aspect, 1.0);
  float t = uTime;
  vec2 m = uMouse * vec2(aspect, 1.0);
  float mOn = step(0.0001, abs(uMouse.x) + abs(uMouse.y));

  /* фон: пятно света следует за курсором */
  vec3 col = vec3(0.012, 0.013, 0.024);
  col += uLightCol * 0.070 * exp(-length(p - m) * 1.5) * uLight * mOn;
  col += uLightCol * 0.045 * exp(-length(p + vec2(0.0, 0.25)) * 1.2) * uLight;

  /* волны-кольца от кликов */
  for (int i = 0; i < 3; i++){
    float w = ringW(p, uClicks[i], uRingSpeed);
    col += uLightCol * w * uRingAmp * uLight * 0.5;
    col += vec3(0.9, 0.95, 1.0) * w * w * uRingAmp * 0.35 * uLight;
  }

  /* искры */
  if (uSparks > 0.001){
    for (int i = 0; i < 40; i++){
      float fi = float(i);
      float h1 = hash21(vec2(fi, 3.1));
      float h2 = hash21(vec2(fi, 7.7));
      float h3 = hash21(vec2(fi, 11.9));
      float sp = (0.015 + 0.05 * h3) * uSparkSpeed;
      vec2 pp = vec2(fract(h1 + t * sp), fract(h2 + t * sp * 0.7));
      pp = pp * 2.0 - 1.0;
      pp.x *= aspect;

      /* разлёт от курсора */
      if (uSparkReact > 0.001 && mOn > 0.5){
        vec2 d = pp - m;
        float L = length(d) + 1e-4;
        pp += (d / L) * exp(-L * 2.0) * uSparkReact * 0.5;
      }
      /* притяжение / отталкивание кнопками */
      if (abs(uAttract) > 0.01 && mOn > 0.5){
        vec2 d = m - pp;
        float L = length(d);
        pp += normalize(d + 1e-5) * sign(uAttract) * exp(-L * 1.6) * min(L, 1.0) * 0.55;
      }
      /* толчок от волн-колец */
      for (int k = 0; k < 3; k++){
        vec3 c = uClicks[k];
        if (c.z < -0.5) continue;
        float age = uTime - c.z;
        if (age < 0.0 || age > 2.5) continue;
        vec2 d = pp - c.xy;
        float L = length(d) + 1e-4;
        float rr = age * uRingSpeed;
        pp += (d / L) * exp(-abs(L - rr) * 3.0) * exp(-age * 1.4) * 0.5;
      }

      float d2 = length(p - pp);
      float tw = 0.5 + 0.5 * sin(t * 3.0 + h1 * 40.0);
      vec3 pc = mix(vec3(0.72, 0.8, 1.0), uLightCol, 0.65);
      float size = 2600.0 + h3 * 4200.0;
      col += pc * exp(-d2 * d2 * size) * (0.7 + 0.9 * tw) * uSparks * uLight;
      col += pc * exp(-d2 * 13.0) * 0.05 * uSparks * uLight;
    }
  }

  /* сетка-оверлей */
  if (uGridOn > 0.5){
    vec2 gc = p * uGridScale * 0.5;
    vec2 gf = abs(fract(gc) - 0.5);
    float line = smoothstep(0.035, 0.0, min(gf.x, gf.y));
    col += uLightCol * line * 0.07 * uLight;
  }
  return col;
}

/* ---- пауза (пустое пространство) ---- */
vec3 idleScene(vec2 uv){
  float aspect = uRes.x / uRes.y;
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 col = mix(vec3(0.016, 0.017, 0.030), vec3(0.030, 0.026, 0.055), uv.y * 0.5 + 0.5);
  vec2 cell = (p + vec2(uTime * 0.01, 0.0)) * 60.0;
  float h = hash21(floor(cell));
  float star = step(0.9965, h) * smoothstep(0.2, 0.0, length(fract(cell) - 0.5));
  col += vec3(0.7, 0.75, 1.0) * star * (0.5 + 0.5 * sin(uTime * 2.0 + h * 40.0)) * 0.55;
  col += vec3(0.35, 0.4, 0.75) * 0.06 * exp(-length(p) * 1.4);
  vec2 m = uMouse * vec2(aspect, 1.0);
  col += vec3(0.5, 0.55, 0.9) * 0.05 * exp(-length(p - m) * 4.0);
  return col;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec3 col;
  if (uMode > 1.5)      col = scene3(uv);
  else if (uMode > 0.5) col = scene2(uv);
  else                  col = idleScene(uv);

  /* стартовая волна: за гребнем — сцена, впереди — серый фон */
  if (uReveal < 0.999){
    float aspect = uRes.x / uRes.y;
    vec2 c = uRevealPos * vec2(aspect, 1.0);
    vec2 pc = uv * vec2(aspect, 1.0);
    float reach = length(vec2(aspect, 1.0)) + length(c) + 0.08;
    float e = 1.0 - pow(1.0 - uReveal, 2.4);
    float R = e * reach;
    float d = length(pc - c);
    float inside = smoothstep(R, R - 0.05, d);
    col = mix(vec3(0.085, 0.088, 0.10), col, inside);
    float crest = exp(-abs(d - R) * 34.0);
    col += (uLightCol * 0.7 + vec3(0.3)) * crest * 0.95;
  }

  vec2 vuv = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - dot(vuv, vuv) * 0.9;
  col = col / (1.0 + col * 0.6);
  col = pow(max(col, 0.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ============================================================
   Модуль «Сетка курсора» — порт React Bits Cursor Grid (WebGL1)
   состояние ячеек в текстуре, прожектор, волны от кликов
   ============================================================ */
const CG_VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const CG_FRAG = `
precision highp float;

uniform vec2  uResolution;
uniform vec2  uOffset;
uniform float uCellSize;
uniform sampler2D uState;
uniform vec2  uCells;
uniform vec3  uColor;
uniform vec3  uGridColor;
uniform float uLineWidth;
uniform float uMaxOpacity;
uniform float uFillOpacity;
uniform float uGridOpacity;
uniform float uCellRadius;
uniform float uCellGap;
uniform float uGridStyle;
uniform vec2  uMouse;
uniform float uRadius;
uniform float uSpotlight;
uniform float uPresence;
uniform float uEdgeFade;
uniform float uReveal;

float level(vec2 cell){
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= uCells.x || cell.y >= uCells.y) return 0.0;
  float v = texture2D(uState, (cell + 0.5) / uCells).r;
  return v * v * (3.0 - 2.0 * v);
}
float line(float d, float width){
  float w = max(width, 1.0);
  return clamp(w * 0.5 + 0.5 - d, 0.0, 1.0) * (width / w);
}
float roundBox(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main(){
  vec2 pos = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 g = (pos - uOffset) / uCellSize;
  vec2 cell = floor(g);
  vec2 f = g - cell;
  vec2 edge = min(f, 1.0 - f) * uCellSize;

  float vx = line(edge.x, uLineWidth);
  float vy = line(edge.y, uLineWidth);
  if (uGridStyle > 0.5 && uGridStyle < 1.5) {          /* пунктир */
    float dash = uCellSize / 6.0;
    vx *= step(0.5, fract((pos.y - uOffset.y) / dash + 0.25));
    vy *= step(0.5, fract((pos.x - uOffset.x) / dash + 0.25));
  } else if (uGridStyle > 1.5 && uGridStyle < 2.5) {   /* точки */
    float r = max(uLineWidth * 1.25, 1.2);
    float d = length(edge);
    vx = clamp(r + 0.5 - d, 0.0, 1.0);
    vy = 0.0;
  } else if (uGridStyle > 2.5) {                       /* крестики */
    float arm = uCellSize * 0.1 + uLineWidth;
    vx *= step(edge.y, arm);
    vy *= step(edge.x, arm);
  }
  float mark = max(vx, vy);

  vec2 toMouse = pos - uMouse;
  float spot = exp(-dot(toMouse, toMouse) / max(uRadius * uRadius, 1.0) * 1.6) * uSpotlight * uPresence;

  vec2 center = uResolution * 0.5;
  float reach = length(center);
  float shown = smoothstep(uReveal * (reach + uCellSize * 2.0), uReveal * (reach + uCellSize * 2.0) - uCellSize * 2.0, length(pos - center));
  shown = uReveal >= 1.0 ? 1.0 : shown;

  float fade = 1.0;
  if (uEdgeFade > 0.0) {
    vec2 norm = pos / uResolution;
    vec2 a = clamp(norm / uEdgeFade, 0.0, 1.0);
    vec2 b = clamp((1.0 - norm) / uEdgeFade, 0.0, 1.0);
    vec2 sa = a * a * a * (a * (a * 6.0 - 15.0) + 10.0);
    vec2 sb = b * b * b * (b * (b * 6.0 - 15.0) + 10.0);
    fade = sa.x * sa.y * sb.x * sb.y;
  }

  float own = level(cell);
  float gridAlpha = mark * min(uGridOpacity + spot * 0.45, 1.0) * fade * shown;
  float litAlpha = 0.0;
  float fillAlpha = 0.0;

  if (uCellGap <= 0.0 && uCellRadius <= 0.0) {
    vec2 side = step(0.5, f) * 2.0 - 1.0;
    float nx = level(cell + vec2(side.x, 0.0));
    float ny = level(cell + vec2(0.0, side.y));
    float nc = level(cell + side);
    float ex = max(own, nx);
    float ey = max(own, ny);
    float joint = max(max(ex, ey), nc);
    float lit;
    if (uGridStyle > 1.5 && uGridStyle < 2.5) lit = vx * joint;
    else lit = max(vx * (edge.y < uLineWidth ? joint : ex), vy * (edge.x < uLineWidth ? joint : ey));
    litAlpha = lit * uMaxOpacity;
    fillAlpha = own * uFillOpacity;
  } else if (own > 0.0) {
    vec2 local = (f - 0.5) * uCellSize;
    float halfSize = uCellSize * 0.5 - max(uCellGap, 0.0);
    float radius = min(uCellRadius, halfSize);
    float sd = roundBox(local, vec2(halfSize), radius);
    float inside = clamp(0.5 - sd, 0.0, 1.0);
    float border = line(abs(sd + uLineWidth * 0.5), uLineWidth) * inside;
    litAlpha = border * own * uMaxOpacity;
    fillAlpha = inside * own * uFillOpacity;
  }
  litAlpha *= fade;
  fillAlpha *= fade;

  float cellAlpha = clamp(max(litAlpha, fillAlpha), 0.0, 1.0);
  float alpha = cellAlpha + gridAlpha * (1.0 - cellAlpha);
  vec3 premul = uColor * cellAlpha + uGridColor * gridAlpha * (1.0 - cellAlpha);
  gl_FragColor = vec4(premul, alpha);
}
`;

const cgClamp = (v, a, b) => Math.min(b, Math.max(a, v));
const CG_FALLOFF = [t => t, t => t * t * (3 - 2 * t), t => t * t * t];
const CG_INTRO_SECONDS = 1.4;

function createCursorGrid(canvas, container, S){
  const gl = canvas.getContext('webgl', {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false
  });
  if (!gl) return null;

  const shCompile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
      console.error('[cursor-grid]', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };
  const vs = shCompile(gl.VERTEX_SHADER, CG_VERT);
  const fs = shCompile(gl.FRAGMENT_SHADER, CG_FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){
    console.error('[cursor-grid]', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uResolution','uOffset','uCellSize','uState','uCells','uColor','uGridColor','uLineWidth',
   'uMaxOpacity','uFillOpacity','uGridOpacity','uCellRadius','uCellGap','uGridStyle','uMouse',
   'uRadius','uSpotlight','uPresence','uEdgeFade','uReveal']
    .forEach(n => U[n] = gl.getUniformLocation(prog, n));

  const stateTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, stateTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  const view = { width: 1, height: 1, ratio: 1, cellSize: 0 };
  const grid = { cols: 0, rows: 0, offX: 0, offY: 0 };
  const pointer = { x: 0, y: 0, inside: false };
  const mouse = { x: 0, y: 0 };
  const pulses = [];
  let levels = new Float32Array(0);
  let waves = new Float32Array(0);
  let targets = new Float32Array(0);
  let touched = new Float32Array(0);
  let pixels = new Uint8Array(0);
  let presence = 0, clock = 0;
  let introClock = S.intro ? 0 : 1;
  let raf = 0, last = 0;
  let visible = false, dirty = true;

  function rebuild(){
    const ratio = Math.min(S.dpr || window.devicePixelRatio || 1, 2);
    view.width = Math.max(1, container.clientWidth);
    view.height = Math.max(1, container.clientHeight);
    view.ratio = ratio;
    canvas.width = Math.max(1, Math.round(view.width * ratio));
    canvas.height = Math.max(1, Math.round(view.height * ratio));
    const size = Math.max(8, S.cellSize);
    const cols = Math.ceil(view.width / size) + 1;
    const rows = Math.ceil(view.height / size) + 1;
    const resized = cols !== grid.cols || rows !== grid.rows || size !== view.cellSize;
    grid.cols = cols; grid.rows = rows;
    grid.offX = (view.width - cols * size) / 2;
    grid.offY = (view.height - rows * size) / 2;
    view.cellSize = size;
    if (resized){
      levels  = new Float32Array(cols * rows);
      waves   = new Float32Array(cols * rows);
      targets = new Float32Array(cols * rows);
      touched = new Float32Array(cols * rows).fill(-1e9);
      pixels  = new Uint8Array(cols * rows);
      gl.bindTexture(gl.TEXTURE_2D, stateTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, cols, rows, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, pixels);
    }
    dirty = true;
  }

  const light = (index, value) => {
    if (value > targets[index]) targets[index] = value;
    touched[index] = clock;
  };

  function energize(x, y){
    const size = Math.max(8, S.cellSize);
    if (S.highlight === 1){
      const col = Math.floor((x - grid.offX) / size);
      const row = Math.floor((y - grid.offY) / size);
      if (col >= 0 && row >= 0 && col < grid.cols && row < grid.rows) light(row * grid.cols + col, 1);
      return;
    }
    const r = S.radius;
    const ease = CG_FALLOFF[S.falloff] || CG_FALLOFF[0];
    const minCol = Math.max(0, Math.floor((x - r - grid.offX) / size));
    const maxCol = Math.min(grid.cols - 1, Math.floor((x + r - grid.offX) / size));
    const minRow = Math.max(0, Math.floor((y - r - grid.offY) / size));
    const maxRow = Math.min(grid.rows - 1, Math.floor((y + r - grid.offY) / size));
    for (let row = minRow; row <= maxRow; row++){
      for (let col = minCol; col <= maxCol; col++){
        const cx = grid.offX + col * size + size / 2;
        const cy = grid.offY + row * size + size / 2;
        const dist = Math.hypot(cx - x, cy - y);
        if (dist > r) continue;
        const value = ease(1 - dist / r);
        if (value > 0) light(row * grid.cols + col, value);
      }
    }
  }

  function sweepPulses(){
    const size = Math.max(8, S.cellSize);
    const ahead = size * 0.6, behind = size * 1.4;
    const far = Math.hypot(view.width, view.height);
    waves.fill(0);
    for (let k = pulses.length - 1; k >= 0; k--){
      const pulse = pulses[k];
      const ringR = (clock - pulse.t0) * S.pulseSpeed;
      if (ringR - behind * 2 > far){ pulses.splice(k, 1); continue; }
      if (ringR < 0) continue;
      const envelope = pulse.strength * Math.pow(Math.max(0, 1 - ringR / (far + behind)), 0.6);
      const outer = ringR + ahead * 2;
      const minCol = Math.max(0, Math.floor((pulse.x - outer - grid.offX) / size));
      const maxCol = Math.min(grid.cols - 1, Math.floor((pulse.x + outer - grid.offX) / size));
      const minRow = Math.max(0, Math.floor((pulse.y - outer - grid.offY) / size));
      const maxRow = Math.min(grid.rows - 1, Math.floor((pulse.y + outer - grid.offY) / size));
      for (let row = minRow; row <= maxRow; row++){
        for (let col = minCol; col <= maxCol; col++){
          const cx = grid.offX + col * size + size / 2;
          const cy = grid.offY + row * size + size / 2;
          const off = Math.hypot(cx - pulse.x, cy - pulse.y) - ringR;
          if (off > ahead * 2 || off < -behind * 2) continue;
          const t = off > 0 ? off / ahead : off / behind;
          const value = envelope * Math.exp(-t * t);
          const index = row * grid.cols + col;
          if (value > waves[index]) waves[index] = value;
        }
      }
    }
    dirty = true;
  }

  function draw(){
    const ratio = view.ratio;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stateTex);
    if (dirty){
      for (let i = 0; i < levels.length; i++)
        pixels[i] = Math.round(cgClamp(Math.max(levels[i], waves[i]), 0, 1) * 255);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, grid.cols, grid.rows, gl.LUMINANCE, gl.UNSIGNED_BYTE, pixels);
      dirty = false;
    }
    const lineDevice = Math.max(0.25, S.lineWidth) * ratio;
    const snap = Math.round(lineDevice) % 2 === 1 ? 0.5 : 0;
    gl.uniform1i(U.uState, 0);
    gl.uniform2f(U.uResolution, canvas.width, canvas.height);
    gl.uniform2f(U.uOffset, Math.round(grid.offX * ratio) + snap, Math.round(grid.offY * ratio) + snap);
    gl.uniform1f(U.uCellSize, view.cellSize * ratio);
    gl.uniform2f(U.uCells, grid.cols, grid.rows);
    gl.uniform3fv(U.uColor, hex2rgb(S.color));
    gl.uniform3fv(U.uGridColor, hex2rgb(S.gridColor));
    gl.uniform1f(U.uLineWidth, lineDevice);
    gl.uniform1f(U.uMaxOpacity, cgClamp(S.maxOpacity, 0, 1));
    gl.uniform1f(U.uFillOpacity, cgClamp(S.fillOpacity, 0, 1));
    gl.uniform1f(U.uGridOpacity, cgClamp(S.gridOpacity, 0, 1));
    gl.uniform1f(U.uCellRadius, Math.max(0, S.cellRadius) * ratio);
    gl.uniform1f(U.uCellGap, Math.max(0, S.cellGap) * ratio);
    gl.uniform1f(U.uGridStyle, S.gridStyle);
    gl.uniform2f(U.uMouse, mouse.x * ratio, mouse.y * ratio);
    gl.uniform1f(U.uRadius, Math.max(1, S.radius) * ratio);
    gl.uniform1f(U.uSpotlight, cgClamp(S.spotlight, 0, 1));
    gl.uniform1f(U.uPresence, presence);
    gl.uniform1f(U.uEdgeFade, cgClamp(S.edgeFade, 0, 0.5));
    gl.uniform1f(U.uReveal, introClock >= 1 ? 1 : 1 - Math.pow(1 - introClock, 2.2));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now){
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? cgClamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
    last = now;
    clock += dt;
    if (S.intro && introClock < 1) introClock = Math.min(1, introClock + dt / CG_INTRO_SECONDS);
    if (Math.max(8, S.cellSize) !== view.cellSize) rebuild();

    const follow = 1 - Math.exp(-dt / 0.07);
    mouse.x += (pointer.x - mouse.x) * follow;
    mouse.y += (pointer.y - mouse.y) * follow;
    const presenceGoal = pointer.inside ? 1 : 0;
    presence += (presenceGoal - presence) * (1 - Math.exp(-dt / 0.25));

    if (S.ambient > 0 && levels.length){
      const chance = S.ambient * dt * levels.length * 0.04;
      let spawns = Math.floor(chance) + (Math.random() < chance % 1 ? 1 : 0);
      while (spawns-- > 0) light(Math.floor(Math.random() * levels.length), 0.25 + Math.random() * 0.45);
    }
    if (pulses.length) sweepPulses();
    else if (waves.length && waves.some(v => v > 0)){ waves.fill(0); dirty = true; }

    const holdSeconds = Math.max(0, S.holdTime) / 1000;
    const fadeStep = dt / (Math.max(16, S.fadeDuration) / 1000);
    const attack = 1 - Math.exp(-dt / 0.045);
    let active = pulses.length > 0 || (S.intro && introClock < 1) ||
                 Math.abs(presence - presenceGoal) > 0.002;
    for (let i = 0; i < levels.length; i++){
      let target = targets[i];
      if (target <= 0 && levels[i] <= 0) continue;
      if (clock - touched[i] > holdSeconds) target = Math.max(0, target - fadeStep);
      targets[i] = target;
      const before = levels[i];
      const next = target > before ? before + (target - before) * attack : target;
      levels[i] = next < 0.002 ? 0 : next;
      if (levels[i] !== before) dirty = true;
      if (levels[i] > 0 || targets[i] > 0) active = true;
    }
    if (Math.abs(mouse.x - pointer.x) + Math.abs(mouse.y - pointer.y) > 0.05 && presence > 0.002) active = true;
    if (S.ambient > 0) active = true;

    draw();
    if (active) raf = requestAnimationFrame(frame);
  }

  function wake(){
    if (!visible) return;
    if (!raf && !document.hidden){
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  const locate = e => {
    const r = container.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    return { x, y, inside: x >= 0 && y >= 0 && x <= r.width && y <= r.height };
  };
  const onMove = e => {
    const { x, y, inside } = locate(e);
    const was = pointer.inside;
    pointer.inside = inside;
    if (!inside){ if (was) wake(); return; }
    pointer.x = x; pointer.y = y;
    if (!was){ mouse.x = x; mouse.y = y; }
    energize(x, y);
    wake();
  };
  const onDown = e => {
    if (!S.clickPulse) return;
    const { x, y, inside } = locate(e);
    if (!inside) return;
    // клики по панели модуля и контекстному меню — без импульса
    if (e.target && e.target.closest && (e.target.closest('#panel') || e.target.closest('.ctx-menu'))) return;
    pulses.push({ x, y, t0: clock, strength: 1 });
    wake();
  };
  const onLeave = () => { pointer.inside = false; wake(); };
  const onVis = () => wake();

  const ro = new ResizeObserver(() => { rebuild(); draw(); wake(); });
  ro.observe(container);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVis);

  rebuild();
  if (S.intro) pulses.push({ x: view.width / 2, y: view.height / 2, t0: 0.15, strength: 0.6 });
  draw();

  return {
    wake,
    setVisible(v){
      visible = v;
      if (v){ rebuild(); wake(); }
      else if (raf){ cancelAnimationFrame(raf); raf = 0; }
    },
    destroy(){
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      gl.deleteTexture(stateTex);
      gl.deleteProgram(prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}

let cg = null;
function cgWake(){ if (cg) cg.wake(); }
function syncCursorGrid(){
  const cv = document.getElementById('gridgl');
  const on = state.active === 'cursorgrid' && state.mode === '2d' &&
             state.reveal >= 1 && !!cgSet.on && !!cg;
  cv.classList.toggle('on', on);
  if (cg) cg.setVisible(on);
}

/* слой Aero Shards: монтируется лениво, живёт пока модуль активен */
let aero = null, aeroTried = false;
function syncAero(){
  const cv = document.getElementById('aeroGl');
  if (!cv) return;
  const want = state.active === 'aeroshards' && state.mode === '3d' &&
               state.reveal >= 1 && !!asSet.on;
  cv.classList.toggle('on', want);
  if (!window.AeroShardsLib){ if(want) window.Playground?.loadAero(); return; }
  if (want && !aero && !aeroTried){
    aeroTried = true;
    try {
      const status = $('#aeroStatus');
      status.hidden = false;
      status.textContent = 'Подготавливаем 3D-сцену…';
      aero = AeroShardsLib.mount(cv, { ...asSet });
    } catch (err){ console.error('[aero] mount failed', err); aero = null; window.Playground?.aeroError(err); return; }
    if (!aero) window.Playground?.aeroError();
    if (aero && aero.ready) aero.ready.then(() => {
      $('#aeroStatus').hidden = true;
      // если пока переключились — гасим
      if (!(state.active === 'aeroshards' && state.mode === '3d' && asSet.on)) {
        try { aero.update({ paused: true }); } catch (e) {}
      }
    }).catch(err => { window.Playground?.aeroError(err); });
  } else if (aero){
    try { aero.update({ ...asSet, paused: !want || !!asSet.paused }); } catch (e) {}
  }
}

/* кнопки 2D-сцены — только у модуля «Волны и искры» после раскрытия */
function syncStageAct(){
  window.Playground?.syncDemo();
  const on = state.mode === '2d' && state.active === 'waveskry' && state.reveal >= 1;
  document.getElementById('stageAct').classList.toggle('on', on);
  if (!on){
    state.u.attract = 0;
    document.querySelectorAll('#stageAct button').forEach(b => b.classList.remove('sel'));
  }
}

/* ---------------- WebGL ---------------- */
const canvas = $('#gl');
let gl = null, prog = null, U = {};
let rafId = null, tNow = 0, lastT = performance.now();
const mouse  = { x: 0, y: 0 };
const mouseS = { x: 0, y: 0 };
const clickBuf = new Float32Array([-1,-1,-1, -1,-1,-1, -1,-1,-1]);
let clickSlot = 0;

function compile(type, src){
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
    console.error(gl.getShaderInfoLog(sh));
    throw new Error('shader compile failed');
  }
  return sh;
}

function initGL(){
  gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    || canvas.getContext('experimental-webgl');
  if (!gl) return false;

  prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(prog));
    return false;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  ['uRes','uTime','uMouse','uMode','uLight','uLightCol','uGridOn','uGridScale',
   'uShape','uRotSpeed','uParticle','uParticleSpeed','uRingAmp','uRingSpeed',
   'uSparks','uSparkSpeed','uSparkReact','uAttract','uReveal','uRevealPos']
    .forEach(n => U[n] = gl.getUniformLocation(prog, n));
  U.uClicks = gl.getUniformLocation(prog, 'uClicks[0]');
  return true;
}

function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const w = Math.max(1, Math.round(canvas.clientWidth  * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
    if (gl) gl.viewport(0, 0, w, h);
  }
}

function setShape(i){
  let target = i;
  while (target < state.shapeCur - 0.01) target += 4;   // морфинг только вперёд
  if (Math.abs(target - state.shapeCur) < 0.01) return;
  state.shapeTarget = target;
}

function frame(now){
  const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));   // метки времени не обязаны монотонны (таб был в фоне)
  lastT = now;
  tNow += dt;

  // стартовая волна-раскрытие
  if (state.revealRun && state.reveal < 1){
    state.reveal = Math.min(1, state.reveal + dt / 1.35);
    if (state.reveal >= 1){
      state.revealRun = false;
      syncStageAct();
      syncCursorGrid();
      syncAero();
      if (!state.active) stageHint.classList.remove('hide');
    }
  }

  mouseS.x += (mouse.x - mouseS.x) * Math.min(1, dt * 5);
  mouseS.y += (mouse.y - mouseS.y) * Math.min(1, dt * 5);

  // плавный морфинг формул
  const diff = state.shapeTarget - state.shapeCur;
  if (Math.abs(diff) < 0.01){
    state.shapeCur = mod4(state.shapeTarget);
    state.shapeTarget = state.shapeCur;
  } else {
    state.shapeCur += diff * Math.min(1, dt * 3.2);
  }

  resize();
  if (gl){
    const u = state.u;
    // изоляция модулей: каждый активный модуль показывает только свои элементы
    const am = state.active ? byId(state.active) : null;
    const customOn = !!(am && am.custom);
    const mergedOn = state.active === 'waveskry';
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, tNow);
    gl.uniform2f(U.uMouse, mouseS.x, mouseS.y);
    gl.uniform1f(U.uMode, modeUniform());
    gl.uniform1f(U.uLight, u.light);
    gl.uniform3f(U.uLightCol, u.lightCol[0], u.lightCol[1], u.lightCol[2]);
    gl.uniform1f(U.uGridOn, customOn ? 0 : u.gridOn);          // сетка пространства — только вне модулей со слоем
    gl.uniform1f(U.uGridScale, u.gridScale);
    gl.uniform1f(U.uShape, state.shapeCur);
    gl.uniform1f(U.uRotSpeed, u.rotSpeed);
    gl.uniform1f(U.uParticle, state.active === 'particles' ? u.particle : 0);   // частицы — только в своём модуле
    gl.uniform1f(U.uParticleSpeed, u.particleSpeed);
    gl.uniform1f(U.uRingAmp, mergedOn ? u.ringAmp : 0);
    gl.uniform1f(U.uRingSpeed, u.ringSpeed);
    gl.uniform1f(U.uSparks, mergedOn ? u.sparks : 0);
    gl.uniform1f(U.uSparkSpeed, u.sparkSpeed);
    gl.uniform1f(U.uSparkReact, u.sparkReact);
    gl.uniform1f(U.uAttract, mergedOn ? u.attract : 0);
    gl.uniform1f(U.uReveal, state.reveal);
    gl.uniform2f(U.uRevealPos, state.revealPos[0], state.revealPos[1]);
    gl.uniform3fv(U.uClicks, clickBuf);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // частицы названий модулей
  if (appRoot.classList.contains('on')) drawNameFX(tNow);

  rafId = requestAnimationFrame(frame);
}

function startGL(){
  try {
    if (!initGL()){
      $('#stage').appendChild(el('<div class="gl-fallback">WebGL недоступен — визуальная сцена отключена</div>'));
      rafId = requestAnimationFrame(frame);
      return;
    }
  } catch (err){
    gl = null;
    console.error(err);
    $('#stage').appendChild(el('<div class="gl-fallback">Ошибка шейдера — сцена отключена</div>'));
    rafId = requestAnimationFrame(frame);
    return;
  }
  resize();
  rafId = requestAnimationFrame(frame);
}

/* мышь для сцены: при выходе курсора из поля — мягкий возврат в исходное */
$('#stage').addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
});
$('#stage').addEventListener('mouseleave', () => {
  mouse.x = 0;
  mouse.y = 0;
});

/* ---------------- стартовая волна и клики по сцене ---------------- */
function scenePoint(e){
  const r = canvas.getBoundingClientRect();
  const ux = ((e.clientX - r.left) / r.width) * 2 - 1;
  const uy = -(((e.clientY - r.top) / r.height) * 2 - 1);
  return { ux, uy, aspect: canvas.clientWidth / Math.max(1, canvas.clientHeight) };
}
function pushClick(ux, uy, aspect){
  const k = clickSlot * 3;
  clickBuf[k]     = ux * aspect;
  clickBuf[k + 1] = uy;
  clickBuf[k + 2] = tNow;
  clickSlot = (clickSlot + 1) % 3;
}
/* волна-раскрытие стартует от переключателя 2D/3D (внизу слева),
   максимум 2 раза за запуск — выбор режима и первое переключение */
function startWaveFromSwitch(){
  const sw = document.getElementById('modeSwitch');
  const r  = sw.getBoundingClientRect();
  const cr = canvas.getBoundingClientRect();
  state.revealPos = [
    ((r.left + r.width / 2 - cr.left) / cr.width) * 2 - 1,
    -(((r.top + r.height / 2 - cr.top) / cr.height) * 2 - 1),
  ];
  state.reveal = 0;
  state.revealRun = true;
  syncCursorGrid();                 // слои скрываются до конца волны
  syncAero();
  syncStageAct();
  const sh = document.getElementById('startHint');
  if (sh && !sh.classList.contains('go')){
    sh.classList.add('go');
    setTimeout(() => { sh.style.display = 'none'; }, 500);
  }
}
$('#stage').addEventListener('click', e => {
  if (e.target.closest('#panel') || e.target.closest('.ctx-menu') || e.target.closest('.stage-act')) return;
  // кольца-клики — только когда активен модуль «Волны и искры»
  if (state.mode === '2d' && state.active === 'waveskry' && state.reveal >= 1){
    const pt = scenePoint(e);
    pushClick(pt.ux, pt.uy, pt.aspect);
  }
});

/* кнопки 2D-сцены */
document.querySelectorAll('#stageAct button').forEach(b => b.addEventListener('click', () => {
  const act = b.dataset.act;
  if (act === 'burst'){
    pushClick(0, 0, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    b.classList.add('sel');
    setTimeout(() => b.classList.remove('sel'), 350);
    return;
  }
  const mode = act === 'attract' ? 1 : -1;
  state.u.attract = state.u.attract === mode ? 0 : mode;
  document.querySelectorAll('#stageAct button').forEach(x => {
    if (x.dataset.act === 'attract') x.classList.toggle('sel', state.u.attract === 1);
    if (x.dataset.act === 'repel')    x.classList.toggle('sel', state.u.attract === -1);
  });
}));

/* ============================================================
   Миниатюра модуля при наведении на пункт меню
   2D — свой рендер на Canvas2D, 3D — отдельный мини-WebGL
   ============================================================ */
const peekEl  = document.getElementById('modPeek');
const peekCv  = document.getElementById('peekCv');
const peekName= document.getElementById('peekName');
const peek2d  = peekCv.getContext('2d');
const PEEK_W = 192, PEEK_H = 120;
let peekRaf = 0, peekMod = null, peekT0 = 0;
let peekGL;                       // undefined — не пробовали, false — нет WebGL
const peekSeeds = Array.from({ length: 44 }, () => ({
  x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.4, p: Math.random() * 6.28,
}));

function peekBg(c){
  c.fillStyle = '#0c0e15';
  c.fillRect(0, 0, PEEK_W, PEEK_H);
}

const PEEK2D = {
  space(c, t){
    peekBg(c);
    const g = c.createRadialGradient(
      PEEK_W / 2 + Math.sin(t * 0.7) * 30, PEEK_H / 2 + Math.cos(t * 0.5) * 16, 4,
      PEEK_W / 2, PEEK_H / 2, 130);
    g.addColorStop(0, 'rgba(124,156,255,.30)');
    g.addColorStop(1, 'rgba(124,156,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, PEEK_W, PEEK_H);
    for (let i = 0; i < 16; i++){
      const q = peekSeeds[i];
      const x = ((q.x + t * 0.02 * q.s) % 1) * PEEK_W;
      const y = ((q.y + t * 0.013 * q.s) % 1) * PEEK_H;
      c.fillStyle = 'rgba(190,205,255,' + (0.25 + 0.35 * Math.abs(Math.sin(t + q.p))) + ')';
      c.fillRect(x, y, 1.6, 1.6);
    }
  },
  waveskry(c, t){
    peekBg(c);
    const mx = PEEK_W / 2 + Math.sin(t * 1.1) * 44;
    const my = PEEK_H / 2 + Math.cos(t * 0.9) * 24;
    // искры
    for (let i = 0; i < 24; i++){
      const q = peekSeeds[i];
      let x = ((q.x + t * 0.035 * q.s) % 1) * PEEK_W;
      let y = ((q.y + t * 0.024 * q.s) % 1) * PEEK_H;
      const dx = x - mx, dy = y - my;
      const L = Math.hypot(dx, dy) + 0.01;
      const push = Math.exp(-L / 26) * 24;
      x += dx / L * push;
      y += dy / L * push;
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 2.6 + q.p));
      c.fillStyle = 'rgba(175,205,255,' + (tw * 0.95).toFixed(3) + ')';
      c.beginPath();
      c.arc(x, y, 1.4 + q.s * 1.1, 0, 6.2832);
      c.fill();
    }
    const g = c.createRadialGradient(mx, my, 1, mx, my, 44);
    g.addColorStop(0, 'rgba(124,156,255,.30)');
    g.addColorStop(1, 'rgba(124,156,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, PEEK_W, PEEK_H);
    // кольца-волны
    c.strokeStyle = 'rgba(160,185,255,.7)';
    for (let i = 0; i < 3; i++){
      const ph = (t * 0.3 + i / 3) % 1;
      c.globalAlpha = (1 - ph) * 0.8;
      c.lineWidth = 2.2 * (1 - ph) + 0.6;
      c.beginPath();
      c.arc(PEEK_W / 2, PEEK_H / 2, ph * 100, 0, 6.2832);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = '#cfe0ff';
    c.beginPath();
    c.arc(PEEK_W / 2, PEEK_H / 2, 3 + Math.sin(t * 5), 0, 6.2832);
    c.fill();
  },
  aeroshards(c, t){
    peekBg(c);
    // ленты стеклянных осколков, плывущие по диагонали
    for (let i = 0; i < 7; i++){
      const ph = t * (0.16 + i * 0.03) + i * 0.9;
      const y0 = ((i * 31 + Math.sin(ph) * 16) % (PEEK_H + 40)) - 20;
      const x0 = ((ph * 46 + i * 57) % (PEEK_W + 130)) - 65;
      const len = 44 + i * 7, hgt = 7 + (i % 3) * 5;
      c.save();
      c.translate(x0, y0);
      c.rotate(-0.5 + Math.sin(ph * 0.7) * 0.25);
      const g = c.createLinearGradient(0, -hgt, len, hgt);
      g.addColorStop(0, 'rgba(168,85,247,.06)');
      g.addColorStop(0.5, 'rgba(137,106,189,.55)');
      g.addColorStop(1, 'rgba(210,185,255,.18)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, -hgt / 2); c.lineTo(len, -hgt / 2 + 3);
      c.lineTo(len - 8, hgt / 2); c.lineTo(4, hgt / 2 - 2);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(232,214,255,.8)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, -hgt / 2); c.lineTo(len, -hgt / 2 + 3); c.stroke();
      c.restore();
    }
    const g2 = c.createRadialGradient(PEEK_W * 0.6, PEEK_H * 0.4, 4, PEEK_W * 0.6, PEEK_H * 0.4, 92);
    g2.addColorStop(0, 'rgba(168,85,247,.22)');
    g2.addColorStop(1, 'rgba(168,85,247,0)');
    c.fillStyle = g2;
    c.fillRect(0, 0, PEEK_W, PEEK_H);
  },
  cursorgrid(c, t){
    peekBg(c);
    const step = 16;
    c.strokeStyle = 'rgba(255,255,255,.09)';
    c.lineWidth = 1;
    for (let x = 0; x <= PEEK_W; x += step){ c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, PEEK_H); c.stroke(); }
    for (let y = 0; y <= PEEK_H; y += step){ c.beginPath(); c.moveTo(0, y + .5); c.lineTo(PEEK_W, y + .5); c.stroke(); }
    const mx = PEEK_W / 2 + Math.sin(t * 1.25) * 62;
    const my = PEEK_H / 2 + Math.cos(t * 0.95) * 34;
    // осветлённые ячейки вокруг «курсора»
    const c0 = Math.floor(mx / step), r0 = Math.floor(my / step);
    for (let r = r0 - 3; r <= r0 + 3; r++){
      for (let cc = c0 - 3; cc <= c0 + 3; cc++){
        if (cc < 0 || r < 0 || cc * step >= PEEK_W || r * step >= PEEK_H) continue;
        const d = Math.hypot(cc * step + step / 2 - mx, r * step + step / 2 - my);
        const v = Math.exp(-d / 34);
        if (v > 0.03){
          c.fillStyle = 'rgba(190,215,255,' + (v * 0.4).toFixed(3) + ')';
          c.fillRect(cc * step + 1, r * step + 1, step - 2, step - 2);
          c.strokeStyle = 'rgba(230,240,255,' + (v * 0.9).toFixed(3) + ')';
          c.strokeRect(cc * step + 1.5, r * step + 1.5, step - 3, step - 3);
        }
      }
    }
    const g = c.createRadialGradient(mx, my, 2, mx, my, 70);
    g.addColorStop(0, 'rgba(160,190,255,.22)');
    g.addColorStop(1, 'rgba(160,190,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, PEEK_W, PEEK_H);
  },
};

function peekGLInit(){
  if (peekGL !== undefined) return peekGL;
  const cv = document.createElement('canvas');
  cv.width = PEEK_W; cv.height = PEEK_H;
  const g = cv.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!g){ peekGL = false; return false; }
  const mk = (type, src) => {
    const sh = g.createShader(type);
    g.shaderSource(sh, src); g.compileShader(sh);
    if (!g.getShaderParameter(sh, g.COMPILE_STATUS)){
      console.error('[peek]', g.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const vs = mk(g.VERTEX_SHADER, VERT), fs = mk(g.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs){ peekGL = false; return false; }
  const p = g.createProgram();
  g.attachShader(p, vs); g.attachShader(p, fs); g.linkProgram(p);
  if (!g.getProgramParameter(p, g.LINK_STATUS)){ peekGL = false; return false; }
  g.useProgram(p);
  const buf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), g.STATIC_DRAW);
  const loc = g.getAttribLocation(p, 'aPos');
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
  const U = {};
  ['uRes','uTime','uMouse','uMode','uLight','uLightCol','uGridOn','uGridScale',
   'uShape','uRotSpeed','uParticle','uParticleSpeed','uRingAmp','uRingSpeed',
   'uSparks','uSparkSpeed','uSparkReact','uAttract','uReveal','uRevealPos']
    .forEach(n => U[n] = g.getUniformLocation(p, n));
  U.uClicks = g.getUniformLocation(p, 'uClicks[0]');
  peekGL = { g, p, U, cv };
  return peekGL;
}

function peekDraw3D(t, id){
  const P = peekGLInit();
  if (!P) return false;
  const { g, U } = P;
  const cfg = id === 'particles'
    ? { shape: 0, rot: 0.2, part: 1.9, pspd: 1.3 }
    : id === 'formulas'
      ? { shape: state.shapeCur, rot: 0.5, part: 0.7, pspd: 1.0 }
      : { shape: state.shapeCur, rot: 0.3, part: 1.1, pspd: 1.0 };
  g.viewport(0, 0, PEEK_W, PEEK_H);
  g.uniform2f(U.uRes, PEEK_W, PEEK_H);
  g.uniform1f(U.uTime, t);
  g.uniform2f(U.uMouse, Math.sin(t * 0.7) * 0.6, Math.cos(t * 0.55) * 0.5);
  g.uniform1f(U.uMode, 2);
  g.uniform1f(U.uLight, 1.15);
  g.uniform3f(U.uLightCol, state.u.lightCol[0], state.u.lightCol[1], state.u.lightCol[2]);
  g.uniform1f(U.uGridOn, state.u.gridOn);
  g.uniform1f(U.uGridScale, state.u.gridScale);
  g.uniform1f(U.uShape, cfg.shape);
  g.uniform1f(U.uRotSpeed, cfg.rot);
  g.uniform1f(U.uParticle, cfg.part);
  g.uniform1f(U.uParticleSpeed, cfg.pspd);
  g.uniform1f(U.uRingAmp, 0); g.uniform1f(U.uRingSpeed, 1);
  g.uniform1f(U.uSparks, 0); g.uniform1f(U.uSparkSpeed, 1); g.uniform1f(U.uSparkReact, 0);
  g.uniform1f(U.uAttract, 0);
  g.uniform1f(U.uReveal, 1);
  g.uniform2f(U.uRevealPos, 0, 0);
  g.uniform3fv(U.uClicks, [-1,-1,-1, -1,-1,-1, -1,-1,-1]);
  g.drawArrays(g.TRIANGLES, 0, 3);
  peek2d.drawImage(P.cv, 0, 0);
  return true;
}

function showPeek(mod, node){
  peekMod = mod;
  peekName.textContent = mod.name;
  const r = node.getBoundingClientRect();
  peekEl.style.left = (r.right + 14) + 'px';
  peekEl.style.top = Math.min(Math.max(10, r.top - 8), innerHeight - 168) + 'px';
  peekEl.classList.add('on');
  if (!peekRaf){
    peekT0 = performance.now();
    peekRaf = requestAnimationFrame(peekFrame);
  }
}
function hidePeek(){
  peekEl.classList.remove('on');
  peekMod = null;
  if (peekRaf){ cancelAnimationFrame(peekRaf); peekRaf = 0; }
}
function peekFrame(now){
  peekRaf = 0;
  if (!peekMod) return;
  const t = Math.max(0, (now - peekT0) / 1000);
  const useGL = peekMod.id !== 'aeroshards' &&      // Aero Shards — свой рендер-набросок
                ((peekMod.dims.length === 1 && peekMod.dims[0] === '3d') ||
                 (peekMod.id === 'space' && state.mode === '3d'));
  if (useGL){
    if (!peekDraw3D(t, peekMod.id)) (PEEK2D[peekMod.id] || PEEK2D.space)(peek2d, t);
  } else {
    (PEEK2D[peekMod.id] || PEEK2D.space)(peek2d, t);
  }
  peekRaf = requestAnimationFrame(peekFrame);
}

/* ---------------- ИНТРО ---------------- */
const boot       = $('#boot');
const appRoot = $('#app');
document.querySelector('[data-cat]').innerHTML = CAT_SVG;
const cat = document.querySelector('.cat');
document.addEventListener('pointermove', e => {
  if (introDone) return;
  const r = cat.getBoundingClientRect();
  cat.style.setProperty('--px', Math.max(-5, Math.min(5, (e.clientX-r.left-r.width/2)/45))+'px');
  cat.style.setProperty('--py', Math.max(-4, Math.min(4, (e.clientY-r.top-r.height*.37)/55))+'px');
}, {passive:true});
let introDone = false;
function finishIntro(){
  if (introDone) return;
  introDone = true;
  boot.classList.add('done');
  appRoot.classList.add('on', 'settled');
  appRoot.inert = false;
  setTimeout(() => { boot.hidden = true; $('#modeSwitch button').focus({preventScroll:true}); }, 500);
}
function expandIntro(){
  const win = $('#appWindow');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Width/height animate from the centered window to the viewport. The fallback
  // also completes the intro when transitions are interrupted or unavailable.
  return new Promise(resolve => {
    let fallback;
    const complete = () => {
      clearTimeout(fallback);
      win.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = event => {
      if (event.target === win && event.propertyName === 'width') complete();
    };
    win.addEventListener('transitionend', onEnd);
    boot.classList.add('phase-max');
    win.classList.add('max');
    if (reducedMotion) { complete(); return; }
    setTimeout(() => boot.querySelector('.cat-holder').classList.add('jump'), 150);
    fallback = setTimeout(complete, 1300);
  });
}
async function runIntro(){
  appRoot.inert = true;
  const pageLoaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(r => window.addEventListener('load', r, {once:true}));
  await Promise.all([pageLoaded, document.fonts.ready]);
  $('#bootStatus').textContent = 'Всё готово. Кот ещё немного смотрит на тебя.';
  $('#bootProgress').classList.add('ready');
  await new Promise(r => setTimeout(r, 2000));
  $('#bootStatus').textContent = 'Открываем Playground…';
  await expandIntro();
  finishIntro();
}

/* ---------------- свечение курсора ---------------- */
const cursorGlow = $('#cursorGlow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
}, { passive: true });

/* ---------------- ЗАПУСК ---------------- */
syncBadges();
syncStageAct();
startGL();
try { cg = createCursorGrid($('#gridgl'), $('#stage'), cgSet); } catch(err) { console.warn('Cursor Grid unavailable', err); }
syncCursorGrid();
runIntro();
document.fonts.ready.then(buildNameFX);

