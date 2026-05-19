// ─── Game constants ───────────────────────────────────────────────────────────
const COLS = 10, ROWS = 20, BLOCK = 30;
const API_BASE = 'http://localhost:8000';

const COLORS = [
  null,
  '#00d4ff', // I
  '#f7d800', // O
  '#a855f7', // T
  '#22c55e', // S
  '#ef4444', // Z
  '#3b82f6', // J
  '#f97316', // L
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  [[2,2],[2,2]],
  [[0,3,0],[3,3,3],[0,0,0]],
  [[0,4,4],[4,4,0],[0,0,0]],
  [[5,5,0],[0,5,5],[0,0,0]],
  [[6,0,0],[6,6,6],[0,0,0]],
  [[0,0,7],[7,7,7],[0,0,0]],
];

const SCORE_TABLE = [0, 100, 300, 500, 800];

// ─── Auth / session state ─────────────────────────────────────────────────────
let authToken  = localStorage.getItem('tetris_token');
let username   = localStorage.getItem('tetris_nickname') || null;
let myBest     = 0;
let globalBestScore  = 0;
let globalBestPlayer = null;

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  Object.assign(headers, opts.headers || {});
  const res = await fetch(API_BASE + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || '서버 오류가 발생했습니다.');
  return data;
}

async function apiRegister(email, password, nickname) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname }),
  });
}

async function apiLogin(email, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function apiRecordGame(score, level, lines) {
  return apiFetch('/api/game/record', {
    method: 'POST',
    body: JSON.stringify({ score, level, lines }),
  });
}

async function apiFetchGlobalBest() {
  return apiFetch('/api/game/global-best');
}

async function apiFetchMyBest() {
  return apiFetch('/api/game/my-best');
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const authScreen       = document.getElementById('auth-screen');
const startScreen      = document.getElementById('start-screen');
const gameScreen       = document.getElementById('game-screen');

const loginEmailEl     = document.getElementById('login-email');
const loginPasswordEl  = document.getElementById('login-password');
const loginBtn         = document.getElementById('login-btn');
const loginError       = document.getElementById('login-error');

const regEmailEl       = document.getElementById('reg-email');
const regNicknameEl    = document.getElementById('reg-nickname');
const regPasswordEl    = document.getElementById('reg-password');
const registerBtn      = document.getElementById('register-btn');
const registerError    = document.getElementById('register-error');

const loginForm        = document.getElementById('login-form');
const registerForm     = document.getElementById('register-form');

const welcomeMsg       = document.getElementById('welcome-msg');
const globalBestBanner = document.getElementById('global-best-banner');
const bestPreview      = document.getElementById('best-preview');
const startBtn         = document.getElementById('start-btn');
const logoutBtn        = document.getElementById('logout-btn');

const playerName       = document.getElementById('player-name');
const scoreEl          = document.getElementById('score-value');
const levelEl          = document.getElementById('level-value');
const bestEl           = document.getElementById('best-value');
const globalBestEl     = document.getElementById('global-best-value');
const globalBestPlayerEl = document.getElementById('global-best-player');
const pauseBtn         = document.getElementById('pause-btn');
const muteBtn          = document.getElementById('mute-btn');

const overlay          = document.getElementById('overlay');
const overlayTitle     = document.getElementById('overlay-title');
const overlayScore     = document.getElementById('overlay-score');
const overlaySub       = document.getElementById('overlay-sub');
const overlayBest      = document.getElementById('overlay-best');
const overlayGlobal    = document.getElementById('overlay-global');
const overlayBtn       = document.getElementById('overlay-btn');

const boardCanvas      = document.getElementById('board');
const ctx              = boardCanvas.getContext('2d');
const nextCanvas       = document.getElementById('next-canvas');
const nctx             = nextCanvas.getContext('2d');

// ─── Screen transitions ───────────────────────────────────────────────────────
function showAuth() {
  authScreen.classList.remove('hidden');
  startScreen.classList.add('hidden');
  gameScreen.style.display = 'none';
  overlay.classList.remove('show');
}

async function showStart() {
  authScreen.classList.add('hidden');
  gameScreen.style.display = 'none';
  overlay.classList.remove('show');

  welcomeMsg.textContent = username + '님, 환영합니다!';
  bestPreview.textContent = myBest > 0 ? '내 최고 점수: ' + myBest.toLocaleString() + '점' : '';

  try {
    const gb = await apiFetchGlobalBest();
    globalBestScore  = gb.score;
    globalBestPlayer = gb.nickname;
    updateGlobalBestDisplay();
    if (gb.score > 0) {
      globalBestBanner.textContent =
        '전체 최고 점수: ' + gb.score.toLocaleString() + '점 — ' + (gb.nickname || '?');
    } else {
      globalBestBanner.textContent = '아직 기록이 없습니다. 첫 주인공이 되어보세요!';
    }
  } catch (_) {
    globalBestBanner.textContent = '서버에 연결할 수 없습니다.';
  }

  startScreen.classList.remove('hidden');
}

// ─── Global best 패널 업데이트 ────────────────────────────────────────────────
function updateGlobalBestDisplay() {
  globalBestEl.textContent = globalBestScore > 0 ? globalBestScore.toLocaleString() : '—';
  globalBestPlayerEl.textContent = globalBestPlayer || '';
}

// ─── Auth tab 전환 ───────────────────────────────────────────────────────────
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    loginForm.classList.toggle('hidden', target !== 'login');
    registerForm.classList.toggle('hidden', target !== 'register');
    loginError.textContent = '';
    registerError.textContent = '';
  });
});

// ─── 로그인 ──────────────────────────────────────────────────────────────────
async function handleLogin() {
  const email    = loginEmailEl.value.trim();
  const password = loginPasswordEl.value;
  loginError.textContent = '';

  if (!email || !password) {
    loginError.textContent = '이메일과 비밀번호를 입력하세요.';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = '로그인 중…';
  try {
    const data = await apiLogin(email, password);
    authToken = data.access_token;
    username  = data.nickname;
    localStorage.setItem('tetris_token',    authToken);
    localStorage.setItem('tetris_nickname', username);

    const mb = await apiFetchMyBest();
    myBest = mb.score;

    await showStart();
  } catch (e) {
    loginError.textContent = e.message;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '로그인';
  }
}

loginBtn.addEventListener('click', handleLogin);
loginEmailEl.addEventListener('keydown', e => { if (e.key === 'Enter') loginPasswordEl.focus(); });
loginPasswordEl.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

// ─── 회원가입 ────────────────────────────────────────────────────────────────
async function handleRegister() {
  const email    = regEmailEl.value.trim();
  const nickname = regNicknameEl.value.trim();
  const password = regPasswordEl.value;
  registerError.textContent = '';

  if (!email || !nickname || !password) {
    registerError.textContent = '모든 항목을 입력하세요.';
    return;
  }

  registerBtn.disabled = true;
  registerBtn.textContent = '처리 중…';
  try {
    await apiRegister(email, password, nickname);
    // 가입 성공 → 자동 로그인
    const data = await apiLogin(email, password);
    authToken = data.access_token;
    username  = data.nickname;
    localStorage.setItem('tetris_token',    authToken);
    localStorage.setItem('tetris_nickname', username);
    myBest = 0;
    await showStart();
  } catch (e) {
    registerError.textContent = e.message;
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = '회원가입';
  }
}

registerBtn.addEventListener('click', handleRegister);
regPasswordEl.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });

// ─── 로그아웃 ────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', () => {
  authToken = null;
  username  = null;
  myBest    = 0;
  localStorage.removeItem('tetris_token');
  localStorage.removeItem('tetris_nickname');
  loginEmailEl.value    = '';
  loginPasswordEl.value = '';
  showAuth();
});

// ─── 게임 시작 버튼 ──────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  gameScreen.style.display = 'flex';
  playerName.textContent = username;
  bestEl.textContent     = myBest > 0 ? myBest.toLocaleString() : '—';
  updateGlobalBestDisplay();
  startGame();
});

// ─── 게임 로직 ───────────────────────────────────────────────────────────────
let board, score, level, lines, piece, next, pos, paused, gameOver, loopId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randPiece() {
  const idx = Math.floor(Math.random() * 7) + 1;
  return { shape: PIECES[idx].map(r => [...r]), color: idx };
}

function rotate(shape) {
  const n = shape.length, m = shape[0].length;
  const result = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let r = 0; r < n; r++)
    for (let c = 0; c < m; c++)
      result[c][n - 1 - r] = shape[r][c];
  return result;
}

function collides(b, p, px, py) {
  for (let r = 0; r < p.length; r++)
    for (let c = 0; c < p[r].length; c++)
      if (p[r][c]) {
        const nx = px + c, ny = py + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && b[ny][nx]) return true;
      }
  return false;
}

function merge(b, p, px, py, color) {
  for (let r = 0; r < p.length; r++)
    for (let c = 0; c < p[r].length; c++)
      if (p[r][c] && py + r >= 0)
        b[py + r][px + c] = color;
}

function clearLines(b) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r].every(v => v !== 0)) {
      b.splice(r, 1);
      b.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

function spawnPiece() {
  piece = next;
  next  = randPiece();
  pos   = { x: Math.floor((COLS - piece.shape[0].length) / 2), y: -1 };
  if (collides(board, piece.shape, pos.x, pos.y)) endGame();
}

function drop() {
  if (paused || gameOver) return;
  pos.y++;
  if (collides(board, piece.shape, pos.x, pos.y)) {
    pos.y--;
    merge(board, piece.shape, pos.x, pos.y, piece.color);
    const cleared = clearLines(board);
    if (cleared > 0) {
      score += SCORE_TABLE[cleared] * level;
      lines += cleared;
      level  = Math.floor(lines / 10) + 1;
      scoreEl.textContent = score.toLocaleString();
      levelEl.textContent = level;
    }
    spawnPiece();
  }
  draw();
}

function hardDrop() {
  while (!collides(board, piece.shape, pos.x, pos.y + 1)) pos.y++;
  drop();
}

function moveLeft()  { if (!collides(board, piece.shape, pos.x - 1, pos.y)) pos.x--; draw(); }
function moveRight() { if (!collides(board, piece.shape, pos.x + 1, pos.y)) pos.x++; draw(); }

function rotatePiece() {
  const r = rotate(piece.shape);
  if (!collides(board, r, pos.x, pos.y)) piece.shape = r;
  draw();
}

function ghostY() {
  let gy = pos.y;
  while (!collides(board, piece.shape, pos.x, gy + 1)) gy++;
  return gy;
}

function drawBlock(context, x, y, colorIdx, alpha = 1) {
  if (colorIdx === 0) return;
  context.globalAlpha = alpha;
  context.fillStyle = COLORS[colorIdx];
  context.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 6);
  context.globalAlpha = 1;
}

function draw() {
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      ctx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c]);

  const gy = ghostY();
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        drawBlock(ctx, pos.x + c, gy + r, piece.color, 0.2);

  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        drawBlock(ctx, pos.x + c, pos.y + r, piece.color);

  drawNext();
}

function drawNext() {
  nctx.fillStyle = '#1e1e2e';
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const ns   = next.shape;
  const offX = Math.floor((4 - ns[0].length) / 2);
  const offY = Math.floor((4 - ns.length) / 2);
  const nb   = 28;

  for (let r = 0; r < ns.length; r++)
    for (let c = 0; c < ns[r].length; c++)
      if (ns[r][c]) {
        const x = (offX + c) * nb + 4;
        const y = (offY + r) * nb + 4;
        nctx.fillStyle = COLORS[ns[r][c]];
        nctx.fillRect(x + 1, y + 1, nb - 2, nb - 2);
        nctx.fillStyle = 'rgba(255,255,255,0.15)';
        nctx.fillRect(x + 1, y + 1, nb - 2, 5);
      }
}

function getSpeed() {
  return Math.max(100, 800 - (level - 1) * 70);
}

function loop() {
  drop();
  loopId = setTimeout(loop, getSpeed());
}

function startGame() {
  board    = createBoard();
  score    = 0;
  level    = 1;
  lines    = 0;
  paused   = false;
  gameOver = false;
  scoreEl.textContent = '0';
  levelEl.textContent = '1';
  next = randPiece();
  spawnPiece();
  clearTimeout(loopId);
  loopId = setTimeout(loop, getSpeed());
  AudioEngine.play();
  draw();
}

async function endGame() {
  gameOver = true;
  clearTimeout(loopId);
  AudioEngine.stop();

  overlayTitle.textContent  = 'GAME OVER';
  overlayScore.textContent  = score.toLocaleString() + '점';
  overlaySub.textContent    = username + '님의 최종 점수입니다';
  overlayBest.textContent   = '점수 저장 중…';
  overlayBest.className     = 'overlay-best';
  overlayGlobal.textContent = '';
  overlayBtn.textContent    = '다시 시작';
  overlay.classList.add('show');

  try {
    const result = await apiRecordGame(score, level, lines);

    myBest = result.personal_best;
    bestEl.textContent = myBest > 0 ? myBest.toLocaleString() : '—';

    if (result.is_personal_best && score > 0) {
      overlayBest.textContent = '🏆 개인 신기록!';
      overlayBest.className   = 'overlay-best new-record';
    } else {
      overlayBest.textContent = '내 최고 점수: ' + myBest.toLocaleString() + '점';
      overlayBest.className   = 'overlay-best';
    }

    globalBestScore  = result.global_best;
    globalBestPlayer = result.global_best_nickname;
    updateGlobalBestDisplay();

    if (globalBestScore > 0) {
      const isGlobalChamp = score >= globalBestScore;
      overlayGlobal.textContent = isGlobalChamp
        ? '전체 1위!'
        : '전체 최고: ' + globalBestScore.toLocaleString() + '점 (' + (globalBestPlayer || '?') + ')';
      overlayGlobal.className = 'overlay-global' + (isGlobalChamp ? ' global-champ' : '');
    }
  } catch (e) {
    overlayBest.textContent = '점수 저장 실패 (' + e.message + ')';
    overlayBest.className   = 'overlay-best';
  }
}

// ─── Pause ────────────────────────────────────────────────────────────────────
function togglePause() {
  if (gameOver) return;
  paused = !paused;
  pauseBtn.textContent = paused ? '계속하기 (P)' : '일시정지 (P)';
  if (paused) {
    clearTimeout(loopId);
    overlayTitle.textContent  = 'PAUSE';
    overlayScore.textContent  = '';
    overlaySub.textContent    = 'P 키를 눌러 계속하세요';
    overlayBest.textContent   = '';
    overlayGlobal.textContent = '';
    overlayBtn.textContent    = '계속하기';
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
    loopId = setTimeout(loop, getSpeed());
  }
}

function toggleMute() {
  AudioEngine.setMute(!AudioEngine.isMuted());
  muteBtn.textContent = AudioEngine.isMuted() ? '🔇 음소거 해제 (M)' : '🔊 음소거 (M)';
}

pauseBtn.addEventListener('click', togglePause);
muteBtn.addEventListener('click', toggleMute);

overlayBtn.addEventListener('click', () => {
  overlay.classList.remove('show');
  if (gameOver) {
    startGame();
  } else {
    togglePause();
  }
});

document.addEventListener('keydown', e => {
  if (gameScreen.style.display === 'none') return;
  if (paused && e.key !== 'p' && e.key !== 'P') return;
  switch (e.key) {
    case 'ArrowLeft':         e.preventDefault(); moveLeft();    break;
    case 'ArrowRight':        e.preventDefault(); moveRight();   break;
    case 'ArrowDown':         e.preventDefault(); drop();        break;
    case 'ArrowUp':
    case 'z': case 'Z':       e.preventDefault(); rotatePiece(); break;
    case ' ':                 e.preventDefault(); hardDrop();    break;
    case 'p': case 'P':       togglePause(); break;
    case 'm': case 'M':       toggleMute();  break;
  }
});

// ─── 초기화: 저장된 토큰이 있으면 자동 로그인 시도 ───────────────────────────
(async () => {
  if (authToken && username) {
    try {
      const mb = await apiFetchMyBest();
      myBest   = mb.score;
      username = mb.nickname || username;
      localStorage.setItem('tetris_nickname', username);
      await showStart();
    } catch (_) {
      // 토큰 만료 등 → 로그인 화면으로
      localStorage.removeItem('tetris_token');
      localStorage.removeItem('tetris_nickname');
      authToken = null;
      username  = null;
      showAuth();
    }
  } else {
    showAuth();
  }
})();
