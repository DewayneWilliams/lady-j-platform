"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // Category tabs
  const tabs = document.querySelectorAll(".cat-tab");
  const panels = document.querySelectorAll(".cat-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.tab;
      tabs.forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      panels.forEach((p) => {
        p.classList.toggle("active", p.dataset.panel === key);
      });
    });
  });

  // Add / remove services
  const basketList = document.getElementById("basketList");
  const basketEmpty = document.getElementById("basketEmpty");
  const basketTotals = document.getElementById("basketTotals");
  const basketMins = document.getElementById("basketMins");
  const basketTotal = document.getElementById("basketTotal");
  const continueBtn = document.getElementById("continueBtn");
  const mobileContinue = document.getElementById("mobileContinue");
  const mobileTotal = document.getElementById("mobileTotal");
  const mobileMeta = document.getElementById("mobileMeta");

  function money(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  function syncBasket() {
    const rows = [...document.querySelectorAll(".svc-row")].filter((row) => {
      const input = row.querySelector(".svc-check");
      return input && input.checked;
    });

    if (basketList) {
      basketList.innerHTML = rows
        .map((row) => {
          const id = row.dataset.id;
          const name = row.dataset.name;
          const price = Number(row.dataset.price || 0);
          return `<li data-basket-id="${id}"><span>${name}</span><span class="price">${money(price)}</span></li>`;
        })
        .join("");
    }

    const total = rows.reduce((sum, row) => sum + Number(row.dataset.price || 0), 0);
    const mins = rows.reduce((sum, row) => sum + Number(row.dataset.mins || 0), 0);
    const count = rows.length;

    if (basketEmpty) basketEmpty.hidden = count > 0;
    if (basketTotals) basketTotals.hidden = count === 0;
    if (basketMins) basketMins.textContent = mins + " min";
    if (basketTotal) basketTotal.textContent = money(total);
    if (continueBtn) continueBtn.disabled = count === 0;
    if (mobileContinue) mobileContinue.disabled = count === 0;
    if (mobileTotal) mobileTotal.textContent = money(total);
    if (mobileMeta) {
      mobileMeta.textContent =
        count > 0 ? `${count} selected · ${mins} min` : "Select a service";
    }
  }

  document.querySelectorAll("[data-toggle-service]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const row = btn.closest(".svc-row");
      const input = row.querySelector(".svc-check");
      if (!input) return;
      input.checked = !input.checked;
      btn.classList.toggle("added", input.checked);
      btn.textContent = input.checked ? "Added" : "Add";
      syncBasket();
    });
  });

  syncBasket();
});
