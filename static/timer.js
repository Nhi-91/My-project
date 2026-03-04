let intervalId = null;

let phase = "ready"; // ready | study | break
let remainingSeconds = 20 * 60;

let plannedStudy = 20;
let plannedBreak = 5;

const LONG_BREAK_MINUTES = 15;
let currentBreakMinutes = plannedBreak;

// 0..2; when equals 2, next break becomes long, then resets to 0 after long break
let cyclesSinceLongBreak = 0;

let startedAt = null;
let completedToday = 0;

const elPhase = document.getElementById("phase");
const elTime = document.getElementById("time");
const elMessage = document.getElementById("message");

const elMood = document.getElementById("mood");
const elStudy = document.getElementById("studyMinutes");
const elBreak = document.getElementById("breakMinutes");

const elSuggest = document.getElementById("btnSuggest");
const elStart = document.getElementById("btnStart");
const elStop = document.getElementById("btnStop");
const elReset = document.getElementById("btnReset");

const elCycleInfo = document.getElementById("cycleInfo");
const elCompletedToday = document.getElementById("completedToday");

const elToast = document.getElementById("toast");
const elToastTitle = document.getElementById("toastTitle");
const elToastBody = document.getElementById("toastBody");

const elModalOverlay = document.getElementById("modalOverlay");
const elModalBodyText = document.getElementById("modalBodyText");
const elModalPrimary = document.getElementById("modalPrimary");
const elModalSecondary = document.getElementById("modalSecondary");

function showToast(title, body, ms = 2600) {
  elToastTitle.textContent = title;
  elToastBody.textContent = body;
  elToast.classList.add("show");
  setTimeout(() => elToast.classList.remove("show"), ms);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function moodMessage(mood, currentPhase) {
  if (currentPhase === "study") {
    if (mood === "tired_eyes") return "Focus gently. Keep posture relaxed to reduce eye strain.";
    if (mood === "down") return "Start small. Just this session. You do not need to feel ready to begin.";
    return "One session at a time. Consistency beats perfection.";
  }

  if (currentPhase === "break") {
    if (mood === "tired_eyes") return "Break: use the 20-20-20 rule (look far for 20 seconds).";
    if (mood === "down") return "You showed up. Reset and continue when ready.";
    return "Nice work. Stand up, stretch, and drink some water.";
  }

  return "Pick a mood and start a session.";
}

function motivationLine(mood, when) {
  if (mood === "tired_eyes") {
    if (when === "start") return "Start gently. Protect your eyes.";
    if (when === "break") return "Break time. Look far, blink slowly.";
    return "Back to it. Steady pace.";
  }
  if (mood === "down") {
    if (when === "start") return "No pressure. Just do this session.";
    if (when === "break") return "Good job showing up. Breathe and reset.";
    return "One more step. Build momentum.";
  }
  if (when === "start") return "Start the session. Clean focus.";
  if (when === "break") return "Good work. Take a short reset.";
  return "Ready when you are.";
}

function clampInt(value, min, max, fallback) {
  if (Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function longBreakCounterText() {
  return `Long break counter: ${cyclesSinceLongBreak}/3`;
}

function nextBreakPreview() {
  const willBeLong = (cyclesSinceLongBreak === 2);
  if (willBeLong) return `Next break: ${LONG_BREAK_MINUTES} (long)`;
  return `Next break: ${plannedBreak}`;
}

function syncUI() {
  elTime.textContent = formatTime(remainingSeconds);

  const mood = elMood.value;

  if (phase === "ready") {
    elPhase.textContent = "Ready";
    elMessage.textContent = `${moodMessage(mood, "ready")} • ${nextBreakPreview()}`;
    elStart.disabled = false;
    elStop.disabled = true;
  } else if (phase === "study") {
    elPhase.textContent = "Study";
    elMessage.textContent = moodMessage(mood, "study");
    elStart.disabled = true;
    elStop.disabled = false;
  } else if (phase === "break") {
    elPhase.textContent = (currentBreakMinutes === LONG_BREAK_MINUTES) ? "Long break" : "Break";
    elMessage.textContent = moodMessage(mood, "break");
    elStart.disabled = true;
    elStop.disabled = false;
  }

  elCycleInfo.textContent =
    `${plannedStudy} / ${plannedBreak} (+ long ${LONG_BREAK_MINUTES} after 3) • ${longBreakCounterText()}`;
  elCompletedToday.textContent = String(completedToday);
}

async function saveSession(completed, plannedMinutes, actualMinutes, breakMinutes, mood) {
  const payload = {
    mood: mood,
    planned_minutes: plannedMinutes,
    actual_minutes: actualMinutes,
    break_minutes: breakMinutes,
    completed: completed
  };

  try {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Failed to save session:", err);
  }
}

function startCountdown() {
  stopTimer();
  intervalId = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      syncUI();

      if (phase === "study") {
        const isLongBreak = (cyclesSinceLongBreak === 2);
        currentBreakMinutes = isLongBreak ? LONG_BREAK_MINUTES : plannedBreak;

        // Save the study session; store the break minutes that will be used next
        saveSession(true, plannedStudy, plannedStudy, currentBreakMinutes, elMood.value);

        phase = "break";
        remainingSeconds = currentBreakMinutes * 60;

        if (isLongBreak) {
          showToast("Long break", `Take ${LONG_BREAK_MINUTES} minutes to recharge.`);
        } else {
          showToast("Break time", motivationLine(elMood.value, "break"));
        }

        syncUI();
      } else if (phase === "break") {
        phase = "ready";
        remainingSeconds = plannedStudy * 60;
        completedToday += 1;

        if (currentBreakMinutes === LONG_BREAK_MINUTES) {
          cyclesSinceLongBreak = 0;
          showToast("Back to ready", "Long break finished. Start the next cycle when ready.");
        } else {
          cyclesSinceLongBreak += 1;
          showToast("Cycle completed", "Nice. Keep the consistency.");
        }

        currentBreakMinutes = plannedBreak;

        syncUI();
        stopTimer();
      }
      return;
    }

    syncUI();
  }, 1000);
}

/* ---------- Modal helper (promise-based) ---------- */
function openModal(messageText) {
  return new Promise((resolve) => {
    elModalBodyText.textContent = messageText;

    elModalOverlay.classList.add("show");
    elModalOverlay.setAttribute("aria-hidden", "false");

    const close = (result) => {
      elModalOverlay.classList.remove("show");
      elModalOverlay.setAttribute("aria-hidden", "true");
      cleanup();
      resolve(result);
    };

    const onPrimary = () => close("continue");
    const onSecondary = () => close("adjust");

    const onOverlayClick = (e) => {
      if (e.target === elModalOverlay) close("adjust");
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") close("adjust");
    };

    function cleanup() {
      elModalPrimary.removeEventListener("click", onPrimary);
      elModalSecondary.removeEventListener("click", onSecondary);
      elModalOverlay.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKeyDown);
    }

    elModalPrimary.addEventListener("click", onPrimary);
    elModalSecondary.addEventListener("click", onSecondary);
    elModalOverlay.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);

    setTimeout(() => elModalPrimary.focus(), 0);
  });
}

/* ---------- Handlers ---------- */
async function handleStart() {
  plannedStudy = clampInt(parseInt(elStudy.value, 10), 5, 60, 20);
  plannedBreak = clampInt(parseInt(elBreak.value, 10), 3, 20, 5);

  // Eye-friendly tweak
  if (elMood.value === "tired_eyes" && plannedBreak < 7) {
    plannedBreak = 7;
  }

  // Modal warning if too short
  if (plannedStudy < 15) {
    const choice = await openModal(
      `You chose a very short study session (${plannedStudy} minutes).
Short sessions are okay, but consistency matters.

Continue anyway or adjust the time?`
    );

    if (choice === "adjust") {
      elStudy.value = "15";
      plannedStudy = 15;
      showToast("Adjusted", "Set to 15 minutes for a steadier rhythm.");
      syncUI();
      return;
    }
  }

  elStudy.value = String(plannedStudy);
  elBreak.value = String(plannedBreak);

  currentBreakMinutes = plannedBreak;

  phase = "study";
  remainingSeconds = plannedStudy * 60;
  startedAt = Date.now();

  showToast("Session started", motivationLine(elMood.value, "start"));

  syncUI();
  startCountdown();
}

function handleStop() {
  if (phase === "study") {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const actualMinutes = Math.min(plannedStudy, Math.floor(elapsedSeconds / 60));
    saveSession(false, plannedStudy, actualMinutes, plannedBreak, elMood.value);

    if (actualMinutes < 10) {
      showToast("Pause noted", "Consider trying 15 minutes next time.");
    } else {
      showToast("Paused", "Good self-check. Rest a bit, then continue.");
    }
  }

  phase = "ready";
  remainingSeconds = plannedStudy * 60;
  syncUI();
  stopTimer();
}

async function handleSuggest() {
  try {
    const res = await fetch("/api/suggestions");
    const data = await res.json();

    plannedStudy = data.suggested_study;
    plannedBreak = data.suggested_break;

    elStudy.value = String(plannedStudy);
    elBreak.value = String(plannedBreak);

    currentBreakMinutes = plannedBreak;
    remainingSeconds = plannedStudy * 60;
    phase = "ready";

    showToast("Suggestion updated", `Try ${plannedStudy}/${plannedBreak}. Long break after 3 cycles.`);

    syncUI();
  } catch (err) {
    console.error("Failed to load suggestion:", err);
  }
}

function handleReset() {
  stopTimer();
  cyclesSinceLongBreak = 0;
  completedToday = 0;

  // keep current plannedStudy/plannedBreak values from inputs
  plannedStudy = clampInt(parseInt(elStudy.value, 10), 5, 60, plannedStudy);
  plannedBreak = clampInt(parseInt(elBreak.value, 10), 3, 20, plannedBreak);

  currentBreakMinutes = plannedBreak;
  phase = "ready";
  remainingSeconds = plannedStudy * 60;

  showToast("Reset", "Counters reset. Timer is ready.");

  syncUI();
}

elStart.addEventListener("click", handleStart);
elStop.addEventListener("click", handleStop);
elSuggest.addEventListener("click", handleSuggest);
elReset.addEventListener("click", handleReset);

elMood.addEventListener("change", () => {
  if (phase === "ready") syncUI();
});

syncUI();
