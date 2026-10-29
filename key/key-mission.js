const $=id=>document.getElementById(id);
const stages=[
 {name:'쉬운 열쇠',detail:'둥근 머리와 단순한 이빨',difficulty:'★☆☆',pts:[[175,235],[180,210],[198,190],[224,185],[250,194],[264,215],[264,241],[248,260],[223,269],[198,262],[180,244],[175,235],[264,235],[315,235],[365,235],[415,235],[465,235],[465,265],[493,265],[493,235],[520,235],[520,210],[550,210],[550,235]]},
 {name:'중간 열쇠',detail:'육각형 머리와 두 개의 이빨',difficulty:'★★☆',pts:[[162,205],[190,177],[230,177],[260,205],[260,245],[230,273],[190,273],[162,245],[162,205],[260,225],[310,225],[360,225],[410,225],[435,225],[435,265],[462,265],[462,225],[490,225],[490,275],[520,275],[520,225],[552,225]]},
 {name:'고급 열쇠',detail:'별 모양 머리와 정교한 계단형 이빨',difficulty:'★★★',pts:[[195,157],[209,190],[244,174],[231,209],[268,225],[231,240],[244,275],[209,258],[195,292],[181,258],[146,275],[159,240],[122,225],[159,209],[146,174],[181,190],[195,157],[268,225],[315,225],[355,225],[390,225],[390,255],[412,255],[412,225],[438,225],[438,275],[461,275],[461,225],[485,225],[485,250],[507,250],[507,225],[530,225],[530,270],[553,270],[553,225],[582,225]]}
];
// 도면을 캔버스 중심 기준으로 확대해 그리기 영역을 넓힙니다.
for(const stage of stages){stage.pts=stage.pts.map(([x,y])=>[360+(x-360)*1.17,235+(y-235)*1.17]);}
const ROUND_SECONDS=[35,30,25];
let timerId=null, deadline=0, timeLeft=0;
function stopTimer(){if(timerId!==null){clearInterval(timerId);timerId=null;}}
function tickTimer(){
 const remaining=Math.max(0,(deadline-performance.now())/1000);
 timeLeft=remaining;
 const display=remaining<10 ? remaining.toFixed(2) : String(Math.ceil(remaining));
 $('timer').textContent=`⏱ 남은 시간 ${display}초`;
 $('timer').classList.toggle('warning',remaining<=10 && remaining>5);
 $('timer').classList.toggle('urgent',remaining<=5);
 if(remaining<=0){stopTimer();fail('시간 초과! 제한 시간 안에 열쇠를 완성하지 못했습니다.');}
}
function restartTimer(){stopTimer();timeLeft=ROUND_SECONDS[selected];deadline=performance.now()+timeLeft*1000;tickTimer();timerId=setInterval(tickTimer,100);}
const ARRIVAL_RADIUS=11; // 도착점 안에 실제로 들어와야 성공
let targetLevel=0;
let selected=0,paths=[],drawing=false,covered=[],guide=[],completed=[false,false,false];
const canvas=$('canvas'),ctx=canvas.getContext('2d');
const COVER_RADIUS=14; // 점선의 작은 빈틈은 인정하되 실제로 그린 주변만 채움
const LIMIT_RADIUS=14; // 이 범위를 벗어나면 즉시 실패
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function dense(points){const out=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],n=Math.max(1,Math.ceil(dist(a,b)/4));for(let j=0;j<n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}out.push(points.at(-1));return out;}
function show(id){['select','play','final'].forEach(x=>$(x).classList.toggle('hidden',x!==id));}
function drawPath(pts,color,width,dash=[]){if(!pts.length)return;ctx.beginPath();ctx.moveTo(...pts[0]);pts.slice(1).forEach(p=>ctx.lineTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
function circle(p,r,c){ctx.beginPath();ctx.arc(...p,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}
function paint(){ctx.clearRect(0,0,720,470);const pts=stages[selected].pts;ctx.strokeStyle='#ffffff08';ctx.lineWidth=1;for(let x=20;x<720;x+=25){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,470);ctx.stroke();}for(let y=20;y<470;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(720,y);ctx.stroke();}drawPath(pts,'#3b6a76',28);drawPath(pts,'#87e8e9',3,[5,9]);
// 이미 채운 도면을 밝은 초록색으로 표시합니다.
for(let i=1;i<guide.length;i++)if(covered[i-1]&&covered[i])drawPath([guide[i-1],guide[i]],'#66f4ba',7);
paths.forEach(p=>{if(p.length>1)drawPath(p,'#f9d77e',5);else if(p.length)circle(p[0],3,'#f9d77e');});circle(pts[0],11,'#4cf0a1');circle(pts[0],5,'#08392c');circle(pts.at(-1),11,'#ff9a9a');circle(pts.at(-1),5,'#4c1720');ctx.font='bold 15px system-ui';ctx.fillStyle='#b8ffe0';ctx.fillText('시작',pts[0][0]-17,pts[0][1]-20);ctx.fillStyle='#ffd0d0';ctx.fillText('도착',pts.at(-1)[0]-17,pts.at(-1)[1]-20);}
function point(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*720/r.width,(e.clientY-r.top)*470/r.height];}
function percent(){return Math.floor(covered.filter(Boolean).length/guide.length*100);}
function update(){const n=covered.filter(Boolean).length,pct=Math.floor(n/guide.length*100);$('percent').textContent=`진행률 ${pct}%`;$('bar').style.width=`${pct}%`;$('message').textContent=pct>=95?'95% 이상 완성! 빨간 도착점에 들어가면 성공합니다.':`${pct}% 완성! 남은 점선도 자유롭게 그려 주세요. 손을 떼고 다시 그려도 됩니다.`;}
function checkArrival(p){if(!failed && drawing && dist(p,stages[selected].pts.at(-1))<=ARRIVAL_RADIUS && percent()>=95){drawing=false;completed[selected]=true;endStage();return true;}return false;}
function reset(){restartTimer();$('failOverlay').classList.add('hidden');paths=[];drawing=false;failed=false;$('message').className='message';guide=dense(stages[selected].pts);covered=Array(guide.length).fill(false);$('percent').textContent='진행률 0%';$('bar').style.width='0%';$('message').textContent='어느 부분부터든 자유롭게 그리세요. 여러 번 나눠 그릴 수 있습니다.';paint();}
function nearest(q){let best=Infinity;for(let i=0;i<guide.length;i++)best=Math.min(best,dist(q,guide[i]));return best;}
function mark(q){for(let i=0;i<guide.length;i++)if(!covered[i]&&dist(q,guide[i])<=COVER_RADIUS)covered[i]=true;}
let failed=false;function fail(reason='점선을 감싸는 테두리 밖으로 벗어났습니다.'){stopTimer();$('failDesc').textContent=reason+' 다시 그리기에 도전하세요!';drawing=false;failed=true;paint();$('failOverlay').classList.remove('hidden');$('failRetry').focus();$('message').className='message bad';$('message').textContent='실패! 기준선 밖으로 벗어났습니다. 다시 그리기를 눌러 도전하세요.';}
function begin(e){if(drawing||failed)return;const p=point(e);if(nearest(p)>LIMIT_RADIUS){fail();return;}drawing=true;paths.push([p]);canvas.setPointerCapture(e.pointerId);mark(p);paint();update();checkArrival(p);}
function move(e){if(!drawing||failed)return;const p=point(e),line=paths.at(-1),a=line.at(-1),distance=dist(a,p);const n=Math.max(1,Math.ceil(distance/2));const samples=[];for(let j=1;j<=n;j++){const q=[a[0]+(p[0]-a[0])*j/n,a[1]+(p[1]-a[1])*j/n];if(nearest(q)>LIMIT_RADIUS){fail();return;}samples.push(q);}samples.forEach(mark);line.push(p);paint();update();for(const q of samples){if(checkArrival(q))return;}}
function release(e){if(!drawing)return;if(e&&e.type==='pointerup')move(e);drawing=false;}
function endStage(){
  stopTimer();paint();
  // 점수 연동: 선택한 열쇠에 따라 단계별 점수를 더합니다 (최대 200점)
  //  하 선택: 하 200 / 중 선택: 하 100 + 중 100 / 상 선택: 하 0 + 중 100 + 상 100
  {const KEY_POINTS=[[200],[100,100],[0,100,100]];
   const earned=KEY_POINTS[targetLevel].slice(0,selected+1).reduce((a,b)=>a+b,0);
   if(earned>0&&window.ScoreLink)ScoreLink.record('key',earned);}
  if(selected<targetLevel){
    start(selected+1);
  }else{
    $('finalTitle').textContent='최종 성공! 도시를 구하셨습니다!';
    $('finalDescription').textContent=`축하합니다! ${targetLevel+1}단계까지 열쇠 미션을 완료했습니다. 도시를 구했습니다!`;
    show('final');
  }
}
function start(i){selected=i;show('play');$('level').textContent=`${i+1}단계 · ${stages[i].name}`;$('step').textContent=stages[i].difficulty;reset();}
function mini(pts){return `<svg viewBox="85 120 540 210" aria-hidden="true"><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#79e4da" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;}
function choices(){$('choices').innerHTML=stages.map((s,i)=>`<button class="choice" data-i="${i}">${mini(s.pts)}<b>${i+1}단계 · ${s.name}</b><small>${s.difficulty} · ${s.detail}${completed[i]?' · ✅ 완료':''}</small></button>`).join('');document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{targetLevel=+b.dataset.i;start(0)});}
choices();canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>drawing=false);$('retry').onclick=reset;$('back').onclick=()=>{stopTimer();choices();show('select');};$('finalHome').onclick=()=>{choices();show('select');};$('finalReplay').onclick=()=>{completed=[false,false,false];choices();start(0);};

$('failRetry').onclick=reset;
// 다음 참가자: 점수는 이미 저장되어 있으므로 바로 참가자 등록 화면으로 돌아갑니다.
$('finalNext').onclick=()=>{try{localStorage.removeItem('sl_player_v2');}catch(e){}location.reload();};
