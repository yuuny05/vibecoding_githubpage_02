/* ── Supabase 설정 (실제 값으로 교체) ── */
const SUPABASE_URL      = 'https://beahwishizeovioqezad.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYWh3aXNoaXplb3Zpb3FlemFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ4MjQsImV4cCI6MjA5NDc4MDgyNH0.-xdAKFILnKpXJeaiqaK7lXcgD5JNzmayMMFOilbnKHw';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLUMN_IDS = ['todo', 'in-progress', 'done'];

let draggedCardId = null;
let currentUser   = null;
let authMode      = 'login'; // 'login' | 'signup'

/* ════════════════════════════════════════
   인증 — 에러 / 폼 유틸
════════════════════════════════════════ */

const showError = (message) => {
  const errEl = document.getElementById('auth-error');
  errEl.textContent = message;
  errEl.removeAttribute('hidden');
};

const clearError = () => {
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  errEl.setAttribute('hidden', '');
};

const setAuthMode = (mode) => {
  authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('auth-title').textContent       = isSignup ? '회원가입' : '로그인';
  document.getElementById('btn-auth-submit').textContent  = isSignup ? '회원가입' : '로그인';
  document.getElementById('btn-auth-toggle').textContent  = isSignup ? '로그인' : '회원가입';
  const toggleTextEl = document.getElementById('btn-auth-toggle').closest('.auth-toggle-text');
  toggleTextEl.childNodes[0].textContent = isSignup ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? ';
  document.getElementById('input-password').setAttribute(
    'autocomplete', isSignup ? 'new-password' : 'current-password'
  );
  clearError();
};

/* ════════════════════════════════════════
   인증 — UI 전환
════════════════════════════════════════ */

const showAuthView = () => {
  document.getElementById('auth-overlay').removeAttribute('hidden');
  document.getElementById('board').setAttribute('hidden', '');
  document.getElementById('user-info').setAttribute('hidden', '');
  setAuthMode('login');
};

const showBoardView = (user) => {
  currentUser = user;
  document.getElementById('auth-overlay').setAttribute('hidden', '');
  document.getElementById('board').removeAttribute('hidden');
  document.getElementById('user-info').removeAttribute('hidden');
  document.getElementById('user-email').textContent = user.email ?? '';
  loadCards(user.id);
};

/* ════════════════════════════════════════
   인증 — Supabase Auth 함수
════════════════════════════════════════ */

const signUpWithEmail = async (email, password) =>
  supabaseClient.auth.signUp({ email, password });

const signInWithEmail = async (email, password) =>
  supabaseClient.auth.signInWithPassword({ email, password });

const signInWithGoogle = async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) showError('Google 로그인에 실패했습니다.');
};

const signInWithGitHub = async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) showError('GitHub 로그인에 실패했습니다.');
};

const handleSignOut = async () => {
  await supabaseClient.auth.signOut();
};

/* ════════════════════════════════════════
   인증 — 폼 제출 핸들러
════════════════════════════════════════ */

const handleAuthSubmit = async (e) => {
  e.preventDefault();
  const email     = document.getElementById('input-email').value.trim();
  const password  = document.getElementById('input-password').value;
  const submitBtn = document.getElementById('btn-auth-submit');

  clearError();
  submitBtn.disabled = true;

  const { error } = authMode === 'login'
    ? await signInWithEmail(email, password)
    : await signUpWithEmail(email, password);

  submitBtn.disabled = false;

  if (error) {
    showError(error.message);
  } else if (authMode === 'signup') {
    showError('가입 확인 이메일을 발송했습니다. 이메일을 확인해 주세요.');
  }
};

/* ════════════════════════════════════════
   Supabase CRUD
════════════════════════════════════════ */

const loadCards = async (userId) => {
  const { data, error } = await supabaseClient
    .from('cards')
    .select('id, column_id, text, "order"')
    .eq('user_id', userId)
    .order('"order"', { ascending: true });

  if (error) {
    console.error('카드 로드 실패:', error.message);
    return;
  }
  renderCards(data);
};

const insertCard = async (text, columnId, userId, order) => {
  const { data, error } = await supabaseClient
    .from('cards')
    .insert({ user_id: userId, column_id: columnId, text, order })
    .select('id')
    .single();

  if (error) {
    console.error('카드 추가 실패:', error.message);
    return null;
  }
  return data;
};

const deleteCardFromDB = async (id) => {
  const { error } = await supabaseClient
    .from('cards')
    .delete()
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) console.error('카드 삭제 실패:', error.message);
};

const updateCardColumn = async (id, newColumnId) => {
  const { error } = await supabaseClient
    .from('cards')
    .update({ column_id: newColumnId })
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) console.error('카드 이동 실패:', error.message);
};

const renderCards = (cards) => {
  COLUMN_IDS.forEach(id => {
    document.querySelector(`#${id} .card-list`).innerHTML = '';
    updateCount(id);
  });
  cards.forEach(({ id, column_id, text }) => {
    const listEl = document.querySelector(`#${column_id} .card-list`);
    if (!listEl) return;
    listEl.appendChild(createCard(text, column_id, id));
    updateCount(column_id);
  });
};

/* ════════════════════════════════════════
   카드 생성
════════════════════════════════════════ */

const createCard = (text, columnId, dbId) => {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.draggable = true;
  cardEl.dataset.id = dbId;
  cardEl.setAttribute('role', 'listitem');

  const textEl = document.createElement('span');
  textEl.className = 'card-text';
  textEl.textContent = text;

  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn-delete';
  btnDelete.setAttribute('aria-label', '카드 삭제');
  btnDelete.textContent = '×';
  btnDelete.addEventListener('click', () => deleteCard(cardEl));

  cardEl.appendChild(textEl);
  cardEl.appendChild(btnDelete);

  cardEl.addEventListener('dragstart', handleDragStart);
  cardEl.addEventListener('dragend', handleDragEnd);

  return cardEl;
};

/* ════════════════════════════════════════
   카드 추가 / 삭제
════════════════════════════════════════ */

const addCard = async (columnId) => {
  const columnEl = document.getElementById(columnId);
  const inputEl  = columnEl.querySelector('.card-input');
  const text     = inputEl.value.trim();

  if (!text || !currentUser) { inputEl.focus(); return; }

  const order  = columnEl.querySelectorAll('.card').length;
  const result = await insertCard(text, columnId, currentUser.id, order);
  if (!result) return;

  columnEl.querySelector('.card-list').appendChild(createCard(text, columnId, result.id));
  inputEl.value = '';
  inputEl.focus();
  updateCount(columnId);
};

const deleteCard = async (cardEl) => {
  const columnEl = cardEl.closest('.column');
  await deleteCardFromDB(cardEl.dataset.id);
  cardEl.remove();
  if (columnEl) updateCount(columnEl.id);
};

/* ════════════════════════════════════════
   카드 수 뱃지 업데이트
════════════════════════════════════════ */

const updateCount = (columnId) => {
  const columnEl = document.getElementById(columnId);
  const count    = columnEl.querySelectorAll('.card').length;
  columnEl.querySelector('.column-count').textContent = count;
};

/* ════════════════════════════════════════
   드래그 이벤트 핸들러
════════════════════════════════════════ */

const handleDragStart = (e) => {
  draggedCardId = e.currentTarget.dataset.id;
  e.dataTransfer.setData('text/plain', draggedCardId);
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.currentTarget.classList.add('dragging'), 0);
};

const handleDragEnd = (e) => {
  e.currentTarget.classList.remove('dragging');
  draggedCardId = null;
  document.querySelectorAll('.column.drag-over').forEach(col => {
    col.classList.remove('drag-over');
  });
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const columnEl = e.currentTarget;
  if (!columnEl.classList.contains('drag-over')) {
    columnEl.classList.add('drag-over');
  }
};

const handleDragLeave = (e) => {
  const columnEl = e.currentTarget;
  if (!columnEl.contains(e.relatedTarget)) {
    columnEl.classList.remove('drag-over');
  }
};

const handleDrop = async (e) => {
  e.preventDefault();
  const columnEl = e.currentTarget;
  columnEl.classList.remove('drag-over');

  const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
  if (!cardId) return;

  const cardEl       = document.querySelector(`[data-id="${cardId}"]`);
  if (!cardEl) return;

  const originColumnEl = cardEl.closest('.column');
  const newColumnId    = columnEl.id;

  if (originColumnEl && originColumnEl.id !== newColumnId) {
    await updateCardColumn(cardId, newColumnId);
    updateCount(originColumnEl.id);
  }

  columnEl.querySelector('.card-list').appendChild(cardEl);
  updateCount(newColumnId);
};

/* ════════════════════════════════════════
   이벤트 등록
════════════════════════════════════════ */

const initColumns = () => {
  COLUMN_IDS.forEach(id => {
    const columnEl = document.getElementById(id);

    columnEl.addEventListener('dragover',  handleDragOver);
    columnEl.addEventListener('dragleave', handleDragLeave);
    columnEl.addEventListener('drop',      handleDrop);

    columnEl.querySelector('.btn-add').addEventListener('click', () => addCard(id));
    columnEl.querySelector('.card-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCard(id);
    });
  });
};

const initAuthEvents = () => {
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
  document.getElementById('btn-auth-toggle').addEventListener('click', () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  });
  document.getElementById('btn-google').addEventListener('click', signInWithGoogle);
  document.getElementById('btn-github').addEventListener('click', signInWithGitHub);
  document.getElementById('btn-logout').addEventListener('click', handleSignOut);
};

/* ════════════════════════════════════════
   인증 상태 감지
════════════════════════════════════════ */

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    showBoardView(session.user);
  } else {
    currentUser = null;
    showAuthView();
  }
});

/* ════════════════════════════════════════
   초기화
════════════════════════════════════════ */

initColumns();
initAuthEvents();
