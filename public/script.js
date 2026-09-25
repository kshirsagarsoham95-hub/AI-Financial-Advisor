const financeForm =
    document.getElementById("financeForm");

const result =
    document.getElementById("result");


financeForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // =========================
        // GET USER DATA
        // =========================

        const income =
            Number(
                document.getElementById("income").value
            );


        const rent =
            Number(
                document.getElementById("rent").value
            );


        const food =
            Number(
                document.getElementById("food").value
            );


        const transport =
            Number(
                document.getElementById("transport").value
            );


        const bills =
            Number(
                document.getElementById("bills").value
            );


        const entertainment =
            Number(
                document.getElementById("entertainment").value
            );


        const other =
            Number(
                document.getElementById("other").value
            );


        const savings =
            Number(
                document.getElementById("savings").value
            );


        const goal =
            document.getElementById("goal").value;


        const goalAmount =
            Number(
                document.getElementById("goalAmount").value
            );


        const targetMonths =
            Number(
                document.getElementById("targetMonths").value
            );


        // =========================
        // CALCULATIONS
        // =========================

        const totalExpenses =
            rent +
            food +
            transport +
            bills +
            entertainment +
            other;


        const remaining =
            income - totalExpenses;


        const savingsRate =
            income > 0
                ? (savings / income) * 100
                : 0;


        const monthlyGoalSaving =
            targetMonths > 0
                ? goalAmount / targetMonths
                : 0;


        // =========================
        // LOADING
        // =========================

        result.innerHTML = `

            <h2>
                Analyzing Your Finances...
            </h2>

            <p>
                AI Financial Advisor is
                preparing your recommendations.
            </p>

        `;


        // =========================
        // SEND TO BACKEND
        // =========================

        try {


            const response =
                await fetch(
                    "/analyze",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },


                        body:
                            JSON.stringify({

                                income,

                                rent,
                                food,
                                transport,
                                bills,
                                entertainment,
                                other,

                                savings,

                                goal,
                                goalAmount,
                                targetMonths,

                                totalExpenses,
                                remaining,
                                savingsRate,
                                monthlyGoalSaving

                            })

                    }
                );


            const data =
                await response.json();


            // =========================
            // ERROR
            // =========================

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Server error"
                );

            }


            // =========================
            // DISPLAY AI
            // =========================

            result.innerHTML = `

                <h2>
                    AI Financial Advice
                </h2>


                <div class="ai-response">

                    ${data.advice.replace(
                        /\n/g,
                        "<br>"
                    )}

                </div>

            `;


        }

        catch (error) {


            console.error(error);


            result.innerHTML = `

                <h2>
                    Error
                </h2>


                <p>
                    ${error.message}
                </p>

            `;

        }

    }
);