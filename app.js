function parseTimeToSeconds(text) {
  if (!text) return 0;
  const parts = text.trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
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
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function riegel(timeSec, d1, d2, exponent = 1.06) {
  return timeSec * Math.pow(d2 / d1, exponent);
}

document.getElementById("calcBtn").addEventListener("click", () => {
  const tenk = parseTimeToSeconds(document.getElementById("tenk").value);
  const half = parseTimeToSeconds(document.getElementById("half").value);
  const full = parseTimeToSeconds(document.getElementById("full").value);
  const mode = document.getElementById("raceMode").value;

  let pred = 0;
  let dist = 10;

  if (mode === "10K") {
    dist = 10;
    pred = tenk || (half ? riegel(half, 21.0975, 10, 1.04) : 0) || (full ? riegel(full, 42.195, 10, 1.03) : 0);
  } else if (mode === "half") {
    dist = 21.0975;
    pred = half || (tenk ? riegel(tenk, 10, 21.0975, 1.06) : 0) || (full ? riegel(full, 42.195, 21.0975, 1.045) : 0);
  } else {
    dist = 42.195;
    pred = full || (half ? riegel(half, 21.0975, 42.195, 1.06) : 0) || (tenk ? riegel(tenk, 10, 42.195, 1.06) : 0);
  }

  if (!pred) {
    document.getElementById("resultTime").textContent = "-";
    document.getElementById("resultPace").textContent = "-";
    document.getElementById("resultNote").textContent = "기록을 하나 이상 입력해줘";
    return;
  }

  document.getElementById("resultTime").textContent = secondsToHms(pred);
  document.getElementById("resultPace").textContent = secondsToPace(pred / dist);
  document.getElementById("resultNote").textContent = "웹 1단계 기본 예측 완료";
});

document.getElementById("paceBtn").addEventListener("click", () => {
  const dist = Number(document.getElementById("dist").value || 0);
  const time = parseTimeToSeconds(document.getElementById("targetTime").value);

  if (!dist || !time) {
    document.getElementById("paceResult").textContent = "거리와 목표 시간을 입력해줘";
    return;
  }

  document.getElementById("paceResult").textContent = `평균 페이스: ${secondsToPace(time / dist)}`;
});
