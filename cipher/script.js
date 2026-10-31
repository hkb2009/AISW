// ─────────────────────────────────────────────
// 문제 은행: 5개 유형
// 1. 순서 맞추기  2. 알파벳 암호  3. 도형 암호  4. 이진수  5. 넌센스
// 각 문제: {text, answer, why, hint, options?, accept?}
//  - options: 선택형 버튼 (앞 두 글자를 뺀 부분이 정답 비교값)
//  - accept: 정답으로 함께 인정할 다른 표기
// ─────────────────────────────────────────────
const Q=(text,answer,why,hint,extra={})=>({text,answer,why,hint,...extra});

// 1. 순서 맞추기: 이미지 속 색상·도형 규칙 9문제 (난이도 구분 없이 공통)
const patternBank = [
 {ask:'다음에 올 색깔은?',seq:'🔴 🔵 🔴 🔵 🔴 ?',options:['🔴 빨간색','🔵 파란색'],answer:'파란색',why:'빨강과 파랑이 번갈아 나타나므로 다음은 파랑입니다.',hint:'두 색이 번갈아 나옵니다.'},
 {ask:'다음에 올 색깔은?',seq:'🟡 🟡 🟢 🟡 🟡 🟢 🟡 ?',options:['🟡 노란색','🟢 초록색'],answer:'노란색',why:'노랑·노랑·초록이 반복됩니다. 마지막 노랑 다음은 노랑입니다.',hint:'세 개씩 묶어 보세요.'},
 {ask:'다음에 올 도형은?',seq:'▲ ▼ ▲ ▼ ▲ ?',options:['▲ 위쪽 삼각형','▼ 아래쪽 삼각형'],answer:'아래쪽 삼각형',why:'위쪽과 아래쪽 삼각형이 번갈아 나옵니다.',hint:'삼각형의 방향을 보세요.'},
 {ask:'다음에 올 색깔은?',seq:'🔴 🔴 🔵 🔴 🔴 🔵 🔴 🔴 ?',options:['🔴 빨간색','🔵 파란색'],answer:'파란색',why:'빨강·빨강·파랑이 반복됩니다.',hint:'세 개씩 끊어서 보세요.'},
 {ask:'다음에 올 색깔은?',seq:'🔺 🔵 🔺 🔺 🔵 🔵 🔺 🔺 🔺 ?',options:['🔺 빨간 삼각형','🔵 파란 원'],answer:'파란 원',why:'빨간 삼각형 1개·파란 원 1개, 삼각형 2개·원 2개, 삼각형 3개 다음에는 원 3개가 나옵니다.',hint:'같은 모양의 연속 개수가 증가합니다.'},
 {ask:'다음에 올 색깔은?',seq:'🔴 🟡 🟢 🔴 🟡 🟢 🔴 ?',options:['🔴 빨간색','🟡 노란색','🟢 초록색'],answer:'노란색',why:'빨강·노랑·초록이 반복되므로 빨강 다음은 노랑입니다.',hint:'세 가지 색이 반복됩니다.'},
 {ask:'다음에 올 색깔은?',seq:'🔴 🔵 🟡 🔴 🟡 🔵 🔴 🔵 ?',options:['🔴 빨간색','🔵 파란색','🟡 노란색'],answer:'노란색',why:'세 개씩 묶으면 빨강·파랑·노랑, 빨강·노랑·파랑이 번갈아 반복됩니다. 세 번째 묶음은 빨강·파랑·노랑이므로 다음은 노랑입니다.',hint:'빨강으로 시작하는 세 개씩 묶어 보세요.'},
 {ask:'다음에 올 도형은?',seq:'▲ ● ● ▲ ▲ ● ● ● ▲ ▲ ▲ ?',options:['▲ 삼각형','● 원'],answer:'원',why:'삼각형 1개·원 2개, 삼각형 2개·원 3개, 삼각형 3개 다음에는 원이 옵니다.',hint:'연속된 삼각형과 원의 개수를 살펴보세요.'},
 {ask:'다음에 올 색깔은?',seq:'🔴 🔵 🔵 🟡 🔴 🔵 🔵 🟡 🔴 ?',options:['🔴 빨간색','🔵 파란색','🟡 노란색'],answer:'파란색',why:'빨강·파랑·파랑·노랑의 네 가지 순서가 반복됩니다.',hint:'네 개씩 묶어 보세요.'}
].map(x=>Q(`[순서 맞추기] ${x.ask}\n${x.seq}`,x.answer,x.why,x.hint,{options:x.options}));

// 2. 알파벳 암호(시저 암호): 하 = 문제 1·2, 중 = 문제 3·4, 상 = 문제 5·6
const caesarBank = [
 Q('[알파벳 암호] 원래 단어는?\n암호 DBU는 알파벳을 뒤로 1칸씩 밀어 만든 암호입니다. 원래 단어는 무엇일까요?','CAT','각 글자를 1칸 앞으로 되돌리면 D→C, B→A, U→T 이므로 CAT(고양이)입니다.','각 알파벳을 하나 앞 글자로 바꿔 보세요. (B → A)'),
 Q('[알파벳 암호] 원래 단어는?\n암호 EPH는 알파벳을 뒤로 1칸씩 밀어 만든 암호입니다. 원래 단어는 무엇일까요?','DOG','각 글자를 1칸 앞으로 되돌리면 E→D, P→O, H→G 이므로 DOG(개)입니다.','각 알파벳을 하나 앞 글자로 바꿔 보세요. (E → D)'),
 Q('[알파벳 암호] 원래 단어는?\n암호 DPEF는 알파벳을 뒤로 1칸씩 밀어 만든 암호입니다. 원래 단어는 무엇일까요?','CODE','각 글자를 1칸 앞으로 되돌리면 D→C, P→O, E→D, F→E 이므로 CODE(코드)입니다.','각 알파벳을 하나 앞 글자로 바꿔 보세요. 컴퓨터와 관련된 단어예요.'),
 Q('[알파벳 암호] 원래 단어는?\n암호 EBUB는 알파벳을 뒤로 1칸씩 밀어 만든 암호입니다. 원래 단어는 무엇일까요?','DATA','각 글자를 1칸 앞으로 되돌리면 E→D, B→A, U→T, B→A 이므로 DATA(데이터)입니다.','각 알파벳을 하나 앞 글자로 바꿔 보세요. 정보·자료를 뜻하는 단어예요.'),
 Q('[알파벳 암호] 원래 단어는?\n암호 JOUFMMJHFODF는 알파벳을 뒤로 1칸씩 밀어 만든 암호입니다. 원래 단어는 무엇일까요?','INTELLIGENCE','각 글자를 1칸 앞으로 되돌리면 J→I, O→N, U→T, F→E, M→L, M→L, J→I, H→G, F→E, O→N, D→C, F→E 이므로 INTELLIGENCE(지능)입니다.','각 알파벳을 하나 앞 글자로 바꿔 보세요. AI의 I가 바로 이 단어예요.'),
 Q('[알파벳 암호] 원래 단어는?\n암호 TXHVW는 알파벳을 앞으로 3칸씩 밀어 만든 암호입니다. 원래 단어는 무엇일까요?','QUEST','각 글자를 3칸씩 되돌리면 T→Q, X→U, H→E, V→S, W→T 이므로 QUEST(탐구, 탐색)입니다.','각 알파벳을 3칸 앞 글자로 바꿔 보세요. (T → S → R → Q)')
];

// 3. 도형 암호: 정답이 모두 실제 영어 단어(4글자)
const shapeBank = {
 easy:[
  Q('[도형 암호] 도형 문자 해독\n대응표: ▲ = A  /  ● = B  /  ■ = C  /  ◆ = D  /  ★ = E  /  ♥ = F\n암호: ■ ▲ ♥ ★','CAFE','■는 C, ▲는 A, ♥는 F, ★는 E이므로 CAFE(카페)입니다.','각 기호를 대응표에서 찾아 왼쪽부터 읽으세요.'),
  Q('[도형 암호] 로봇의 기호 언어\n대응표: ☀ = M  /  ☂ = N  /  ☾ = O  /  ♠ = P  /  ♣ = Q  /  ♫ = R\n암호: ☀ ☾ ☾ ☂','MOON','☀는 M, ☾는 O, ☾는 O, ☂는 N이므로 MOON(달)입니다.','네 기호를 차례로 알파벳으로 바꾸세요.'),
  Q('[도형 암호] 도서관의 비밀 기호\n대응표: ▲ = B  /  ● = O  /  ■ = K  /  ◆ = S  /  ★ = A  /  ♥ = L\n암호: ▲ ● ● ■','BOOK','▲는 B, ●는 O, ●는 O, ■는 K이므로 BOOK(책)입니다.','같은 기호는 같은 글자예요. 각 기호를 대응표에서 찾아 왼쪽부터 읽으세요.'),
  Q('[도형 암호] 바닷속 기호 메시지\n대응표: ☀ = F  /  ☂ = I  /  ☾ = S  /  ♠ = H  /  ♣ = T  /  ♫ = E\n암호: ☀ ☂ ☾ ♠','FISH','☀는 F, ☂는 I, ☾는 S, ♠는 H이므로 FISH(물고기)입니다.','각 기호를 대응표에서 찾아 왼쪽부터 읽으세요.')
 ],
 medium:[
  Q('[도형 암호] 도형의 꼭짓점 암호\n규칙: 도형의 꼭짓점 수를 알파벳 순서로 바꿉니다. (A=1, B=2, C=3 … Z=26)\n대응표: △ = 3 = C  /  □ = 4 = D  /  ⬠ = 5 = E  /  ⬡ = 6 = F\n암호: ⬡ ⬠ ⬠ □','FEED','⬡는 꼭짓점 6개라서 F, ⬠는 5개라서 E, □는 4개라서 D입니다. 따라서 FEED(먹이를 주다)입니다.','꼭짓점 5개는 E, 6개는 F입니다.'),
  Q('[도형 암호] 회전된 화살표\n기본 대응표: ↑ = E  /  → = D  /  ↓ = I  /  ← = T\n규칙: 제시된 화살표를 각각 시계 방향으로 90° 회전한 다음 대응하는 알파벳을 읽으세요.\n암호: ← ↑ → ↓','EDIT','←를 돌리면 ↑(E), ↑를 돌리면 →(D), →를 돌리면 ↓(I), ↓를 돌리면 ←(T)이므로 EDIT(편집하다)입니다.','←를 시계 방향으로 90° 돌리면 ↑가 됩니다.')
 ],
 hard:[
  Q('[도형 암호] 이중 도형 암호\n첫 번째 도형은 시작 알파벳, 두 번째 기호는 앞으로 이동할 칸 수입니다.\n시작 알파벳: ▲ = A  /  ■ = F  /  ● = K  /  ◆ = P\n이동 규칙: ○ = +1칸  /  ◇ = +2칸  /  ☆ = +3칸\n암호: ▲○ / ■☆ / ◆◇ / ▲☆','BIRD','A+1=B, F+3=I, P+2=R, A+3=D이므로 BIRD(새)입니다.','첫 기호로 시작 알파벳을 정하고 두 번째 기호만큼 앞으로 이동하세요.'),
  Q('[도형 암호] AI의 패턴 학습\nAI가 학습한 도형과 알파벳의 관계에서 숨겨진 규칙을 찾으세요.\n학습 데이터: △ = R  /  □ = S  /  ⬠ = T  /  ⬡ = U\n규칙: 도형의 꼭짓점 수에 15를 더한 숫자를 알파벳 순서에 대응합니다.\n암호: △ ⬡ □ ⬠','RUST','△는 3+15=18(R), ⬡는 6+15=21(U), □는 4+15=19(S), ⬠는 5+15=20(T)이므로 RUST(녹)입니다.','학습 데이터에서 각 도형이 어떤 알파벳인지 찾아 순서대로 읽으세요.')
 ]
};

// 4. 이진수: 중 3문제, 상 3문제 (하 버전에는 출제하지 않음)
const binaryBank = {
 medium:[
  Q('[이진수] 10110₂ = ?₁₀','22','10110₂는 16 + 4 + 2 = 22입니다.','1이 있는 자리의 자릿값(16, 8, 4, 2, 1)을 더하세요.'),
  Q('[이진수] 13₁₀ = ?₂','1101','13 = 8 + 4 + 1이므로 이진수로 1101₂입니다.','8, 4, 2, 1 자릿값을 생각하세요.'),
  Q('[이진수] 이진수 101과 11을 더하면?','1000','101₂는 5, 11₂는 3입니다. 5 + 3 = 8이고, 8을 이진수로 쓰면 1000₂입니다. (십진수 8로 입력해도 정답)','먼저 십진수로 바꿔 더한 뒤 다시 이진수로 바꿔 보세요.',{accept:['8']})
 ],
 hard:[
  Q('[이진수] 빈칸에 들어갈 숫자\n다음은 십진수를 이진수로 바꾼 결과입니다. 빈칸에 들어갈 이진수는?\n십진수 7  →  111\n십진수 11  →  1011\n십진수 19  →  □','10011','19 = 16 + 2 + 1이므로 10011₂입니다.','16, 8, 4, 2, 1의 자리 중 어떤 자리가 1인지 보세요.'),
  Q('[이진수] 이진수 규칙 추리\n다음 이진수에서 규칙을 찾아 물음표에 들어갈 숫자를 고르세요.\n1 → 10 → 11 → 100 → ?','101','이진수로 1, 2, 3, 4를 순서대로 썼으므로 다음은 5를 나타내는 101₂입니다.','이진수들을 십진수로 바꿔 읽어 보세요.',{options:['① 101','② 110','③ 111','④ 1000']}),
  Q('[이진수] 이진수 비밀번호\n· 4자리 이진수입니다.\n· 십진수로 바꾸면 10보다 큽니다.\n· 십진수로 바꾼 숫자는 홀수입니다.\n다음 중 조건을 만족하는 비밀번호는?','1101','1010₂=10, 1100₂=12, 1101₂=13, 1110₂=14입니다. 10보다 크면서 홀수인 수는 13이므로 1101입니다.','이진수에서 홀수는 마지막 자리가 1입니다.',{options:['① 1010','② 1100','③ 1101','④ 1110']})
 ]
};

// 5. 넌센스: 11문제 (공통). 하 버전은 2문제, 중·상 버전은 1문제 출제
const nonsenseBank = [
 Q('[넌센스] 순대를 누르면?','순댓국','순대를 ‘꾹’ 누르면 순대꾹 → 순댓국! 소리를 이용한 말장난이에요.','누를 때 나는 소리 ‘꾹’을 붙여 보세요.',{accept:['순대국']}),
 Q('[넌센스] 신이 화나면?','신발끈','신이 ‘발끈’하면 신발끈! 화를 갑자기 내는 모습을 ‘발끈’이라고 해요.','갑자기 화내는 모습을 나타내는 말을 떠올려 보세요.'),
 Q('[넌센스] 늘 미안해 하는 동물 이름은?','오소리','‘오, 쏘리(sorry)!’ 하고 사과하는 동물, 오소리예요.','영어로 미안하다는 말을 떠올려 보세요.'),
 Q('[넌센스] 왕이 넘어지면?','킹콩','왕(King)이 ‘콩’ 하고 넘어지면 킹콩!','왕을 영어로 하면?'),
 Q('[넌센스] "치킨 열 마리 더 주세요"를 네 글자로 하면?','치킨텐더','치킨 + 텐(ten, 10) + 더 = 치킨텐더!','10을 영어로 하면?'),
 Q('[넌센스] 부엉이가 물에 빠지면?','첨부엉 첨부엉','물에 빠지는 소리 ‘첨벙첨벙’과 부엉이를 합친 말장난이에요.','물에 빠질 때 나는 소리를 떠올려 보세요.',{accept:['첨부엉']}),
 Q('[넌센스] 깡패가 많은 나라는?','칠레','깡패가 “한 대 칠래?” 하고 말하는 것 같은 나라, 칠레예요.','깡패가 겁줄 때 하는 말을 떠올려 보세요.'),
 Q('[넌센스] 팥이 목마를 때 콩에게 하는 말은?','콩나물','“콩, 나 물(줘)!” → 콩나물!','콩에게 물을 달라고 말해 보세요.'),
 Q('[넌센스] 소가 죽으면?','다이소','죽다(die) + 소 = 다이소!','죽다를 영어로 하면?'),
 Q('[넌센스] 얼음이 죽으면?','다이빙','죽다(die) + 얼음 빙(氷) = 다이빙!','얼음을 한자로 하면 ‘빙’이에요.'),
 Q('[넌센스] 가장 뜨거운 과일은?','천도복숭아','천도(1000℃)처럼 뜨거운 복숭아, 천도복숭아예요.','아주 높은 온도를 숫자로 떠올려 보세요.')
];

// 하 버전 넌센스 추가 문제
const nonsenseEasyExtra = [
 Q('[넌센스] 바나나가 웃으면?','바나나킥','바나나가 ‘킥킥’ 웃으면 바나나킥!','웃는 소리 ‘킥킥’을 붙여 보세요.'),
 Q('[넌센스] 딸기가 직장을 잃으면?','딸기시럽','직장을 잃는 것을 ‘실업’이라고 해요. 딸기 + 실업 → 딸기시럽!','직장을 잃는 걸 ‘○○’이라고 해요. 소리가 비슷한 달콤한 것을 떠올려 보세요.',{accept:['딸기실업']})
];

const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const pick=items=>items[Math.floor(Math.random()*items.length)];

// 난이도 배정: 각 유형은 문제 순서가 곧 난이도 순서(쉬움 → 어려움)입니다.
const byLevel={
 pattern:{easy:patternBank.slice(0,3),medium:patternBank.slice(3,6),hard:patternBank.slice(6,9)},
 logic:{easy:caesarBank.slice(0,2),medium:caesarBank.slice(2,4),hard:caesarBank.slice(4,6)},
 shape:shapeBank,
 binary:binaryBank,
 nonsense:{easy:[...nonsenseBank.slice(0,4),...nonsenseEasyExtra],medium:nonsenseBank.slice(4,8),hard:nonsenseBank.slice(8,11)}
};

// 버전별 출제 구성 (총 5문제)
// 하: 순서 1 + 논리 1 + 도형 1 + 넌센스 2 (이진수 없음)
// 중·상: 순서 1 + 논리 1 + 도형 1 + 이진수 1 + 넌센스 1
function buildQuestions(version){
 const base=[pick(byLevel.pattern[version]),pick(byLevel.logic[version]),pick(byLevel.shape[version])];
 if(version==='easy')return shuffle([...base,...shuffle(byLevel.nonsense.easy).slice(0,2)]);
 return shuffle([...base,pick(byLevel.binary[version]),pick(byLevel.nonsense[version])]);
}

// 점수 기준
const PASS_SCORE=350, HINT_PENALTY=20;

const versions={easy:{label:'하',audience:'초등학생용',stars:3,time:null,title:'암호 탐험가'},medium:{label:'중',audience:'중·고등학생용',stars:4,time:300,title:'보안 분석가'},hard:{label:'상',audience:'대학생용',stars:5,time:300,title:'암호 해독 마스터'}};
const screen=document.getElementById('screen'),hud=document.getElementById('hud');
const $=id=>document.getElementById(id);
let game=null,timer=null;
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
function stopTimer(){if(timer!==null)clearInterval(timer);timer=null;}
function resetScreen(){screen.classList.remove('intro-panel','result-fail','result-success','shake');}

function menu(){stopTimer();game=null;hud.hidden=true;document.body.classList.remove('playing');resetScreen();
 screen.innerHTML=`<div class="eyebrow">SELECT GAME VERSION</div><h2>도전할 버전을 선택하세요</h2><p class="desc">순서 맞추기·알파벳 암호·도형 암호·이진수·넌센스 문제가 랜덤으로 5문제 출제됩니다. (하 버전은 이진수 대신 넌센스 2문제) 문제당 100점, 힌트를 쓰면 ${HINT_PENALTY}점이 깎이며 <strong>맞힌 만큼 점수가 쌓입니다</strong>. 오답도 풀이를 확인한 뒤 계속 진행할 수 있어요.</p><div class="levels">${Object.entries(versions).map(([key,v])=>`<button class="level" data-version="${key}"><b>${v.label}</b><div class="stars" aria-label="별 ${v.stars}개">${'★'.repeat(v.stars)}</div><small>5문제 랜덤 출제 · ${v.time?'제한 시간 5분':'시간 제한 없음'} · 문제마다 힌트 1회</small></button>`).join('')}</div>`;
 screen.querySelectorAll('[data-version]').forEach(b=>b.onclick=()=>start(b.dataset.version));}

function start(version){stopTimer();document.body.classList.remove('intro-mode');document.body.classList.add('playing');resetScreen();
 game={version,questions:buildQuestions(version),index:0,points:0,correct:0,usedHint:false,remaining:versions[version].time,started:Date.now(),locked:false};
 hud.hidden=false;render();
 if(game.remaining!==null){timer=setInterval(()=>{if(!game)return;game.remaining=Math.max(0,versions[game.version].time-Math.floor((Date.now()-game.started)/1000));updateHUD();if(game.remaining===0)finish(true);},250);}}

function updateHUD(){if(!game)return;const v=versions[game.version];$('levelLabel').textContent=`${v.label} ${'★'.repeat(v.stars)}`;$('progress').textContent=`${Math.min(game.index+1,game.questions.length)} / ${game.questions.length}`;$('score').textContent=game.points;$('timer').textContent=game.remaining===null?'∞':clock(game.remaining);$('hints').textContent=game.usedHint?'사용 완료':'사용 가능';}

// 공백·쉼표·아래첨자(₂, ₁₀)·문장부호는 무시하고 비교합니다.
function normalize(s){return String(s).trim().toLowerCase().replace(/[\s,→\-₀-₉.!?~"']+/g,'');}

function render(){if(!game)return;game.locked=false;game.usedHint=false;const q=game.questions[game.index],v=versions[game.version];
 screen.innerHTML=`<div class="q-top"><div class="eyebrow">${v.label} VERSION · QUESTION ${game.index+1} / ${game.questions.length}</div><button class="btn secondary small" id="home" type="button">버전 선택으로</button></div><div class="meter"><div style="width:${game.index*100/game.questions.length}%"></div></div><h2>문제 ${game.index+1}</h2><div class="challenge">${escapeHTML(q.text).replace(/\n/g,'<br>')}</div><form id="answerForm" class="answer-form"><label for="answer" class="desc answer-label">${q.options?'정답을 고르세요':'정답을 입력하세요'}</label>${q.options?`<div class="answer-row choice-row"><div class="choice-grid">${q.options.map(x=>`<button type="button" class="choice-btn" data-choice="${escapeHTML(x.slice(2).trim())}">${escapeHTML(x)}</button>`).join('')}</div><button class="btn secondary" type="button" id="hintBtn">힌트 보기</button></div>`:`<div class="answer-row"><input id="answer" type="text" autocomplete="off" spellcheck="false" required placeholder="정답 입력" aria-label="정답 입력"><button class="btn" type="submit">정답 확인</button><button class="btn secondary" type="button" id="hintBtn">힌트 보기</button></div>`}</form><div id="hintText" class="hint"></div><div id="feedback" role="status" aria-live="polite"></div>`;
 $('answerForm').onsubmit=e=>{e.preventDefault();if(!q.options)submit($('answer').value);};
 screen.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>submit(b.dataset.choice));
 $('hintBtn').onclick=()=>{if(game.locked||game.usedHint)return;game.usedHint=true;$('hintText').textContent='HINT · '+q.hint;$('hintBtn').disabled=true;updateHUD();};
 $('home').onclick=menu;updateHUD();if(!q.options)$('answer').focus();}

function submit(value){if(!game||game.locked)return;const q=game.questions[game.index];
 const ok=[q.answer,...(q.accept||[])].some(a=>normalize(value)===normalize(a));
 game.locked=true;const earned=Math.max(0,(ok?100:0)-(game.usedHint?HINT_PENALTY:0));game.points+=earned;if(ok)game.correct++;
 $('answerForm').querySelectorAll('input,button').forEach(el=>el.disabled=true);
 $('feedback').innerHTML=`<div class="feedback ${ok?'success':'failure'}"><h3>${ok?'ACCESS GRANTED · 정답!':'ACCESS DENIED · 오답!'}</h3><p>정답: <strong>${escapeHTML(q.answer)}</strong></p><p><strong>풀이 / 해설:</strong> ${escapeHTML(q.why)}</p><p>이번 문제 획득 점수: <strong>${earned}점</strong></p><button class="btn" id="next">${game.index===game.questions.length-1?'결과 확인 →':'다음 문제 →'}</button></div>`;
 if(!ok){screen.classList.remove('shake');void screen.offsetWidth;screen.classList.add('shake');}
 $('next').onclick=()=>{game.index++;if(game.index>=game.questions.length)finish(false);else render();};
 updateHUD();$('feedback').scrollIntoView({behavior:'smooth',block:'nearest'});$('next').focus({preventScroll:true});}

// 결과 화면: 모두 맞히면 성공, 하나라도 틀리거나 시간이 끝나면 실패.
// 버튼은 프로그램 첫 화면으로 돌아가는 버튼 하나만 둡니다.
function finish(expired){if(!game)return;stopTimer();const g=game,v=versions[g.version],elapsed=Math.floor((Date.now()-g.started)/1000),total=g.questions.length;
 // 성공·실패 없이 얻은 점수를 보여 줍니다
 const success=true;
 if(window.ScoreLink)ScoreLink.record('cipher',g.points); // 점수 연동
 hud.hidden=true;resetScreen();screen.classList.add(success?'result-success':'result-fail');
 const summary=`<div class="summary"><div>정답 수<strong>${g.correct} / ${total}</strong></div><div>점수<strong>${g.points} / ${total*100}</strong></div><div>소요 시간<strong>${clock(elapsed)}</strong></div></div>`;
 const homeBtn=`<div class="actions result-actions"><button class="btn ${success?'':'retry'}" id="toStart">처음으로 →</button><button class="btn" id="toNext">다음 참가자 →</button></div>`;
 if(success){
  screen.innerHTML=`<div class="eyebrow">${expired?'TIME UP · 점검 종료':'MISSION COMPLETE · 점검 완료'}</div><div class="door" id="door"><div></div><div></div></div><h2 class="granted">획득 점수 ${g.points}점</h2><p class="desc">${expired?'제한 시간이 끝났습니다. ':''}${total}문제 중 ${g.correct}문제를 맞혀 ${g.points}점을 얻었습니다! 수고하셨어요.</p><h2>${v.label} 버전 · ${v.title}</h2>${summary}${homeBtn}`;
  setTimeout(()=>$('door')?.classList.add('open'),100);
 }else{
  const reason=`${expired?'제한 시간이 끝났습니다. ':''}${total}문제 중 ${g.correct}문제를 맞혀 ${g.points}점을 얻었습니다.`;
  screen.innerHTML=`<div class="eyebrow fail-eyebrow">${expired?'TIME EXPIRED':'MISSION FAILED'}</div><div class="door locked" id="door"><div></div><div></div><span class="lock-mark" aria-hidden="true">✕</span></div><h2 class="denied fail-title">ACCESS DENIED · 해킹 방어 실패</h2><p class="desc">${reason} ${PASS_SCORE}점 이상이어야 해킹을 막을 수 있어요. 처음부터 다시 도전해 보세요!</p><h2>${v.label} 버전 · ${v.title}</h2>${summary}${homeBtn}`;
  void screen.offsetWidth;screen.classList.add('shake');
 }
 $('toStart').onclick=intro;$('toNext').onclick=nextPlayer;window.scrollTo({top:0});}
function nextPlayer(){try{localStorage.removeItem('sl_player_v2');}catch(e){}location.reload();} // 다음 참가자: 등록 화면으로


// 첫 화면: 해킹을 막기 위한 보안 지식 점검 안내
function intro(){
 stopTimer();game=null;hud.hidden=true;document.body.classList.remove('playing');document.body.classList.add('intro-mode');resetScreen();
 screen.classList.add('intro-panel');
 screen.innerHTML=`<div class="intro-top"><span class="intro-step">[ STEP 2 ]</span><span class="intro-status"><span class="pulse-dot"></span> SECURITY ALERT</span></div>
 <div class="intro-frame"><div class="intro-copy"><div class="eyebrow">NEXUS SECURITY LAB · SECURITY CHECK</div><h2>CODE RED :<br>도시를 구하라!</h2><p>해커가 도시 서버에 침투하려고<br class="desktop-break"> 시도하고 있습니다.</p><p>해킹을 막으려면 <em>보안 지식</em>이 필요합니다.<br class="desktop-break"> 지금 여러분의 실력을 점검해 봅시다.</p><div class="intro-note">[ 점검 항목: 순서 맞추기 · 알파벳 암호 · 도형 암호 · 이진수 · 넌센스 ]</div></div>
 <div class="intro-globe" aria-hidden="true"><svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="150" cy="150" r="116" stroke="currentColor" stroke-width="4"/><ellipse cx="150" cy="150" rx="49" ry="116" stroke="currentColor" stroke-width="3"/><ellipse cx="150" cy="150" rx="116" ry="43" stroke="currentColor" stroke-width="3"/><path d="M34 150H266M150 34V266" stroke="currentColor" stroke-width="3"/><path d="M62 81l28-18 18 10 5 19 29 10-12 19-26 4-9 26-20-11-21-27zm104 35 21-23 33 5 20 25-13 22-31 6-11 29-22-19zm-54 53 25 11 16 33-17 35-22-9-9-39z" fill="currentColor" opacity=".8"/><path d="M149 45V18" stroke="#ff5569" stroke-width="4"/><path d="M150 0c-17 0-29 12-29 29 0 22 29 48 29 48s29-26 29-48c0-17-12-29-29-29z" fill="#ff425c"/><circle cx="150" cy="28" r="9" fill="#092739"/><path d="M191 17l-4 23h-9l4-23zm-10 29h9v9h-9" fill="#ff425c"/></svg><div class="globe-scan"></div></div>
 <div class="intro-bottom"><div class="intro-symbols"><span class="intro-lock">▣</span><span class="intro-key">⚿</span></div><button class="intro-enter" id="enterLab">점검 시작 <span>→</span></button></div></div>
 <div class="intro-foot">WARNING · HACKING ATTEMPT DETECTED · SECURITY CHECK REQUIRED</div>`;
 $('enterLab').onclick=()=>{screen.classList.remove('intro-panel');document.body.classList.remove('intro-mode');menu();};
}
intro();
