
const { createClient } = supabase;
const SUPABASE_URL = 'https://beahwishizeovioqezad.supabase.co';  // Project URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYWh3aXNoaXplb3Zpb3FlemFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ4MjQsImV4cCI6MjA5NDc4MDgyNH0.-xdAKFILnKpXJeaiqaK7lXcgD5JNzmayMMFOilbnKHw';                           // anon public key
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const input = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const prioritySelect = document.getElementById('priority-select');
const todoList = document.getElementById('todo-list');
const remaining = document.getElementById('remaining');

const PRIORITY_LABEL = { high: '높음', medium: '중간', low: '낮음' };
const PRIORITY_ORDER = ['high', 'medium', 'low'];
const TAG_MAP = { high: 'movement', medium: 'ritual', low: 'mind' };

// ── Auth elements
const authOverlay  = document.getElementById('auth-overlay');
const authEmail    = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError    = document.getElementById('auth-error');
const authMessage  = document.getElementById('auth-message');
const authSubmit   = document.getElementById('auth-submit');
const userEmailEl  = document.getElementById('user-email');
const logoutBtn    = document.getElementById('logout-btn');

let currentUser = null;
let authMode = 'signin';

const AUTH_ERRORS = {
  'Invalid login credentials':              '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed':                    '이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.',
  'User already registered':                '이미 가입된 이메일입니다.',
  'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
};

function authErrMsg(msg) {
  return AUTH_ERRORS[msg] || msg;
}

function showApp(user) {
  currentUser = user;
  authOverlay.classList.add('is-hidden');
  if (userEmailEl) {
    userEmailEl.textContent =
      user.email ||
      user.user_metadata?.full_name ||
      user.user_metadata?.user_name ||
      '사용자';
  }
}

function showAuth() {
  currentUser = null;
  todos = [];
  authOverlay.classList.remove('is-hidden');
  authError.textContent = '';
  authMessage.textContent = '';
  render();
}

async function handleAuthSubmit() {
  const email    = authEmail.value.trim();
  const password = authPassword.value;
  authError.textContent = '';
  authMessage.textContent = '';

  if (!email || !password) {
    authError.textContent = '이메일과 비밀번호를 입력하세요.';
    return;
  }

  authSubmit.disabled = true;

  if (authMode === 'signin') {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) authError.textContent = authErrMsg(error.message);
  } else {
    const { error } = await db.auth.signUp({ email, password });
    if (error) {
      authError.textContent = authErrMsg(error.message);
    } else {
      authMessage.textContent = '가입 확인 이메일을 보냈습니다. 메일함을 확인해주세요.';
    }
  }

  authSubmit.disabled = false;
}

// 탭 전환
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    authMode = tab.dataset.tab;
    authSubmit.textContent = authMode === 'signin' ? '로그인' : '회원가입';
    authError.textContent = '';
    authMessage.textContent = '';
  });
});

authSubmit.addEventListener('click', handleAuthSubmit);
[authEmail, authPassword].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAuthSubmit(); })
);

async function signInWithProvider(provider) {
  authError.textContent = '';
  const { error } = await db.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) authError.textContent = authErrMsg(error.message);
}

document.getElementById('google-login').addEventListener('click', () => signInWithProvider('google'));
document.getElementById('github-login').addEventListener('click', () => signInWithProvider('github'));

logoutBtn.addEventListener('click', async () => {
  await db.auth.signOut();
});

// ── Todo state
let todos = [];
let draggingId = null;
let currentFilter = 'all';

async function saveAll() {
  const updates = todos.map((t, i) => ({ ...t, sort_order: i }));
  const { error } = await db.from('todos').upsert(updates);
  if (error) console.error('saveAll error:', error);
}

function clearDragOver() {
  document.querySelectorAll('[data-drag-state]').forEach(el => delete el.dataset.dragState);
  document.querySelectorAll('.drag-over, .drag-over-top, .drag-over-bottom')
    .forEach(el => el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom'));
}

async function reorder(dragId, targetId, position, targetPriority) {
  const dragging = { ...todos.find(t => t.id === dragId), priority: targetPriority };
  const rest = todos.filter(t => t.id !== dragId);
  const idx = rest.findIndex(t => t.id === targetId);
  rest.splice(position === 'before' ? idx : idx + 1, 0, dragging);
  todos = rest;
  await saveAll();
  render();
}

async function reorderToGroupStart(dragId, priority) {
  const dragging = { ...todos.find(t => t.id === dragId), priority };
  const rest = todos.filter(t => t.id !== dragId);
  let insertIdx = rest.findIndex(t => (t.priority || 'medium') === priority);
  if (insertIdx === -1) {
    insertIdx = rest.length;
    for (let i = PRIORITY_ORDER.indexOf(priority) + 1; i < PRIORITY_ORDER.length; i++) {
      const next = rest.findIndex(t => (t.priority || 'medium') === PRIORITY_ORDER[i]);
      if (next !== -1) { insertIdx = next; break; }
    }
  }
  rest.splice(insertIdx, 0, dragging);
  todos = rest;
  await saveAll();
  render();
}

function addDragEvents(li, todo) {
  li.addEventListener('dragstart', e => {
    draggingId = todo.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { li.dataset.dragState = 'dragging'; }, 0);
  });

  li.addEventListener('dragend', () => {
    draggingId = null;
    delete li.dataset.dragState;
    clearDragOver();
  });

  li.addEventListener('dragover', e => {
    e.preventDefault();
    if (draggingId === todo.id) return;
    clearDragOver();
    const rect = li.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    li.dataset.dragState = 'over';
    li.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
  });

  li.addEventListener('dragleave', e => {
    if (li.contains(e.relatedTarget)) return;
    delete li.dataset.dragState;
    li.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  li.addEventListener('drop', e => {
    e.preventDefault();
    const isBefore = li.classList.contains('drag-over-top');
    delete li.dataset.dragState;
    li.classList.remove('drag-over-top', 'drag-over-bottom');
    if (!draggingId || draggingId === todo.id) return;
    reorder(draggingId, todo.id, isBefore ? 'before' : 'after', todo.priority || 'medium');
  });
}

function addGroupHeaderEvents(header, priority) {
  header.addEventListener('dragover', e => {
    e.preventDefault();
    clearDragOver();
    header.classList.add('drag-over');
  });
  header.addEventListener('dragleave', e => {
    if (header.contains(e.relatedTarget)) return;
    header.classList.remove('drag-over');
  });
  header.addEventListener('drop', e => {
    e.preventDefault();
    header.classList.remove('drag-over');
    if (!draggingId) return;
    reorderToGroupStart(draggingId, priority);
  });
}

function render() {
  todoList.innerHTML = '';

  // 날짜 표시
  const dateEl = document.getElementById('today-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
  }

  // 진행률
  const done = todos.filter(t => t.done).length;
  const total = todos.length;
  const doneEl   = document.getElementById('done-count');
  const totalEl  = document.getElementById('total-count');
  const fillEl   = document.getElementById('progress-fill');
  if (doneEl)  doneEl.textContent  = done;
  if (totalEl) totalEl.textContent = total;
  if (fillEl)  fillEl.style.width  = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';

  // 사이드바 카운트
  PRIORITY_ORDER.forEach(p => {
    const el = document.getElementById(`count-${p}`);
    if (el) el.textContent = todos.filter(t => (t.priority || 'medium') === p && !t.done).length;
  });
  const allEl = document.getElementById('count-all');
  if (allEl) allEl.textContent = todos.filter(t => !t.done).length;

  // 필터 적용
  let filtered = [...todos];
  if (currentFilter === 'active') filtered = todos.filter(t => !t.done);
  else if (currentFilter === 'done') filtered = todos.filter(t => t.done);
  else if (currentFilter.startsWith('priority-')) {
    const p = currentFilter.replace('priority-', '');
    filtered = todos.filter(t => (t.priority || 'medium') === p);
  }

  // 우선순위 그룹별 렌더링
  PRIORITY_ORDER.forEach(priority => {
    const group = filtered.filter(t => (t.priority || 'medium') === priority);
    if (group.length === 0) return;

    const header = document.createElement('li');
    header.className = 'boudoir__group-header';
    header.textContent = PRIORITY_LABEL[priority];
    header.dataset.priority = priority;
    addGroupHeaderEvents(header, priority);
    todoList.appendChild(header);

    group.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'boudoir__row' + (todo.done ? ' is-done' : '');
      li.draggable = true;

      // 핸들
      const handle = document.createElement('span');
      handle.className = 'boudoir__handle';
      handle.textContent = '⠿';

      // 시간
      const timeEl = document.createElement('span');
      timeEl.className = 'boudoir__time';
      timeEl.textContent = new Date(todo.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

      // 체크 버튼
      const check = document.createElement('button');
      check.className = 'boudoir__check';
      check.setAttribute('role', 'checkbox');
      check.setAttribute('aria-checked', String(todo.done));
      if (todo.done) {
        check.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
      check.addEventListener('click', () => toggleTodo(todo.id));

      // 텍스트
      const textWrap = document.createElement('div');
      textWrap.className = 'boudoir__text';
      const textMain = document.createElement('span');
      textMain.className = 'boudoir__text-main';
      textMain.textContent = todo.text;
      textWrap.appendChild(textMain);

      // 우선순위 태그
      const tag = document.createElement('span');
      tag.className = 'boudoir__tag';
      tag.dataset.tag = TAG_MAP[todo.priority || 'medium'];
      tag.textContent = PRIORITY_LABEL[todo.priority || 'medium'];

      // 삭제 버튼
      const delBtn = document.createElement('button');
      delBtn.className = 'boudoir__delete';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => deleteTodo(todo.id));

      li.append(handle, timeEl, check, textWrap, tag, delBtn);
      addDragEvents(li, todo);
      todoList.appendChild(li);
    });
  });

  // 남은 할일 표시
  const count = todos.filter(t => !t.done).length;
  if (remaining) {
    remaining.textContent = count > 0 ? `${count}개 남음` : todos.length > 0 ? 'All done ✦' : '';
  }
}

async function addTodo() {
  const text = input.value.trim();
  if (!text) return;
  addBtn.disabled = true;
  const { data, error } = await db.from('todos')
    .insert({ text, priority: prioritySelect.value, done: false, sort_order: todos.length, user_id: currentUser.id })
    .select()
    .single();
  addBtn.disabled = false;
  if (error) { console.error('addTodo error:', error); addBtn.disabled = false; return; }
  todos.push(data);
  input.value = '';
  render();
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  const { error } = await db.from('todos').update({ done: !todo.done }).eq('id', id);
  if (error) { console.error('toggleTodo error:', error); return; }
  todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
  render();
}

async function deleteTodo(id) {
  const { error } = await db.from('todos').delete().eq('id', id);
  if (error) { console.error('deleteTodo error:', error); return; }
  todos = todos.filter(t => t.id !== id);
  render();
}

document.querySelectorAll('.boudoir__pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.boudoir__pill').forEach(p => p.classList.remove('is-active'));
    pill.classList.add('is-active');
    // 사이드바 active 해제
    document.querySelectorAll('.boudoir__nav-item').forEach(i => i.classList.remove('is-active'));
    document.querySelector('.boudoir__nav-item[data-priority="all"]').classList.add('is-active');
    currentFilter = pill.dataset.filter;
    render();
  });
});

document.querySelectorAll('.boudoir__nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.boudoir__nav-item').forEach(i => i.classList.remove('is-active'));
    item.classList.add('is-active');
    document.querySelectorAll('.boudoir__pill').forEach(p => p.classList.remove('is-active'));
    const p = item.dataset.priority;
    if (p === 'all') {
      currentFilter = 'all';
      document.querySelector('.boudoir__pill[data-filter="all"]').classList.add('is-active');
    } else {
      currentFilter = 'priority-' + p;
    }
    render();
  });
});

addBtn.addEventListener('click', addTodo);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo();
});

db.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    showApp(session.user);
    const { data, error } = await db.from('todos').select('*').order('sort_order');
    if (error) { console.error('init error:', error); return; }
    todos = data || [];
    render();
  } else {
    showAuth();
  }
});
