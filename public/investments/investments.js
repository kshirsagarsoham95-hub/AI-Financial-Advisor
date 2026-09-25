// ==========================================================================
// AI FINANCIAL ADVISOR - INVESTMENTS & PROFIT MULTIPLIER ENGINE
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    // User info display
    const invUserAvatar = document.getElementById("invUserAvatar");
    const invUserEmail = document.getElementById("invUserEmail");

    // Capital Barometer
    const barometerSurplus = document.getElementById("barometerSurplus");
    const barometerSavings = document.getElementById("barometerSavings");
    const barometerRate = document.getElementById("barometerRate");

    // Simulator elements
    const rangeLumpSum = document.getElementById("rangeLumpSum");
    const rangeMonthlySip = document.getElementById("rangeMonthlySip");
    const rangeHorizon = document.getElementById("rangeHorizon");
    const valInitialLumpSum = document.getElementById("valInitialLumpSum");
    const valMonthlySip = document.getElementById("valMonthlySip");
    const valHorizon = document.getElementById("valHorizon");
    const valCagr = document.getElementById("valCagr");
    const riskButtons = document.querySelectorAll(".risk-toggle-btn");

    // Simulator outputs
    const simTotalInvested = document.getElementById("simTotalInvested");
    const simProfitGained = document.getElementById("simProfitGained");
    const simTotalCorpus = document.getElementById("simTotalCorpus");
    const btnSync = document.getElementById("btnSyncWithAssessment");

    // AI Strategy elements
    const btnGenerateAi = document.getElementById("btnGenerateAiStrategy");
    const aiResultsContainer = document.getElementById("aiStrategyResultsContainer");
    const strategyPortfolioName = document.getElementById("strategyPortfolioName");
    const strategyRationale = document.getElementById("strategyRationale");
    const strategyExpectedCagr = document.getElementById("strategyExpectedCagr");
    const strategyRiskRating = document.getElementById("strategyRiskRating");
    const strategyTiersList = document.getElementById("strategyTiersList");
    const strategyTacticsList = document.getElementById("strategyTacticsList");

    let activeCagr = 12; // default balanced
    let currentProfile = {
        monthlySurplus: 20000,
        currentSavings: 150000,
        savingsRate: 28.5,
        goal: "Wealth Accumulation & Capital Growth"
    };

    // Helper: Rupee Formatter
    function formatRupee(amount) {
        return "₹" + Math.round(Number(amount) || 0).toLocaleString("en-IN");
    }

    // 1. Fetch user authentication info
    try {
        const authRes = await fetch("/api/me");
        if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.email) {
                invUserEmail.textContent = authData.email;
                invUserAvatar.textContent = authData.email.charAt(0).toUpperCase();
            }
        }
    } catch (e) {
        console.warn("Could not fetch user session:", e);
    }

    // 2. Fetch or read user assessment data
    let reportData = null;
    const sessionCached = sessionStorage.getItem("financialReport");
    if (sessionCached) {
        try {
            reportData = JSON.parse(sessionCached);
        } catch (e) {
            console.warn("Could not parse sessionStorage:", e);
        }
    }

    if (!reportData || !reportData.analysis) {
        try {
            const apiRes = await fetch("/api/latest-analysis");
            if (apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData.data) reportData = apiData.data;
            }
        } catch (e) {
            console.warn("Could not fetch latest analysis:", e);
        }
    }

    if (reportData && reportData.metrics) {
        const m = reportData.metrics;
        currentProfile.monthlySurplus = Math.max(0, m.remaining || 0);
        currentProfile.currentSavings = Math.max(0, m.savings || 0);
        currentProfile.savingsRate = m.savingsRate || 0;
        currentProfile.goal = m.goal || "Wealth Accumulation";
    }

    // Update Barometer stats
    function updateBarometer() {
        barometerSurplus.textContent = `${formatRupee(currentProfile.monthlySurplus)} / mo`;
        barometerSavings.textContent = formatRupee(currentProfile.currentSavings);
        barometerRate.textContent = `${currentProfile.savingsRate}%`;

        // Pre-fill sliders from profile if available
        if (currentProfile.monthlySurplus > 0) {
            rangeMonthlySip.value = Math.min(100000, currentProfile.monthlySurplus);
        }
        if (currentProfile.currentSavings > 0) {
            rangeLumpSum.value = Math.min(1000000, currentProfile.currentSavings);
        }
    }

    updateBarometer();

    // 3. Compounding Simulator Calculation Engine
    let chartInstance = null;

    function calculateCompounding() {
        const lumpSum = Number(rangeLumpSum.value) || 0;
        const monthlySip = Number(rangeMonthlySip.value) || 0;
        const years = Number(rangeHorizon.value) || 1;
        const annualRate = activeCagr / 100;
        const monthlyRate = annualRate / 12;

        valInitialLumpSum.textContent = formatRupee(lumpSum);
        valMonthlySip.textContent = formatRupee(monthlySip);
        valHorizon.textContent = `${years} Year${years > 1 ? "s" : ""}`;
        valCagr.textContent = `${activeCagr}%`;

        const totalMonths = years * 12;
        const totalInvested = lumpSum + (monthlySip * totalMonths);

        // Future value calculations:
        // FV of lump sum: P * (1 + r)^n
        const fvLumpSum = lumpSum * Math.pow(1 + monthlyRate, totalMonths);

        // FV of monthly annuity: PMT * [((1 + r)^n - 1) / r] * (1 + r)
        const fvSip = monthlySip * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);

        const terminalCorpus = fvLumpSum + fvSip;
        const profitGained = Math.max(0, terminalCorpus - totalInvested);

        simTotalInvested.textContent = formatRupee(totalInvested);
        simProfitGained.textContent = "+" + formatRupee(profitGained);
        simTotalCorpus.textContent = formatRupee(terminalCorpus);

        // Update Projection Chart
        updateProjectionChart(lumpSum, monthlySip, years, monthlyRate);
    }

    // Chart.js Compounding Projection
    function updateProjectionChart(lumpSum, monthlySip, years, monthlyRate) {
        const ctx = document.getElementById("growthProjectionChart");
        if (!ctx || typeof Chart === "undefined") return;

        const labels = [];
        const investedData = [];
        const corpusData = [];

        // Sample at each year
        for (let y = 1; y <= years; y++) {
            labels.push(`Yr ${y}`);
            const m = y * 12;
            const inv = lumpSum + (monthlySip * m);
            const fvL = lumpSum * Math.pow(1 + monthlyRate, m);
            const fvS = monthlySip * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate);
            investedData.push(Math.round(inv));
            corpusData.push(Math.round(fvL + fvS));
        }

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx.getContext("2d"), {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Total Corpus (₹)",
                        data: corpusData,
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: years > 10 ? 0 : 3
                    },
                    {
                        label: "Invested Capital (₹)",
                        data: investedData,
                        borderColor: "#64748b",
                        borderDash: [5, 5],
                        borderWidth: 1.5,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            color: "#94a3b8",
                            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                            boxWidth: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ₹${context.raw.toLocaleString("en-IN")}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: val => "₹" + (val >= 10000000 ? (val/10000000).toFixed(1) + "Cr" : (val/100000).toFixed(0) + "L"),
                            color: "#64748b",
                            font: { size: 9 }
                        },
                        grid: { color: "rgba(255, 255, 255, 0.04)" }
                    },
                    x: {
                        ticks: { color: "#64748b", font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Attach slider listeners
    [rangeLumpSum, rangeMonthlySip, rangeHorizon].forEach(range => {
        range.addEventListener("input", calculateCompounding);
    });

    // Risk toggle buttons
    riskButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            riskButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCagr = Number(btn.getAttribute("data-cagr")) || 12;
            calculateCompounding();
        });
    });

    // Sync button
    btnSync.addEventListener("click", () => {
        if (currentProfile.monthlySurplus > 0) {
            rangeMonthlySip.value = Math.min(100000, currentProfile.monthlySurplus);
        }
        if (currentProfile.currentSavings > 0) {
            rangeLumpSum.value = Math.min(1000000, currentProfile.currentSavings);
        }
        calculateCompounding();
    });

    // Initial calculation
    calculateCompounding();

    // 4. AI Strategic Allocation Generator (via POST /api/investment-strategy)
    btnGenerateAi.addEventListener("click", async () => {
        const monthlySurplus = Number(rangeMonthlySip.value) || currentProfile.monthlySurplus;
        const currentSavings = Number(rangeLumpSum.value) || currentProfile.currentSavings;
        const horizonYears = Number(rangeHorizon.value) || 5;
        const riskTolerance = activeCagr >= 15 ? "Aggressive Growth" : activeCagr <= 8 ? "Conservative Capital Preservation" : "Balanced Wealth Accumulation";

        btnGenerateAi.disabled = true;
        btnGenerateAi.innerHTML = `
            <span>Synthesizing Strategy with Gemini...</span>
            <div class="loading-spinner-ring" style="width: 16px; height: 16px; border-width: 2px; margin: 0;"></div>
        `;

        try {
            const response = await fetch("/api/investment-strategy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    monthlySurplus,
                    currentSavings,
                    riskTolerance,
                    horizonYears,
                    goal: currentProfile.goal
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate investment strategy.");
            }

            const strategy = data.strategy;

            // Render strategy UI
            strategyPortfolioName.textContent = strategy.portfolioName || "Custom Growth & Yield Blueprint";
            strategyRationale.textContent = strategy.executiveRationale || "";
            strategyExpectedCagr.textContent = strategy.expectedCagr || `${activeCagr}% CAGR`;
            strategyRiskRating.textContent = `${strategy.riskTier || riskTolerance} Profile`;

            // Render Tier Allocations
            strategyTiersList.innerHTML = "";
            const tiers = strategy.tierAllocations || [];

            tiers.forEach(t => {
                const item = document.createElement("div");
                item.className = "strategy-breakdown-item";
                item.innerHTML = `
                    <div>
                        <div class="strategy-item-name">${t.tier || "Strategic Tier"} (${t.percentage || 0}%)</div>
                        <div class="strategy-item-purpose">${t.strategicRole || ""}</div>
                        <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
                            <strong>Recommended:</strong> ${(t.recommendedInstruments || []).join(", ")}
                        </div>
                    </div>
                    <div class="strategy-item-amounts">
                        <div class="strategy-pct-badge">${formatRupee(t.monthlyAmount || 0)} / mo</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                            Lump-Sum: ${formatRupee(t.lumpSumAmount || 0)}
                        </div>
                        <div style="font-size: 11px; color: #34d399; font-weight: 700; margin-top: 2px;">
                            Expected Yield: ${t.expectedYield || "12%"}
                        </div>
                    </div>
                `;
                strategyTiersList.appendChild(item);
            });

            // Render Tactics
            strategyTacticsList.innerHTML = "";
            const tactics = strategy.profitMaximizationTactics || [];
            tactics.forEach(tac => {
                const li = document.createElement("li");
                li.innerHTML = `&bull; <span>${tac}</span>`;
                strategyTacticsList.appendChild(li);
            });

            aiResultsContainer.style.display = "block";
            aiResultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });

        } catch (err) {
            alert("Error: " + err.message);
            console.error("AI Investment strategy error:", err);
        } finally {
            btnGenerateAi.disabled = false;
            btnGenerateAi.innerHTML = `
                <span>Re-generate AI Deployment Strategy</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
            `;
        }
    });
});
