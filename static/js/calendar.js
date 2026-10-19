"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("selectedDate");
  const timeInput = document.getElementById("selectedTime");
  const slotGrid = document.getElementById("slotGrid");
  const timeHeading = document.getElementById("timeHeading");
  const basketDate = document.getElementById("basketDate");
  const basketTime = document.getElementById("basketTime");
  const mobileWhen = document.getElementById("mobileWhen");
  const cal = document.getElementById("monthCal");
  if (!cal || !slotGrid) return;

  const duration = Number(cal.dataset.duration || 60);

  function minutesLabel(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h < 12 ? "AM" : "PM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  function setSelectedDay(dateStr) {
    dateInput.value = dateStr;
    timeInput.value = "";
    document.querySelectorAll(".cal-day").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.date === dateStr);
    });
    if (basketDate) basketDate.textContent = dateStr;
    if (basketTime) basketTime.textContent = "—";
    if (timeHeading) timeHeading.textContent = `Times for ${dateStr}`;
    if (mobileWhen) mobileWhen.textContent = dateStr;
    loadSlots(dateStr);
  }

  function renderSlots(slots) {
    slotGrid.innerHTML = "";
    if (!slots.length) {
      slotGrid.innerHTML = '<p class="muted">No open times for this date.</p>';
      return;
    }
    slots.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot";
      btn.dataset.time = String(s.start_minutes);
      btn.textContent = s.label;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".slot").forEach((el) => el.classList.remove("selected"));
        btn.classList.add("selected");
        timeInput.value = String(s.start_minutes);
        if (basketTime) basketTime.textContent = s.label;
        if (mobileWhen && dateInput.value) {
          mobileWhen.textContent = `${dateInput.value} · ${s.label}`;
        }
      });
      slotGrid.appendChild(btn);
    });
  }

  async function loadSlots(dateStr) {
    slotGrid.innerHTML = '<p class="muted">Loading times…</p>';
    try {
      const res = await fetch(
        `/api/availability?date=${encodeURIComponent(dateStr)}&duration=${duration}`
      );
      const data = await res.json();
      renderSlots(data.slots || []);
    } catch (_) {
      slotGrid.innerHTML = '<p class="muted">Could not load times. Try again.</p>';
    }
  }

  document.querySelectorAll(".cal-day.open").forEach((btn) => {
    btn.addEventListener("click", () => setSelectedDay(btn.dataset.date));
  });

  // Keep existing selected time highlighted after load
  if (dateInput.value && timeInput.value) {
    const t = timeInput.value;
    document.querySelectorAll(".slot").forEach((btn) => {
      if (btn.dataset.time === t) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        document.querySelectorAll(".slot").forEach((el) => el.classList.remove("selected"));
        btn.classList.add("selected");
        timeInput.value = btn.dataset.time;
        const label = minutesLabel(Number(btn.dataset.time));
        if (basketTime) basketTime.textContent = label;
      });
    });
  }
});
