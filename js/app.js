(() => {
  "use strict";

  const STORAGE_KEY = "chain.habits.v1";

  /* ---------------------------------------------------------------
     Date helpers — always work in the user's local calendar day
     --------------------------------------------------------------- */
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function addDays(d, n) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
  }

  function today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /* ---------------------------------------------------------------
     Storage
     --------------------------------------------------------------- */
  function loadHabits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Could not read saved habits, starting fresh.", err);
      return [];
    }
  }

  function saveHabits(habits) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (err) {
      console.error("Could not save habits — device storage may be full.", err);
    }
  }

  let habits = loadHabits();

  /* ---------------------------------------------------------------
     Streak logic
     A streak counts consecutive completed days ending today.
     If today isn't done yet, the streak still shows the chain built
     through yesterday — today simply hasn't been decided yet.
     --------------------------------------------------------------- */
  function computeStreak(habit) {
    const t = today();
    let cursor = habit.log[dateKey(t)] ? t : addDays(t, -1);
    let streak = 0;
    while (habit.log[dateKey(cursor)]) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function lastSevenDays(habit) {
    const t = today();
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = addDays(t, -i);
      days.push({ key: dateKey(d), isToday: i === 0, done: !!habit.log[dateKey(d)] });
    }
    return days;
  }

  /* ---------------------------------------------------------------
     Rendering
     --------------------------------------------------------------- */
  const habitListEl = document.getElementById("habitList");
  const emptyStateEl = document.getElementById("emptyState");
  const cardTemplate = document.getElementById("habitCardTemplate");
  const todayLabelEl = document.getElementById("todayLabel");

  function renderTodayLabel() {
    todayLabelEl.textContent = today().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  function renderChain(container, habit) {
    container.innerHTML = "";
    const days = lastSevenDays(habit);

    days.forEach((day, idx) => {
      const dot = document.createElement("span");
      dot.className = "chain-dot";
      if (day.done) dot.classList.add("is-done");
      if (day.isToday) dot.classList.add("is-today");
      dot.title = day.key;
      container.appendChild(dot);

      if (idx < days.length - 1) {
        const link = document.createElement("span");
        link.className = "chain-link";
        const next = days[idx + 1];
        if (day.done && next.done) link.classList.add("is-linked");
        else if (day.done !== next.done && !next.isToday && day.key <= dateKey(today())) {
          // a link breaks where one side was completed and the other wasn't,
          // as long as that day has already passed (not just "not yet today")
          if (!(next.isToday && !next.done)) link.classList.add("is-broken");
        }
        container.appendChild(link);
      }
    });
  }

  function renderHabits() {
    habitListEl.innerHTML = "";
    emptyStateEl.hidden = habits.length > 0;

    habits.forEach((habit) => {
      const node = cardTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = habit.id;

      node.querySelector(".habit-card__name").textContent = habit.name;

      const streak = computeStreak(habit);
      const streakWrap = node.querySelector(".habit-card__streak");
      streakWrap.dataset.zero = streak === 0 ? "true" : "false";
      node.querySelector(".habit-card__streak-number").textContent = streak;
      node.querySelector(".habit-card__streak-label").textContent =
        streak === 1 ? "day streak" : "day streak";

      renderChain(node.querySelector(".habit-card__chain"), habit);

      const toggleBtn = node.querySelector(".habit-card__toggle");
      const doneToday = !!habit.log[dateKey(today())];
      toggleBtn.textContent = doneToday ? "Done today ✓" : "Mark today done";
      toggleBtn.classList.toggle("is-active", doneToday);

      toggleBtn.addEventListener("click", () => toggleToday(habit.id, node));
      node.querySelector(".habit-card__delete").addEventListener("click", () => deleteHabit(habit.id));

      habitListEl.appendChild(node);
    });
  }

  /* ---------------------------------------------------------------
     Actions
     --------------------------------------------------------------- */
  function addHabit(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    habits.push({
      id: (crypto.randomUUID && crypto.randomUUID()) || `h_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: trimmed,
      createdAt: dateKey(today()),
      log: {},
    });
    saveHabits(habits);
    renderHabits();
  }

  function toggleToday(id, node) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const key = dateKey(today());
    habit.log[key] = !habit.log[key];
    if (!habit.log[key]) delete habit.log[key];
    saveHabits(habits);
    renderHabits();

    if (habit.log[key]) {
      const refreshed = habitListEl.querySelector(`[data-id="${id}"]`);
      if (refreshed) {
        refreshed.classList.add("just-checked");
        refreshed.addEventListener("animationend", () => refreshed.classList.remove("just-checked"), { once: true });
      }
    }
  }

  function deleteHabit(id) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const confirmed = window.confirm(`Delete "${habit.name}"? This removes its whole history.`);
    if (!confirmed) return;
    habits = habits.filter((h) => h.id !== id);
    saveHabits(habits);
    renderHabits();
  }

  /* ---------------------------------------------------------------
     Form wiring
     --------------------------------------------------------------- */
  const form = document.getElementById("addHabitForm");
  const input = document.getElementById("habitNameInput");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addHabit(input.value);
    input.value = "";
    input.focus();
  });

  /* ---------------------------------------------------------------
     Offline indicator
     --------------------------------------------------------------- */
  const offlineBanner = document.getElementById("offlineBanner");
  function updateOnlineStatus() {
    offlineBanner.hidden = navigator.onLine;
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  /* ---------------------------------------------------------------
     Install prompt (Android/desktop Chrome-family browsers)
     --------------------------------------------------------------- */
  const installBtn = document.getElementById("installBtn");
  let deferredInstallEvent = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallEvent = e;
    const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches;
    installBtn.hidden = alreadyInstalled;
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredInstallEvent) return;
    deferredInstallEvent.prompt();
    await deferredInstallEvent.userChoice;
    deferredInstallEvent = null;
    installBtn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installBtn.hidden = true;
  });

  /* ---------------------------------------------------------------
     Service worker registration
     --------------------------------------------------------------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    });
  }

  /* ---------------------------------------------------------------
     Splash screen
     Browsers (Android Chrome) already generate a native splash from
     the manifest's icon + background_color + name — that's automatic
     and needs no code. This in-app splash exists for everywhere that
     doesn't: iOS Safari has no equivalent, and Apple's old per-device
     apple-touch-startup-image meta tags require a separate image for
     every screen size and are no longer reliably honored on current
     iOS Safari. A single in-app splash, shown only when launched from
     the home screen icon, covers every platform with one code path.
     --------------------------------------------------------------- */
  const splashEl = document.getElementById("splash");
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true; // legacy iOS flag

  if (!isStandalone) {
    splashEl.remove();
  } else {
    const MIN_VISIBLE_MS = 500;
    const shownAt = Date.now();
    const dismissSplash = () => {
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
      setTimeout(() => {
        splashEl.classList.add("splash--hide");
        splashEl.addEventListener("transitionend", () => splashEl.remove(), { once: true });
      }, remaining);
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(dismissSplash));
  }

  /* ---------------------------------------------------------------
     Init
     --------------------------------------------------------------- */
  renderTodayLabel();
  updateOnlineStatus();
  renderHabits();
})();
