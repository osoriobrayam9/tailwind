const API = 'https://todoapitest.juansegaliz.com/todos';

async function j(path='', init={}){
  const res = await fetch(API+path, { headers:{'Content-Type':'application/json'}, ...init });
  const txt = await res.text(); const data = txt ? (()=>{try{return JSON.parse(txt)}catch{return txt}})() : null;
  if(!res.ok) throw new Error((data && data.message) || res.statusText);
  return data;
}

const dom = {
  form: document.querySelector('#tw-form'),
  title: document.querySelector('#tw-title'),
  desc: document.querySelector('#tw-desc'),
  list: document.querySelector('#tw-list'),
  reload: document.querySelector('#tw-reload'),
  tpl: document.querySelector('#tw-item'),
};

const state = { rows: [] };

const render = () => {
  dom.list.innerHTML = '';
  for(const r of state.rows){
    const el = dom.tpl.content.firstElementChild.cloneNode(true);
    el.dataset.id = r.id;
    el.querySelector('.tw-title').textContent = r.title ?? '(Sin título)';
    const dd = el.querySelector('.tw-desc');
    dd.textContent = r.description ?? '';
    dd.classList.toggle('hidden', !dd.textContent);
    const cb = el.querySelector('.tw-toggle');
    cb.checked = !!r.completed;
    if(r.completed) el.querySelector('.tw-title').classList.add('line-through','text-slate-400');
    dom.list.appendChild(el);
  }
};

async function load(){
  const data = await j('');
  state.rows = Array.isArray(data) ? data : (data?.items ?? []);
  render();
}

async function add(e){
  e.preventDefault();
  const payload = { title: dom.title.value.trim(), description: dom.desc.value.trim() || null, completed: false };
  if(!payload.title) return;
  const created = await j('', { method:'POST', body: JSON.stringify(payload) });
  state.rows.unshift(created);
  dom.form.reset();
  render();
}

async function toggle(id, val){
  const i = state.rows.findIndex(x=>String(x.id)===String(id)); if(i<0) return;
  const prev = state.rows[i]; state.rows[i] = { ...prev, completed: val }; render();
  try{ const saved = await j('/'+encodeURIComponent(id), { method:'PUT', body: JSON.stringify({ completed: val })}); state.rows[i] = { ...state.rows[i], ...saved }; }
  catch{ state.rows[i] = prev; }
  render();
}

async function drop(id){
  const i = state.rows.findIndex(x=>String(x.id)===String(id)); if(i<0) return;
  const temp = state.rows.splice(i,1)[0]; render();
  try{ await j('/'+encodeURIComponent(id), { method:'DELETE' }); }
  catch{ state.rows.splice(i,0,temp); render(); }
}

function startEdit(id){
  const el = dom.list.querySelector(`li[data-id="${CSS.escape(String(id))}"]`);
  if(!el) return;
  const row = state.rows.find(x=>String(x.id)===String(id));
  const t = document.createElement('input'); t.className='px-2 py-1 rounded-lg border border-slate-800 bg-slate-950'; t.value = row.title ?? '';
  const d = document.createElement('input'); d.className='px-2 py-1 rounded-lg border border-slate-800 bg-slate-950 w-full'; d.placeholder='Descripción'; d.value = row.description ?? '';
  el.querySelector('.tw-title').replaceWith(t);
  el.querySelector('.tw-desc').replaceWith(d);
  const ok = document.createElement('button'); ok.textContent='✔'; ok.className='px-2 py-1 rounded-lg border border-slate-800'; ok.dataset.act='ok';
  el.querySelector('.tw-edit').replaceWith(ok);
  t.focus();
}

async function saveEdit(id, el){
  const inputs = el.querySelectorAll('input');
  const [t, d] = inputs;
  const payload = { title: t?.value.trim() || '(Sin título)', description: d?.value.trim() || null };
  const i = state.rows.findIndex(x=>String(x.id)===String(id)); if(i<0) return;
  const prev = state.rows[i]; state.rows[i] = { ...prev, ...payload }; render();
  try{ const saved = await j('/'+encodeURIComponent(id), { method:'PUT', body: JSON.stringify(payload) }); state.rows[i] = { ...state.rows[i], ...saved }; }
  catch{ state.rows[i] = prev; }
  render();
}

dom.list.addEventListener('click', (e)=>{
  const li = e.target.closest('li'); if(!li) return;
  const id = li.dataset.id;
  if(e.target.matches('.tw-toggle')) return void toggle(id, e.target.checked);
  if(e.target.matches('.tw-del')) return void drop(id);
  if(e.target.matches('[data-act="ok"]')) return void saveEdit(id, li);
  if(e.target.matches('.tw-edit')) return void startEdit(id);
});

dom.form.addEventListener('submit', add);
dom.reload.addEventListener('click', load);
load();