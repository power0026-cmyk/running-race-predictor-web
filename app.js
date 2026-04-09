
let latestCsvSummary=null; const STORAGE_KEY="rrp_web_state_v252"; const CUSTOM_RACE_KEY="rrp_custom_races_v252";
const RACE_DB={full:[{id:"seoul_full",name:"서울마라톤",factor:.992,desc:"기록 친화적",season:"봄",elevation:"낮음",favorite:true,source:"base"},{id:"daegu_full",name:"대구마라톤",factor:.993,desc:"고속 코스",season:"봄",elevation:"낮음",favorite:true,source:"base"},{id:"jtbc_full",name:"JTBC 서울마라톤",factor:.995,desc:"도심형 무난 코스",season:"가을",elevation:"중간",favorite:false,source:"base"},{id:"chuncheon_full",name:"춘천마라톤",factor:1.006,desc:"후반 미세 난이도",season:"가을",elevation:"중간",favorite:false,source:"base"},{id:"gyeongju_full",name:"경주국제마라톤",factor:1.004,desc:"무난하나 변수 존재",season:"가을",elevation:"중간",favorite:false,source:"base"},{id:"gongju_full",name:"공주마라톤",factor:1.012,desc:"업다운 변수 존재",season:"가을",elevation:"조금 높음",favorite:true,source:"base"}],half:[{id:"seoul_half",name:"서울하프마라톤",factor:.996,desc:"하프 기록 친화적",season:"봄",elevation:"낮음",favorite:true,source:"base"},{id:"gyeongju_half",name:"경주국제마라톤 하프",factor:1.003,desc:"무난한 하프",season:"가을",elevation:"중간",favorite:false,source:"base"},{id:"city_half",name:"도심 하프 기준",factor:.999,desc:"비교용 기준 코스",season:"봄",elevation:"보통",favorite:false,source:"base"}],tenk:[{id:"seoul_10k",name:"서울마라톤 10K",factor:.998,desc:"빠른 10K",season:"봄",elevation:"낮음",favorite:true,source:"base"},{id:"jtbc_10k",name:"JTBC 서울마라톤 10K",factor:1.000,desc:"일반적인 도심형",season:"가을",elevation:"보통",favorite:false,source:"base"},{id:"seoulhalf_10k",name:"서울하프마라톤 10K",factor:1.001,desc:"무난한 10K",season:"봄",elevation:"보통",favorite:false,source:"base"},{id:"gyeongju_10k",name:"경주국제마라톤 10K",factor:1.004,desc:"약간의 변수",season:"가을",elevation:"중간",favorite:false,source:"base"}]};
const byId=id=>document.getElementById(id), setText=(id,v)=>{const e=byId(id); if(e) e.textContent=v;}, setValue=(id,v)=>{const e=byId(id); if(e) e.value=v;};
const num=v=>Number(v||0);
function hmsToSeconds(h,m,s){return num(h)*3600+num(m)*60+num(s);}
function msToSeconds(m,s){return num(m)*60+num(s);}
function secondsToHms(seconds){seconds=Math.round(seconds||0);const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
function secondsToPace(sec){if(!sec||sec<=0) return "-"; const m=Math.floor(sec/60),s=Math.round(sec%60); return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}/km`;}
function getDistanceByMode(m){return m==="full"?42.195:m==="half"?21.0975:10}
function getDbMode(m){return m==="full"?"full":m==="half"?"half":"tenk"}
const riegel=(t,d1,d2,e=1.06)=>t*Math.pow(d2/d1,e);
function pickPrediction(mode,tenk,half,full){if(mode==="10K") return {dist:10,pred:tenk||(half?riegel(half,21.0975,10,1.04):0)||(full?riegel(full,42.195,10,1.03):0),base:tenk?"10K 기록 직접 사용":(half?"하프 기록 기반 예측":"풀 기록 기반 예측")}; if(mode==="half") return {dist:21.0975,pred:half||(tenk?riegel(tenk,10,21.0975,1.06):0)||(full?riegel(full,42.195,21.0975,1.045):0),base:half?"하프 기록 직접 사용":(tenk?"10K 기록 기반 예측":"풀 기록 기반 예측")}; return {dist:42.195,pred:full||(half?riegel(half,21.0975,42.195,1.06):0)||(tenk?riegel(tenk,10,42.195,1.06):0),base:full?"풀 기록 직접 사용":(half?"하프 기록 기반 예측":"10K 기록 기반 예측")};}
function setPredictionResult(t,p,n){setText("resultTime",t);setText("resultPace",p);setText("resultNote",n);setText("heroTime",t);setText("heroPace",p);setText("heroMeta",n);}

function setTrainingFeedbackDefault(){
  setText("fbWeeklyAvg","-");
  setText("fbLongestRun","-");
  setText("fbRunFreq","-");
  setText("fbPriority","CSV를 업로드하면 표시돼.");
  setText("fbSignals","주간거리, 롱런, 일관성, 강도 균형을 바탕으로 보여줘.");
  setText("fbAdvice","CSV를 올리면 다음 4주에 어떤 훈련을 더 해야 할지 정리해줄게.");
}
function formatKm(v){ return `${Number(v||0).toFixed(1)}km`; }
function weekKeyFromDate(date){
  const d = new Date(date);
  const day = (d.getDay()+6)%7;
  d.setDate(d.getDate()-day);
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}
function analyzeTrainingRows(rows){
  if(!rows || !rows.length) return null;
  const sample = rows[0];
  const dateCol = findColumn(sample, ["activity date","date","start time","날짜","일자"]);
  const distanceCol = findColumn(sample, ["distance","거리","kilometers","kilometres","km"]);
  const hrCol = findColumn(sample, ["avg hr","average heart rate","heart rate","심박"]);
  const typeCol = findColumn(sample, ["sport type","activity type","type","활동 종류"]);
  const now = new Date();
  const weeks12Ago = new Date(now);
  weeks12Ago.setDate(now.getDate() - 7*12);
  let longestRun = 0, hrTotal = 0, hrCount = 0, runs12 = 0;
  const weekTotals = {};
  for(const row of rows){
    if(typeCol && !looksLikeRun({ [typeCol]: row[typeCol] })) continue;
    const dist = safeNumber(row[distanceCol]);
    if(dist <= 0) continue;
    const dt = parseFlexibleDate(row[dateCol]);
    if(!dt) continue;
    if(dist > longestRun) longestRun = dist;
    const hr = safeNumber(row[hrCol]);
    if(hr > 0){ hrTotal += hr; hrCount += 1; }
    if(dt >= weeks12Ago){
      runs12 += 1;
      const wk = weekKeyFromDate(dt);
      weekTotals[wk] = (weekTotals[wk] || 0) + dist;
    }
  }
  const weeklyValues = Object.values(weekTotals);
  const weeklyAvg = weeklyValues.length ? weeklyValues.reduce((a,b)=>a+b,0) / Math.max(12, weeklyValues.length) : 0;
  const weeklyPeak = weeklyValues.length ? Math.max(...weeklyValues) : 0;
  const variability = weeklyAvg > 0 && weeklyValues.length ? (weeklyPeak - Math.min(...weeklyValues)) / weeklyAvg : 0;
  const runFreq = runs12 / 12;
  const avgHr = hrCount ? hrTotal / hrCount : 0;
  return { weeklyAvg, weeklyPeak, longestRun, runFreq, variability, avgHr };
}
function buildTrainingAdvice(stats, extras){
  if(!stats) return null;
  const signals = [];
  const advice = [];
  let priority = "주간거리 기반";

  if(stats.weeklyAvg < 40){
    signals.push("🔴 주간거리 부족");
    advice.push("다음 4주 동안 주간거리를 급하게 올리지 말고 35 → 40 → 45km처럼 점진적으로 올려봐.");
    priority = "주간거리 기반";
  } else if(stats.weeklyAvg < 55){
    signals.push("🟡 주간거리 보강 필요");
    advice.push("기록 향상을 원하면 최근 주간거리에서 5~10km 정도 더 안정적으로 쌓는 게 좋아.");
    priority = "주간거리 일관성";
  } else {
    signals.push("🟢 주간거리 양호");
    advice.push("주간거리 기반은 괜찮아. 이제 질 훈련과 회복 균형을 보는 단계야.");
  }

  if(stats.longestRun < 24){
    signals.push("🔴 롱런 부족");
    advice.push("최장거리가 짧은 편이야. 2주에 1번 24~28km 롱런으로 후반 적응을 만들어봐.");
    if(priority === "주간거리 기반") priority = "롱런 적응";
  } else if(stats.longestRun < 28){
    signals.push("🟡 롱런 보강 필요");
    advice.push("마라톤 대비라면 28~30km 롱런 경험을 조금 더 쌓는 게 좋아.");
  } else {
    signals.push("🟢 롱런 양호");
  }

  if(stats.runFreq < 3){
    signals.push("🔴 빈도 낮음");
    advice.push("주당 러닝 횟수가 적은 편이야. 거리보다 먼저 주 4회 리듬을 만드는 게 효과적이야.");
    priority = "주간 러닝 빈도";
  } else if(stats.runFreq < 4){
    signals.push("🟡 빈도 조금 부족");
    advice.push("훈련 빈도를 주 4회 이상으로 맞추면 거리 누적이 훨씬 쉬워져.");
  } else {
    signals.push("🟢 빈도 양호");
  }

  if(stats.variability > 0.7){
    signals.push("🔴 일관성 흔들림 큼");
    advice.push("주별 훈련량 편차가 큰 편이야. 강한 주와 쉬는 주의 차이를 줄여서 꾸준함을 먼저 잡아봐.");
    priority = "훈련 일관성";
  } else if(stats.variability > 0.4){
    signals.push("🟡 일관성 보강 필요");
    advice.push("들쑥날쑥한 패턴보다 비슷한 리듬으로 누적하는 쪽이 기록 향상에 유리해.");
  } else {
    signals.push("🟢 일관성 양호");
  }

  if(extras && extras.ltPace > 0){
    const ltMin = extras.ltPace / 60;
    if(ltMin > 4.8){
      signals.push("🟡 역치 자극 보강 필요");
      advice.push("주 1회 20~30분 템포런이나 크루즈 인터벌을 넣어서 역치 자극을 조금 더 만들면 좋아.");
      if(priority === "주간거리 일관성") priority = "역치 훈련";
    } else {
      signals.push("🟢 역치 자극 양호");
    }
  } else {
    signals.push("⚪ 역치 정보 없음");
    advice.push("젖산 역치 페이스를 입력하면 템포런 보강 조언이 더 정확해져.");
  }

  if(extras && extras.vo2 > 0 && extras.vo2 < 48){
    advice.push("VO2max 수치가 낮은 편이라면 단거리 인터벌보다 먼저 유산소 기반과 템포런을 우선하는 게 좋아.");
  }

  if(extras && extras.fullEqSec > 0){
    if(extras.fullEqSec <= 10800){
      advice.push("현재 입력 기준으로는 서브3 사정권에 가까워. 무리한 고강도보다 롱런과 회복 완성도가 더 중요해.");
    } else if(extras.fullEqSec <= 12600){
      advice.push("서브3를 바로 노리기보다는 먼저 풀 기준 3시간 10분~20분대를 안정적으로 만드는 전략이 좋아.");
    }
  }

  return { priority, signals: signals.join("  "), advice: advice.slice(0,5).join("\\n") };
}
function setTrainingFeedback(stats, built){
  if(!stats || !built){ setTrainingFeedbackDefault(); return; }
  setText("fbWeeklyAvg", formatKm(stats.weeklyAvg));
  setText("fbLongestRun", formatKm(stats.longestRun));
  setText("fbRunFreq", `${stats.runFreq.toFixed(1)}회`);
  setText("fbPriority", built.priority);
  setText("fbSignals", built.signals);
  setText("fbAdvice", built.advice);
}

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function setSub3Gauge(score, fullEqSec, label, note){
  setText("sub3Score", `${Math.round(score)}점`);
  setText("sub3FullEq", fullEqSec>0 ? secondsToHms(fullEqSec) : "-");
  const bar=byId("sub3Bar"); if(bar) bar.style.width=`${clamp(score,0,100)}%`;
  setText("sub3Label", label);
  setText("sub3Note", note);
}
function computeSub3Gauge({fullEqSec,weekly,mileage6m,vo2,ltPace,bmi}){
  let score=0;
  if(fullEqSec>0){
    const diffMin=(10800-fullEqSec)/60;
    score += clamp(50 + diffMin*2.2, 0, 60);
  }
  score += clamp((weekly-35)*0.6, 0, 15);
  score += clamp((mileage6m-500)*0.012, 0, 10);
  score += clamp((vo2-48)*1.2, 0, 10);
  if(ltPace>0){
    const ltBonus = clamp((280-ltPace)*0.18, 0, 10);  // around 4:40/km threshold
    score += ltBonus;
  }
  if(bmi>0 && bmi < 23) score += 3;
  if(bmi >= 25) score -= 3;
  score = clamp(score, 0, 100);

  let label = "아직은 준비 구간";
  if(score >= 85) label = "서브3 사정권";
  else if(score >= 70) label = "도전권 진입";
  else if(score >= 55) label = "기반은 보임";
  else if(score >= 40) label = "훈련 누적이 더 필요";
  return {
    score,
    label,
    note: "풀 기준 예상기록, 주간거리, 6개월 누적거리, VO2max, 젖산 역치 페이스, 체형 변수를 합쳐 만든 참고용 게이지야."
  };
}
function updateTimePreview(){setText("tenkPreview",secondsToHms(hmsToSeconds(byId("tenkH")?.value,byId("tenkM")?.value,byId("tenkS")?.value)));setText("halfPreview",secondsToHms(hmsToSeconds(byId("halfH")?.value,byId("halfM")?.value,byId("halfS")?.value)));setText("fullPreview",secondsToHms(hmsToSeconds(byId("fullH")?.value,byId("fullM")?.value,byId("fullS")?.value)));setText("targetTimePreview",secondsToHms(hmsToSeconds(byId("targetTimeH")?.value,byId("targetTimeM")?.value,byId("targetTimeS")?.value)));const lt=msToSeconds(byId("ltPaceMin")?.value,byId("ltPaceSec")?.value), tp=msToSeconds(byId("targetPaceMin")?.value,byId("targetPaceSec")?.value); setText("ltPacePreview",lt?secondsToPace(lt):"00:00/km"); setText("targetPacePreview",tp?secondsToPace(tp):"00:00/km");}
function getSelectedDistance(){const preset=byId("distPreset")?.value||"10"; return preset==="custom"?Number(byId("distCustom")?.value||0):Number(preset);}
function toggleDistanceCustom(){const isCustom=(byId("distPreset")?.value==="custom"); byId("distCustom")?.classList.toggle("hidden",!isCustom);}
function loadCustomRaces(){try{const raw=localStorage.getItem(CUSTOM_RACE_KEY); if(!raw) return []; const p=JSON.parse(raw); return Array.isArray(p)?p:[];}catch(e){return [];}}
function saveCustomRaces(r){localStorage.setItem(CUSTOM_RACE_KEY,JSON.stringify(r));}
function getAllRacesForMode(mode){const dbMode=getDbMode(mode); return [...(RACE_DB[dbMode]||[]).map(r=>({...r})),...loadCustomRaces().filter(r=>r.mode===dbMode)];}
function buildRaceCards(mode,base){const dbMode=getDbMode(mode), dist=getDistanceByMode(dbMode); return getAllRacesForMode(mode).map(r=>({...r,pred:base*Number(r.factor||1),pace:(base*Number(r.factor||1))/dist})).sort((a,b)=>a.favorite!==b.favorite?(a.favorite?-1:1):a.pred-b.pred);}
function renderRaceCards(mode,base){const wrap=byId("raceCards"); if(!wrap) return; if(!base||base<=0){wrap.innerHTML='<div class="empty-message">계산하면 여기에 대회 비교 카드가 생겨.</div>'; return;} const races=buildRaceCards(mode,base); wrap.innerHTML=races.map(r=>`<div class="race-card ${r.favorite?"favorite":""}"><div class="badge-row">${r.favorite?'<span class="small-badge">즐겨찾기</span>':""}${r.source==="custom"?'<span class="small-badge">내 대회</span>':""}</div><div class="race-card-title">${r.name}</div><div class="race-card-time">${secondsToHms(r.pred)}</div><div class="race-card-pace">${secondsToPace(r.pace)}</div><div class="race-card-desc">${r.desc||"-"}</div><div class="race-card-meta">${r.season||"-"} · ${r.elevation||"-"}</div></div>`).join("");}
function renderCustomRaceList(){const wrap=byId("customRaceList"),msg=byId("customRaceMessage"); if(!wrap||!msg) return; const races=loadCustomRaces(); if(!races.length){msg.textContent="아직 추가한 대회가 없어."; wrap.innerHTML=""; return;} msg.textContent=`내 대회 ${races.length}개 저장됨`; wrap.innerHTML=races.map(r=>`<div class="custom-race-item"><div class="custom-race-item-title">${r.name}</div><div class="custom-race-item-meta">${r.mode.toUpperCase()} · 보정값 ${Number(r.factor).toFixed(3)} ${r.favorite?"· 즐겨찾기":""}</div><div class="custom-race-item-desc">${r.desc||"-"} · ${r.season||"-"} · ${r.elevation||"-"}</div><div class="custom-race-item-actions"><button class="custom-mini-btn" onclick="toggleCustomFavorite('${r.id}')">${r.favorite?"즐겨찾기 해제":"즐겨찾기"}</button><button class="custom-mini-btn" onclick="removeCustomRace('${r.id}')">삭제</button></div></div>`).join("");}
window.toggleCustomFavorite=id=>{saveCustomRaces(loadCustomRaces().map(r=>r.id===id?{...r,favorite:!r.favorite}:r)); renderCustomRaceList(); rerenderRaceCardsFromState();};
window.removeCustomRace=id=>{saveCustomRaces(loadCustomRaces().filter(r=>r.id!==id)); renderCustomRaceList(); rerenderRaceCardsFromState();};
function makeRaceFactor({speed,hill,turns,weather,finish}){let f=1.000; if(speed==="very_fast") f-=.010; else if(speed==="fast") f-=.005; else if(speed==="slow") f+=.005; else if(speed==="very_slow") f+=.010; if(hill==="slight") f+=.003; else if(hill==="medium") f+=.007; else if(hill==="high") f+=.012; if(turns==="medium") f+=.002; else if(turns==="many") f+=.005; if(weather==="cloudy") f-=.001; else if(weather==="rain") f+=.004; else if(weather==="snow") f+=.008; if(finish==="hard") f+=.004; else if(finish==="easy") f-=.002; return Number(f.toFixed(3));}
function updateFactorPreview(){const f=makeRaceFactor({speed:byId("customRaceSpeed")?.value||"normal",hill:byId("customRaceHill")?.value||"none",turns:byId("customRaceTurns")?.value||"few",weather:byId("customRaceWeather")?.value||"clear",finish:byId("customRaceFinish")?.value||"normal"}); setValue("customRaceFactorPreview",f.toFixed(3)); return f;}
function rerenderRaceCardsFromState(){const s=getAppState(), mode=s.raceMode||"10K", current=parseHmsString(s.resultTime); if(current>0) renderRaceCards(mode,current); else renderRaceCards(mode,0); saveAppState();}
function parseHmsString(text){if(!text||text==="-"||!text.includes(":")) return 0; const p=text.split(":").map(Number); if(p.some(Number.isNaN)) return 0; if(p.length===3) return p[0]*3600+p[1]*60+p[2]; if(p.length===2) return p[0]*60+p[1]; return 0;}
["customRaceSpeed","customRaceHill","customRaceTurns","customRaceWeather","customRaceFinish"].forEach(id=>byId(id)?.addEventListener("change",updateFactorPreview));
["tenkH","tenkM","tenkS","halfH","halfM","halfS","fullH","fullM","fullS","targetTimeH","targetTimeM","targetTimeS","ltPaceMin","ltPaceSec","targetPaceMin","targetPaceSec"].forEach(id=>byId(id)?.addEventListener("input",updateTimePreview));
byId("distPreset")?.addEventListener("change",()=>{toggleDistanceCustom(); saveAppState();});
byId("previewFactorBtn")?.addEventListener("click",()=>setText("customRaceMessage",`자동 계산 보정값: ${updateFactorPreview().toFixed(3)}`));
byId("addCustomRaceBtn")?.addEventListener("click",()=>{const name=byId("customRaceName")?.value.trim(),mode=byId("customRaceMode")?.value||"full",factor=updateFactorPreview(),desc=byId("customRaceDesc")?.value,season=byId("customRaceSeason")?.value,elevation=byId("customRaceElevation")?.value,favorite=!!byId("customRaceFavorite")?.checked; if(!name){setText("customRaceMessage","대회명을 입력해줘"); return;} const races=loadCustomRaces(); races.push({id:`custom_${Date.now()}`,name,mode,factor,desc,season,elevation,favorite,source:"custom"}); saveCustomRaces(races); setValue("customRaceName",""); if(byId("customRaceFavorite")) byId("customRaceFavorite").checked=false; ["customRaceMode","customRaceSpeed","customRaceHill","customRaceTurns","customRaceWeather","customRaceFinish","customRaceDesc","customRaceSeason","customRaceElevation"].forEach((id,i)=>{}); updateFactorPreview(); setText("customRaceMessage",`${name} 추가 완료`); renderCustomRaceList(); rerenderRaceCardsFromState();});
byId("clearCustomRacesBtn")?.addEventListener("click",()=>{localStorage.removeItem(CUSTOM_RACE_KEY); renderCustomRaceList(); rerenderRaceCardsFromState(); setText("customRaceMessage","내 대회 전체 삭제 완료");});
byId("calcBtn")?.addEventListener("click",()=>{const tenk=hmsToSeconds(byId("tenkH")?.value,byId("tenkM")?.value,byId("tenkS")?.value), half=hmsToSeconds(byId("halfH")?.value,byId("halfM")?.value,byId("halfS")?.value), full=hmsToSeconds(byId("fullH")?.value,byId("fullM")?.value,byId("fullS")?.value), mode=byId("raceMode")?.value||"10K"; const mileage6m=num(byId("mileage6m")?.value), mileage1y=num(byId("mileage1y")?.value), weekly=num(byId("weekly")?.value), avgHr=num(byId("avgHrInput")?.value), vo2=num(byId("vo2max")?.value), ltHr=num(byId("ltHr")?.value), ltPace=msToSeconds(byId("ltPaceMin")?.value,byId("ltPaceSec")?.value), height=num(byId("heightCm")?.value), weight=num(byId("weightKg")?.value), bmi=(height>0&&weight>0)?weight/Math.pow(height/100,2):0; const result=pickPrediction(mode,tenk,half,full); if(!result.pred){setPredictionResult("-","-","기록을 하나 이상 입력해줘"); renderRaceCards(mode,0); saveAppState(); return;} let adjusted=result.pred; const comments=[result.base]; if(weekly>=50){adjusted*=.992; comments.push("주간거리 양호")} else if(weekly>0&&weekly<25){adjusted*=1.015; comments.push("주간거리 부족")} if(mileage6m>=800){adjusted*=.994; comments.push("6개월 누적 양호")} else if(mileage6m>0&&mileage6m<400){adjusted*=1.012; comments.push("6개월 거리 낮음")} if(mileage1y>=1600) comments.push("1년 누적 안정적"); if(avgHr>=155) comments.push("최근 훈련강도 높음"); else if(avgHr>0) comments.push("평균 심박 반영"); if(vo2>=55){adjusted*=.992; comments.push("VO2max 우수")} else if(vo2>0&&vo2<45){adjusted*=1.008; comments.push("VO2max 보수적 반영")} if(ltPace>0&&mode==="10K"){adjusted=(adjusted*.7)+(ltPace*10*.3); comments.push("젖산 역치 페이스 반영")} if(ltHr>=170) comments.push("역치심박 높음"); if(bmi>0&&bmi<20.5) comments.push("경량 체형"); else if(bmi>=25){adjusted*=1.006; comments.push("체중 변수 반영")} setPredictionResult(secondsToHms(adjusted),secondsToPace(adjusted/result.dist),`${mode} 기준 예측 완료 · ${comments.join(" · ")}`);
const fullEqSec = mode==="full" ? adjusted : (mode==="half" ? riegel(adjusted,21.0975,42.195,1.06) : riegel(adjusted,10,42.195,1.06));
const gauge = computeSub3Gauge({fullEqSec,weekly,mileage6m,vo2,ltPace,bmi});
setSub3Gauge(gauge.score, fullEqSec, gauge.label, gauge.note);
renderRaceCards(mode,adjusted); saveAppState();});
function updatePaceModeVisibility(){const m=byId("paceCalcMode")?.value||"time_to_pace"; byId("timeToPaceFields")?.classList.toggle("hidden",m!=="time_to_pace"); byId("paceToTimeFields")?.classList.toggle("hidden",m!=="pace_to_time");}
byId("paceCalcMode")?.addEventListener("change",()=>{updatePaceModeVisibility(); saveAppState();});
byId("paceBtn")?.addEventListener("click",()=>{const mode=byId("paceCalcMode")?.value||"time_to_pace", dist=getSelectedDistance(); if(!dist||dist<=0){setText("paceResult","입력 확인"); setText("paceSubResult","거리(km)를 선택하거나 입력해줘"); saveAppState(); return;} if(mode==="time_to_pace"){const time=hmsToSeconds(byId("targetTimeH")?.value,byId("targetTimeM")?.value,byId("targetTimeS")?.value); if(!time){setText("paceResult","입력 확인"); setText("paceSubResult","목표 시간을 입력해줘"); saveAppState(); return;} setText("paceResult",secondsToPace(time/dist)); setText("paceSubResult",`총 기록 ${secondsToHms(time)} · 거리 ${dist}km`);} else {const pace=msToSeconds(byId("targetPaceMin")?.value,byId("targetPaceSec")?.value); if(!pace){setText("paceResult","입력 확인"); setText("paceSubResult","목표 페이스를 입력해줘"); saveAppState(); return;} const total=pace*dist; setText("paceResult",secondsToHms(total)); setText("paceSubResult",`평균 페이스 ${secondsToPace(pace)} · 거리 ${dist}km`);} saveAppState();});
function parseCsvLine(line){const result=[]; let current="", inQuotes=false; for(let i=0;i<line.length;i++){const ch=line[i]; if(ch === '"'){if(inQuotes&&line[i+1]==='"'){current+='"'; i++;} else inQuotes=!inQuotes;} else if(ch===','&&!inQuotes){result.push(current); current="";} else current+=ch;} result.push(current); return result;}
function parseCsv(text){const lines=text.split(/\r?\n/).filter(line=>line.trim()!==""); if(!lines.length) return []; const headers=parseCsvLine(lines[0]).map(h=>h.trim()), rows=[]; for(let i=1;i<lines.length;i++){const values=parseCsvLine(lines[i]), row={}; headers.forEach((h,idx)=>row[h]=(values[idx]||"").trim()); rows.push(row);} return rows;}
function findColumn(row,candidates){const keys=Object.keys(row); for(const key of keys){const lower=key.toLowerCase(); for(const cand of candidates){if(lower.includes(cand)) return key;}} return null;}
function safeNumber(v){if(!v) return 0; const n=Number(String(v).replace(/,/g,"").trim()); return Number.isFinite(n)?n:0;}
function parseFlexibleDate(v){if(!v) return null; const d=new Date(v); return isNaN(d.getTime())?null:d;}
function looksLikeRun(row){const text=Object.values(row).join(" ").toLowerCase(); const pos=["run","running","러닝","달리기","트레드밀"], neg=["ride","cycling","bike","walk","hike","swim","요가"]; if(pos.some(w=>text.includes(w))) return true; if(neg.some(w=>text.includes(w))) return false; return true;}
function summarizeTrainingCsv(rows){if(!rows.length) return null; const sample=rows[0], dateCol=findColumn(sample,["activity date","date","start time","날짜","일자"]), distanceCol=findColumn(sample,["distance","거리","kilometers","kilometres","km"]), elapsedCol=findColumn(sample,["moving time","elapsed time","duration","time","이동 시간","경과 시간"]), paceCol=findColumn(sample,["avg pace","average pace","pace","페이스"]), hrCol=findColumn(sample,["avg hr","average heart rate","heart rate","심박"]), typeCol=findColumn(sample,["sport type","activity type","type","활동 종류"]); let runs=0,totalDistance=0,totalHr=0,hrCount=0,totalPace=0,paceCount=0,sixMonthDistance=0,oneYearDistance=0; const dated=[]; const now=new Date(), six=new Date(), one=new Date(); six.setMonth(now.getMonth()-6); one.setFullYear(now.getFullYear()-1); for(const row of rows){if(typeCol&&!looksLikeRun({[typeCol]:row[typeCol]})) continue; const distance=safeNumber(row[distanceCol]); if(distance<=0) continue; runs++; totalDistance+=distance; const hr=safeNumber(row[hrCol]); if(hr>0){totalHr+=hr; hrCount++;} let pace=parseHmsString(row[paceCol]); if(!pace&&row[elapsedCol]){const elapsed=parseHmsString(row[elapsedCol]); if(elapsed>0&&distance>0) pace=elapsed/distance;} if(pace>0){totalPace+=pace; paceCount++;} const dt=parseFlexibleDate(row[dateCol]); if(dt){dated.push({date:dt,distance}); if(dt>=six) sixMonthDistance+=distance; if(dt>=one) oneYearDistance+=distance;}} if(!runs) return null; let weeklyEstimate=0; if(dated.length>1){dated.sort((a,b)=>a.date-b.date); const spanDays=Math.max(7,Math.round((dated[dated.length-1].date-dated[0].date)/(1000*60*60*24))+1); weeklyEstimate=(totalDistance/spanDays)*7;} else if(oneYearDistance>0) weeklyEstimate=oneYearDistance/52; return {runs,totalDistance,avgPace:paceCount?totalPace/paceCount:0,avgHr:hrCount?totalHr/hrCount:0,sixMonthDistance,oneYearDistance,weeklyEstimate};}
function setCsvSummary(s){if(!s){["csvRuns","csvDistance","csvPace","csvHr","csv6m","csv1y","csvWeekly"].forEach(id=>setText(id,"-")); return;} setText("csvRuns",String(s.runs)); setText("csvDistance",`${s.totalDistance.toFixed(1)} km`); setText("csvPace",s.avgPace?secondsToPace(s.avgPace):"-"); setText("csvHr",s.avgHr?`${s.avgHr.toFixed(0)} bpm`:"-"); setText("csv6m",`${s.sixMonthDistance.toFixed(1)} km`); setText("csv1y",`${s.oneYearDistance.toFixed(1)} km`); setText("csvWeekly",`${s.weeklyEstimate.toFixed(1)} km`);}
byId("csvFile")?.addEventListener("change",async e=>{
  const file=e.target.files[0];
  if(!file){
    setText("csvFileName","선택된 파일 없음");
    latestCsvSummary=null;
    setCsvSummary(null);
    setTrainingFeedbackDefault();
    return;
  }
  setText("csvFileName",file.name);
  try{
    const rows = parseCsv(await file.text());
    const summary = summarizeTrainingCsv(rows);
    latestCsvSummary=summary;
    setCsvSummary(summary);
    const stats = analyzeTrainingRows(rows);
    const ltPace = msToSeconds(byId("ltPaceMin")?.value,byId("ltPaceSec")?.value);
    const tenk = hmsToSeconds(byId("tenkH")?.value,byId("tenkM")?.value,byId("tenkS")?.value);
    const half = hmsToSeconds(byId("halfH")?.value,byId("halfM")?.value,byId("halfS")?.value);
    const full = hmsToSeconds(byId("fullH")?.value,byId("fullM")?.value,byId("fullS")?.value);
    const mode = byId("raceMode")?.value || "10K";
    const pred = pickPrediction(mode,tenk,half,full);
    const fullEqSec = full || (pred.pred ? (mode==="full" ? pred.pred : (mode==="half" ? riegel(pred.pred,21.0975,42.195,1.06) : riegel(pred.pred,10,42.195,1.06))) : 0);
    const built = buildTrainingAdvice(stats, { ltPace, vo2:num(byId("vo2max")?.value), fullEqSec });
    setTrainingFeedback(stats, built);
    setText("csvFileName",summary?`${file.name} · 업로드 완료`:`${file.name} · 러닝 데이터 인식 실패`);
  }catch(err){
    latestCsvSummary=null;
    setText("csvFileName",`${file.name} · 읽기 실패`);
    setCsvSummary(null);
    setTrainingFeedbackDefault();
  }
});
byId("applyCsvBtn")?.addEventListener("click",()=>{if(!latestCsvSummary){setText("heroMeta","먼저 CSV를 업로드해줘"); return;} setValue("mileage6m",latestCsvSummary.sixMonthDistance.toFixed(1)); setValue("mileage1y",latestCsvSummary.oneYearDistance.toFixed(1)); setValue("weekly",latestCsvSummary.weeklyEstimate.toFixed(1)); if(latestCsvSummary.avgHr>0) setValue("avgHrInput",latestCsvSummary.avgHr.toFixed(0)); setText("heroMeta","CSV 요약값을 입력칸에 적용했어"); saveAppState();});
function getAppState(){const ids=["tenkH","tenkM","tenkS","halfH","halfM","halfS","fullH","fullM","fullS","heightCm","weightKg","vo2max","ltPaceMin","ltPaceSec","ltHr","avgHrInput","mileage6m","mileage1y","weekly","profileNote","raceMode","paceCalcMode","distPreset","distCustom","targetTimeH","targetTimeM","targetTimeS","targetPaceMin","targetPaceSec","customRaceName","customRaceMode","customRaceSpeed","customRaceHill","customRaceTurns","customRaceWeather","customRaceFinish","customRaceDesc","customRaceSeason","customRaceElevation","customRaceFactorPreview"]; const s={}; ids.forEach(id=>s[id]=byId(id)?.value||""); s.customRaceFavorite=byId("customRaceFavorite")?.checked||false; ["heroTime","heroPace","heroMeta","resultTime","resultPace","resultNote","paceResult","paceSubResult","tenkPreview","halfPreview","fullPreview","ltPacePreview","targetTimePreview","targetPacePreview","sub3Score","sub3FullEq","sub3Label","sub3Note","fbWeeklyAvg","fbLongestRun","fbRunFreq","fbPriority","fbSignals","fbAdvice"].forEach(id=>s[id]=byId(id)?.textContent||""); s.sub3BarWidth=byId("sub3Bar")?.style.width||"0%"; s.raceCardsHtml=byId("raceCards")?.innerHTML||""; return s;}
function saveAppState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(getAppState()));}
function loadAppState(){try{const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return; const s=JSON.parse(raw); Object.keys(s).forEach(k=>{const el=byId(k); if(el&&("value" in el)) el.value=s[k]||"";}); if(byId("customRaceFavorite")) byId("customRaceFavorite").checked=!!s.customRaceFavorite; ["heroTime","heroPace","heroMeta","resultTime","resultPace","resultNote","paceResult","paceSubResult","tenkPreview","halfPreview","fullPreview","ltPacePreview","targetTimePreview","targetPacePreview","sub3Score","sub3FullEq","sub3Label","sub3Note","fbWeeklyAvg","fbLongestRun","fbRunFreq","fbPriority","fbSignals","fbAdvice"].forEach(id=>setText(id,s[id]||byId(id)?.textContent||"")); if(byId("sub3Bar")&&s.sub3BarWidth) byId("sub3Bar").style.width=s.sub3BarWidth; if(byId("raceCards")&&s.raceCardsHtml) byId("raceCards").innerHTML=s.raceCardsHtml;}catch(e){}}
function bindAutoSave(id,ev="input"){const el=byId(id); if(el) el.addEventListener(ev,saveAppState);}
loadAppState(); renderCustomRaceList(); updateFactorPreview(); updatePaceModeVisibility(); updateTimePreview(); toggleDistanceCustom();
["tenkH","tenkM","tenkS","halfH","halfM","halfS","fullH","fullM","fullS","heightCm","weightKg","vo2max","ltPaceMin","ltPaceSec","ltHr","avgHrInput","mileage6m","mileage1y","weekly","profileNote","distCustom","targetTimeH","targetTimeM","targetTimeS","targetPaceMin","targetPaceSec","customRaceName"].forEach(id=>bindAutoSave(id,"input")); ["raceMode","paceCalcMode","distPreset","customRaceMode","customRaceSpeed","customRaceHill","customRaceTurns","customRaceWeather","customRaceFinish","customRaceDesc","customRaceSeason","customRaceElevation"].forEach(id=>bindAutoSave(id,"change"));

setSub3Gauge(0,0,"기록을 입력하면 서브3 가능성 게이지가 표시돼.","주간거리, 누적거리, VO2max, 젖산 역치 페이스 등을 가볍게 반영한 참고용 지표야.");

setTrainingFeedbackDefault();
