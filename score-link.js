// ─────────────────────────────────────────────
// 점수 연동 (세 게임 공통) — cipher, key, ox 세 게임이 이 파일 하나를 함께 씁니다.
// 기기 3대에서 따로 접속해도 참가자(이름 + 숫자 4자리)별로
// Google 스프레드시트에 점수가 저장되고 이어집니다.
// ─────────────────────────────────────────────
(function(){
'use strict';

// ★ 관리자 설정 ① : Apps Script 웹 앱 주소를 따옴표 안에 붙여 넣으세요. (README.md 참고)
var API_URL = window.SCORE_API_URL || 'https://script.google.com/macros/s/AKfycbxMFw_v1CJVf6e4vlmUZG72A0bURUsCvtuaMS20U26bLWSRPIfE2JyKpaYv2KZ9r8PA/exec';

// ★ 관리자 설정 ② : 연동 점수 배점 (총 1000점). 바꾸면 apps-script/Code.gs 의 max 도 같이 바꾸세요.
//  rawMax = 게임 안에서 나오는 최고 점수, max = 연동 점수 만점
var GAMES = {
  cipher: {name:'암호 풀기', rawMax:500, max:500},  // 문제당 100점, 힌트 사용 시 20점 감점
  key:    {name:'열쇠 미션', rawMax:200, max:200},  // 상·중·하 중 아무 단계나 하나 깨면 200점
  ox:     {name:'OX 퀴즈',   rawMax:300, max:300}   // 맞힌 문제당 100점
};

// ★ 관리자 설정 ③ : 이 시간(분) 동안 아무 조작이 없으면 자동으로 다음 참가자 화면으로 돌아갑니다. 0이면 끄기
var IDLE_MINUTES = 10;

var TOTAL_MAX = 0, ORDER = [];
for (var k in GAMES) { TOTAL_MAX += GAMES[k].max; ORDER.push(k); }
var K_PLAYER = 'sl_player_v2', K_QUEUE = 'sl_queue_v2', K_CACHE = 'sl_cache_v2';

function store(key, value){
  try {
    if (value === undefined) { var s = localStorage.getItem(key); return s ? JSON.parse(s) : null; }
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value));
  } catch(e) { return null; }
}
function online(){ return /^https?:\/\//.test(API_URL); }
function cleanName(s){ return String(s || '').trim().replace(/\s+/g, ' ').slice(0, 20); }
function idOf(name, pin){ return cleanName(name).replace(/\s+/g, '') + '#' + pin; }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function player(){ return store(K_PLAYER); }
function cacheOf(id){ var all = store(K_CACHE) || {}; return all[id] || {scores:{}}; }
function totalOf(scores){ var t = 0; ORDER.forEach(function(g){ if (typeof scores[g] === 'number') t += scores[g]; }); return t; }
// 서버(스프레드시트)를 기준으로 이 기기의 기록을 맞춥니다.
// 시트에서 줄을 지우면 게임 화면에서도 초기화됩니다. (아직 못 보낸 점수만 더해서 보여 줌)
function setFromServer(id, scores){
  var all = store(K_CACHE) || {}, c = {scores:{}};
  ORDER.forEach(function(g){ if (scores && typeof scores[g] === 'number') c.scores[g] = scores[g]; });
  all[id] = c; store(K_CACHE, all);
  var pend = {};
  (store(K_QUEUE) || []).forEach(function(x){ if (idOf(x.name, x.pin) === id && !(pend[x.game] >= x.score)) pend[x.game] = x.score; });
  return mergeCache(id, pend);
}
// 이 기기의 기록에 게임별로 높은 점수를 남깁니다.
function mergeCache(id, scores){
  var all = store(K_CACHE) || {}, c = all[id] || {scores:{}};
  ORDER.forEach(function(g){
    var v = scores && scores[g];
    if (typeof v === 'number' && !(c.scores[g] >= v)) c.scores[g] = v;
  });
  all[id] = c; store(K_CACHE, all); return c;
}

// ── 서버 통신 (Content-Type 을 지정하지 않아야 Apps Script 와 CORS 문제가 없습니다) ──
function apiGet(params){
  var q = Object.keys(params).map(function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  return fetch(API_URL + (API_URL.indexOf('?') < 0 ? '?' : '&') + q, {cache:'no-store'}).then(function(r){ return r.json(); });
}
function apiPost(body){
  return fetch(API_URL, {method:'POST', body:JSON.stringify(body)}).then(function(r){ return r.json(); });
}

// 인터넷이 끊겨도 점수는 이 기기에 보관했다가 연결되면 자동으로 보냅니다.
var flushing = false, lastError = '';
function flush(){
  if (flushing || !online()) { draw(); return; }
  var q = store(K_QUEUE) || [];
  if (!q.length) { draw(); return; }
  flushing = true; var item = q[0];
  apiPost(item).then(function(res){
    flushing = false; lastError = '';
    store(K_QUEUE, (store(K_QUEUE) || []).filter(function(x){ return x.rid !== item.rid; }));
    if (res && res.ok && res.player) setFromServer(res.player.id, res.player.scores);
    else if (res && res.error) lastError = '서버가 기록을 거절했어요: ' + res.error;
    draw(); flush();
  }).catch(function(){ flushing = false; lastError = '서버에 연결할 수 없어요. 자동으로 다시 보냅니다.'; draw(); });
}
setInterval(flush, 15000);
window.addEventListener('online', flush);

// ── 게임이 끝날 때 각 게임에서 호출합니다 ──
function record(game, raw){
  var g = GAMES[game], p = player();
  if (!g) return;
  if (!p) { toast('참가자 등록이 되어 있지 않아 점수를 저장하지 못했어요.', 'bad'); return; }
  raw = Number(raw) || 0;
  var score = Math.max(0, Math.min(g.max, Math.round(raw * g.max / g.rawMax)));
  var before = cacheOf(p.id).scores[game];
  var upd = {}; upd[game] = score; var c = mergeCache(p.id, upd);
  var q = store(K_QUEUE) || [];
  q.push({action:'record', rid:Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          name:p.name, pin:p.pin, game:game, raw:raw, score:score, at:new Date().toISOString()});
  store(K_QUEUE, q);
  var best = typeof before === 'number' && before >= score;
  toast(esc(p.name) + '님 · ' + g.name + ' <b>' + score + '점</b>' + (best ? ' (기존 최고 ' + before + '점 유지)' : ' 저장') +
        '<br>현재 총점 <b>' + totalOf(c.scores) + ' / ' + TOTAL_MAX + '</b>', 'good');
  flush();
}

// ── 화면: 참가자 등록 창 + 오른쪽 아래 점수 배지 + 알림 ──
var overlay, badge, panel, toastEl, toastTimer;
function draw(){
  if (!badge) return;
  var p = player();
  badge.hidden = !p;
  if (!p) return;
  var c = cacheOf(p.id), pending = (store(K_QUEUE) || []).length;
  badge.querySelector('.sl-who').textContent = p.name;
  badge.querySelector('.sl-total').textContent = totalOf(c.scores) + ' / ' + TOTAL_MAX;
  badge.querySelector('.sl-wait').hidden = !pending;
  badge.querySelector('.sl-wait').textContent = '⏳' + pending;
  panel.querySelector('.sl-rows').innerHTML = ORDER.map(function(k){
    var v = c.scores[k];
    return '<div class="sl-row"><span>' + GAMES[k].name + '</span><b>' + (typeof v === 'number' ? v : '-') + ' / ' + GAMES[k].max + '</b></div>';
  }).join('');
  panel.querySelector('.sl-state').textContent = !online() ? '⚠ 서버 주소 미설정 · 이 기기에만 저장 중'
    : pending ? '전송 대기 ' + pending + '건 · ' + (lastError || '보내는 중…') : '✓ 서버에 저장됨';
}
function toast(html, kind){
  if (!toastEl) return;
  toastEl.innerHTML = html; toastEl.className = 'sl-toast ' + (kind || ''); toastEl.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.hidden = true; }, 6000);
}
function showLogin(){ overlay.hidden = false; setTimeout(function(){ overlay.querySelector('[name=name]').focus(); }, 50); }
function logout(ask){
  if (ask && !confirm('다음 참가자로 바꿀까요?\n지금 참가자의 점수는 이미 저장되어 있어요.')) return;
  store(K_PLAYER, null); location.reload();
}
// 서버에서 이 참가자의 기록을 가져옵니다. 실패하면 최대 3번까지 다시 시도합니다.
function fetchPlayer(p, tries){
  return apiGet({action:'get', name:p.name, pin:p.pin}).then(function(res){
    if (!res || res.ok === false) throw new Error(res && res.error || '응답 오류');
    return setFromServer(p.id, res.player ? res.player.scores : {});
  }).catch(function(err){
    if (tries > 1) return new Promise(function(r){ setTimeout(r, 1500); }).then(function(){ return fetchPlayer(p, tries - 1); });
    throw err;
  });
}
function login(name, pin){
  var p = {id:idOf(name, pin), name:cleanName(name), pin:pin};
  store(K_PLAYER, p); draw();
  if (!online()) { overlay.hidden = true; toast(esc(p.name) + '님 환영합니다! (서버 주소가 없어 이 기기에만 저장돼요)', 'bad'); return; }
  // 기록을 다 불러올 때까지 등록 창을 닫지 않습니다. (불러오기 전에 0점으로 보이는 것 방지)
  var btn = overlay.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '기록 불러오는 중…';
  fetchPlayer(p, 3).then(function(c){
    var has = Object.keys(c.scores).length;
    toast(esc(p.name) + '님 ' + (has ? '이어서 진행합니다! 현재 총점 <b>' + totalOf(c.scores) + ' / ' + TOTAL_MAX + '</b>' : '환영합니다! 첫 기록을 시작해요.'), 'good');
  }).catch(function(err){
    toast('기록을 불러오지 못했어요 (' + esc(err && err.message || '연결 오류') + ').<br>점수는 정상 저장되며, 총점 표시는 나중에 맞춰집니다.', 'bad');
  }).then(function(){
    overlay.hidden = true; btn.disabled = false; btn.textContent = '시작하기 →'; draw();
  });
  flush();
}

function mount(){
  var css = document.createElement('style');
  css.textContent =
  '.sl-overlay{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:16px;background:#020a14e6;backdrop-filter:blur(4px);font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif;word-break:keep-all}' +
  '.sl-overlay[hidden],.sl-badge[hidden],.sl-panel[hidden],.sl-toast[hidden],.sl-wait[hidden]{display:none!important}' +
  '.sl-card{width:min(440px,100%);background:#0d2236;border:1px solid #36b4e0;border-radius:18px;padding:28px 26px;color:#eaf7ff;box-shadow:0 0 50px #00a8ff33}' +
  '.sl-card .sl-eyebrow{color:#42cfff;font-size:12px;letter-spacing:2px;font-weight:800}' +
  '.sl-card h2{margin:8px 0 10px;font-size:28px;color:#fff}' +
  '.sl-card p{margin:0 0 18px;color:#b9d3e3;line-height:1.65;font-size:15px}' +
  '.sl-card label{display:block;margin:12px 0 6px;font-size:15px;font-weight:700;color:#d8eefa}' +
  '.sl-card small{font-weight:400;color:#8fb4c8}' +
  '.sl-card input{display:block;box-sizing:border-box;width:100%;margin:6px 0 0;padding:14px 16px;font-size:22px;letter-spacing:1px;background:#04101c;color:#fff;border:1px solid #3c86a8;border-radius:10px;outline:none;font-family:inherit}' +
  '.sl-card input:focus{box-shadow:0 0 16px #1abaff66;border-color:#5fd4ff}' +
  '.sl-card button{display:block;width:100%;margin-top:20px;padding:15px;font-size:19px;font-weight:800;color:#00121c;background:#3fd9f5;border:0;border-radius:10px;cursor:pointer;font-family:inherit}' +
  '.sl-err{min-height:20px;margin-top:10px;color:#ff8b9a;font-weight:700;font-size:14px}' +
  '.sl-warn{margin-top:12px;color:#ffd27a;font-size:13px;line-height:1.5}' +
  '.sl-badge{position:fixed;right:12px;bottom:12px;z-index:9999;font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif;word-break:keep-all}' +
  '.sl-btn{display:flex;align-items:center;gap:8px;background:#0b1e33ee;color:#e8f7ff;border:1px solid #3aa8d8;border-radius:999px;padding:8px 14px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 18px #0006;min-height:0;font-family:inherit}' +
  '.sl-btn .sl-total{color:#ffd76b}.sl-wait{color:#ffb86b}' +
  '.sl-panel{position:absolute;right:0;bottom:calc(100% + 8px);width:240px;background:#0b1e33f7;color:#e8f7ff;border:1px solid #3aa8d8;border-radius:12px;padding:12px 14px;font-size:14px;box-shadow:0 8px 28px #0008}' +
  '.sl-panel h4{margin:0 0 8px;font-size:13px;color:#7fd6ff;letter-spacing:1px}' +
  '.sl-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #ffffff1a}.sl-row b{color:#fff}' +
  '.sl-state{margin-top:8px;font-size:12px;color:#9cc3d6;line-height:1.5}' +
  '.sl-next{margin-top:10px;width:100%;background:#3a2030;color:#ffc2cb;border:1px solid #a84a5c;border-radius:8px;padding:9px;font-size:14px;font-weight:700;cursor:pointer;min-height:0;font-family:inherit}' +
  '.sl-toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:10001;max-width:min(520px,calc(100% - 24px));background:#0b1e33f7;color:#eaf7ff;border:1px solid #3aa8d8;border-radius:12px;padding:12px 18px;font:600 15px/1.6 system-ui,-apple-system,"Malgun Gothic",sans-serif;text-align:center;box-shadow:0 8px 28px #0008;word-break:keep-all}' +
  '.sl-toast.good{border-color:#3fd99a}.sl-toast.bad{border-color:#ff6e83}.sl-toast b{color:#ffd76b}';
  document.head.appendChild(css);

  overlay = document.createElement('div'); overlay.className = 'sl-overlay'; overlay.hidden = true;
  overlay.innerHTML = '<form class="sl-card" autocomplete="off"><div class="sl-eyebrow">PLAYER CHECK-IN</div><h2>참가자 등록</h2>' +
    '<p>이름과 숫자 4자리를 입력하세요.<br>다른 체험 부스에서도 <b>같은 이름 + 같은 숫자</b>를 입력하면 점수가 이어서 쌓여요.</p>' +
    '<label>이름<input name="name" maxlength="20" required placeholder="예: 홍길동"></label>' +
    '<label>숫자 4자리 <small>(꼭 기억하세요! 예: 생일 0315)</small><input name="pin" inputmode="numeric" maxlength="4" required placeholder="0000"></label>' +
    '<div class="sl-err" role="alert"></div><button type="submit">시작하기 →</button>' +
    (online() ? '' : '<div class="sl-warn">⚠ 관리자: score-link.js 에 서버 주소(API_URL)가 없어 이 기기에만 저장됩니다.</div>') + '</form>';
  var form = overlay.querySelector('form'), err = overlay.querySelector('.sl-err');
  form.pin.addEventListener('input', function(){ form.pin.value = form.pin.value.replace(/\D/g, '').slice(0, 4); });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var name = cleanName(form.name.value), pin = form.pin.value;
    if (!name) { err.textContent = '이름을 입력해 주세요.'; return; }
    if (!/^\d{4}$/.test(pin)) { err.textContent = '숫자 4자리를 입력해 주세요.'; return; }
    err.textContent = ''; login(name, pin);
  });
  // 등록 창이 떠 있는 동안 게임의 단축키(OX 키 등)가 동작하지 않도록 막습니다.
  overlay.addEventListener('keydown', function(e){ e.stopPropagation(); });

  badge = document.createElement('div'); badge.className = 'sl-badge'; badge.hidden = true;
  badge.innerHTML = '<div class="sl-panel" hidden><h4>내 연동 점수</h4><div class="sl-rows"></div><div class="sl-state"></div>' +
    '<button type="button" class="sl-next">다음 참가자 →</button></div>' +
    '<button type="button" class="sl-btn" aria-label="연동 점수 보기">👤 <span class="sl-who"></span> · 🏆 <span class="sl-total">0</span> <span class="sl-wait" hidden></span></button>';
  panel = badge.querySelector('.sl-panel');
  badge.querySelector('.sl-btn').onclick = function(){ panel.hidden = !panel.hidden; draw(); };
  badge.querySelector('.sl-next').onclick = function(){ logout(true); };

  toastEl = document.createElement('div'); toastEl.className = 'sl-toast'; toastEl.hidden = true; toastEl.setAttribute('role', 'status');

  document.body.appendChild(overlay); document.body.appendChild(badge); document.body.appendChild(toastEl);
  if (!player()) showLogin();
  else if (online()) fetchPlayer(player(), 2).then(draw, function(){});  // 새로고침해도 다른 기기 점수까지 맞춥니다
  draw(); flush();

  if (IDLE_MINUTES > 0) {
    var last = Date.now(), bump = function(){ last = Date.now(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(function(t){ document.addEventListener(t, bump, true); });
    setInterval(function(){ if (player() && Date.now() - last > IDLE_MINUTES * 60000) logout(false); }, 30000);
  }
}
document.addEventListener('keydown', function(e){
  // 등록 창이 떠 있으면 게임 단축키를 막습니다 (OX 퀴즈의 O/X 키 등)
  if (overlay && !overlay.hidden && !overlay.contains(e.target)) e.stopImmediatePropagation();
}, true);

// 최종 점수: 보내는 중인 점수가 서버에 다 들어갈 때까지(최대 10초) 기다린 뒤 서버 기준 총점을 돌려줍니다.
function summary(){
  var p = player();
  if (!p) return Promise.resolve(null);
  var until = Date.now() + 10000;
  function mine(){ return (store(K_QUEUE) || []).some(function(x){ return idOf(x.name, x.pin) === p.id; }); }
  return new Promise(function(done){
    (function wait(){ flush(); if (!mine() || Date.now() > until) done(); else setTimeout(wait, 400); })();
  }).then(function(){
    return online() ? fetchPlayer(p, 2).catch(function(){ return cacheOf(p.id); }) : cacheOf(p.id);
  }).then(function(c){
    return {name:p.name, total:totalOf(c.scores), max:TOTAL_MAX, scores:c.scores,
            games:ORDER.map(function(g){ return {id:g, name:GAMES[g].name, max:GAMES[g].max, score:c.scores[g]}; })};
  });
}
window.ScoreLink = {record:record, player:player, summary:summary, logout:function(){ logout(true); }};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
