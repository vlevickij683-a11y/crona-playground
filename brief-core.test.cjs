const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('./brief-core.js');
const variant = {key:'test-1',module:'glowbutton',name:'Свечение',mode:'2d',version:1,settings:{radius:17,color:'#ffffff',vector:[1,2]},defaults:{radius:16,color:'#ffffff',vector:[1,2]},note:'Для заявки <b>текст</b>',use:'Кнопка заказа'};
test('export contains only effective changes, including array equality',()=>{
  assert.deepEqual(core.diff(variant.settings,variant.defaults),{radius:17});
  const text=core.exportText({entries:[variant],note:'Сайт студии'});
  assert.match(text,/"radius": 17/); assert.doesNotMatch(text,/"color"|"vector"/);
  assert.match(text,/Версия: 1/);assert.match(text,/<b>текст<\/b>/);
});
test('unchanged values and reverted settings produce default marker',()=>{
  const e=core.clone(variant);e.settings.radius=16;
  assert.deepEqual(core.diff(e.settings,e.defaults),{});
  assert.match(core.exportText({entries:[e]}),/Стандартные настройки/);
});
test('snapshots remain independent and survive JSON storage',()=>{
  const e=core.clone(variant);const second=core.clone(e);second.key='second';second.mode='3d';second.settings.radius=29;
  const data=core.decode(JSON.stringify({schema:1,entries:[e,second],note:'Бриф'}));
  assert.equal(data.entries[0].settings.radius,17);assert.equal(data.entries[1].settings.radius,29);
  const text=core.exportText(data);assert.match(text,/=== 2D \/ 1 ===/);assert.match(text,/=== 3D \/ 1 ===/);
});
test('invalid stored entries cannot break export',()=>{
  const data=core.decode(JSON.stringify({schema:1,entries:[null,{},variant,{...variant,settings:null}],note:7}));
  assert.equal(data.entries.length,1);assert.equal(data.note,'');assert.doesNotThrow(()=>core.exportText(data));
});
