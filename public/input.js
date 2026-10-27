// ==========================================================================
// AI FINANCIAL ADVISOR - INPUT & REAL-TIME CASHFLOW ENGINE
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    // Form and control elements
    const form = document.getElementById("advisorForm");
    const btnDemo = document.getElementById("btnDemoProfile");
    const btnSubmit = document.getElementById("btnSubmit");
    const modal = document.getElementById("loadingModal");
    const statusText = document.getElementById("loadingStatusText");

    // Inputs
    const incomeInput = document.getElementById("income");
    const rentInput = document.getElementById("rent");
    const foodInput = document.getElementById("food");
    const transportInput = document.getElementById("transport");
    const billsInput = document.getElementById("bills");
    const entertainmentInput = document.getElementById("entertainment");
    const otherInput = document.getElementById("other");
    const savingsInput = document.getElementById("savings");
    const goalInput = document.getElementById("goal");
    const goalAmountInput = document.getElementById("goalAmount");
    const targetMonthsInput = document.getElementById("targetMonths");

    // Live display cards
    const liveIncome = document.getElementById("liveIncome");
    const liveExpenses = document.getElementById("liveExpenses");
    const liveExpenseRatio = document.getElementById("liveExpenseRatio");
    const liveCashflow = document.getElementById("liveCashflow");
    const liveCashflowStatus = document.getElementById("liveCashflowStatus");
    const liveSavingsRate = document.getElementById("liveSavingsRate");
    const liveSavingsQuality = document.getElementById("liveSavingsQuality");

    // User display
    const userEmailDisplay = document.getElementById("userEmailDisplay");
    const userAvatar = document.getElementById("userAvatar");

    // Load active session user info
    try {
        const authRes = await fetch("/api/me");
        if (authRes.status === 401) {
            window.location.href = "/";
            return;
        }
        if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.email) {
                userEmailDisplay.textContent = authData.email;
                userAvatar.textContent = authData.email.charAt(0).toUpperCase();
            }
        }
    } catch (e) {
        console.warn("Could not fetch user session:", e);
    }

    // Restore previous inputs if user navigated back from report page
    const savedInputs = sessionStorage.getItem("financialInputs");
    if (savedInputs) {
        try {
            const data = JSON.parse(savedInputs);
            incomeInput.value = data.income || "";
            rentInput.value = data.rent || "";
            foodInput.value = data.food || "";
            transportInput.value = data.transport || "";
            billsInput.value = data.bills || "";
            entertainmentInput.value = data.entertainment || "";
            otherInput.value = data.other || "";
            savingsInput.value = data.savings || "";
            goalInput.value = data.goal || "";
            goalAmountInput.value = data.goalAmount || "";
            targetMonthsInput.value = data.targetMonths || "";
        } catch (e) {
            console.error("Error reading saved inputs:", e);
        }
    }

    // Helper: format INR currency
    function formatRupee(amount) {
        return "₹" + Math.round(amount).toLocaleString("en-IN");
    }

    // Recalculate live strip
    function updateLiveCalculations() {
        const income = Math.max(0, Number(incomeInput.value) || 0);
        const rent = Math.max(0, Number(rentInput.value) || 0);
        const food = Math.max(0, Number(foodInput.value) || 0);
        const transport = Math.max(0, Number(transportInput.value) || 0);
        const bills = Math.max(0, Number(billsInput.value) || 0);
        const entertainment = Math.max(0, Number(entertainmentInput.value) || 0);
        const other = Math.max(0, Number(otherInput.value) || 0);

        const totalExpenses = rent + food + transport + bills + entertainment + other;
        const netCashflow = income - totalExpenses;
        const expenseRatio = income > 0 ? ((totalExpenses / income) * 100).toFixed(1) : 0;
        const savingsRate = income > 0 ? ((netCashflow / income) * 100).toFixed(1) : 0;

        liveIncome.textContent = formatRupee(income);
        liveExpenses.textContent = formatRupee(totalExpenses);

        // Expense ratio status
        liveExpenseRatio.textContent = `${expenseRatio}% of income`;
        if (expenseRatio > 85) {
            liveExpenseRatio.className = "live-status status-danger";
        } else if (expenseRatio > 70) {
            liveExpenseRatio.className = "live-status status-warning";
        } else {
            liveExpenseRatio.className = "live-status status-positive";
        }

        // Net Cashflow
        liveCashflow.textContent = (netCashflow >= 0 ? "+" : "-") + formatRupee(Math.abs(netCashflow));
        if (netCashflow > 0) {
            liveCashflowStatus.textContent = "Surplus Active";
            liveCashflowStatus.className = "live-status status-positive";
        } else if (netCashflow === 0) {
            liveCashflowStatus.textContent = "Break-even";
            liveCashflowStatus.className = "live-status status-warning";
        } else {
            liveCashflowStatus.textContent = "Deficit Alert";
            liveCashflowStatus.className = "live-status status-danger";
        }

        // Savings Potential
        liveSavingsRate.textContent = `${savingsRate}%`;
        if (savingsRate >= 20) {
            liveSavingsQuality.textContent = "Optimal (≥20%)";
            liveSavingsQuality.className = "live-status status-positive";
        } else if (savingsRate > 0) {
            liveSavingsQuality.textContent = "Moderate (<20%)";
            liveSavingsQuality.className = "live-status status-warning";
        } else {
            liveSavingsQuality.textContent = "Negative / At Risk";
            liveSavingsQuality.className = "live-status status-danger";
        }
    }

    // Attach listeners to all numeric inputs
    [incomeInput, rentInput, foodInput, transportInput, billsInput, entertainmentInput, otherInput].forEach(inp => {
        inp.addEventListener("input", updateLiveCalculations);
    });

    // Run once on initial load
    updateLiveCalculations();

    // DEMO PROFILE LOADER
    btnDemo.addEventListener("click", () => {
        incomeInput.value = "70000";
        rentInput.value = "20000";
        foodInput.value = "10000";
        transportInput.value = "4500";
        billsInput.value = "3500";
        entertainmentInput.value = "6000";
        otherInput.value = "3000";
        savingsInput.value = "150000";
        goalInput.value = "Down payment for Electric Vehicle";
        goalAmountInput.value = "250000";
        targetMonthsInput.value = "12";

        updateLiveCalculations();

        // Highlight inputs briefly
        incomeInput.focus();
    });

    // SUBMIT FORM & REDIRECT TO REPORT.HTML
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const income = Number(incomeInput.value);
        if (!income || income <= 0) {
            alert("Please provide a valid monthly income greater than 0.");
            incomeInput.focus();
            return;
        }

        const payload = {
            income: income,
            rent: Number(rentInput.value) || 0,
            food: Number(foodInput.value) || 0,
            transport: Number(transportInput.value) || 0,
            bills: Number(billsInput.value) || 0,
            entertainment: Number(entertainmentInput.value) || 0,
            other: Number(otherInput.value) || 0,
            savings: Number(savingsInput.value) || 0,
            goal: goalInput.value.trim() || "Financial Security",
            goalAmount: Number(goalAmountInput.value) || 0,
            targetMonths: Number(targetMonthsInput.value) || 12
        };

        // Cache inputs for quick editing
        sessionStorage.setItem("financialInputs", JSON.stringify(payload));

        // Open modal & start animation steps
        modal.classList.add("active");
        btnSubmit.disabled = true;

        const steps = [
            { text: "Auditing monthly cashflows and fixed commitments...", stepId: "step1" },
            { text: "Benchmarking allocations against 50/30/20 guidelines...", stepId: "step2" },
            { text: "Evaluating goal horizon, runway adequacy, and capital shortfall...", stepId: "step3" },
            { text: "Synthesizing executive wealth recommendations via Gemini...", stepId: "step4" }
        ];

        let currentStepIndex = 0;
        const stepInterval = setInterval(() => {
            currentStepIndex = (currentStepIndex + 1) % steps.length;
            statusText.textContent = steps[currentStepIndex].text;
            steps.forEach((s, idx) => {
                const el = document.getElementById(s.stepId);
                if (el) {
                    if (idx === currentStepIndex) el.classList.add("active");
                    else el.classList.remove("active");
                }
            });
        }, 1200);

        try {
            const response = await fetch("/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            clearInterval(stepInterval);

            if (response.status === 401) {
                statusText.textContent = "Session expired. Redirecting to sign in...";
                setTimeout(() => {
                    window.location.href = "/";
                }, 1000);
                return;
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Analysis request failed.");
            }

            // Save structured report in sessionStorage
            sessionStorage.setItem("financialReport", JSON.stringify(result));

            // Smooth redirect to report.html
            statusText.textContent = "Report ready! Launching Executive Dossier...";
            setTimeout(() => {
                window.location.href = "/report.html";
            }, 500);

        } catch (error) {
            clearInterval(stepInterval);
            modal.classList.remove("active");
            btnSubmit.disabled = false;
            alert("Analysis Notice: " + error.message);
            console.error("Submission failed:", error);
        }
    });
});
