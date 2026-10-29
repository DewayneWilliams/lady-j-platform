const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(file,'utf8');
const transpile = source => ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
function findNode(node,predicate) { if(predicate(node)) return node; return ts.forEachChild(node,child=>findNode(child,predicate)); }
function gallery(os, fail=false) {
  const source=ts.createSourceFile('gallery.tsx',read('components/salon/media/ClientMediaGallery.tsx'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const key=findNode(source,n=>ts.isVariableDeclaration(n)&&n.name.getText(source)==='prefKey');
  const effect=findNode(source,n=>ts.isCallExpression(n)&&n.expression.getText(source)==='useEffect'&&n.getText(source).includes('sessionStorage.getItem(prefKey)'));
  const write=findNode(source,n=>ts.isJsxAttribute(n)&&n.name.getText(source)==='onPress'&&n.getText(source).includes('sessionStorage.setItem(prefKey'));
  const native=ts.createSourceFile('SecureStore.ts',read('node_modules/expo-secure-store/src/SecureStore.ts'),ts.ScriptTarget.Latest,true);
  const valid=findNode(native,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='isValidKey');
  const notifications=[], values=new Map(), keys=[];
  let ready=false;
  const context={exports:{},Platform:{OS:os},s:{session:{user:{id:'00000000-0000-4000-8000-000000000001'}},notify:message=>notifications.push(message)},
    setFilters(){},setPrefsReady:value=>{ready=value;},sort:'asc',useEffect:fn=>fn(),
    sessionStorage:{getItem:async key=>{keys.push(key); if(fail) throw Error('Storage unavailable'); if(os!=='web'&&!context.valid(key)) throw Error('Invalid key provided to SecureStore.'); return values.get(key)??null;},setItem:async(key,value)=>{keys.push(key);if(fail)throw Error('Storage unavailable');if(os!=='web'&&!context.valid(key))throw Error('Invalid key provided to SecureStore.');values.set(key,value);}}};
  vm.runInNewContext(transpile(valid.getText(native)+'\nexports.valid=isValidKey;'),context);context.valid=context.exports.valid;
  vm.runInNewContext(transpile(`const prefKey=${key.initializer.getText(source)}; ${effect.getText(source)}; exports.write=${write.initializer.expression.getText(source)};`),context);
  return {context,notifications,keys,values,ready:()=>ready};
}
test('native media sort reproduces the rejected legacy key and accepts repaired reads/writes',async()=>{
  const g=gallery('ios');assert.equal(g.context.valid('lj-media-sort:00000000'),false);
  await tick();assert.equal(g.ready(),true);g.context.exports.write();await tick();
  assert.equal(g.notifications.length,0);assert.equal(g.values.size,1);assert(g.keys.every(key=>g.context.valid(key)));
});
test('web sort keeps its existing preference key; native storage rejections are handled',async()=>{
  const web=gallery('web');await tick();web.context.exports.write();await tick();assert(web.keys.every(key=>key.startsWith('lj-media-sort:')));
  const failed=gallery('android',true);await tick();assert.equal(failed.ready(),true);failed.context.exports.write();await tick();assert.equal(failed.notifications.length,2);
});
function editor({live=true,block=null}={}) {
  const state=[],refs=[],calls=[],saved=[];let cursor=0,refCursor=0;
  const jsx=(type,props)=>({type,props});
  const exported={};
  const modules={
    react:{useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];},useRef:initial=>{const i=refCursor++;return refs[i]??(refs[i]={current:initial});}},
    'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{View:'View'},
    '@/lib/salon/revenueReport':{validReportDate:v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00Z').toISOString().slice(0,10)===v},
    './BlockReasonField':{default:'Reason'},'../DateFields':{DateField:'Date',TimeField:'Time'},
    '@/lib/salon/calendarActivity':{localCalendarTime:iso=>new Date(Date.parse(iso)-4*3600000).toISOString().slice(0,16)},
    '@/lib/salon/client':{db:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{},error:null};}}),check:r=>{if(r.error)throw Error(r.error.message);return r.data;}},
    '@/lib/salon/SalonProvider':{useSalon:()=>({notify(){}})},'../ui':{Field:'Field',Txt:'Text',useColors:()=>({})},'./OwnerUI':{OwnerButton:'Button'},
  };
  vm.runInNewContext(transpile(read('components/salon/owner/BlockTimeEditor.tsx')),{exports:exported,require:name=>{if(!(name in modules))throw Error(name);return modules[name];}});
  const render=()=>{cursor=0;refCursor=0;return exported.default({date:'2027-01-05',block,live,onSaved:async day=>saved.push(day),onBusyChange(){},onDemoSave:row=>saved.push(row),onDelete:row=>saved.push({deleted:row.id})});};
  const children=()=>render().props.children.flat().filter(Boolean);
  return {state,calls,saved,children,field:label=>children().find(n=>n.props?.label===label),save:async()=>{children().find(n=>n.props?.label==='Save Block').props.onPress();await tick();}};
}
test('existing form opens with date/time controls and saves single-day and multiday owner RPCs',async()=>{
  const e=editor();for(const label of ['From','To','Start time','End time'])assert(e.field(label));
  e.field('Details (optional, owner only)').props.onChangeText('Private notes');await e.save();
  assert.equal(e.calls[0].name,'lj_save_calendar_block');assert.equal(e.calls[0].args.p_description,'Private notes');assert.equal(e.calls[0].args.p_repeat,'none');
  const multi=editor();multi.field('To').props.onChange('2027-01-07');await multi.save();assert.equal(multi.calls[0].args.p_end,'2027-01-07T15:00:00.000Z');
});
test('form rejects reversed dates and missing Other notes before any write',async()=>{
  const e=editor();e.field('End time').props.onChange('09:00');await e.save();assert.equal(e.calls.length,0);
  const other=editor();other.children().find(n=>n.type==='Reason').props.onChange('other');await other.save();assert.equal(other.calls.length,0);
  assert(other.state.some(value=>typeof value==='string'&&value.includes('Enter a description')));
});
test('demo saves use the same fields without backend writes; editing preserves the block ID and delete callback',async()=>{
  const e=editor({live:false});await e.save();assert.equal(e.calls.length,0);assert.equal(e.saved[0].kind,'block');
  const b={id:'existing-block',starts_at:'2027-01-05T14:00:00Z',ends_at:'2027-01-05T15:00:00Z',block_reason:'vacation',block_description:'Existing notes',updated_at:'2026-10-29T10:00:00Z'};
  const edit=editor({block:b});assert.equal(edit.field('Details (optional, owner only)').props.value,'Existing notes');await edit.save();assert.equal(edit.calls[0].args.p_id,b.id);assert.equal(edit.calls[0].args.p_expected,b.updated_at);edit.field('Delete Block').props.onPress();assert.equal(edit.saved.at(-1).deleted,b.id);
});
