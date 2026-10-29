/**
 * 체험활동 점수 연동 서버 (Google Apps Script)
 * - 이 코드를 Google 스프레드시트의 [확장 프로그램 → Apps Script] 에 붙여 넣고
 *   "웹 앱"으로 배포하세요. (자세한 방법은 README.md)
 * - 시트는 처음 기록이 들어올 때 자동으로 만들어집니다.
 *     「참가자 점수」: 참가자 한 명당 한 줄 (게임별 최고 점수 + 총점)
 *     「플레이 기록」: 게임이 끝날 때마다 한 줄씩 쌓이는 전체 기록
 */

// 연동 점수 만점 (총 1000점). score-link.js 의 max 와 같게 맞추세요.
var GAMES = {
  cipher: {label: '암호 풀기', max: 500},
  key:    {label: '열쇠 미션', max: 200},
  ox:     {label: 'OX 퀴즈',   max: 300}
};
var ORDER = ['cipher', 'key', 'ox'];

var SCORE_SHEET = '참가자 점수';
var LOG_SHEET = '플레이 기록';
var SCORE_HEAD = ['참가자ID', '이름', '숫자4자리', '암호 풀기', '열쇠 미션', 'OX 퀴즈', '총점', '처음 참가', '마지막 기록'];
var LOG_HEAD = ['시각', '참가자ID', '이름', '게임', '게임 점수', '연동 점수', '최고점 갱신', '요청ID'];
var COL_FIRST_GAME = 4, COL_TOTAL = 7, COL_LAST = 9;

function sheet_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  }
  return sh;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function cleanName_(s) { return String(s || '').trim().replace(/\s+/g, ' ').slice(0, 20); }
function idOf_(name, pin) { return cleanName_(name).replace(/\s+/g, '') + '#' + pin; }
// 이름이 = + - @ 로 시작하면 수식으로 처리되지 않게 텍스트로 저장
function text_(s) { s = String(s); return /^[=+\-@']/.test(s) ? "'" + s : s; }
function findRow_(sh, id) {
  if (sh.getLastRow() < 2) return 0;
  var cell = sh.getRange(2, 1, sh.getLastRow() - 1, 1)
    .createTextFinder(id).matchEntireCell(true).matchCase(true).findNext();
  return cell ? cell.getRow() : 0;
}
function playerFromRow_(values) {
  var scores = {}, total = 0;
  ORDER.forEach(function (g, i) {
    var v = values[COL_FIRST_GAME - 1 + i];
    if (v !== '' && v !== null && !isNaN(Number(v))) { scores[g] = Number(v); total += Number(v); }
  });
  return {id: String(values[0]), name: String(values[1]), scores: scores, total: total};
}
function check_(name, pin) {
  name = cleanName_(name); pin = String(pin || '');
  if (!name) throw new Error('이름이 비어 있습니다.');
  if (!/^\d{4}$/.test(pin)) throw new Error('숫자 4자리가 올바르지 않습니다.');
  return {name: name, pin: pin, id: idOf_(name, pin)};
}

// 조회: ?action=get&name=홍길동&pin=0315   /  연결 확인: ?action=ping
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'get') {
      var who = check_(p.name, p.pin);
      var sh = sheet_(SCORE_SHEET, SCORE_HEAD);
      var row = findRow_(sh, who.id);
      if (!row) return json_({ok: true, player: null});
      return json_({ok: true, player: playerFromRow_(sh.getRange(row, 1, 1, SCORE_HEAD.length).getValues()[0])});
    }
    return json_({ok: true, message: '점수 서버가 작동 중입니다.'});
  } catch (err) {
    return json_({ok: false, error: String(err.message || err)});
  }
}

// 기록: {action:'record', name, pin, game, raw, score, rid}
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents);
    var who = check_(body.name, body.pin);
    var game = GAMES[body.game];
    if (!game) throw new Error('알 수 없는 게임입니다: ' + body.game);
    // 게임에서 나온 점수(raw)를 그대로 쓰고 만점에서 자릅니다.
    // (기기에 예전 score-link.js 가 남아 있어 환산이 틀려도 서버에서 바로잡습니다)
    var rawNum = Number(body.raw);
    var score = Math.max(0, Math.min(game.max, Math.round(isFinite(rawNum) && body.raw !== '' && body.raw != null ? rawNum : (Number(body.score) || 0))));

    lock.waitLock(20000);
    var sh = sheet_(SCORE_SHEET, SCORE_HEAD), now = new Date();
    var row = findRow_(sh, who.id);
    if (!row) {
      sh.appendRow([text_(who.id), text_(who.name), "'" + who.pin, '', '', '', 0, now, now]);
      row = sh.getLastRow();
    }
    var col = COL_FIRST_GAME + ORDER.indexOf(body.game);
    var cell = sh.getRange(row, col), old = cell.getValue();
    var improved = old === '' || score > Number(old);
    if (improved) cell.setValue(score);

    var player = playerFromRow_(sh.getRange(row, 1, 1, SCORE_HEAD.length).getValues()[0]);
    sh.getRange(row, COL_TOTAL).setValue(player.total);
    sh.getRange(row, COL_LAST).setValue(now);

    sheet_(LOG_SHEET, LOG_HEAD).appendRow([now, text_(who.id), text_(who.name), game.label,
      Number(body.raw) || 0, score, improved ? 'O' : '', String(body.rid || '')]);
    return json_({ok: true, improved: improved, player: player});
  } catch (err) {
    return json_({ok: false, error: String(err.message || err)});
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}
