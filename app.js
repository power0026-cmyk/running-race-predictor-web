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
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function secondsToPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return "-";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function riegel(timeSec, d1, d2, exponent = 1.06) {
  return timeSec * Math.pow(d2 / d1, exponent);
}

function pickPrediction(mode, tenk, half, full) {
  if (mode === "10K") {
    return {
      dist: 10,
      pred: tenk || (half ? riegel(half, 21.0975, 10, 1.04) : 0) || (full ? riegel(full, 42.195, 10, 1.03) : 0),
      base: tenk ? "10K 기록 직접 사용" : (half ? "하프 기록 기반 예측" : "풀 기록 기반 예측"),
    };
  }
  if (mode === "half") {
    return {
      dist: 21.0975,
      pred: half || (tenk ? riegel(tenk, 10, 21.0975, 1.06) : 0) || (full ? riegel(full, 42.195, 21.0975, 1.045) : 0),
      base: half ? "하프 기록 직접 사용" : (tenk ? "10K 기록 기반 예측" : "풀 기록 기반 예측"),
    };
  }
  return {
    dist: 42.195,
    pred: full || (half ? riegel(half, 21.0975, 42.195, 1.06) : 0) || (tenk ? riegel(tenk, 10, 42.195, 1.06) : 0),
    base: full ? "풀 기록 직접 사용" : (half ? "하프 기록 기반 예측" : "10K 기록 기반 예측"),
  };
}

function setPredictionResult(timeText, paceText, noteText) {
  document.getElementById("resultTime").textContent = timeText;
  document.getElementById("resultPace").textContent = paceText;
  document.getElementById("resultNote").textContent = noteText;
  document.getElementById("heroTime").textContent = timeText;
  document.getElementById("heroPace").textContent = paceText;
  document.getElementById("heroMeta").textContent = noteText;
}

document.getElementById("calcBtn").addEventListener("click", () => {
  const tenk = parseTimeToSeconds(document.getElementById("tenk").value);
  const half = parseTimeToSeconds(document.getElementById("half").value);
  const full = parseTimeToSeconds(document.getElementById("full").value);
  const mode = document.getElementById("raceMode").value;
  const result = pickPrediction(mode, tenk, half, full);

  if (!result.pred) {
    setPredictionResult("-", "-", "기록을 하나 이상 입력해줘");
    return;
  }

  setPredictionResult(
    secondsToHms(result.pred),
    secondsToPace(result.pred / result.dist),
    `${mode} 기준 예측 완료 · ${result.base}`
  );
});

function updatePaceModeVisibility() {
  const mode = document.getElementById("paceCalcMode").value;
  document.getElementById("timeToPaceFields").classList.toggle("hidden", mode !== "time_to_pace");
  document.getElementById("paceToTimeFields").classList.toggle("hidden", mode !== "pace_to_time");
}

document.getElementById("paceCalcMode").addEventListener("change", updatePaceModeVisibility);

document.getElementById("paceBtn").addEventListener("click", () => {
  const mode = document.getElementById("paceCalcMode").value;
  const dist = Number(document.getElementById("dist").value || 0);

  if (!dist || dist <= 0) {
    document.getElementById("paceResult").textContent = "입력 확인";
    document.getElementById("paceSubResult").textContent = "거리(km)를 0보다 크게 입력해줘";
    return;
  }

  if (mode === "time_to_pace") {
    const time = parseTimeToSeconds(document.getElementById("targetTime").value);
    if (!time) {
      document.getElementById("paceResult").textContent = "입력 확인";
      document.getElementById("paceSubResult").textContent = "목표 시간을 입력해줘";
      return;
    }
    const pace = time / dist;
    document.getElementById("paceResult").textContent = secondsToPace(pace);
    document.getElementById("paceSubResult").textContent = `총 기록 ${secondsToHms(time)} · 거리 ${dist}km`;
  } else {
    const pace = parseTimeToSeconds(document.getElementById("targetPace").value);
    if (!pace) {
      document.getElementById("paceResult").textContent = "입력 확인";
      document.getElementById("paceSubResult").textContent = "목표 페이스를 입력해줘";
      return;
    }
    const total = pace * dist;
    document.getElementById("paceResult").textContent = secondsToHms(total);
    document.getElementById("paceSubResult").textContent = `평균 페이스 ${secondsToPace(pace)} · 거리 ${dist}km`;
  }
});

updatePaceModeVisibility();

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function findColumn(row, candidates) {
  const keys = Object.keys(row);
  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const cand of candidates) {
      if (lower.includes(cand)) {
        return key;
      }
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

  let runs = 0;
  let totalDistance = 0;
  let totalHr = 0;
  let hrCount = 0;
  let totalPace = 0;
  let paceCount = 0;
  let sixMonthDistance = 0;

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  for (const row of rows) {
    if (typeCol && !looksLikeRun({[typeCol]: row[typeCol]})) continue;

    const distance = safeNumber(row[distanceCol]);
    if (distance <= 0) continue;

    runs += 1;
    totalDistance += distance;

    const hr = safeNumber(row[hrCol]);
    if (hr > 0) {
      totalHr += hr;
      hrCount += 1;
    }

    const paceText = row[paceCol];
    const elapsedText = row[elapsedCol];

    let pace = parseTimeToSeconds(paceText);
    if (!pace && elapsedText) {
      const elapsed = parseTimeToSeconds(elapsedText);
      if (elapsed > 0 && distance > 0) {
        pace = elapsed / distance;
      }
    }

    if (pace > 0) {
      totalPace += pace;
      paceCount += 1;
    }

    const dt = parseFlexibleDate(row[dateCol]);
    if (dt && dt >= sixMonthsAgo) {
      sixMonthDistance += distance;
    }
  }

  if (!runs) return null;

  return {
    runs,
    totalDistance,
    avgPace: paceCount ? totalPace / paceCount : 0,
    avgHr: hrCount ? totalHr / hrCount : 0,
    sixMonthDistance
  };
}

function setCsvSummary(summary) {
  if (!summary) {
    document.getElementById("csvRuns").textContent = "-";
    document.getElementById("csvDistance").textContent = "-";
    document.getElementById("csvPace").textContent = "-";
    document.getElementById("csvHr").textContent = "-";
    document.getElementById("csv6m").textContent = "-";
    return;
  }

  document.getElementById("csvRuns").textContent = String(summary.runs);
  document.getElementById("csvDistance").textContent = `${summary.totalDistance.toFixed(1)} km`;
  document.getElementById("csvPace").textContent = summary.avgPace ? secondsToPace(summary.avgPace) : "-";
  document.getElementById("csvHr").textContent = summary.avgHr ? `${summary.avgHr.toFixed(0)} bpm` : "-";
  document.getElementById("csv6m").textContent = `${summary.sixMonthDistance.toFixed(1)} km`;
}

document.getElementById("csvFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    document.getElementById("csvFileName").textContent = "선택된 파일 없음";
    setCsvSummary(null);
    return;
  }

  document.getElementById("csvFileName").textContent = file.name;

  try {
    const text = await file.text();
    const rows = parseCsv(text);
    const summary = summarizeTrainingCsv(rows);
    setCsvSummary(summary);

    if (!summary) {
      document.getElementById("csvFileName").textContent = `${file.name} · 러닝 데이터 인식 실패`;
    } else {
      document.getElementById("csvFileName").textContent = `${file.name} · 업로드 완료`;
    }
  } catch (err) {
    document.getElementById("csvFileName").textContent = `${file.name} · 읽기 실패`;
    setCsvSummary(null);
  }
});
