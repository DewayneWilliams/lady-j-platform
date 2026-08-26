"use strict";


document.addEventListener(
  "DOMContentLoaded",
  () => {

    const CONFIG = {
      discount: 0.15,
      maxDays: 60,
      sameDayNotice: 120,
      open: 600,
      close: 1080
    };


    const DATA = [

      {
        category: "HAIR",

        services: [
          ["Wash & Blow Dry", 300, 60],
          ["Silk Press", 450, 90],
          ["Cut & Style", 350, 60],
          ["Natural Hair Styling", 350, 75],
          ["Loc Retwist", 400, 120],
          ["Braids / Twists", 450, 150],
          ["Relaxer", 400, 90],
          ["Hair Color", 500, 120],
          ["Highlights", 550, 120],
          ["Wig / Weave Installation", 500, 120],
          ["Deep Conditioning Treatment", 250, 45]
        ],

        addons: [
          ["Trim", 100, 15],
          ["Scalp Treatment", 150, 20],
          ["Extra Length / Density", 150, 30]
        ]
      },


      {
        category: "SKIN & FACIALS",

        services: [
          ["Skin Analysis", 150, 30],
          ["Brightening Facial", 475, 60],
          ["Acne Facial", 500, 60],
          ["Rejuv RX Facial", 500, 60],
          ["Fire & Ice Facial", 700, 75],
          ["Korean Medi-Glow Facial", 650, 75],
          ["Zena Algae Peel", 850, 60],
          ["V.I Peel", 1850, 60],
          ["Perfect Derma Peel", 1650, 60]
        ],

        addons: [
          ["Microdermabrasion", 150, 20],
          ["Dermaplaning", 175, 20],
          ["Chemical Peel", 200, 20]
        ]
      },


      {
        category: "MANICURES",

        services: [
          ["Spa Manicure", 200, 45],
          ["Gel-X", 325, 75],
          ["BIAB / Gel Overlay", 325, 75],
          ["Hard Gel Overlay", 350, 75],
          ["Acrylic Full Set", 350, 90],
          ["Acrylic Refill", 250, 60]
        ],

        addons: [
          ["French Tips", 40, 15],
          ["Chrome / Ombre", 50, 15],
          ["Paraffin", 50, 15],

          [
            "Nail Art",
            10,
            5,
            10,
            "per nail"
          ],

          ["Nail Repair", 30, 10],
          ["Soak Off Gel Polish", 50, 15],
          ["Soak Off Gel-X / BIAB", 100, 30]
        ]
      },


      {
        category: "PEDICURES",

        services: [
          ["Spa Pedicure", 300, 60],
          ["Medical Pedicure", 600, 75],
          ["Deluxe Pedicure", 400, 75],
          ["Polish Only on Toes", 130, 30],
          ["Full Set on Toes", 200, 60]
        ],

        addons: [
          ["French Tips", 40, 15],

          [
            "Gel-X / BIAB Big Toe",
            25,
            10,
            2,
            "each"
          ],

          ["Gel Polish Removal", 50, 15],
          ["Paraffin Treatment", 50, 15]
        ]
      },


      {
        category: "LASHES",

        services: [
          ["Classic Lash Extensions", 450, 120],
          ["Hybrid Lash Extensions", 600, 135],
          ["Volume Lash Extensions", 700, 150],
          ["Lash Refill", 350, 90],
          ["Lash Lift & Tint", 450, 75]
        ],

        addons: [
          ["Lash Removal", 150, 30],
          ["Lash Tint", 100, 20]
        ]
      },


      {
        category: "BROWS",

        services: [
          ["Brow Shaping / Wax", 75, 20],
          ["Brow Tinting", 150, 30],
          ["Brow Lamination", 275, 45],
          ["Microblading", 1200, 120],
          ["Microshading / Powder Brows", 1500, 150],
          ["Ombre Brows", 1500, 150],
          ["Nano Brows", 1600, 150],
          ["Combo Brows", 1800, 180]
        ],

        addons: [
          ["Brow Tint", 100, 20],
          ["Permanent Brow Touch-Up", 600, 90]
        ]
      },


      {
        category: "WAXING",

        services: [
          ["Brows", 75, 15],
          ["Upper Lip", 50, 10],
          ["Chin", 50, 10],
          ["Full Face", 200, 30],
          ["Underarm", 100, 15],
          ["Half Arm", 125, 20],
          ["Full Arms", 175, 30],
          ["Half Legs", 200, 30],
          ["Full Legs", 300, 45],
          ["Women’s Bikini", 175, 30],
          ["Women’s Brazilian", 300, 45],
          ["Back", 250, 45]
        ],

        addons: []
      },


      {
        category: "MASSAGE",

        services: [
          ["Swedish Massage — 60 min", 550, 60],
          ["Deep Tissue Massage — 60 min", 600, 60],
          ["Hot Stone Massage — 60 min", 600, 60],
          ["Lymphatic Drainage Massage — 60 min", 700, 60],
          ["Swedish Upper Body — 30 min", 300, 30],
          ["Deep Tissue Upper Body — 30 min", 350, 30]
        ],

        addons: []
      },


      {
        category: "BODY & SPA",

        services: [
          ["Cocoa Bean Body Wrap", 500, 75],
          ["Full Body Scrub", 350, 60],
          ["Back Scrub", 200, 30],
          ["Mole / Skin Tag Removal", 400, 45]
        ],

        addons: []
      },


      {
        category: "MAKEUP",

        services: [
          ["Makeup Application", 400, 60],
          ["Soft Glam", 400, 60],
          ["Full Glam", 500, 75],
          ["Bridal Makeup", 700, 90]
        ],

        addons: []
      }

    ];


    const $ =
      id =>
        document.getElementById(id);


    const state = {
      selected: new Map(),
      open: new Set(["HAIR"]),
      date: null,
      time: null,
      page: 0,
      payment: "wire"
    };


    const services =
      DATA.flatMap(
        group => [

          ...group.services.map(
            item =>
              normalize(
                group.category,
                item
              )
          ),

          ...group.addons.map(
            item =>
              normalize(
                group.category,
                item,
                true
              )
          )

        ]
      );


    const lookup =
      new Map(
        services.map(
          item => [
            item.id,
            item
          ]
        )
      );


    function normalize(
      category,
      item,
      addon = false
    ) {

      return {
        id:
          `${category}__${item[0]}`
            .replace(
              /\s+/g,
              "_"
            ),

        category,

        name:
          item[0],

        price:
          item[1],

        duration:
          item[2],

        max:
          item[3] || 1,

        suffix:
          item[4] || "",

        addon
      };

    }


    function money(value) {

      return (
        "$"
        +
        Math.round(value)
          .toLocaleString(
            "en-US"
          )
      );

    }


    function selectedItems() {

      return [

        ...state.selected.entries()

      ]
        .map(
          ([id,qty]) => ({
            ...lookup.get(id),
            qty
          })
        )
        .filter(Boolean);

    }


    function totals() {

      let regular = 0;

      let duration = 0;


      selectedItems()
        .forEach(
          item => {

            regular +=
              item.price
              *
              item.qty;


            duration +=
              item.duration
              *
              item.qty;

          }
        );


      const savings =
        regular
        *
        CONFIG.discount;


      return {
        regular,
        savings,
        wire:
          regular
          -
          savings,
        duration
      };

    }


    function durationLabel(minutes) {

      if (!minutes) {
        return "—";
      }


      const hours =
        Math.floor(
          minutes / 60
        );


      const mins =
        minutes % 60;


      if (
        hours
        &&
        mins
      ) {

        return (
          `${hours} hr`
          +
          `${hours > 1 ? "s" : ""} `
          +
          `${mins} min`
        );

      }


      if (hours) {

        return (
          `${hours} hr`
          +
          `${hours > 1 ? "s" : ""}`
        );

      }


      return `${mins} min`;

    }


    /* SERVICES */

    function renderServices() {

      $("serviceCategories")
        .innerHTML =

        DATA.map(
          group => {

            const open =
              state.open.has(
                group.category
              );


            const selectedCount = [

              ...state.selected.keys()

            ]
              .filter(
                id =>
                  id.startsWith(
                    `${group.category}__`
                  )
              )
              .length;


            return `

              <div
                class="
                  service-category
                  ${open ? "open" : ""}
                "
                data-category="${esc(group.category)}"
              >

                <button
                  class="category-toggle"
                  type="button"
                  data-action="category"
                >

                  <span>
                    ${esc(group.category)}
                  </span>

                  <span class="category-right">

                    ${
                      selectedCount

                        ? `
                          <span class="category-count">
                            ${selectedCount} SELECTED
                          </span>
                        `

                        : ""
                    }

                    <span class="chevron">
                      ⌄
                    </span>

                  </span>

                </button>


                <div class="category-content">

                  ${group.services
                    .map(
                      item =>
                        serviceRow(
                          group.category,
                          item
                        )
                    )
                    .join("")
                  }


                  ${
                    group.addons.length

                      ? `

                        <span class="addon-label">
                          ADD-ONS
                        </span>

                        ${group.addons
                          .map(
                            item =>
                              serviceRow(
                                group.category,
                                item
                              )
                          )
                          .join("")
                        }

                      `

                      : ""
                  }

                </div>

              </div>

            `;

          }
        )
        .join("");

    }


    function serviceRow(
      category,
      raw
    ) {

      const item =
        lookup.get(
          `${category}__${raw[0]}`
            .replace(
              /\s+/g,
              "_"
            )
        );


      const qty =
        state.selected.get(
          item.id
        )
        ||
        0;


      const control =
        item.max > 1

          ? `

            <div class="quantity">

              <button
                type="button"
                data-action="minus"
                data-id="${esc(item.id)}"
              >
                −
              </button>

              <span>
                ${qty}
              </span>

              <button
                type="button"
                data-action="plus"
                data-id="${esc(item.id)}"
              >
                +
              </button>

            </div>

          `

          : `

            <button
              class="add-service"
              type="button"
              data-action="toggle"
              data-id="${esc(item.id)}"
            >
              ${qty ? "✓ ADDED" : "+ ADD"}
            </button>

          `;


      return `

        <div
          class="
            service-row
            ${qty ? "selected" : ""}
          "
        >

          <div class="service-name">
            ${esc(item.name)}
          </div>


          <div class="service-price">

            ${money(item.price)}

            ${
              item.suffix
                ? ` ${esc(item.suffix)}`
                : ""
            }

          </div>


          ${control}

        </div>

      `;

    }


    $("serviceCategories")
      .addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-action]"
            );


          if (!button) {
            return;
          }


          const action =
            button.dataset.action;


          if (
            action === "category"
          ) {

            const category =
              button
                .closest(
                  ".service-category"
                )
                .dataset.category;


            state.open.has(category)

              ? state.open.delete(category)

              : state.open.add(category);


            renderServices();

            save();

            return;

          }


          const item =
            lookup.get(
              button.dataset.id
            );


          if (!item) {
            return;
          }


          const current =
            state.selected.get(
              item.id
            )
            ||
            0;


          if (
            action === "toggle"
          ) {

            current

              ? state.selected.delete(
                  item.id
                )

              : state.selected.set(
                  item.id,
                  1
                );

          }


          if (
            action === "plus"
          ) {

            state.selected.set(
              item.id,
              Math.min(
                current + 1,
                item.max
              )
            );

          }


          if (
            action === "minus"
          ) {

            if (
              current <= 1
            ) {

              state.selected.delete(
                item.id
              );

            }
            else {

              state.selected.set(
                item.id,
                current - 1
              );

            }

          }


          state.time = null;


          renderServices();

          renderTimes();

          updateUI();

          save();

        }
      );


    /* DATES */

    function validDates() {

      const dates = [];

      const today =
        startOfDay(
          new Date()
        );


      for (
        let i = 0;
        i <= CONFIG.maxDays;
        i++
      ) {

        const date =
          new Date(today);


        date.setDate(
          today.getDate()
          +
          i
        );


        const day =
          date.getDay();


        if (
          day >= 2
          &&
          day <= 6
        ) {

          dates.push(date);

        }

      }


      return dates;

    }


    function renderDates() {

      const dates =
        validDates();


      const maxPage =
        Math.max(
          0,
          Math.ceil(
            dates.length / 7
          )
          -
          1
        );


      state.page =
        Math.max(
          0,
          Math.min(
            state.page,
            maxPage
          )
        );


      const visible =
        dates.slice(
          state.page * 7,
          state.page * 7 + 7
        );


      $("dateGrid")
        .innerHTML =

        visible
          .map(
            date => {

              const key =
                dateKey(date);


              return `

                <button
                  class="
                    date-btn
                    ${state.date === key ? "selected" : ""}
                  "
                  type="button"
                  data-date="${key}"
                >

                  <span class="day">

                    ${date
                      .toLocaleDateString(
                        "en-US",
                        {
                          weekday:
                            "short"
                        }
                      )
                      .toUpperCase()
                    }

                  </span>


                  <span class="num">
                    ${date.getDate()}
                  </span>


                  <span class="month">

                    ${date
                      .toLocaleDateString(
                        "en-US",
                        {
                          month:
                            "short"
                        }
                      )
                      .toUpperCase()
                    }

                  </span>

                </button>

              `;

            }
          )
          .join("");


      $("prevDates").disabled =
        state.page === 0;


      $("nextDates").disabled =
        state.page >= maxPage;


      if (
        visible.length
      ) {

        $("dateRangeLabel")
          .textContent =

          `${visible[0].toLocaleDateString(
            "en-US",
            {
              month:
                "short",
              day:
                "numeric"
            }
          )} – `
          +
          `${visible[
            visible.length - 1
          ].toLocaleDateString(
            "en-US",
            {
              month:
                "short",
              day:
                "numeric"
            }
          )}`;

      }

    }


    $("dateGrid")
      .addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-date]"
            );


          if (!button) {
            return;
          }


          state.date =
            button.dataset.date;


          state.time = null;


          renderDates();

          renderTimes();

          updateUI();

          save();

        }
      );


    $("prevDates")
      .addEventListener(
        "click",
        () => {

          if (
            state.page > 0
          ) {

            state.page--;

            renderDates();

          }

        }
      );


    function nextPage() {

      const maxPage =
        Math.max(
          0,
          Math.ceil(
            validDates().length
            /
            7
          )
          -
          1
        );


      if (
        state.page < maxPage
      ) {

        state.page++;

        renderDates();

      }

    }


    $("nextDates")
      .addEventListener(
        "click",
        nextPage
      );


    $("nextSeven")
      .addEventListener(
        "click",
        nextPage
      );


    /* TIMES */

    function allTimeSlots() {

      const slots = [];


      for (
        let minutes =
          CONFIG.open;

        minutes <
          CONFIG.close;

        minutes += 30
      ) {

        slots.push(minutes);

      }


      return slots;

    }


    function renderTimes() {

      const slots =
        allTimeSlots();


      const hasServices =
        state.selected.size > 0;


      const hasDate =
        !!state.date;


      const {
        duration
      } =
        totals();


      let minimumStart =
        CONFIG.open;


      if (hasDate) {

        const selectedDate =
          parseDate(
            state.date
          );


        if (
          isToday(
            selectedDate
          )
        ) {

          const now =
            new Date();


          const notice =
            now.getHours()
            *
            60
            +
            now.getMinutes()
            +
            CONFIG.sameDayNotice;


          minimumStart =
            Math.max(
              CONFIG.open,
              Math.ceil(
                notice / 30
              )
              *
              30
            );

        }

      }


      $("timeGrid")
        .innerHTML =

        slots
          .map(
            minutes => {

              let disabled =
                !hasServices
                ||
                !hasDate;


              if (
                !disabled
                &&
                minutes <
                minimumStart
              ) {

                disabled = true;

              }


              if (
                !disabled
                &&
                minutes
                +
                duration
                >
                CONFIG.close
              ) {

                disabled = true;

              }


              const label =
                timeLabel(
                  minutes
                );


              const selected =
                state.time
                ===
                label;


              return `

                <button
                  class="
                    time-btn
                    ${selected ? "selected" : ""}
                  "
                  type="button"
                  data-time="${label}"
                  ${disabled ? "disabled" : ""}
                >
                  ${label}
                </button>

              `;

            }
          )
          .join("");


      if (
        !hasServices
        ||
        !hasDate
      ) {

        $("timeHint")
          .textContent =
          "Select your services and date to activate available appointment times.";

      }
      else {

        $("timeHint")
          .textContent =
          "Only start times that allow your full appointment to finish by 6 PM are available.";

      }

    }


    $("timeGrid")
      .addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-time]"
            );


          if (
            !button
            ||
            button.disabled
          ) {

            return;

          }


          state.time =
            button.dataset.time;


          renderTimes();

          updateUI();

          save();

        }
      );


    /* SPECIAL */

    $("specialToggle")
      .addEventListener(
        "click",
        () => {

          $("specialPanel")
            .classList
            .toggle(
              "hidden"
            );


          $("specialToggle")
            .querySelector("span")
            .textContent =

            $("specialPanel")
              .classList
              .contains(
                "hidden"
              )

              ? "+"

              : "−";

        }
      );


    /* PAYMENT */

    $("wireOption")
      .addEventListener(
        "click",
        () => {

          state.payment =
            "wire";


          updateUI();

          save();

        }
      );


    $("cashOption")
      .addEventListener(
        "click",
        () => {

          state.payment =
            "cash";


          updateUI();

          save();

        }
      );


    $("copyAccount")
      .addEventListener(
        "click",
        async () => {

          const button =
            $("copyAccount");


          try {

            await navigator
              .clipboard
              .writeText(
                "3201297"
              );


            button.textContent =
              "COPIED ✓";

          }
          catch {

            const input =
              document.createElement(
                "textarea"
              );


            input.value =
              "3201297";


            document.body
              .appendChild(
                input
              );


            input.select();


            document.execCommand(
              "copy"
            );


            input.remove();


            button.textContent =
              "COPIED ✓";

          }


          setTimeout(
            () => {

              button.textContent =
                "COPY ACCOUNT NUMBER";

            },
            2000
          );

        }
      );


    function updateUI() {

      const {
        regular,
        savings,
        wire,
        duration
      } =
        totals();


      const wireSelected =
        state.payment
        ===
        "wire";


      $("wireRegular")
        .textContent =
        money(regular);


      $("wireTotal")
        .textContent =
        money(wire);


      $("wireSavings")
        .textContent =
        money(savings);


      $("cashTotal")
        .textContent =
        money(regular);


      $("cashSaveText")
        .textContent =

        regular

          ? `Bank wire saves ${money(savings)}`

          : "Bank wire saves 15%";


      $("wireButtonText")
        .textContent =

        regular

          ? `PAY ${money(wire)} VIA BANK WIRE`

          : "SELECT SERVICES TO SEE SAVINGS";


      $("wireOption")
        .classList
        .toggle(
          "selected",
          wireSelected
        );


      $("cashOption")
        .classList
        .toggle(
          "selected",
          !wireSelected
        );


      $("bankPanel")
        .classList
        .toggle(
          "hidden",
          !wireSelected
        );


      $("bankRegular")
        .textContent =
        money(regular);


      $("bankSavings")
        .textContent =
        `-${money(savings)}`;


      $("bankTotal")
        .textContent =
        money(wire);


      $("bankPayToday")
        .textContent =
        money(wire);


      $("submitBooking")
        .textContent =

        wireSelected

          ? `SUBMIT ${money(wire)} PAYMENT & BOOK`

          : "REQUEST APPOINTMENT";


      $("summaryRegular")
        .textContent =
        money(regular);


      $("summarySavings")
        .textContent =
        wireSelected
          ? `-${money(savings)}`
          : "$0";


      $("summaryPayLabel")
        .textContent =

        wireSelected

          ? "BANK WIRE TOTAL"

          : "PAY AT SALON";


      $("summaryPayTotal")
        .textContent =

        money(
          wireSelected
            ? wire
            : regular
        );


      $("summaryCash")
        .textContent =
        `Pay at salon: ${money(regular)}`;


      $("summaryDate")
        .textContent =

        state.date

          ? prettyDate(
              state.date
            )

          : "—";


      $("summaryTime")
        .textContent =
        state.time || "—";


      $("summaryDuration")
        .textContent =
        durationLabel(
          duration
        );


      renderSummaryServices();


      const count =
        selectedItems()
          .reduce(
            (
              sum,
              item
            ) =>
              sum + item.qty,
            0
          );


      $("mobileCount")
        .textContent =

        `${count} service${count === 1 ? "" : "s"}`;


      $("mobileTotal")
        .textContent =

        money(
          wireSelected
            ? wire
            : regular
        );

    }


    function renderSummaryServices() {

      const items =
        selectedItems();


      if (
        !items.length
      ) {

        $("summaryServices")
          .innerHTML =
          "<p>No services selected yet.</p>";

        return;

      }


      $("summaryServices")
        .innerHTML =

        items
          .map(
            item => `

              <div class="summary-service">

                <span>

                  ${esc(item.name)}

                  ${
                    item.qty > 1
                      ? ` × ${item.qty}`
                      : ""
                  }

                </span>

                <strong>

                  ${money(
                    item.price
                    *
                    item.qty
                  )}

                </strong>

              </div>

            `
          )
          .join("");

    }


    /* MOBILE CONTINUE */

    $("mobileContinue")
      .addEventListener(
        "click",
        () => {

          let target;


          if (
            !state.selected.size
          ) {

            target =
              $("services");

          }
          else if (
            !state.date
            ||
            !state.time
          ) {

            target =
              $("dateGrid");

          }
          else {

            target =
              $("bookingForm");

          }


          target.scrollIntoView({
            behavior:
              "smooth",

            block:
              "center"
          });

        }
      );


    /* VALIDATION */

    $("bookingForm")
      .addEventListener(
        "submit",
        event => {

          event.preventDefault();


          $("formMessage")
            .textContent = "";


          const error =
            validate();


          if (error) {

            $("formMessage")
              .textContent =
              error.message;


            if (
              error.element
            ) {

              error.element
                .focus?.();


              error.element
                .scrollIntoView({
                  behavior:
                    "smooth",

                  block:
                    "center"
                });

            }


            return;

          }


          showConfirmation();

        }
      );


    function validate() {

      if (
        !state.selected.size
      ) {

        return {
          message:
            "Please select at least one service.",

          element:
            $("services")
        };

      }


      if (
        !state.date
      ) {

        return {
          message:
            "Please select an appointment date.",

          element:
            $("dateGrid")
        };

      }


      if (
        !state.time
      ) {

        return {
          message:
            "Please select an appointment time.",

          element:
            $("timeGrid")
        };

      }


      const required = [

        [
          "firstName",
          "Please enter your first name."
        ],

        [
          "lastName",
          "Please enter your last name."
        ],

        [
          "mobile",
          "Please enter your mobile or WhatsApp number."
        ],

        [
          "email",
          "Please enter your email address."
        ]

      ];


      for (
        const [
          id,
          message
        ]
        of required
      ) {

        if (
          !$(id)
            .value
            .trim()
        ) {

          return {
            message,
            element:
              $(id)
          };

        }

      }


      if (
        !$("email")
          .checkValidity()
      ) {

        return {
          message:
            "Please enter a valid email address.",

          element:
            $("email")
        };

      }


      if (
        state.payment
        ===
        "wire"
      ) {

        if (
          !$("referenceNumber")
            .value
            .trim()
        ) {

          return {
            message:
              "Please enter your bank transfer reference number.",

            element:
              $("referenceNumber")
          };

        }


        if (
          !$("paymentDate")
            .value
        ) {

          return {
            message:
              "Please enter the payment date.",

            element:
              $("paymentDate")
          };

        }


        if (
          !$("paymentProof")
            .files
            .length
        ) {

          return {
            message:
              "Please attach proof of payment.",

            element:
              $("paymentProof")
          };

        }

      }


      return null;

    }


    /* CONFIRMATION */

    function showConfirmation() {

      const {
        regular,
        savings,
        wire,
        duration
      } =
        totals();


      const wireSelected =
        state.payment
        ===
        "wire";


      $("confirmationTitle")
        .textContent =

        wireSelected

          ? "Payment Submitted"

          : "Appointment Request Received";


      $("confirmationText")
        .textContent =

        wireSelected

          ? "Your appointment request and payment information have been received. Your appointment will be confirmed once your bank transfer is verified."

          : "Your appointment request has been received. Lady J Salon & Day Spa will confirm your appointment.";


      $("confirmationSummary")
        .innerHTML = `

          <strong>

            ${selectedItems()
              .map(
                item =>
                  `${esc(item.name)}${
                    item.qty > 1
                      ? ` × ${item.qty}`
                      : ""
                  }`
              )
              .join(", ")
            }

          </strong>

          <br>

          ${prettyDate(state.date)}
          •
          ${state.time}

          <br>

          Estimated Appointment Time:
          ${durationLabel(duration)}

          <br>

          Regular Total:
          ${money(regular)}

          <br>

          ${
            wireSelected

              ? `
                Bank Wire Savings:
                ${money(savings)}
                <br>
                Bank Wire Total:
                <strong>
                  ${money(wire)}
                </strong>
              `

              : `
                Pay at Salon:
                <strong>
                  ${money(regular)}
                </strong>
              `
          }

        `;


      $("confirmationModal")
        .classList
        .remove(
          "hidden"
        );

    }


    function closeModal() {

      $("confirmationModal")
        .classList
        .add(
          "hidden"
        );

    }


    $("closeModal")
      .addEventListener(
        "click",
        closeModal
      );


    $("doneButton")
      .addEventListener(
        "click",
        closeModal
      );


    $("confirmationModal")
      .addEventListener(
        "click",
        event => {

          if (
            event.target
            ===
            $("confirmationModal")
          ) {

            closeModal();

          }

        }
      );


    /* STORAGE */

    function save() {

      localStorage
        .setItem(
          "ladyJBooking",
          JSON.stringify({

            selected:
              [
                ...state.selected.entries()
              ],

            open:
              [
                ...state.open
              ],

            date:
              state.date,

            time:
              state.time,

            page:
              state.page,

            payment:
              state.payment

          })
        );

    }


    function restore() {

      try {

        const saved =
          JSON.parse(
            localStorage
              .getItem(
                "ladyJBooking"
              )
          );


        if (!saved) {
          return;
        }


        if (
          Array.isArray(
            saved.selected
          )
        ) {

          state.selected =
            new Map(
              saved.selected
                .filter(
                  ([id]) =>
                    lookup.has(id)
                )
            );

        }


        if (
          Array.isArray(
            saved.open
          )
        ) {

          state.open =
            new Set(
              saved.open
            );

        }


        if (
          saved.date
          &&
          validDates()
            .some(
              date =>
                dateKey(date)
                ===
                saved.date
            )
        ) {

          state.date =
            saved.date;

        }


        state.time =
          typeof saved.time
          ===
          "string"

            ? saved.time

            : null;


        state.page =
          Number.isInteger(
            saved.page
          )

            ? saved.page

            : 0;


        state.payment =
          saved.payment
          ===
          "cash"

            ? "cash"

            : "wire";

      }
      catch {

        console.warn(
          "Could not restore booking state."
        );

      }

    }


    /* HELPERS */

    function startOfDay(date) {

      const copy =
        new Date(date);


      copy.setHours(
        0,
        0,
        0,
        0
      );


      return copy;

    }


    function dateKey(date) {

      return [

        date.getFullYear(),

        String(
          date.getMonth() + 1
        ).padStart(
          2,
          "0"
        ),

        String(
          date.getDate()
        ).padStart(
          2,
          "0"
        )

      ].join("-");

    }


    function parseDate(key) {

      const [
        year,
        month,
        day
      ] =
        key
          .split("-")
          .map(Number);


      return new Date(
        year,
        month - 1,
        day
      );

    }


    function prettyDate(key) {

      return parseDate(key)
        .toLocaleDateString(
          "en-US",
          {
            weekday:
              "short",

            month:
              "short",

            day:
              "numeric"
          }
        );

    }


    function isToday(date) {

      return (
        dateKey(date)
        ===
        dateKey(
          new Date()
        )
      );

    }


    function timeLabel(minutes) {

      const hour24 =
        Math.floor(
          minutes / 60
        );


      const mins =
        minutes % 60;


      const suffix =
        hour24 >= 12
          ? "PM"
          : "AM";


      const hour =
        hour24 % 12
        ||
        12;


      return (
        `${hour}:`
        +
        `${String(mins).padStart(2,"0")} `
        +
        suffix
      );

    }


    function esc(value) {

      return String(value)

        .replaceAll(
          "&",
          "&amp;"
        )

        .replaceAll(
          "<",
          "&lt;"
        )

        .replaceAll(
          ">",
          "&gt;"
        )

        .replaceAll(
          '"',
          "&quot;"
        )

        .replaceAll(
          "'",
          "&#039;"
        );

    }


    /* START */

    restore();

    renderServices();

    renderDates();

    renderTimes();

    updateUI();


    $("paymentDate").max =
      dateKey(
        new Date()
      );

  }
);