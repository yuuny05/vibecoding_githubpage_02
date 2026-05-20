/* ── Supabase 설정 ── */
const SUPABASE_URL      = 'https://beahwishizeovioqezad.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYWh3aXNoaXplb3Zpb3FlemFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ4MjQsImV4cCI6MjA5NDc4MDgyNH0.-xdAKFILnKpXJeaiqaK7lXcgD5JNzmayMMFOilbnKHw';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLUMN_IDS = ['todo', 'in-progress', 'done'];

/* ── 전역 상태 ── */
let draggedCardId   = null;
let currentUser     = null;
let authMode        = 'login';
let currentBoard    = null;
let boards          = [];
let boardTags       = [];
let boardMembers    = [];
let realtimeChannel = null;
let editingCardId   = null;
let pendingBoardId  = null;

/* ════════════════════════════════════════
   인증 — 유틸
════════════════════════════════════════ */

const showError = (message) => {
  const el = document.getElementById('auth-error');
  el.textContent = message;
  el.removeAttribute('hidden');
};

const clearError = () => {
  const el = document.getElementById('auth-error');
  el.textContent = '';
  el.setAttribute('hidden', '');
};

const setAuthMode = (mode) => {
  authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('auth-title').textContent      = isSignup ? '회원가입' : '로그인';
  document.getElementById('btn-auth-submit').textContent = isSignup ? '회원가입' : '로그인';
  document.getElementById('btn-auth-toggle').textContent = isSignup ? '로그인' : '회원가입';
  const toggleEl = document.getElementById('btn-auth-toggle').closest('.auth-toggle-text');
  toggleEl.childNodes[0].textContent = isSignup ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? ';
  document.getElementById('input-password').setAttribute(
    'autocomplete', isSignup ? 'new-password' : 'current-password'
  );
  clearError();
};

/* ════════════════════════════════════════
   인증 — UI 전환
════════════════════════════════════════ */

const showAuthView = () => {
  unsubscribeRealtime();
  currentBoard = null;
  document.getElementById('auth-overlay').removeAttribute('hidden');
  document.getElementById('board-selector').setAttribute('hidden', '');
  document.getElementById('board').setAttribute('hidden', '');
  document.getElementById('user-info').setAttribute('hidden', '');
  document.getElementById('board-actions').setAttribute('hidden', '');
  document.getElementById('btn-back-to-boards').setAttribute('hidden', '');
  document.getElementById('current-board-name').setAttribute('hidden', '');
  setAuthMode('login');
};

const showBoardSelector = () => {
  document.getElementById('board-selector').removeAttribute('hidden');
  document.getElementById('board').setAttribute('hidden', '');
  document.getElementById('board-actions').setAttribute('hidden', '');
  document.getElementById('btn-back-to-boards').setAttribute('hidden', '');
  document.getElementById('current-board-name').setAttribute('hidden', '');
  unsubscribeRealtime();
  currentBoard = null;
};

const showKanbanView = () => {
  document.getElementById('board-selector').setAttribute('hidden', '');
  document.getElementById('board').removeAttribute('hidden');
  document.getElementById('board-actions').removeAttribute('hidden');
  document.getElementById('btn-back-to-boards').removeAttribute('hidden');
  document.getElementById('current-board-name').textContent = currentBoard.name;
  document.getElementById('current-board-name').removeAttribute('hidden');
};

const showBoardView = async (user) => {
  currentUser = user;
  document.getElementById('auth-overlay').setAttribute('hidden', '');
  document.getElementById('user-info').removeAttribute('hidden');
  document.getElementById('user-email').textContent = user.email ?? '';
  await handleInviteTokenFromURL();
  await loadBoards();
  showBoardSelector();
};

/* ════════════════════════════════════════
   인증 — Supabase Auth
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
  if (error) showError(error.message);
  else if (authMode === 'signup') showError('확인 이메일을 발송했습니다. 이메일을 확인해 주세요.');
};

/* ════════════════════════════════════════
   보드 관리
════════════════════════════════════════ */

const loadBoards = async () => {
  const { data, error } = await supabaseClient
    .from('boards')
    .select('id, name, created_by, created_at')
    .order('created_at', { ascending: false });
  if (error) { console.error('보드 로드 실패:', error.message); return; }
  boards = data ?? [];
  renderBoards(boards);
  if (pendingBoardId) {
    const target = boards.find(b => b.id === pendingBoardId);
    if (target) { pendingBoardId = null; await selectBoard(target); }
  }
};

const createBoard = async (name) => {
  const { data, error } = await supabaseClient
    .from('boards')
    .insert({ name, created_by: currentUser.id })
    .select('id, name, created_by')
    .single();
  if (error) { console.error('보드 생성 실패:', error.message); return null; }
  return data;
};

const selectBoard = async (board) => {
  currentBoard = board;
  COLUMN_IDS.forEach(id => {
    document.querySelector(`#${id} .card-list`).innerHTML = '';
    updateCount(id);
  });
  await Promise.all([
    loadBoardTags(board.id),
    loadBoardMembers(board.id),
    loadCards(board.id),
  ]);
  subscribeToBoard(board.id);
  showKanbanView();
};

const renderBoards = (list) => {
  const listEl = document.getElementById('board-list');
  listEl.innerHTML = '';
  if (!list.length) {
    listEl.innerHTML = '<p class="board-empty">보드가 없습니다. 새 보드를 만들어보세요.</p>';
    return;
  }
  list.forEach(board => {
    const cardEl = document.createElement('div');
    cardEl.className = 'board-card';
    cardEl.setAttribute('role', 'listitem');
    cardEl.innerHTML = `<span class="board-card-name">${board.name}</span>`;
    cardEl.addEventListener('click', () => selectBoard(board));
    listEl.appendChild(cardEl);
  });
};

/* ════════════════════════════════════════
   멤버 / 초대
════════════════════════════════════════ */

const loadBoardMembers = async (boardId) => {
  const { data, error } = await supabaseClient
    .from('board_members')
    .select('id, user_id, email, role, joined_at')
    .eq('board_id', boardId);
  if (error) { console.error('멤버 로드 실패:', error.message); return; }
  boardMembers = data ?? [];
  renderOnlineMembers(boardMembers);
};

const inviteByEmail = async (email) => {
  const { data, error } = await supabaseClient
    .from('board_invites')
    .insert({ board_id: currentBoard.id, invited_by: currentUser.id, email })
    .select('token')
    .single();
  if (error) { console.error('초대 실패:', error.message); return null; }
  return buildInviteUrl(data.token);
};

const generateInviteLink = async () => {
  const { data, error } = await supabaseClient
    .from('board_invites')
    .insert({ board_id: currentBoard.id, invited_by: currentUser.id, email: null })
    .select('token')
    .single();
  if (error) { console.error('링크 생성 실패:', error.message); return null; }
  return buildInviteUrl(data.token);
};

const buildInviteUrl = (token) =>
  `${window.location.origin}${window.location.pathname}?invite=${token}`;

const acceptInvite = async (token) => {
  const { data, error } = await supabaseClient.rpc('accept_invite', { p_token: token });
  if (error) { console.error('초대 수락 실패:', error.message); return null; }
  return data;
};

const handleInviteTokenFromURL = async () => {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('invite');
  if (!token) return;
  window.history.replaceState({}, '', window.location.pathname);
  const boardId = await acceptInvite(token);
  if (boardId) pendingBoardId = boardId;
};

const renderMembersList = (members) => {
  const listEl = document.getElementById('members-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  members.forEach(m => {
    const li = document.createElement('li');
    li.className = 'member-item';
    li.innerHTML = `
      <div class="member-avatar-sm">${(m.email ?? '?')[0].toUpperCase()}</div>
      <span class="member-item-email">${m.email ?? '(알 수 없음)'}</span>
      <span class="member-item-role">${m.role === 'owner' ? '소유자' : '멤버'}</span>
    `;
    listEl.appendChild(li);
  });
};

const renderOnlineMembers = (members) => {
  const containerEl = document.getElementById('online-members');
  if (!containerEl) return;
  containerEl.innerHTML = '';
  members.slice(0, 5).forEach(m => {
    const avatar = document.createElement('div');
    avatar.className = 'member-avatar';
    avatar.title = m.email ?? 'Member';
    avatar.textContent = (m.email ?? '?')[0].toUpperCase();
    containerEl.appendChild(avatar);
  });
};

/* ════════════════════════════════════════
   Supabase CRUD
════════════════════════════════════════ */

const loadCards = async (boardId) => {
  const { data, error } = await supabaseClient
    .from('cards')
    .select('id, column_id, text, "order", due_date, priority, card_tags(tag_id, tags(id, name, color))')
    .eq('board_id', boardId)
    .order('"order"', { ascending: true });
  if (error) { console.error('카드 로드 실패:', error.message); return; }
  renderCards(data ?? []);
};

const insertCard = async (text, columnId, boardId, order) => {
  const { data, error } = await supabaseClient
    .from('cards')
    .insert({ board_id: boardId, created_by: currentUser.id, column_id: columnId, text, order })
    .select('id')
    .single();
  if (error) { console.error('카드 추가 실패:', error.message); return null; }
  return data;
};

const deleteCardFromDB = async (id) => {
  const { error } = await supabaseClient.from('cards').delete().eq('id', id);
  if (error) console.error('카드 삭제 실패:', error.message);
};

const updateCardColumn = async (id, newColumnId) => {
  const { error } = await supabaseClient
    .from('cards').update({ column_id: newColumnId }).eq('id', id);
  if (error) console.error('카드 이동 실패:', error.message);
};

const updateCardDetails = async (cardId, details) => {
  const { error } = await supabaseClient.from('cards').update(details).eq('id', cardId);
  if (error) { console.error('카드 수정 실패:', error.message); return false; }
  return true;
};

const renderCards = (cards) => {
  COLUMN_IDS.forEach(id => {
    document.querySelector(`#${id} .card-list`).innerHTML = '';
    updateCount(id);
  });
  cards.forEach(card => {
    const listEl = document.querySelector(`#${card.column_id} .card-list`);
    if (!listEl) return;
    listEl.appendChild(createCard(card));
    updateCount(card.column_id);
  });
};

/* ════════════════════════════════════════
   카드 DOM 생성
════════════════════════════════════════ */

const createCard = (card) => {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.draggable = true;
  cardEl.dataset.id = card.id;
  if (card.due_date)  cardEl.dataset.dueDate  = card.due_date;
  if (card.priority)  cardEl.dataset.priority  = card.priority;
  if (card.card_tags) cardEl.dataset.tagIds = JSON.stringify(card.card_tags.map(ct => ct.tag_id));
  cardEl.setAttribute('role', 'listitem');

  const textEl = document.createElement('span');
  textEl.className = 'card-text';
  textEl.textContent = card.text;

  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn-delete';
  btnDelete.setAttribute('aria-label', '카드 삭제');
  btnDelete.textContent = '×';
  btnDelete.addEventListener('click', (e) => { e.stopPropagation(); deleteCard(cardEl); });

  cardEl.appendChild(textEl);
  cardEl.appendChild(btnDelete);

  const metaEl = buildCardMeta(card);
  if (metaEl) cardEl.appendChild(metaEl);

  cardEl.addEventListener('dragstart', handleDragStart);
  cardEl.addEventListener('dragend', handleDragEnd);
  cardEl.addEventListener('click', () => openCardModal(card.id));

  return cardEl;
};

const buildCardMeta = (card) => {
  const tags = card.card_tags ?? [];
  if (!card.priority && !card.due_date && !tags.length) return null;

  const metaEl = document.createElement('div');
  metaEl.className = 'card-meta';

  if (card.priority) {
    const p = document.createElement('span');
    p.className = `card-priority card-priority--${card.priority}`;
    p.textContent = { low: '낮음', medium: '중간', high: '높음' }[card.priority];
    metaEl.appendChild(p);
  }

  if (card.due_date) {
    const d = document.createElement('span');
    const today = new Date().toISOString().slice(0, 10);
    d.className = 'card-due-date' + (card.due_date < today ? ' card-due-date--overdue' : '');
    d.textContent = '📅 ' + card.due_date;
    metaEl.appendChild(d);
  }

  tags.forEach(ct => {
    const tag = ct.tags;
    if (!tag) return;
    const t = document.createElement('span');
    t.className = 'card-tag';
    t.style.setProperty('--tag-color', tag.color);
    t.textContent = tag.name;
    metaEl.appendChild(t);
  });

  return metaEl;
};

const renderCardMeta = (cardEl, card) => {
  const existing = cardEl.querySelector('.card-meta');
  if (existing) existing.remove();
  const metaEl = buildCardMeta(card);
  if (metaEl) cardEl.appendChild(metaEl);
};

/* ════════════════════════════════════════
   카드 모달
════════════════════════════════════════ */

const openCardModal = async (cardId) => {
  editingCardId = cardId;
  const cardEl  = document.querySelector(`[data-id="${cardId}"]`);
  if (!cardEl) return;

  document.getElementById('modal-card-text').value     = cardEl.querySelector('.card-text').textContent;
  document.getElementById('modal-card-due').value      = cardEl.dataset.dueDate  ?? '';
  document.getElementById('modal-card-priority').value = cardEl.dataset.priority ?? '';

  const selectedIds = JSON.parse(cardEl.dataset.tagIds ?? '[]');
  renderTagSelector(boardTags, selectedIds);

  document.getElementById('card-modal').removeAttribute('hidden');
};

const closeCardModal = () => {
  editingCardId = null;
  document.getElementById('card-modal').setAttribute('hidden', '');
};

const saveCardDetails = async () => {
  if (!editingCardId) return;
  const details = {
    text:     document.getElementById('modal-card-text').value.trim(),
    due_date: document.getElementById('modal-card-due').value      || null,
    priority: document.getElementById('modal-card-priority').value || null,
  };
  if (!details.text) return;
  const ok = await updateCardDetails(editingCardId, details);
  if (!ok) return;

  const cardEl = document.querySelector(`[data-id="${editingCardId}"]`);
  if (cardEl) {
    cardEl.querySelector('.card-text').textContent = details.text;
    cardEl.dataset.dueDate  = details.due_date  ?? '';
    cardEl.dataset.priority = details.priority  ?? '';
    const tagIds  = JSON.parse(cardEl.dataset.tagIds ?? '[]');
    const tagObjs = boardTags.filter(t => tagIds.includes(t.id));
    renderCardMeta(cardEl, { ...details, card_tags: tagObjs.map(t => ({ tags: t })) });
  }
  logActivity('card_updated', editingCardId, { text: details.text });
  closeCardModal();
};

/* ════════════════════════════════════════
   태그 관리
════════════════════════════════════════ */

const loadBoardTags = async (boardId) => {
  const { data, error } = await supabaseClient
    .from('tags').select('id, name, color').eq('board_id', boardId);
  if (error) { console.error('태그 로드 실패:', error.message); return; }
  boardTags = data ?? [];
};

const createTag = async (name, color) => {
  const { data, error } = await supabaseClient
    .from('tags')
    .insert({ board_id: currentBoard.id, name, color })
    .select('id, name, color')
    .single();
  if (error) { console.error('태그 생성 실패:', error.message); return null; }
  boardTags.push(data);
  return data;
};

const renderTagSelector = (tags, selectedIds) => {
  const containerEl = document.getElementById('modal-tag-selector');
  if (!containerEl) return;
  containerEl.innerHTML = '';
  if (!tags.length) {
    containerEl.innerHTML = '<span class="tag-empty">태그 없음 — 아래에서 새 태그를 만드세요</span>';
    return;
  }
  tags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip' + (selectedIds.includes(tag.id) ? ' tag-chip--selected' : '');
    chip.textContent = tag.name;
    chip.style.setProperty('--tag-color', tag.color);
    chip.dataset.tagId = tag.id;
    chip.addEventListener('click', () => toggleTagOnCard(tag.id, chip));
    containerEl.appendChild(chip);
  });
};

const addTagToCard = async (cardId, tagId) => {
  const { error } = await supabaseClient.from('card_tags').insert({ card_id: cardId, tag_id: tagId });
  if (error && !error.message.includes('duplicate')) console.error('태그 추가 실패:', error.message);
};

const removeTagFromCard = async (cardId, tagId) => {
  const { error } = await supabaseClient
    .from('card_tags').delete().eq('card_id', cardId).eq('tag_id', tagId);
  if (error) console.error('태그 삭제 실패:', error.message);
};

const toggleTagOnCard = async (tagId, chipEl) => {
  if (!editingCardId) return;
  const isSelected = chipEl.classList.contains('tag-chip--selected');
  if (isSelected) {
    await removeTagFromCard(editingCardId, tagId);
    chipEl.classList.remove('tag-chip--selected');
  } else {
    await addTagToCard(editingCardId, tagId);
    chipEl.classList.add('tag-chip--selected');
  }
  const cardEl = document.querySelector(`[data-id="${editingCardId}"]`);
  if (!cardEl) return;
  const selectedIds = Array.from(document.querySelectorAll('#modal-tag-selector .tag-chip--selected'))
    .map(el => el.dataset.tagId);
  cardEl.dataset.tagIds = JSON.stringify(selectedIds);
  const tagObjs = boardTags.filter(t => selectedIds.includes(t.id));
  const priority = cardEl.dataset.priority || null;
  const dueDate  = cardEl.dataset.dueDate  || null;
  renderCardMeta(cardEl, { priority, due_date: dueDate, card_tags: tagObjs.map(t => ({ tags: t })) });
};

/* ════════════════════════════════════════
   활동 로그
════════════════════════════════════════ */

const logActivity = async (action, cardId, details) => {
  if (!currentBoard) return;
  await supabaseClient.from('activity_logs').insert({
    board_id: currentBoard.id,
    user_id:  currentUser.id,
    card_id:  cardId ?? null,
    action,
    details,
  });
};

const loadActivityLog = async () => {
  const { data, error } = await supabaseClient
    .from('activity_logs')
    .select('id, action, details, created_at, user_id')
    .eq('board_id', currentBoard.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('활동 로그 로드 실패:', error.message); return; }
  renderActivityLog(data ?? []);
};

const renderActivityLog = (logs) => {
  const listEl = document.getElementById('activity-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  logs.forEach(log => {
    const li = document.createElement('li');
    li.className = 'activity-item';
    li.innerHTML = `
      <span class="activity-action">${formatAction(log.action, log.details)}</span>
      <time class="activity-time" datetime="${log.created_at}">${formatRelativeTime(log.created_at)}</time>
    `;
    listEl.appendChild(li);
  });
};

const toggleActivityLog = () => {
  const asideEl = document.getElementById('activity-log');
  const isOpen  = asideEl.classList.contains('activity-log--open');
  if (isOpen) {
    asideEl.classList.remove('activity-log--open');
  } else {
    loadActivityLog();
    asideEl.classList.add('activity-log--open');
  }
};

const formatAction = (action, details = {}) => {
  const text = details.text ? `"${details.text}"` : '';
  const map = {
    card_added:   `카드 추가: ${text}`,
    card_moved:   `카드 이동: ${details.from ?? ''} → ${details.to ?? ''}`,
    card_deleted: `카드 삭제: ${text}`,
    card_updated: `카드 수정: ${text}`,
    member_joined:`새 멤버 참여`,
  };
  return map[action] ?? action;
};

const formatRelativeTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return '방금 전';
  if (mins < 60)  return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

/* ════════════════════════════════════════
   실시간
════════════════════════════════════════ */

const subscribeToBoard = (boardId) => {
  unsubscribeRealtime();
  realtimeChannel = supabaseClient
    .channel(`board:${boardId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` }, handleRealtimeCardChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `board_id=eq.${boardId}` }, handleRealtimeActivityChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'board_members', filter: `board_id=eq.${boardId}` }, handleRealtimeMemberChange)
    .subscribe();
};

const unsubscribeRealtime = () => {
  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

const handleRealtimeCardChange = (payload) => {
  const { eventType, new: newCard, old: oldCard } = payload;

  if (eventType === 'INSERT') {
    if (document.querySelector(`[data-id="${newCard.id}"]`)) return;
    const listEl = document.querySelector(`#${newCard.column_id} .card-list`);
    if (!listEl) return;
    listEl.appendChild(createCard(newCard));
    updateCount(newCard.column_id);
  }

  if (eventType === 'UPDATE') {
    const cardEl = document.querySelector(`[data-id="${newCard.id}"]`);
    if (!cardEl) return;
    const oldColId = cardEl.closest('.column')?.id;
    if (oldColId && oldColId !== newCard.column_id) {
      const newListEl = document.querySelector(`#${newCard.column_id} .card-list`);
      if (newListEl) { newListEl.appendChild(cardEl); updateCount(oldColId); updateCount(newCard.column_id); }
    }
    cardEl.querySelector('.card-text').textContent = newCard.text;
    cardEl.dataset.dueDate  = newCard.due_date  ?? '';
    cardEl.dataset.priority = newCard.priority  ?? '';
    renderCardMeta(cardEl, newCard);
  }

  if (eventType === 'DELETE') {
    const cardEl = document.querySelector(`[data-id="${oldCard.id}"]`);
    if (!cardEl) return;
    const columnEl = cardEl.closest('.column');
    cardEl.remove();
    if (columnEl) updateCount(columnEl.id);
  }
};

const handleRealtimeActivityChange = (payload) => {
  const asideEl = document.getElementById('activity-log');
  if (!asideEl.classList.contains('activity-log--open')) return;
  const listEl = document.getElementById('activity-list');
  const log = payload.new;
  const li = document.createElement('li');
  li.className = 'activity-item';
  li.innerHTML = `
    <span class="activity-action">${formatAction(log.action, log.details)}</span>
    <time class="activity-time" datetime="${log.created_at}">방금 전</time>
  `;
  listEl.insertBefore(li, listEl.firstChild);
};

const handleRealtimeMemberChange = (payload) => {
  if (!boardMembers.find(m => m.user_id === payload.new.user_id)) {
    boardMembers.push(payload.new);
    renderOnlineMembers(boardMembers);
  }
};

/* ════════════════════════════════════════
   카드 추가 / 삭제
════════════════════════════════════════ */

const addCard = async (columnId) => {
  if (!currentBoard) return;
  const columnEl = document.getElementById(columnId);
  const inputEl  = columnEl.querySelector('.card-input');
  const text     = inputEl.value.trim();
  if (!text) { inputEl.focus(); return; }

  const order  = columnEl.querySelectorAll('.card').length;
  const result = await insertCard(text, columnId, currentBoard.id, order);
  if (!result) return;

  const card = { id: result.id, text, column_id: columnId, due_date: null, priority: null, card_tags: [] };
  columnEl.querySelector('.card-list').appendChild(createCard(card));
  inputEl.value = '';
  inputEl.focus();
  updateCount(columnId);
  logActivity('card_added', result.id, { text, column_id: columnId });
};

const deleteCard = async (cardEl) => {
  const columnEl = cardEl.closest('.column');
  const cardId   = cardEl.dataset.id;
  const text     = cardEl.querySelector('.card-text')?.textContent ?? '';
  await deleteCardFromDB(cardId);
  cardEl.remove();
  if (columnEl) updateCount(columnEl.id);
  logActivity('card_deleted', null, { text });
};

/* ════════════════════════════════════════
   카드 수 뱃지
════════════════════════════════════════ */

const updateCount = (columnId) => {
  const columnEl = document.getElementById(columnId);
  const count    = columnEl.querySelectorAll('.card').length;
  columnEl.querySelector('.column-count').textContent = count;
};

/* ════════════════════════════════════════
   드래그 핸들러
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
  document.querySelectorAll('.column.drag-over').forEach(col => col.classList.remove('drag-over'));
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const columnEl = e.currentTarget;
  if (!columnEl.classList.contains('drag-over')) columnEl.classList.add('drag-over');
};

const handleDragLeave = (e) => {
  const columnEl = e.currentTarget;
  if (!columnEl.contains(e.relatedTarget)) columnEl.classList.remove('drag-over');
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
    logActivity('card_moved', cardId, {
      text: cardEl.querySelector('.card-text')?.textContent ?? '',
      from: originColumnEl.id,
      to:   newColumnId,
    });
    updateCount(originColumnEl.id);
  }
  columnEl.querySelector('.card-list').appendChild(cardEl);
  updateCount(newColumnId);
};

/* ════════════════════════════════════════
   공유 모달
════════════════════════════════════════ */

const openShareModal = async () => {
  renderMembersList(boardMembers);
  const url = await generateInviteLink();
  const linkInput = document.getElementById('invite-link-display');
  if (linkInput) linkInput.value = url ?? '';
  document.getElementById('share-modal').removeAttribute('hidden');
};

const closeShareModal = () => {
  document.getElementById('share-modal').setAttribute('hidden', '');
};

const handleInviteEmail = async () => {
  const emailInput = document.getElementById('input-invite-email');
  const email = emailInput?.value.trim();
  if (!email) return;
  const url = await inviteByEmail(email);
  if (url) {
    emailInput.value = '';
    alert(`초대 링크: ${url}\n(실제 서비스에서는 이메일로 발송됩니다)`);
  }
};

const handleCopyLink = async () => {
  const linkInput = document.getElementById('invite-link-display');
  if (!linkInput?.value) return;
  await navigator.clipboard.writeText(linkInput.value);
  const btn = document.getElementById('btn-copy-link');
  btn.textContent = '복사됨!';
  setTimeout(() => { btn.textContent = '복사'; }, 2000);
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

  /* 보드 관련 */
  document.getElementById('btn-back-to-boards').addEventListener('click', showBoardSelector);
  document.getElementById('btn-share').addEventListener('click', openShareModal);
  document.getElementById('btn-activity-log').addEventListener('click', toggleActivityLog);
  document.getElementById('btn-close-activity').addEventListener('click', toggleActivityLog);

  /* 보드 생성 */
  document.getElementById('btn-create-board').addEventListener('click', () => {
    document.getElementById('create-board-modal').removeAttribute('hidden');
    document.getElementById('input-board-name').focus();
  });
  document.getElementById('btn-cancel-create-board').addEventListener('click', () => {
    document.getElementById('create-board-modal').setAttribute('hidden', '');
  });
  document.getElementById('btn-confirm-create-board').addEventListener('click', async () => {
    const name = document.getElementById('input-board-name').value.trim();
    if (!name) return;
    const board = await createBoard(name);
    if (!board) return;
    document.getElementById('input-board-name').value = '';
    document.getElementById('create-board-modal').setAttribute('hidden', '');
    await loadBoards();
    await selectBoard(board);
  });

  /* 카드 모달 */
  document.getElementById('btn-save-card').addEventListener('click', saveCardDetails);
  document.getElementById('btn-close-card-modal').addEventListener('click', closeCardModal);
  document.getElementById('btn-close-card-modal-footer').addEventListener('click', closeCardModal);
  document.getElementById('card-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('card-modal')) closeCardModal();
  });

  /* 태그 생성 */
  document.getElementById('btn-create-tag').addEventListener('click', async () => {
    const name  = document.getElementById('input-new-tag-name').value.trim();
    const color = document.getElementById('input-new-tag-color').value;
    if (!name) return;
    const tag = await createTag(name, color);
    if (tag) {
      document.getElementById('input-new-tag-name').value = '';
      const selectedIds = Array.from(document.querySelectorAll('#modal-tag-selector .tag-chip--selected'))
        .map(el => el.dataset.tagId);
      renderTagSelector(boardTags, selectedIds);
    }
  });

  /* 공유 모달 */
  document.getElementById('btn-close-share').addEventListener('click', closeShareModal);
  document.getElementById('btn-copy-link').addEventListener('click', handleCopyLink);
  document.getElementById('btn-invite-email').addEventListener('click', handleInviteEmail);
  document.getElementById('share-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('share-modal')) closeShareModal();
  });
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
