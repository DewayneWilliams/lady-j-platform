document.addEventListener("DOMContentLoaded", () => {

    const cards = [...document.querySelectorAll(".service")];
    const categories = [...document.querySelectorAll(".category")];
    const search = document.getElementById("serviceSearch");

    const serviceSelect = document.getElementById("serviceSelect");
    const booking = document.getElementById("booking");

    let currentCategory = "All";


    function filterServices() {

        const text =
            (search.value || "")
                .trim()
                .toLowerCase();


        cards.forEach(card => {

            const categoryMatch =
                currentCategory === "All" ||
                card.dataset.category === currentCategory;


            const searchMatch =
                !text ||
                card.dataset.name.includes(text) ||
                card.dataset.category
                    .toLowerCase()
                    .includes(text);


            card.classList.toggle(
                "hidden",
                !(categoryMatch && searchMatch)
            );

        });

    }


    categories.forEach(button => {

        button.addEventListener("click", () => {

            categories.forEach(item =>
                item.classList.remove("active")
            );

            button.classList.add("active");

            currentCategory =
                button.dataset.category;

            filterServices();

        });

    });


    search.addEventListener(
        "input",
        filterServices
    );


    document
        .querySelectorAll(".quick-book")
        .forEach(button => {

            button.addEventListener("click", () => {

                serviceSelect.value =
                    button.dataset.service;

                booking.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            });

        });



    /* CALENDAR */

    const grid =
        document.getElementById("calendarGrid");

    const title =
        document.getElementById("calendarTitle");

    const hiddenDate =
        document.getElementById("appointmentDate");

    const dateLabel =
        document.getElementById("selectedDate");

    const previous =
        document.getElementById("prevMonth");

    const next =
        document.getElementById("nextMonth");


    let currentMonth =
        new Date();

    currentMonth.setDate(1);

    let chosenDate = null;


    function formatDate(date) {

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;

    }


    function drawCalendar() {

        grid.innerHTML = "";

        const year =
            currentMonth.getFullYear();

        const month =
            currentMonth.getMonth();

        const first =
            new Date(
                year,
                month,
                1
            );

        const days =
            new Date(
                year,
                month + 1,
                0
            ).getDate();

        const today =
            new Date();

        today.setHours(0, 0, 0, 0);


        title.textContent =
            first.toLocaleDateString(
                "en-US",
                {
                    month: "long",
                    year: "numeric"
                }
            );


        for (
            let i = 0;
            i < first.getDay();
            i++
        ) {

            const empty =
                document.createElement("div");

            empty.className =
                "calendar-empty";

            grid.appendChild(empty);

        }


        for (
            let day = 1;
            day <= days;
            day++
        ) {

            const date =
                new Date(
                    year,
                    month,
                    day
                );


            const button =
                document.createElement("button");


            button.type =
                "button";


            button.className =
                "calendar-day";


            button.textContent =
                day;


            if (date < today) {
                button.disabled = true;
            }


            if (
                chosenDate &&
                chosenDate.toDateString() ===
                date.toDateString()
            ) {

                button.classList.add(
                    "selected"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    chosenDate =
                        date;

                    hiddenDate.value =
                        formatDate(date);

                    dateLabel.textContent =
                        date.toLocaleDateString(
                            "en-US",
                            {
                                weekday: "long",
                                month: "long",
                                day: "numeric"
                            }
                        );

                    drawCalendar();

                }
            );


            grid.appendChild(
                button
            );

        }

    }


    previous.addEventListener(
        "click",
        () => {

            const today =
                new Date();

            const proposed =
                new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                    1
                );


            if (
                proposed.getFullYear()
                <
                today.getFullYear()
            ) {
                return;
            }


            if (
                proposed.getFullYear()
                ===
                today.getFullYear()
                &&
                proposed.getMonth()
                <
                today.getMonth()
            ) {
                return;
            }


            currentMonth =
                proposed;

            drawCalendar();

        }
    );


    next.addEventListener(
        "click",
        () => {

            currentMonth =
                new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                    1
                );

            drawCalendar();

        }
    );


    drawCalendar();



    /* TIME BUTTONS */

    const hiddenTime =
        document.getElementById(
            "appointmentTime"
        );


    const times =
        [...document.querySelectorAll(".time")];


    times.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                times.forEach(item =>
                    item.classList.remove(
                        "selected"
                    )
                );


                button.classList.add(
                    "selected"
                );


                hiddenTime.value =
                    button.dataset.time;

            }
        );

    });



    /* FORM CHECK */

    const form =
        document.getElementById(
            "bookingForm"
        );


    form.addEventListener(
        "submit",
        event => {

            if (!hiddenDate.value) {

                event.preventDefault();

                alert(
                    "Please choose your appointment day."
                );

                return;
            }


            if (!hiddenTime.value) {

                event.preventDefault();

                alert(
                    "Please choose your preferred time."
                );

            }

        }
    );

});