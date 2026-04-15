const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const clearBtn = document.getElementById("clearBtn");
const bellModeBtn = document.getElementById("bellModeBtn");
const bellStopModeBtn = document.getElementById("bellStopModeBtn");
const setButtons = Array.from(document.querySelectorAll("[data-add]"));
const volumeInput = document.getElementById("volumeInput");
const warningEl = document.getElementById("warning");
const mokugyoAudio = document.getElementById("mokugyoAudio");
const bellAudio = document.getElementById("bellAudio");

let duration = 150;
let remaining = 150;
let running = false;
let timerId = null;
let missingMokugyo = false;
let missingBell = false;
let bellPlayToken = 0;
let bellModeIndex = 0;
let bellStopModeIndex = 0;
let bellAutoStopTimerId = null;

const bellModes = [
  { key: "once", label: "完了ベル: 1回" },
  { key: "three", label: "完了ベル: 3回" },
  { key: "loop", label: "完了ベル: ループ" },
];

const bellStopModes = [
  { seconds: 30, label: "ベル停止: 30秒" },
  { seconds: 60, label: "ベル停止: 60秒" },
  { seconds: null, label: "ベル停止: 手動" },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatTime = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(Math.max(0, seconds % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
};

const updateWarning = () => {
  warningEl.hidden = !(missingMokugyo || missingBell);
};

const updateDisplay = () => {
  timerEl.textContent = formatTime(remaining);
};

const addTime = (seconds) => {
  const addSeconds = clamp(Number(seconds || 0), 0, 600);
  duration = clamp(duration + addSeconds, 0, 3 * 60 * 60);
  remaining = clamp(remaining + addSeconds, 0, 3 * 60 * 60);
  updateDisplay();
};

const clearTime = () => {
  duration = 0;
  remaining = 0;
  updateDisplay();
};

const syncVolume = () => {
  const volume = clamp(Number(volumeInput.value || 0), 0, 1);
  mokugyoAudio.volume = volume;
  bellAudio.volume = volume;
};

const stopTick = () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
};

const stopMokugyo = () => {
  mokugyoAudio.pause();
  mokugyoAudio.currentTime = 0;
};

const startMokugyo = () => {
  mokugyoAudio.currentTime = 0;
  mokugyoAudio.play().catch(() => {});
};

const stopBell = () => {
  bellPlayToken += 1;
  if (bellAutoStopTimerId) {
    clearTimeout(bellAutoStopTimerId);
    bellAutoStopTimerId = null;
  }
  bellAudio.pause();
  bellAudio.currentTime = 0;
};

const scheduleBellAutoStop = () => {
  if (bellAutoStopTimerId) {
    clearTimeout(bellAutoStopTimerId);
    bellAutoStopTimerId = null;
  }

  const stopAfter = bellStopModes[bellStopModeIndex].seconds;
  if (stopAfter == null) return;

  bellAutoStopTimerId = setTimeout(() => {
    stopBell();
  }, stopAfter * 1000);
};

const playBellOnce = () =>
  new Promise((resolve) => {
    const done = () => resolve();
    bellAudio.currentTime = 0;
    bellAudio.addEventListener("ended", done, { once: true });
    bellAudio.addEventListener("error", done, { once: true });
    bellAudio.play().catch(done);
  });

const playBellPattern = async () => {
  const token = ++bellPlayToken;
  const mode = bellModes[bellModeIndex].key;

  if (mode === "once") {
    await playBellOnce();
    return;
  }

  if (mode === "three") {
    for (let i = 0; i < 3; i += 1) {
      if (token !== bellPlayToken) return;
      await playBellOnce();
    }
    return;
  }

  while (token === bellPlayToken) {
    await playBellOnce();
  }
};

const updateBellModeLabel = () => {
  bellModeBtn.textContent = bellModes[bellModeIndex].label;
};

const updateBellStopModeLabel = () => {
  bellStopModeBtn.textContent = bellStopModes[bellStopModeIndex].label;
};

const startTimer = () => {
  if (remaining <= 0) {
    remaining = duration;
  }
  if (remaining <= 0 || running) return;

  stopBell();
  running = true;
  startMokugyo();
  timerId = setInterval(() => {
    if (remaining <= 1) {
      running = false;
      stopTick();
      stopMokugyo();
      remaining = duration;
      updateDisplay();
      scheduleBellAutoStop();
      void playBellPattern();
      return;
    }
    remaining -= 1;
    updateDisplay();
  }, 1000);
};

const stopTimer = () => {
  running = false;
  stopTick();
  stopMokugyo();
  stopBell();
};

const resetTimer = () => {
  running = false;
  stopTick();
  stopMokugyo();
  stopBell();
  remaining = duration;
  updateDisplay();
};

const toggleBellMode = () => {
  bellModeIndex = (bellModeIndex + 1) % bellModes.length;
  updateBellModeLabel();
};

const toggleBellStopMode = () => {
  bellStopModeIndex = (bellStopModeIndex + 1) % bellStopModes.length;
  updateBellStopModeLabel();
};

setButtons.forEach((button) => {
  button.addEventListener("click", () => addTime(button.dataset.add));
});

startBtn.addEventListener("click", startTimer);
stopBtn.addEventListener("click", stopTimer);
resetBtn.addEventListener("click", resetTimer);
clearBtn.addEventListener("click", clearTime);
bellModeBtn.addEventListener("click", toggleBellMode);
bellStopModeBtn.addEventListener("click", toggleBellStopMode);
volumeInput.addEventListener("input", syncVolume);

mokugyoAudio.addEventListener("error", () => {
  missingMokugyo = true;
  updateWarning();
});

bellAudio.addEventListener("error", () => {
  missingBell = true;
  updateWarning();
});

syncVolume();
updateBellModeLabel();
updateBellStopModeLabel();
updateDisplay();
