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
