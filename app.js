
let latestCsvSummary = null;

const STORAGE_KEY = "running_race_predictor_web_state_v2_4";
const CUSTOM_RACE_KEY = "running_race_predictor_custom_races_v1";

const RACE_DB = {
  full: [
    { id: "seoul_full", name: "서울마라톤", factor: 0.992, desc: "기록 친화적", season: "봄", elevation: "낮음", favorite: true, source: "base" },
    { id: "daegu_full", name: "대구마라톤", factor: 0.993, desc: "고속 코스", season: "봄", elevation: "낮음", favorite: true, source: "base" },
    { id: "jtbc_full", name: "JTBC 서울마라톤", factor: 0.995, desc: "도심형 무난 코스", season: "가을", elevation: "중간", favorite: false, source: "base" },
    { id: "chuncheon_full", name: "춘천마라톤", factor: 1.006, desc: "후반 미세 난이도", season: "가을", elevation: "중간", favorite: false, source: "base" },
    { id: "gyeongju_full", name: "경주국제마라톤", factor: 1.004, desc: "무난하나 변수 존재", season: "가을", elevation: "중간", favorite: false, source: "base" },
    { id: "gongju_full", name: "공주마라톤", factor: 1.012, desc: "업다운 변수 존재", season: "가을", elevation: "조금 높음", favorite: true, source: "base" }
  ],
  half: [
    { id: "seoul_half", name: "서울하프마라톤", factor: 0.996, desc: "하프 기록 친화적", season: "봄", elevation: "낮음", favorite: true, source: "base" },
    { id: "gyeongju_half", name: "경주국제마라톤 하프", factor: 1.003, desc: "무난한 하프", season: "가을", elevation: "중간", favorite: false, source: "base" },
    { id: "city_half", name: "도심 하프 기준", factor: 0.999, desc: "비교용 기준 코스", season: "봄", elevation: "보통", favorite: false, source: "base" }
  ],
  tenk: [
    { id: "seoul_10k", name: "서울마라톤 10K", factor: 0.998, desc: "빠른 10K", season: "봄", elevation: "낮음", favorite: true, source: "base" },
    { id: "jtbc_10k", name: "JTBC 서울마라톤 10K", factor: 1.000, desc: "일반적인 도심형", season: "가을", elevation: "보통", favorite: false, source: "base" },
    { id: "seoulhalf_10k", name: "서울하프마라톤 10K", factor: 1.001, desc: "무난한 10K", season: "봄", elevation: "보통", favorite: false, source: "base" },
    { id: "gyeongju_10k", name: "경주국제마라톤 10K", factor: 1.004, desc: "약간의 변수", season: "가을", elevation: "중간", favorite: false, source: "base" }
  ]
};

function byId(id) { return document.getElementById(id); }
function setText(id, value) { const el = byId(id); if (el) el.textContent = value; }
function setValue(id, value) { const el = byId(id); if (el) el.value = value; }

function parseTimeToSeconds(text) {
  if (!text) return 0;
  const parts = text.trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function secondsToHms(seconds) {
  seconds = Math.round(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function secondsToPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return "-";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function getDistanceByMode(mode) {
  if (mode === "full") return 42.195;
  if (mode === "half") return 21.0975;
  return 10;
}

function getDbMode(mode) {
  if (mode === "full") return "full";
  if (mode === "half") return "half";
  return "tenk";
}

function riegel(timeSec, d1, d2, exponent = 1.06) {
  return timeSec * Math.pow(d2 / d1, exponent);
}

function pickPrediction(mode, tenk, half, full) {
  if (mode === "10K") return { dist: 10, pred: tenk || (half ? riegel(half, 21.0975, 10, 1.04) : 0) || (full ? riegel(full, 42.195, 10, 1.03) : 0), base: tenk ? "10K 기록 직접 사용" : (half ? "하프 기록 기반 예측" : "풀 기록 기반 예측") };
  if (mode === "half") return { dist: 21.0975, pred: half || (tenk ? riegel(tenk, 10, 21.0975, 1.06) : 0) || (full ? riegel(full, 42.195, 21.0975, 1.045) : 0), base: half ? "하프 기록 직접 사용" : (tenk ? "10K 기록 기반 예측" : "풀 기록 기반 예측") };
  return { dist: 42.195, pred: full || (half ? riegel(half, 21.0975, 42.195, 1.06) : 0) || (tenk ? riegel(tenk, 10, 42.195, 1.06) : 0), base: full ? "풀 기록 직접 사용" : (half ? "하프 기록 기반 예측" : "10K 기록 기반 예측") };
}

function setPredictionResult(timeText, paceText, noteText) {
  setText("resultTime", timeText);
  setText("resultPace", paceText);
  setText("resultNote", noteText);
  setText("heroTime", timeText);
  setText("heroPace", paceText);
  setText("heroMeta", noteText);
}

function loadCustomRaces() {
  try {
    const raw = localStorage.getItem(CUSTOM_RACE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("커스텀 대회 불러오기 실패", err);
    return [];
  }
}

function saveCustomRaces(races) {
  try {
    localStorage.setItem(CUSTOM_RACE_KEY, JSON.stringify(races));
  } catch (err) {
    console.error("커스텀 대회 저장 실패", err);
  }
}

function getAllRacesForMode(mode) {
  const dbMode = getDbMode(mode);
  const baseRaces = (RACE_DB[dbMode] || []).map(r => ({ ...r }));
  const customRaces = loadCustomRaces().filter(r => r.mode === dbMode);
  return [...baseRaces, ...customRaces];
}

function buildRaceCards(mode, basePredictionSec) {
  const dbMode = getDbMode(mode);
  const raceList = getAllRacesForMode(mode);
  const dist = getDistanceByMode(dbMode);
  return raceList
    .map(race => ({ ...race, pred: basePredictionSec * Number(race.factor || 1), pace: (basePredictionSec * Number(race.factor || 1)) / dist }))
    .sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.pred - b.pred;
    });
}

function renderRaceCards(mode, basePredictionSec) {
  const wrap = byId("raceCards");
  if (!wrap) return;
  if (!basePredictionSec || basePredictionSec <= 0) {
    wrap.innerHTML = '<div class="empty-message">계산하면 여기에 대회 비교 카드가 생겨.</div>';
    return;
  }
  try {
    const races = buildRaceCards(mode, basePredictionSec);
    if (!races.length) {
      wrap.innerHTML = '<div class="empty-message">대회 데이터가 아직 없어.</div>';
      return;
    }
    wrap.innerHTML = races.map(race => `
      <div class="race-card ${race.favorite ? "favorite" : ""}">
        <div class="badge-row">
          ${race.favorite ? '<span class="small-badge">즐겨찾기</span>' : ""}
          ${race.source === "custom" ? '<span class="small-badge">내 대회</span>' : ""}
        </div>
        <div class="race-card-title">${race.name}</div>
        <div class="race-card-time">${secondsToHms(race.pred)}</div>
        <div class="race-card-pace">${secondsToPace(race.pace)}</div>
        <div class="race-card-desc">${race.desc || "-"}</div>
        <div class="race-card-meta">${race.season || "-"} · ${race.elevation || "-"}</div>
      </div>
    `).join("");
  } catch (err) {
    wrap.innerHTML = `<div class="empty-message">대회 카드 생성 오류: ${err.message}</div>`;
    console.error(err);
  }
}

function renderCustomRaceList() {
  const wrap = byId("customRaceList");
  const msg = byId("customRaceMessage");
  if (!wrap || !msg) return;
  const races = loadCustomRaces();
  if (!races.length) {
    msg.textContent = "아직 추가한 대회가 없어.";
    wrap.innerHTML = "";
    return;
  }
  msg.textContent = `내 대회 ${races.length}개 저장됨`;
  wrap.innerHTML = races.map(race => `
    <div class="custom-race-item">
      <div class="custom-race-item-title">${race.name}</div>
      <div class="custom-race-item-meta">${race.mode.toUpperCase()} · 보정값 ${Number(race.factor).toFixed(3)} ${race.favorite ? "· 즐겨찾기" : ""}</div>
      <div class="custom-race-item-desc">${race.desc || "-"} · ${race.season || "-"} · ${race.elevation || "-"}</div>
      <div class="custom-race-item-actions">
        <button class="custom-mini-btn" onclick="toggleCustomFavorite('${race.id}')">${race.favorite ? "즐겨찾기 해제" : "즐겨찾기"}</button>
        <button class="custom-mini-btn" onclick="removeCustomRace('${race.id}')">삭제</button>
      </div>
    </div>
  `).join("");
}

window.toggleCustomFavorite = function(id) {
  const races = loadCustomRaces().map(r => r.id === id ? { ...r, favorite: !r.favorite } : r);
  saveCustomRaces(races);
  renderCustomRaceList();
  rerenderRaceCardsFromState();
};

window.removeCustomRace = function(id) {
  const races = loadCustomRaces().filter(r => r.id !== id);
  saveCustomRaces(races);
  renderCustomRaceList();
  rerenderRaceCardsFromState();
};

function rerenderRaceCardsFromState() {
  const state = getAppState();
  const mode = state.raceMode || "10K";
  const currentTime = parseTimeToSeconds(state.resultTime);
  if (currentTime > 0) renderRaceCards(mode, currentTime);
  else renderRaceCards(mode, 0);
  saveAppState();
}

const addCustomRaceBtn = byId("addCustomRaceBtn");
if (addCustomRaceBtn) {
  addCustomRaceBtn.addEventListener("click", () => {
    const name = byId("customRaceName")?.value.trim();
    const mode = byId("customRaceMode")?.value || "full";
    const factor = Number(byId("customRaceFactor")?.value || 0);
    const desc = byId("customRaceDesc")?.value.trim();
    const season = byId("customRaceSeason")?.value.trim();
    const elevation = byId("customRaceElevation")?.value.trim();
    const favorite = !!byId("customRaceFavorite")?.checked;

    if (!name) { setText("customRaceMessage", "대회명을 입력해줘"); return; }
    if (!factor || factor <= 0) { setText("customRaceMessage", "보정값을 0보다 크게 입력해줘"); return; }

    const races = loadCustomRaces();
    races.push({ id: `custom_${Date.now()}`, name, mode, factor, desc, season, elevation, favorite, source: "custom" });
    saveCustomRaces(races);

    setValue("customRaceName", "");
    setValue("customRaceFactor", "");
    setValue("customRaceDesc", "");
    setValue("customRaceSeason", "");
    setValue("customRaceElevation", "");
    if (byId("customRaceFavorite")) byId("customRaceFavorite").checked = false;

    setText("customRaceMessage", `${name} 추가 완료`);
    renderCustomRaceList();
    rerenderRaceCardsFromState();
  });
}

const clearCustomRacesBtn = byId("clearCustomRacesBtn");
if (clearCustomRacesBtn) {
  clearCustomRacesBtn.addEventListener("click", () => {
    localStorage.removeItem(CUSTOM_RACE_KEY);
    renderCustomRaceList();
    rerenderRaceCardsFromState();
    setText("customRaceMessage", "내 대회 전체 삭제 완료");
  });
}

const calcBtn = byId("calcBtn");
if (calcBtn) {
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
    if (!result.pred) {
      setPredictionResult("-", "-", "기록을 하나 이상 입력해줘");
      renderRaceCards(mode, 0);
      saveAppState();
      return;
    }

    let adjustedPred = result.pred;
    const comments = [result.base];

    if (weekly >= 50) { adjustedPred *= 0.992; comments.push("주간거리 양호"); }
    else if (weekly > 0 && weekly < 25) { adjustedPred *= 1.015; comments.push("주간거리 부족"); }

    if (mileage6m >= 800) { adjustedPred *= 0.994; comments.push("6개월 누적 양호"); }
    else if (mileage6m > 0 && mileage6m < 400) { adjustedPred *= 1.012; comments.push("6개월 거리 낮음"); }

    if (mileage1y >= 1600) comments.push("1년 누적 안정적");
    if (avgHr >= 155) comments.push("최근 훈련강도 높음");
    else if (avgHr > 0) comments.push("평균 심박 반영");

    setPredictionResult(
      secondsToHms(adjustedPred),
      secondsToPace(adjustedPred / result.dist),
      `${mode} 기준 예측 완료 · ${comments.join(" · ")}`
    );

    renderRaceCards(mode, adjustedPred);
    saveAppState();
  });
}

function updatePaceModeVisibility() {
  const mode = byId("paceCalcMode")?.value || "time_to_pace";
  byId("timeToPaceFields")?.classList.toggle("hidden", mode !== "time_to_pace");
  byId("paceToTimeFields")?.classList.toggle("hidden", mode !== "pace_to_time");
}

const paceCalcMode = byId("paceCalcMode");
if (paceCalcMode) {
  paceCalcMode.addEventListener("change", () => {
    updatePaceModeVisibility();
    saveAppState();
  });
}

const paceBtn = byId("paceBtn");
if (paceBtn) {
  paceBtn.addEventListener("click", () => {
    const mode = byId("paceCalcMode")?.value || "time_to_pace";
    const dist = Number(byId("dist")?.value || 0);

    if (!dist || dist <= 0) {
      setText("paceResult", "입력 확인");
      setText("paceSubResult", "거리(km)를 0보다 크게 입력해줘");
      saveAppState();
      return;
    }

    if (mode === "time_to_pace") {
      const time = parseTimeToSeconds(byId("targetTime")?.value || "");
      if (!time) {
        setText("paceResult", "입력 확인");
        setText("paceSubResult", "목표 시간을 입력해줘");
        saveAppState();
        return;
      }
      const pace = time / dist;
      setText("paceResult", secondsToPace(pace));
      setText("paceSubResult", `총 기록 ${secondsToHms(time)} · 거리 ${dist}km`);
    } else {
      const pace = parseTimeToSeconds(byId("targetPace")?.value || "");
      if (!pace) {
        setText("paceResult", "입력 확인");
        setText("paceSubResult", "목표 페이스를 입력해줘");
        saveAppState();
        return;
      }
      const total = pace * dist;
      setText("paceResult", secondsToHms(total));
      setText("paceSubResult", `평균 페이스 ${secondsToPace(pace)} · 거리 ${dist}km`);
    }
    saveAppState();
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || "").trim(); });
    rows.push(row);
  }
  return rows;
}

function findColumn(row, candidates) {
  const keys = Object.keys(row);
  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const cand of candidates) {
      if (lower.includes(cand)) return key;
    }
  }
  return null;
}

function safeNumber(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseFlexibleDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function looksLikeRun(row) {
  const text = Object.values(row).join(" ").toLowerCase();
  const positive = ["run", "running", "러닝", "달리기", "트레드밀"];
  const negative = ["ride", "cycling", "bike", "walk", "hike", "swim", "요가"];
  if (positive.some(word => text.includes(word))) return true;
  if (negative.some(word => text.includes(word))) return false;
  return true;
}

function summarizeTrainingCsv(rows) {
  if (!rows.length) return null;
  const sample = rows[0];
  const dateCol = findColumn(sample, ["activity date", "date", "start time", "날짜", "일자"]);
  const distanceCol = findColumn(sample, ["distance", "거리", "kilometers", "kilometres", "km"]);
  const elapsedCol = findColumn(sample, ["moving time", "elapsed time", "duration", "time", "이동 시간", "경과 시간"]);
  const paceCol = findColumn(sample, ["avg pace", "average pace", "pace", "페이스"]);
  const hrCol = findColumn(sample, ["avg hr", "average heart rate", "heart rate", "심박"]);
  const typeCol = findColumn(sample, ["sport type", "activity type", "type", "활동 종류"]);

  let runs = 0, totalDistance = 0, totalHr = 0, hrCount = 0, totalPace = 0, paceCount = 0, sixMonthDistance = 0, oneYearDistance = 0;
  const datedDistances = [];
  const now = new Date();
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(now.getMonth() - 6);
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(now.getFullYear() - 1);

  for (const row of rows) {
    if (typeCol && !looksLikeRun({ [typeCol]: row[typeCol] })) continue;
    const distance = safeNumber(row[distanceCol]);
    if (distance <= 0) continue;

    runs += 1;
    totalDistance += distance;

    const hr = safeNumber(row[hrCol]);
    if (hr > 0) { totalHr += hr; hrCount += 1; }

    const paceText = row[paceCol];
    const elapsedText = row[elapsedCol];
    let pace = parseTimeToSeconds(paceText);
    if (!pace && elapsedText) {
      const elapsed = parseTimeToSeconds(elapsedText);
      if (elapsed > 0 && distance > 0) pace = elapsed / distance;
    }
    if (pace > 0) { totalPace += pace; paceCount += 1; }

    const dt = parseFlexibleDate(row[dateCol]);
    if (dt) {
      datedDistances.push({ date: dt, distance });
      if (dt >= sixMonthsAgo) sixMonthDistance += distance;
      if (dt >= oneYearAgo) oneYearDistance += distance;
    }
  }

  if (!runs) return null;

  let weeklyEstimate = 0;
  if (datedDistances.length > 1) {
    datedDistances.sort((a, b) => a.date - b.date);
    const first = datedDistances[0].date;
    const last = datedDistances[datedDistances.length - 1].date;
    const spanDays = Math.max(7, Math.round((last - first) / (1000 * 60 * 60 * 24)) + 1);
    weeklyEstimate = (totalDistance / spanDays) * 7;
  } else if (oneYearDistance > 0) {
    weeklyEstimate = oneYearDistance / 52;
  }

  return { runs, totalDistance, avgPace: paceCount ? totalPace / paceCount : 0, avgHr: hrCount ? totalHr / hrCount : 0, sixMonthDistance, oneYearDistance, weeklyEstimate };
}

function setCsvSummary(summary) {
  if (!summary) {
    setText("csvRuns", "-"); setText("csvDistance", "-"); setText("csvPace", "-"); setText("csvHr", "-"); setText("csv6m", "-"); setText("csv1y", "-"); setText("csvWeekly", "-");
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
if (csvFile) {
  csvFile.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setText("csvFileName", "선택된 파일 없음");
      latestCsvSummary = null;
      setCsvSummary(null);
      return;
    }
    setText("csvFileName", file.name);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const summary = summarizeTrainingCsv(rows);
      latestCsvSummary = summary;
      setCsvSummary(summary);
      if (!summary) setText("csvFileName", `${file.name} · 러닝 데이터 인식 실패`);
      else setText("csvFileName", `${file.name} · 업로드 완료`);
    } catch (err) {
      latestCsvSummary = null;
      setText("csvFileName", `${file.name} · 읽기 실패`);
      setCsvSummary(null);
    }
  });
}

const applyCsvBtn = byId("applyCsvBtn");
if (applyCsvBtn) {
  applyCsvBtn.addEventListener("click", () => {
    if (!latestCsvSummary) {
      setText("heroMeta", "먼저 CSV를 업로드해줘");
      return;
    }
    setValue("mileage6m", latestCsvSummary.sixMonthDistance.toFixed(1));
    setValue("mileage1y", latestCsvSummary.oneYearDistance.toFixed(1));
    setValue("weekly", latestCsvSummary.weeklyEstimate.toFixed(1));
    if (latestCsvSummary.avgHr > 0) setValue("avgHrInput", latestCsvSummary.avgHr.toFixed(0));
    setText("heroMeta", "CSV 요약값을 입력칸에 적용했어");
    saveAppState();
  });
}

function getAppState() {
  return {
    tenk: byId("tenk")?.value || "",
    half: byId("half")?.value || "",
    full: byId("full")?.value || "",
    mileage6m: byId("mileage6m")?.value || "",
    mileage1y: byId("mileage1y")?.value || "",
    weekly: byId("weekly")?.value || "",
    avgHrInput: byId("avgHrInput")?.value || "",
    raceMode: byId("raceMode")?.value || "10K",
    paceCalcMode: byId("paceCalcMode")?.value || "time_to_pace",
    dist: byId("dist")?.value || "",
    targetTime: byId("targetTime")?.value || "",
    targetPace: byId("targetPace")?.value || "",
    heroTime: byId("heroTime")?.textContent || "-",
    heroPace: byId("heroPace")?.textContent || "-",
    heroMeta: byId("heroMeta")?.textContent || "기록을 입력하고 계산해줘",
    resultTime: byId("resultTime")?.textContent || "-",
    resultPace: byId("resultPace")?.textContent || "-",
    resultNote: byId("resultNote")?.textContent || "기록을 입력하고 계산해줘",
    paceResult: byId("paceResult")?.textContent || "-",
    paceSubResult: byId("paceSubResult")?.textContent || "-",
    raceCardsHtml: byId("raceCards")?.innerHTML || ""
  };
}

function saveAppState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(getAppState())); }
  catch (err) { console.error("저장 실패", err); }
}

function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);

    setValue("tenk", state.tenk || "");
    setValue("half", state.half || "");
    setValue("full", state.full || "");
    setValue("mileage6m", state.mileage6m || "");
    setValue("mileage1y", state.mileage1y || "");
    setValue("weekly", state.weekly || "");
    setValue("avgHrInput", state.avgHrInput || "");
    setValue("raceMode", state.raceMode || "10K");
    setValue("paceCalcMode", state.paceCalcMode || "time_to_pace");
    setValue("dist", state.dist || "");
    setValue("targetTime", state.targetTime || "");
    setValue("targetPace", state.targetPace || "");

    setText("heroTime", state.heroTime || "-");
    setText("heroPace", state.heroPace || "-");
    setText("heroMeta", state.heroMeta || "기록을 입력하고 계산해줘");
    setText("resultTime", state.resultTime || "-");
    setText("resultPace", state.resultPace || "-");
    setText("resultNote", state.resultNote || "기록을 입력하고 계산해줘");
    setText("paceResult", state.paceResult || "-");
    setText("paceSubResult", state.paceSubResult || "-");

    const raceCards = byId("raceCards");
    if (raceCards && state.raceCardsHtml) raceCards.innerHTML = state.raceCardsHtml;
  } catch (err) {
    console.error("불러오기 실패", err);
  }
}

function bindAutoSave(id, eventName = "input") {
  const el = byId(id);
  if (el) el.addEventListener(eventName, saveAppState);
}

loadAppState();
renderCustomRaceList();

["tenk","half","full","mileage6m","mileage1y","weekly","avgHrInput","dist","targetTime","targetPace"]
  .forEach(id => bindAutoSave(id, "input"));
["raceMode","paceCalcMode"].forEach(id => bindAutoSave(id, "change"));

updatePaceModeVisibility();
