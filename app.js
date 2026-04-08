let latestCsvSummary = null;

function byId(id){ return document.getElementById(id); }
function setText(id, value){ const el = byId(id); if(el) el.textContent = value; }
function setValue(id, value){ const el = byId(id); if(el) el.value = value; }

function parseTimeToSeconds(text){
  if(!text) return 0;
  const parts = text.trim().split(":").map(Number);
  if(parts.some(Number.isNaN)) return 0;
  if(parts.length === 2) return parts[0]*60 + parts[1];
  if(parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  return 0;
}

function secondsToHms(seconds){
  seconds = Math.round(seconds);
  const h = Math.floor(seconds/3600);
  const m = Math.floor((seconds%3600)/60);
  const s = seconds%60;
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}

function secondsToPace(secPerKm){
  if(!secPerKm || secPerKm <= 0) return "-";
  const m = Math.floor(secPerKm/60);
  const s = Math.round(secPerKm%60);
  return `${m}:${String(s).padStart(2,"0")}/km`;
}

function riegel(timeSec, d1, d2, exponent=1.06){
  return timeSec * Math.pow(d2/d1, exponent);
}

function pickPrediction(mode, tenk, half, full){
  if(mode === "10K"){
    return { dist:10, pred: tenk || (half ? riegel(half,21.0975,10,1.04):0) || (full ? riegel(full,42.195,10,1.03):0), base: tenk ? "10K 기록 직접 사용" : (half ? "하프 기록 기반 예측" : "풀 기록 기반 예측") };
  }
  if(mode === "half"){
    return { dist:21.0975, pred: half || (tenk ? riegel(tenk,10,21.0975,1.06):0) || (full ? riegel(full,42.195,21.0975,1.045):0), base: half ? "하프 기록 직접 사용" : (tenk ? "10K 기록 기반 예측" : "풀 기록 기반 예측") };
  }
  return { dist:42.195, pred: full || (half ? riegel(half,21.0975,42.195,1.06):0) || (tenk ? riegel(tenk,10,42.195,1.06):0), base: full ? "풀 기록 직접 사용" : (half ? "하프 기록 기반 예측" : "10K 기록 기반 예측") };
}

function setPredictionResult(timeText, paceText, noteText){
  setText("resultTime", timeText);
  setText("resultPace", paceText);
  setText("resultNote", noteText);
  setText("heroTime", timeText);
  setText("heroPace", paceText);
  setText("heroMeta", noteText);
}

const calcBtn = byId("calcBtn");
if(calcBtn){
  calcBtn.addEventListener("click", () => {
    const tenk = parseTimeToSeconds(byId("tenk")?.value || "");
    const half = parseTimeToSeconds(byId("half")?.value || "");
    const full = parseTimeToSeconds(byId("full")?.value || "");
    const mode = byId("raceMode")?.value || "10K";
    const mileage6m = Number(byId("mileage6m")?.value || 0);
    const mileage1y = Number(byId("mileage1y")?.value || 0);
    const weekly = Number(byId("weekly")?.value || 0);
    const avgHr = Number(byId("avgHrInput")?.value || 0);

    const result = pickPrediction(mode, tenk, half, full);
    if(!result.pred){
      setPredictionResult("-", "-", "기록을 하나 이상 입력해줘");
      return;
    }

    let adjustedPred = result.pred;
    const comments = [result.base];

    if(weekly >= 50){ adjustedPred *= 0.992; comments.push("주간거리 양호"); }
    else if(weekly > 0 && weekly < 25){ adjustedPred *= 1.015; comments.push("주간거리 부족"); }

    if(mileage6m >= 800){ adjustedPred *= 0.994; comments.push("6개월 누적 양호"); }
    else if(mileage6m > 0 && mileage6m < 400){ adjustedPred *= 1.012; comments.push("6개월 거리 낮음"); }

    if(mileage1y >= 1600){ adjustedPred *= 0.996; comments.push("1년 누적 안정적"); }

    if(avgHr >= 155) comments.push("최근 훈련강도 높음");
    else if(avgHr > 0) comments.push("평균 심박 반영");

    setPredictionResult(secondsToHms(adjustedPred), secondsToPace(adjustedPred/result.dist), `${mode} 기준 예측 완료 · ${comments.join(" · ")}`);
  });
}

function updatePaceModeVisibility(){
  const mode = byId("paceCalcMode")?.value || "time_to_pace";
  byId("timeToPaceFields")?.classList.toggle("hidden", mode !== "time_to_pace");
  byId("paceToTimeFields")?.classList.toggle("hidden", mode !== "pace_to_time");
}

const paceCalcMode = byId("paceCalcMode");
if(paceCalcMode) paceCalcMode.addEventListener("change", updatePaceModeVisibility);

const paceBtn = byId("paceBtn");
if(paceBtn){
  paceBtn.addEventListener("click", () => {
    const mode = byId("paceCalcMode")?.value || "time_to_pace";
    const dist = Number(byId("dist")?.value || 0);

    if(!dist || dist <= 0){
      setText("paceResult","입력 확인");
      setText("paceSubResult","거리(km)를 0보다 크게 입력해줘");
      return;
    }

    if(mode === "time_to_pace"){
      const time = parseTimeToSeconds(byId("targetTime")?.value || "");
      if(!time){
        setText("paceResult","입력 확인");
        setText("paceSubResult","목표 시간을 입력해줘");
        return;
      }
      const pace = time / dist;
      setText("paceResult", secondsToPace(pace));
      setText("paceSubResult", `총 기록 ${secondsToHms(time)} · 거리 ${dist}km`);
    } else {
      const pace = parseTimeToSeconds(byId("targetPace")?.value || "");
      if(!pace){
        setText("paceResult","입력 확인");
        setText("paceSubResult","목표 페이스를 입력해줘");
        return;
      }
      const total = pace * dist;
      setText("paceResult", secondsToHms(total));
      setText("paceSubResult", `평균 페이스 ${secondsToPace(pace)} · 거리 ${dist}km`);
    }
  });
}

function parseCsvLine(line){
  const result = [];
  let current = "";
  let inQuotes = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch === '"'){
      if(inQuotes && line[i+1] === '"'){ current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if(ch === "," && !inQuotes){
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(text){
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if(!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || "").trim(); });
    rows.push(row);
  }
  return rows;
}

function findColumn(row, candidates){
  const keys = Object.keys(row);
  for(const key of keys){
    const lower = key.toLowerCase();
    for(const cand of candidates){
      if(lower.includes(cand)) return key;
    }
  }
  return null;
}

function safeNumber(value){
  if(!value) return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseFlexibleDate(value){
  if(!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function looksLikeRun(row){
  const text = Object.values(row).join(" ").toLowerCase();
  const positive = ["run","running","러닝","달리기","트레드밀"];
  const negative = ["ride","cycling","bike","walk","hike","swim","요가"];
  if(positive.some(word => text.includes(word))) return true;
  if(negative.some(word => text.includes(word))) return false;
  return true;
}

function summarizeTrainingCsv(rows){
  if(!rows.length) return null;
  const sample = rows[0];
  const dateCol = findColumn(sample, ["activity date","date","start time","날짜","일자"]);
  const distanceCol = findColumn(sample, ["distance","거리","kilometers","kilometres","km"]);
  const elapsedCol = findColumn(sample, ["moving time","elapsed time","duration","time","이동 시간","경과 시간"]);
  const paceCol = findColumn(sample, ["avg pace","average pace","pace","페이스"]);
  const hrCol = findColumn(sample, ["avg hr","average heart rate","heart rate","심박"]);
  const typeCol = findColumn(sample, ["sport type","activity type","type","활동 종류"]);

  let runs = 0, totalDistance = 0, totalHr = 0, hrCount = 0, totalPace = 0, paceCount = 0, sixMonthDistance = 0, oneYearDistance = 0;
  const datedDistances = [];

  const now = new Date();
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(now.getMonth()-6);
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(now.getFullYear()-1);

  for(const row of rows){
    if(typeCol && !looksLikeRun({ [typeCol]: row[typeCol] })) continue;
    const distance = safeNumber(row[distanceCol]);
    if(distance <= 0) continue;

    runs += 1;
    totalDistance += distance;

    const hr = safeNumber(row[hrCol]);
    if(hr > 0){ totalHr += hr; hrCount += 1; }

    const paceText = row[paceCol];
    const elapsedText = row[elapsedCol];
    let pace = parseTimeToSeconds(paceText);

    if(!pace && elapsedText){
      const elapsed = parseTimeToSeconds(elapsedText);
      if(elapsed > 0 && distance > 0) pace = elapsed / distance;
    }

    if(pace > 0){ totalPace += pace; paceCount += 1; }

    const dt = parseFlexibleDate(row[dateCol]);
    if(dt){
      datedDistances.push({ date: dt, distance });
      if(dt >= sixMonthsAgo) sixMonthDistance += distance;
      if(dt >= oneYearAgo) oneYearDistance += distance;
    }
  }

  if(!runs) return null;

  let weeklyEstimate = 0;
  if(datedDistances.length > 1){
    datedDistances.sort((a,b) => a.date - b.date);
    const first = datedDistances[0].date;
    const last = datedDistances[datedDistances.length - 1].date;
    const spanDays = Math.max(7, Math.round((last - first)/(1000*60*60*24)) + 1);
    weeklyEstimate = (totalDistance / spanDays) * 7;
  } else if(oneYearDistance > 0){
    weeklyEstimate = oneYearDistance / 52;
  }

  return { runs, totalDistance, avgPace: paceCount ? totalPace/paceCount : 0, avgHr: hrCount ? totalHr/hrCount : 0, sixMonthDistance, oneYearDistance, weeklyEstimate };
}

function setCsvSummary(summary){
  if(!summary){
    setText("csvRuns","-"); setText("csvDistance","-"); setText("csvPace","-"); setText("csvHr","-"); setText("csv6m","-"); setText("csv1y","-"); setText("csvWeekly","-");
    return;
  }
  setText("csvRuns", String(summary.runs));
  setText("csvDistance", `${summary.totalDistance.toFixed(1)} km`);
  setText("csvPace", summary.avgPace ? secondsToPace(summary.avgPace) : "-");
  setText("csvHr", summary.avgHr ? `${summary.avgHr.toFixed(0)} bpm` : "-");
  setText("csv6m", `${summary.sixMonthDistance.toFixed(1)} km`);
  setText("csv1y", `${summary.oneYearDistance.toFixed(1)} km`);
  setText("csvWeekly", `${summary.weeklyEstimate.toFixed(1)} km`);
}

const csvFile = byId("csvFile");
if(csvFile){
  csvFile.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if(!file){
      setText("csvFileName","선택된 파일 없음");
      latestCsvSummary = null;
      setCsvSummary(null);
      return;
    }
    setText("csvFileName", file.name);
    try{
      const text = await file.text();
      const rows = parseCsv(text);
      const summary = summarizeTrainingCsv(rows);
      latestCsvSummary = summary;
      setCsvSummary(summary);
      if(!summary) setText("csvFileName", `${file.name} · 러닝 데이터 인식 실패`);
      else setText("csvFileName", `${file.name} · 업로드 완료`);
    } catch(err){
      latestCsvSummary = null;
      setText("csvFileName", `${file.name} · 읽기 실패`);
      setCsvSummary(null);
    }
  });
}

const applyCsvBtn = byId("applyCsvBtn");
if(applyCsvBtn){
  applyCsvBtn.addEventListener("click", () => {
    if(!latestCsvSummary){
      setText("heroMeta","먼저 CSV를 업로드해줘");
      return;
    }
    setValue("mileage6m", latestCsvSummary.sixMonthDistance.toFixed(1));
    setValue("mileage1y", latestCsvSummary.oneYearDistance.toFixed(1));
    setValue("weekly", latestCsvSummary.weeklyEstimate.toFixed(1));
    if(latestCsvSummary.avgHr > 0) setValue("avgHrInput", latestCsvSummary.avgHr.toFixed(0));
    setText("heroMeta","CSV 요약값을 입력칸에 적용했어");
  });
}

updatePaceModeVisibility();
