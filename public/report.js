// ==========================================================================
// AI FINANCIAL ADVISOR - FLAGSHIP FINTECH DASHBOARD ENGINE
// Stripe / Ramp / Linear Architecture
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    // Top-level DOM references
    const noDataBanner = document.getElementById("noDataBanner");
    const reportContent = document.getElementById("reportContent");

    // ==========================================================================
    // FEATURE 7: SEAMLESS THEME TOGGLE SWITCH
    // ==========================================================================
    const themeToggle = document.getElementById("themeToggle");
    const themeBtnDark = document.getElementById("themeBtnDark");
    const themeBtnLight = document.getElementById("themeBtnLight");

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("finadvisor_theme", theme);

        if (theme === "light") {
            themeBtnLight?.classList.add("active");
            themeBtnDark?.classList.remove("active");
        } else {
            themeBtnDark?.classList.add("active");
            themeBtnLight?.classList.remove("active");
        }

        // Re-render chart colors if charts exist
        updateAllChartThemes(theme);
    }

    const savedTheme = localStorage.getItem("finadvisor_theme") || 
        (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme") || "dark";
            const next = current === "dark" ? "light" : "dark";
            applyTheme(next);
        });
    }

    // ==========================================================================
    // DATA RETRIEVAL (SESSION STORAGE + FALLBACK API)
    // ==========================================================================
    let reportData = null;
    const sessionCached = sessionStorage.getItem("financialReport");
    if (sessionCached) {
        try {
            reportData = JSON.parse(sessionCached);
        } catch (e) {
            console.error("Error parsing sessionStorage report:", e);
        }
    }

    if (!reportData || !reportData.analysis) {
        try {
            const res = await fetch("/api/latest-analysis");
            if (res.ok) {
                const apiData = await res.json();
                if (apiData.data) {
                    reportData = apiData.data;
                }
            }
        } catch (e) {
            console.warn("Could not retrieve latest analysis from server session:", e);
        }
    }

    // Still no data? Show fallback prompt
    if (!reportData || !reportData.analysis) {
        if (noDataBanner) noDataBanner.style.display = "block";
        if (reportContent) reportContent.style.display = "none";
        return;
    }

    if (noDataBanner) noDataBanner.style.display = "none";
    if (reportContent) reportContent.style.display = "block";

    const analysis = reportData.analysis;
    const metrics = reportData.metrics || {};
    const clientEmail = reportData.client || reportData.userEmail || "client@finadvisor.ai";

    // Helpers
    function formatRupee(amount) {
        return "₹" + Math.round(Number(amount) || 0).toLocaleString("en-IN");
    }

    function animateNumber(element, start, end, prefix = "", suffix = "", duration = 1200) {
        if (!element) return;
        const startTime = performance.now();
        const diff = end - start;

        function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (diff * ease));
            element.textContent = prefix + current.toLocaleString("en-IN") + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    // Print handlers
    const btnPrint = document.getElementById("btnPrintReport");
    const btnBottomPrint = document.getElementById("btnBottomPrint");
    [btnPrint, btnBottomPrint].forEach(btn => {
        if (btn) btn.addEventListener("click", () => window.print());
    });

    // Client Meta & Timestamps
    const reportUserEmail = document.getElementById("reportUserEmail");
    const reportUserAvatar = document.getElementById("reportUserAvatar");
    const dossierClientEmail = document.getElementById("dossierClientEmail");
    const dossierDate = document.getElementById("dossierDate");
    const clientGoalHeading = document.getElementById("clientGoalHeading");

    if (reportUserEmail) reportUserEmail.textContent = clientEmail;
    if (reportUserAvatar) reportUserAvatar.textContent = clientEmail.charAt(0).toUpperCase();
    if (dossierClientEmail) dossierClientEmail.textContent = clientEmail;
    if (dossierDate) {
        const now = new Date(reportData.generatedAt || Date.now());
        dossierDate.textContent = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    if (clientGoalHeading && metrics.goal) {
        clientGoalHeading.textContent = `Strategic Wealth Roadmap: ${metrics.goal}`;
    }

    // Financial Health Score
    const score = Math.max(0, Math.min(100, Math.round(analysis.financialHealthScore || 78)));
    const scoreDial = document.getElementById("scoreDial");
    const healthScoreNum = document.getElementById("healthScoreNum");
    const healthScoreBadge = document.getElementById("healthScoreBadge");

    if (healthScoreNum) animateNumber(healthScoreNum, 0, score, "", "", 1000);
    if (scoreDial) {
        scoreDial.style.setProperty("--score-pct", score);
        const scoreColor = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
        scoreDial.style.background = `conic-gradient(${scoreColor} calc(${score} * 1%), var(--border-subtle) 0)`;
    }
    if (healthScoreBadge) {
        healthScoreBadge.textContent = analysis.healthStatus || "Financial Assessment Completed";
        healthScoreBadge.style.color = score >= 75 ? "var(--accent-emerald-light)" : score >= 50 ? "var(--accent-amber-light)" : "var(--accent-rose-light)";
    }

    // ==========================================================================
    // FEATURE 1: GLASSMORPHISM KPI SUMMARY CARDS
    // ==========================================================================
    const incomeTotal = Math.max(0, Number(metrics.income) || 0);
    const netCashflow = metrics.remaining !== undefined ? metrics.remaining : 0;
    const currentSavings = Math.max(0, Number(metrics.savings) || 0);
    const savingsRate = metrics.savingsRate !== undefined ? metrics.savingsRate : 0;
    const runway = metrics.emergencyRunwayMonths || (analysis.riskRadar && analysis.riskRadar.emergencyFundRunwayMonths) || 0;

    // Estimated Net Worth = Liquid Reserves + Projected Goal Capital In-Motion
    const estimatedNetWorth = currentSavings + (netCashflow > 0 ? netCashflow * 3 : 0);
    const kpiNetWorth = document.getElementById("kpiNetWorth");
    const kpiNetWorthSub = document.getElementById("kpiNetWorthSub");
    const kpiNetWorthPill = document.getElementById("kpiNetWorthPill");
    if (kpiNetWorth) animateNumber(kpiNetWorth, 0, estimatedNetWorth, "₹", "", 1200);
    if (kpiNetWorthSub) kpiNetWorthSub.textContent = `Liquid buffer: ${formatRupee(currentSavings)}`;
    if (kpiNetWorthPill) {
        kpiNetWorthPill.textContent = currentSavings >= (incomeTotal * 3) ? "+18.5% Strong" : "+9.2% Moderate";
    }

    // KPI Net Monthly Cashflow
    const kpiNetCashflow = document.getElementById("kpiNetCashflow");
    const kpiNetCashflowSub = document.getElementById("kpiNetCashflowSub");
    const kpiCashflowPill = document.getElementById("kpiCashflowPill");
    if (kpiNetCashflow) {
        const sign = netCashflow >= 0 ? "+" : "-";
        animateNumber(kpiNetCashflow, 0, Math.abs(netCashflow), sign + "₹", "", 1200);
        kpiNetCashflow.style.color = netCashflow >= 0 ? "var(--accent-emerald-light)" : "var(--accent-rose-light)";
    }
    if (kpiNetCashflowSub) {
        kpiNetCashflowSub.textContent = netCashflow >= 0 ? 
            `Surplus (${metrics.surplusPct || 0}% of monthly income)` : 
            `Deficit (${Math.abs(metrics.surplusPct || 0)}% negative cashflow)`;
    }
    if (kpiCashflowPill) {
        kpiCashflowPill.textContent = (netCashflow >= 0 ? "+" : "") + (metrics.surplusPct || 0) + "% Inflow";
        kpiCashflowPill.className = `trend-pill ${netCashflow >= 0 ? 'positive' : 'negative'}`;
    }

    // KPI Savings Rate
    const kpiSavingsRate = document.getElementById("kpiSavingsRate");
    const kpiSavingsRateSub = document.getElementById("kpiSavingsRateSub");
    const kpiSavingsRatePill = document.getElementById("kpiSavingsRatePill");
    if (kpiSavingsRate) animateNumber(kpiSavingsRate, 0, Math.round(savingsRate), "", "%", 1000);
    if (kpiSavingsRateSub) {
        kpiSavingsRateSub.textContent = savingsRate >= 20 ? "Meets institutional benchmark (≥20%)" : "Under ideal wealth generation rate (<20%)";
    }
    if (kpiSavingsRatePill) {
        const delta = (savingsRate - 20).toFixed(1);
        kpiSavingsRatePill.textContent = (delta >= 0 ? "+" : "") + delta + "% vs 20% standard";
        kpiSavingsRatePill.className = `trend-pill ${savingsRate >= 20 ? 'positive' : 'negative'}`;
    }

    // KPI Runway
    const kpiRunway = document.getElementById("kpiRunway");
    const kpiRunwaySub = document.getElementById("kpiRunwaySub");
    const kpiRunwayPill = document.getElementById("kpiRunwayPill");
    if (kpiRunway) kpiRunway.textContent = `${runway} Mo`;
    if (kpiRunwaySub) {
        kpiRunwaySub.textContent = runway >= 3 ? "Healthy emergency reserve (>3 mo)" : "Under-funded emergency buffer (<3 mo)";
    }
    if (kpiRunwayPill) {
        kpiRunwayPill.textContent = runway >= 6 ? "Fortress Reserve" : runway >= 3 ? "Adequate" : "Attention Needed";
        kpiRunwayPill.className = `trend-pill ${runway >= 3 ? 'positive' : 'negative'}`;
    }

    // Executive Summary
    const executiveSummaryText = document.getElementById("executiveSummaryText");
    if (executiveSummaryText && analysis.executiveSummary) {
        executiveSummaryText.textContent = analysis.executiveSummary;
    }

    // ==========================================================================
    // FEATURE 5: CATEGORY EXPENSE BREAKDOWN CARDS WITH ANOMALY BADGES
    // ==========================================================================
    const expenseAnomalyGrid = document.getElementById("expenseAnomalyGrid");
    const rentVal = Math.max(0, Number(metrics.rent) || 0);
    const foodVal = Math.max(0, Number(metrics.food) || 0);
    const transportVal = Math.max(0, Number(metrics.transport) || 0);
    const billsVal = Math.max(0, Number(metrics.bills) || 0);
    const entertainmentVal = Math.max(0, Number(metrics.entertainment) || 0);
    const otherVal = Math.max(0, Number(metrics.other) || 0);

    const categories = [
        {
            name: "Housing & Rent",
            icon: "🏠",
            amount: rentVal,
            recommendedMaxPct: 35,
            color: "#6366F1"
        },
        {
            name: "Groceries & Food",
            icon: "🛒",
            amount: foodVal,
            recommendedMaxPct: 20,
            color: "#38BDF8"
        },
        {
            name: "Commute & Transit",
            icon: "🚗",
            amount: transportVal,
            recommendedMaxPct: 12,
            color: "#A855F7"
        },
        {
            name: "Utilities & Bills",
            icon: "⚡",
            amount: billsVal,
            recommendedMaxPct: 10,
            color: "#F59E0B"
        },
        {
            name: "Lifestyle & Leisure",
            icon: "☕",
            amount: entertainmentVal,
            recommendedMaxPct: 15,
            color: "#F43F5E"
        },
        {
            name: "Other Discretionary",
            icon: "📦",
            amount: otherVal,
            recommendedMaxPct: 10,
            color: "#64748B"
        }
    ];

    if (expenseAnomalyGrid) {
        expenseAnomalyGrid.innerHTML = "";
        categories.forEach(cat => {
            const pctOfIncome = incomeTotal > 0 ? ((cat.amount / incomeTotal) * 100).toFixed(1) : 0;
            const isAnomaly = Number(pctOfIncome) > cat.recommendedMaxPct;
            const isBorderline = Number(pctOfIncome) > (cat.recommendedMaxPct * 0.85);

            const badgeText = isAnomaly ? 
                `⚠️ High Burden (>${cat.recommendedMaxPct}%)` : 
                isBorderline ? `Borderline` : `✓ Healthy (≤${cat.recommendedMaxPct}%)`;
            const badgeClass = isAnomaly ? 'alert' : isBorderline ? 'warning' : 'safe';

            const card = document.createElement("div");
            card.className = "expense-cat-card";
            card.innerHTML = `
                <div class="cat-header">
                    <div class="cat-icon-title">
                        <div class="cat-icon-box">${cat.icon}</div>
                        <span class="cat-name">${cat.name}</span>
                    </div>
                    <span class="anomaly-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="cat-amount-row">
                    <span class="cat-amount">${formatRupee(cat.amount)}</span>
                    <span class="cat-pct">${pctOfIncome}% of income</span>
                </div>
                <div class="cat-progress-bg">
                    <div class="cat-progress-fill" style="width: ${Math.min(100, pctOfIncome)}%; background: ${cat.color};"></div>
                </div>
            `;
            expenseAnomalyGrid.appendChild(card);
        });
    }

    // ==========================================================================
    // FEATURE 6: VISUAL MILESTONE TRACKER CARDS
    // ==========================================================================
    const goalTitle = metrics.goal || "Wealth Accumulation";
    const goalAmount = Math.max(1, Number(metrics.goalAmount) || 500000);
    const targetMonths = Math.max(1, Number(metrics.targetMonths) || 24);
    const goalTargetTitle = document.getElementById("goalTargetTitle");
    const goalRingCircle = document.getElementById("goalRingCircle");
    const goalRingPctText = document.getElementById("goalRingPctText");
    const goalTargetAmountText = document.getElementById("goalTargetAmountText");
    const goalCountdownPill = document.getElementById("goalCountdownPill");
    const goalFeasibilityBadge = document.getElementById("goalFeasibilityBadge");
    const goalVerdictText = document.getElementById("goalVerdictText");
    const milestonesTimeline = document.getElementById("milestonesTimeline");

    if (goalTargetTitle) goalTargetTitle.textContent = goalTitle;
    if (goalTargetAmountText) {
        goalTargetAmountText.textContent = `${formatRupee(currentSavings)} of ${formatRupee(goalAmount)}`;
    }

    const goalProgressPct = Math.min(100, Math.round((currentSavings / goalAmount) * 100));
    if (goalRingPctText) goalRingPctText.textContent = `${goalProgressPct}%`;
    if (goalRingCircle) {
        const circumference = 408.4;
        const offset = circumference - (goalProgressPct / 100) * circumference;
        goalRingCircle.style.strokeDashoffset = offset;
    }

    if (goalCountdownPill) {
        const projectedMonths = netCashflow > 0 ? Math.ceil((goalAmount - currentSavings) / netCashflow) : targetMonths;
        const targetDateObj = new Date();
        targetDateObj.setMonth(targetDateObj.getMonth() + projectedMonths);
        const dateStr = targetDateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        goalCountdownPill.textContent = `⚡ ~${projectedMonths} Months Horizon • Target: ${dateStr}`;
    }

    if (analysis.goalRoadmap) {
        if (goalVerdictText) goalVerdictText.textContent = analysis.goalRoadmap.feasibilityVerdict || "Goal analysis completed.";
        if (goalFeasibilityBadge) goalFeasibilityBadge.textContent = analysis.goalRoadmap.feasibility || "On Track";

        if (milestonesTimeline) {
            const milestones = analysis.goalRoadmap.milestones || [];
            milestonesTimeline.innerHTML = "";
            if (milestones.length > 0) {
                milestones.forEach((ms, idx) => {
                    const step = document.createElement("div");
                    step.className = `milestone-step ${idx === 0 && goalProgressPct >= 33 ? 'completed' : ''}`;
                    step.innerHTML = `
                        <div class="milestone-node">${idx + 1}</div>
                        <div class="milestone-content">
                            <div class="milestone-period">${ms.period || "Milestone"} ${ms.targetAmount ? `&bull; ${ms.targetAmount}` : ""}</div>
                            <div class="milestone-focus">${ms.focus || ""}</div>
                        </div>
                    `;
                    milestonesTimeline.appendChild(step);
                });
            } else {
                milestonesTimeline.innerHTML = `
                    <div class="milestone-step">
                        <div class="milestone-node">1</div>
                        <div class="milestone-content">
                            <div class="milestone-period">Phased Execution</div>
                            <div class="milestone-focus">Automate ${formatRupee(metrics.monthlyGoalSaving || 0)} monthly transfers directly upon salary credit.</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    // Strategic Recommendations
    const recsContainer = document.getElementById("recommendationsContainer");
    if (recsContainer) {
        recsContainer.innerHTML = "";
        const recommendations = analysis.strategicRecommendations || [];
        recommendations.forEach(rec => {
            const priorityClass = (rec.priority || "").toLowerCase().includes("high") ? "priority-high" :
                (rec.priority || "").toLowerCase().includes("med") ? "priority-medium" : "priority-growth";
            const card = document.createElement("div");
            card.className = "rec-card";
            card.innerHTML = `
                <div class="rec-meta-row">
                    <span class="rec-tag-priority ${priorityClass}">${rec.priority || "Action"} &bull; ${rec.timeframe || "Immediate"}</span>
                    ${rec.impact ? `<span class="rec-impact-pill">${rec.impact}</span>` : ""}
                </div>
                <h4 class="rec-title">${rec.title || "Strategic Recommendation"}</h4>
                <p class="rec-details">${rec.details || ""}</p>
            `;
            recsContainer.appendChild(card);
        });
    }

    // Risk Radar
    const riskPrimaryText = document.getElementById("riskPrimaryText");
    const riskSafeguardText = document.getElementById("riskSafeguardText");
    if (analysis.riskRadar) {
        if (riskPrimaryText) riskPrimaryText.textContent = analysis.riskRadar.primaryRisk || "Concentration of fixed expenditures with minimal liquid buffers.";
        if (riskSafeguardText) riskSafeguardText.textContent = analysis.riskRadar.protectiveMeasure || "Establish an automated liquid emergency reserve.";
    }

    // Wealth Advisor Verdict
    const advisorClosingVerdict = document.getElementById("advisorClosingVerdict");
    if (advisorClosingVerdict && analysis.wealthAdvisorVerdict) {
        advisorClosingVerdict.textContent = `"${analysis.wealthAdvisorVerdict}"`;
    }

    // ==========================================================================
    // OUTFLOW DONUT & 50/30/20 BENCHMARK BREAKDOWN LISTS
    // ==========================================================================
    const outflowItems = [
        { label: "Rent / Housing", value: rentVal, color: "#6366f1" },
        { label: "Groceries & Food", value: foodVal, color: "#38bdf8" },
        { label: "Transit & Commute", value: transportVal, color: "#a855f7" },
        { label: "Utilities & Bills", value: billsVal, color: "#f59e0b" },
        { label: "Leisure & Dining", value: entertainmentVal, color: "#f43f5e" },
        { label: "Other Expenses", value: otherVal, color: "#64748b" }
    ];
    if (netCashflow > 0) {
        outflowItems.push({ label: "Unallocated Monthly Surplus", value: netCashflow, color: "#10b981" });
    }
    const activeOutflowItems = outflowItems.filter(item => item.value > 0);
    const totalOutflowBase = activeOutflowItems.reduce((acc, cur) => acc + cur.value, 0) || Math.max(1, incomeTotal);

    const outflowTotalSubtitle = document.getElementById("outflowTotalSubtitle");
    if (outflowTotalSubtitle) {
        outflowTotalSubtitle.textContent = `Total Monthly Base: ${formatRupee(totalOutflowBase)} (Inflow: ${formatRupee(incomeTotal)})`;
    }

    const distList = document.getElementById("outflowDistributionList");
    if (distList) {
        distList.innerHTML = "";
        if (activeOutflowItems.length > 0) {
            activeOutflowItems.forEach(item => {
                const pct = ((item.value / totalOutflowBase) * 100).toFixed(1);
                const row = document.createElement("div");
                row.className = "outflow-dist-item";
                row.innerHTML = `
                    <div class="outflow-dist-header">
                        <span class="outflow-dist-label">
                            <span class="outflow-dist-dot" style="background: ${item.color};"></span>
                            <span>${item.label}</span>
                        </span>
                        <span class="outflow-dist-values"><strong>${formatRupee(item.value)}</strong> &bull; <span style="color: ${item.color}; font-weight: 600;">${pct}%</span></span>
                    </div>
                    <div class="outflow-dist-bar-bg">
                        <div class="outflow-dist-bar-fill" style="width: ${pct}%; background: ${item.color};"></div>
                    </div>
                `;
                distList.appendChild(row);
            });
        }
    }

    const actualNeedsPct = metrics.needsPct !== undefined ? metrics.needsPct : 0;
    const actualWantsPct = metrics.wantsPct !== undefined ? metrics.wantsPct : 0;
    const actualSavingsPct = metrics.surplusPct !== undefined ? metrics.surplusPct : 0;
    const actualNeedsVal = metrics.needsExpenses !== undefined ? metrics.needsExpenses : ((actualNeedsPct / 100) * incomeTotal);
    const actualWantsVal = metrics.wantsExpenses !== undefined ? metrics.wantsExpenses : ((actualWantsPct / 100) * incomeTotal);
    const actualSavingsVal = netCashflow >= 0 ? netCashflow : 0;

    const benchmarkSubtitle = document.getElementById("benchmarkSubtitle");
    if (benchmarkSubtitle) {
        benchmarkSubtitle.textContent = `Needs 50% (${formatRupee(incomeTotal * 0.5)}) • Wants 30% (${formatRupee(incomeTotal * 0.3)}) • Savings 20% (${formatRupee(incomeTotal * 0.2)})`;
    }

    const benchmarkItems = [
        {
            label: "Needs (Living & Essentials)",
            actualPct: actualNeedsPct,
            idealPct: 50,
            actualVal: actualNeedsVal,
            idealVal: incomeTotal * 0.5,
            color: "#6366f1",
            status: actualNeedsPct <= 50 ? "Within Target (≤50%)" : "Over Benchmark (>50%)",
            isGood: actualNeedsPct <= 50
        },
        {
            label: "Wants (Lifestyle & Leisure)",
            actualPct: actualWantsPct,
            idealPct: 30,
            actualVal: actualWantsVal,
            idealVal: incomeTotal * 0.3,
            color: "#f43f5e",
            status: actualWantsPct <= 30 ? "Controlled (≤30%)" : "High Discretionary (>30%)",
            isGood: actualWantsPct <= 30
        },
        {
            label: "Savings (Capital Growth)",
            actualPct: actualSavingsPct,
            idealPct: 20,
            actualVal: actualSavingsVal,
            idealVal: incomeTotal * 0.2,
            color: "#10b981",
            status: actualSavingsPct >= 20 ? "Target Met (≥20%)" : "Under Target (<20%)",
            isGood: actualSavingsPct >= 20
        }
    ];

    const benchmarkList = document.getElementById("benchmarkDistributionList");
    if (benchmarkList) {
        benchmarkList.innerHTML = "";
        benchmarkItems.forEach(item => {
            const statusColor = item.isGood ? "var(--accent-emerald-light)" : "var(--accent-rose-light)";
            const row = document.createElement("div");
            row.className = "outflow-dist-item";
            row.innerHTML = `
                <div class="outflow-dist-header">
                    <span class="outflow-dist-label">
                        <span class="outflow-dist-dot" style="background: ${item.color};"></span>
                        <span>${item.label}</span>
                    </span>
                    <span class="outflow-dist-values">
                        <strong>${formatRupee(item.actualVal)}</strong> (${item.actualPct}%)
                        <span style="color: var(--text-muted); font-size: 11px;">vs Ideal ${item.idealPct}%</span>
                    </span>
                </div>
                <div class="outflow-dist-bar-bg" style="position: relative;">
                    <div class="outflow-dist-bar-fill" style="width: ${Math.min(100, Math.max(0, item.actualPct))}%; background: ${item.color};"></div>
                    <div style="position: absolute; left: ${item.idealPct}%; top: -2px; bottom: -2px; width: 2px; background: #ffffff; opacity: 0.75; border-radius: 1px;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: -2px;">
                    <span style="color: ${statusColor}; font-weight: 600;">${item.status}</span>
                    <span style="color: var(--text-muted);">Ideal target: ${formatRupee(item.idealVal)}/mo</span>
                </div>
            `;
            benchmarkList.appendChild(row);
        });
    }

    // ==========================================================================
    // FEATURE 3: INSTITUTIONAL CHART ENGINES (CHART.JS)
    // ==========================================================================
    const chartInstances = {};

    function updateAllChartThemes(theme) {
        const isDark = theme === "dark";
        const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.08)";
        const textColor = isDark ? "#94A3B8" : "#64748B";

        Object.values(chartInstances).forEach(chart => {
            if (!chart) return;
            if (chart.options.scales) {
                if (chart.options.scales.r) {
                    chart.options.scales.r.grid.color = gridColor;
                    chart.options.scales.r.pointLabels.color = textColor;
                    chart.options.scales.r.angleLines.color = gridColor;
                }
                if (chart.options.scales.x) {
                    chart.options.scales.x.ticks.color = textColor;
                }
                if (chart.options.scales.y) {
                    chart.options.scales.y.grid.color = gridColor;
                    chart.options.scales.y.ticks.color = textColor;
                }
            }
            if (chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            chart.update();
        });
    }

    if (typeof Chart !== "undefined") {
        const isDark = (document.documentElement.getAttribute("data-theme") || "dark") === "dark";
        const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.08)";
        const textColor = isDark ? "#94A3B8" : "#64748B";

        // CHART A: FINANCIAL HEALTH RADAR CHART
        try {
            const radarCanvas = document.getElementById("healthRadarChart");
            if (radarCanvas) {
                if (typeof Chart.getChart === "function") {
                    const prev = Chart.getChart(radarCanvas);
                    if (prev) prev.destroy();
                }

                // Compute scores (0-100) for 6 axes
                const cashflowScore = Math.min(100, Math.max(20, Math.round((netCashflow / (incomeTotal || 1)) * 200)));
                const needsDiscipline = Math.min(100, Math.max(10, Math.round((1 - (actualNeedsVal / (incomeTotal || 1))) * 150)));
                const savingsVelocity = Math.min(100, Math.max(15, Math.round(savingsRate * 3)));
                const runwayScore = Math.min(100, Math.max(10, Math.round((runway / 6) * 100)));
                const goalTraction = Math.min(100, Math.max(25, Math.round(goalProgressPct * 1.5 + 20)));
                const lifestyleBalance = Math.min(100, Math.max(15, Math.round((1 - (entertainmentVal / (incomeTotal || 1))) * 120)));

                chartInstances.radar = new Chart(radarCanvas.getContext("2d"), {
                    type: "radar",
                    data: {
                        labels: [
                            "Cashflow Buffer",
                            "Needs Discipline",
                            "Savings Velocity",
                            "Runway Cushion",
                            "Goal Traction",
                            "Lifestyle Control"
                        ],
                        datasets: [
                            {
                                label: "Client Solvency Profile",
                                data: [cashflowScore, needsDiscipline, savingsVelocity, runwayScore, goalTraction, lifestyleBalance],
                                backgroundColor: "rgba(99, 102, 241, 0.25)",
                                borderColor: "#6366F1",
                                borderWidth: 2,
                                pointBackgroundColor: "#10B981",
                                pointBorderColor: "#FFFFFF",
                                pointHoverRadius: 6
                            },
                            {
                                label: "Target Optimal Benchmark",
                                data: [85, 80, 80, 85, 80, 85],
                                backgroundColor: "rgba(16, 185, 129, 0.08)",
                                borderColor: "rgba(16, 185, 129, 0.45)",
                                borderWidth: 1,
                                borderDash: [4, 4],
                                pointRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100,
                                ticks: { display: false },
                                grid: { color: gridColor },
                                angleLines: { color: gridColor },
                                pointLabels: {
                                    color: textColor,
                                    font: { size: 11, weight: "600", family: "'Plus Jakarta Sans', sans-serif" }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { color: textColor, font: { size: 11 }, boxWidth: 12, padding: 10 }
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Radar chart error:", e);
        }

        // CHART B: MONTHLY SPENDING & CASHFLOW TREND CHART
        try {
            const trendCanvas = document.getElementById("cashflowTrendChart");
            if (trendCanvas) {
                if (typeof Chart.getChart === "function") {
                    const prev = Chart.getChart(trendCanvas);
                    if (prev) prev.destroy();
                }

                const months = ["M -2", "M -1", "Current", "M +1", "M +2", "M +3"];
                const fixedExpenses = actualNeedsVal;
                const discretionary = actualWantsVal;
                const totalOutflow = fixedExpenses + discretionary;
                const monthlySurplus = Math.max(0, netCashflow);

                // Cumulative surplus trajectory
                const cumulativeSurplus = [
                    currentSavings,
                    currentSavings + monthlySurplus * 0.9,
                    currentSavings + monthlySurplus * 1.9,
                    currentSavings + monthlySurplus * 2.9,
                    currentSavings + monthlySurplus * 3.9,
                    currentSavings + monthlySurplus * 5.0
                ];

                chartInstances.trend = new Chart(trendCanvas.getContext("2d"), {
                    type: "line",
                    data: {
                        labels: months,
                        datasets: [
                            {
                                label: "Accumulated Liquid Capital (₹)",
                                data: cumulativeSurplus,
                                borderColor: "#10B981",
                                backgroundColor: "rgba(16, 185, 129, 0.12)",
                                fill: true,
                                tension: 0.35,
                                borderWidth: 2.5,
                                pointBackgroundColor: "#10B981",
                                yAxisID: "y1"
                            },
                            {
                                label: "Monthly Net Inflow (₹)",
                                data: Array(6).fill(incomeTotal),
                                borderColor: "#6366F1",
                                borderDash: [5, 5],
                                borderWidth: 1.5,
                                pointRadius: 0,
                                yAxisID: "y"
                            },
                            {
                                label: "Total Monthly Outflow (₹)",
                                data: Array(6).fill(totalOutflow),
                                borderColor: "#F43F5E",
                                borderWidth: 2,
                                tension: 0.2,
                                pointBackgroundColor: "#F43F5E",
                                yAxisID: "y"
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: "index", intersect: false },
                        scales: {
                            y: {
                                type: "linear",
                                display: true,
                                position: "left",
                                grid: { color: gridColor },
                                ticks: {
                                    color: textColor,
                                    callback: val => "₹" + Math.round(val / 1000) + "k"
                                }
                            },
                            y1: {
                                type: "linear",
                                display: true,
                                position: "right",
                                grid: { drawOnChartArea: false },
                                ticks: {
                                    color: "#10B981",
                                    callback: val => "₹" + Math.round(val / 1000) + "k"
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: textColor, font: { weight: "600" } }
                            }
                        },
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { color: textColor, font: { size: 11 }, boxWidth: 12, padding: 10 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        return ` ${ctx.dataset.label}: ${formatRupee(ctx.raw)}`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Trend chart error:", e);
        }

        // CHART 1: DONUT CHART
        try {
            const donutCanvas = document.getElementById("outflowDonutChart");
            if (donutCanvas && activeOutflowItems.length > 0) {
                if (typeof Chart.getChart === "function") {
                    const prev = Chart.getChart(donutCanvas);
                    if (prev) prev.destroy();
                }

                chartInstances.donut = new Chart(donutCanvas.getContext("2d"), {
                    type: "doughnut",
                    data: {
                        labels: activeOutflowItems.map(i => i.label),
                        datasets: [{
                            data: activeOutflowItems.map(i => i.value),
                            backgroundColor: activeOutflowItems.map(i => i.color),
                            borderWidth: 2,
                            borderColor: isDark ? "#151D2A" : "#FFFFFF",
                            hoverOffset: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: "68%",
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { color: textColor, font: { size: 11 }, padding: 12, boxWidth: 12 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const val = context.raw || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                        return ` ${context.label}: ${formatRupee(val)} (${pct}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } catch (donutErr) {
            console.error("Donut chart error:", donutErr);
        }

        // CHART 2: 50/30/20 BENCHMARK BAR CHART
        try {
            const barCanvas = document.getElementById("benchmarkBarChart");
            if (barCanvas) {
                if (typeof Chart.getChart === "function") {
                    const prev = Chart.getChart(barCanvas);
                    if (prev) prev.destroy();
                }

                chartInstances.bar = new Chart(barCanvas.getContext("2d"), {
                    type: "bar",
                    data: {
                        labels: ["Needs (Living)", "Wants (Lifestyle)", "Savings (Capital)"],
                        datasets: [
                            {
                                label: "Actual Client Allocation (%)",
                                data: [actualNeedsPct, actualWantsPct, actualSavingsPct],
                                backgroundColor: ["rgba(99, 102, 241, 0.85)", "rgba(244, 63, 94, 0.85)", "rgba(16, 185, 129, 0.85)"],
                                borderRadius: 6
                            },
                            {
                                label: "50/30/20 Ideal Benchmark (%)",
                                data: [50, 30, 20],
                                backgroundColor: isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(15, 23, 42, 0.15)",
                                borderColor: isDark ? "rgba(148, 163, 184, 0.5)" : "rgba(15, 23, 42, 0.35)",
                                borderWidth: 1,
                                borderRadius: 6
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: Math.max(100, Math.ceil((Math.max(actualNeedsPct, actualWantsPct, actualSavingsPct) + 15) / 10) * 10),
                                ticks: { callback: val => val + "%", color: textColor, font: { size: 11 } },
                                grid: { color: gridColor }
                            },
                            x: {
                                ticks: { color: textColor, font: { size: 11, weight: "600" } },
                                grid: { display: false }
                            }
                        },
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { color: textColor, font: { size: 11 }, boxWidth: 12, padding: 12 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const pct = context.raw || 0;
                                        const isActual = context.datasetIndex === 0;
                                        const rupeeVal = isActual ?
                                            (context.dataIndex === 0 ? actualNeedsVal : context.dataIndex === 1 ? actualWantsVal : actualSavingsVal) :
                                            (incomeTotal * (pct / 100));
                                        return ` ${context.dataset.label}: ${pct}% (${formatRupee(rupeeVal)}/mo)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } catch (chartErr) {
            console.error("Benchmark bar chart error:", chartErr);
        }
    }

    // ==========================================================================
    // FEATURE 4: INTERACTIVE "WHAT-IF" WEALTH PROJECTION CALCULATOR
    // ==========================================================================
    const sipSlider = document.getElementById("whatIfSipSlider");
    const cagrSlider = document.getElementById("whatIfCagrSlider");
    const horizonSlider = document.getElementById("whatIfHorizonSlider");
    const stepUpSlider = document.getElementById("whatIfStepUpSlider");

    const sipDisplay = document.getElementById("whatIfSipDisplay");
    const cagrDisplay = document.getElementById("whatIfCagrDisplay");
    const horizonDisplay = document.getElementById("whatIfHorizonDisplay");
    const stepUpDisplay = document.getElementById("whatIfStepUpDisplay");

    const investedVal = document.getElementById("whatIfInvestedVal");
    const gainVal = document.getElementById("whatIfGainVal");
    const maturityVal = document.getElementById("whatIfMaturityVal");
    const inflationVal = document.getElementById("whatIfInflationVal");
    const projectionCanvas = document.getElementById("projectionChart");

    // Initialize SIP slider with client's actual monthly surplus
    if (sipSlider) {
        const defaultSip = netCashflow > 1000 ? Math.round(netCashflow / 1000) * 1000 : 15000;
        sipSlider.value = Math.min(100000, Math.max(1000, defaultSip));
    }

    let projectionChartInstance = null;

    function recalculateWhatIf() {
        if (!sipSlider) return;

        const monthlySip = Number(sipSlider.value);
        const cagr = Number(cagrSlider.value) / 100;
        const years = Number(horizonSlider.value);
        const annualStepUp = Number(stepUpSlider.value) / 100;

        if (sipDisplay) sipDisplay.textContent = formatRupee(monthlySip);
        if (cagrDisplay) cagrDisplay.textContent = (cagr * 100).toFixed(1) + "%";
        if (horizonDisplay) horizonDisplay.textContent = years + (years === 1 ? " Year" : " Years");
        if (stepUpDisplay) stepUpDisplay.textContent = (annualStepUp * 100).toFixed(1) + "%";

        let currentMonthly = monthlySip;
        let cumulativeInvested = 0;
        let corpus = 0;
        const monthlyRate = Math.pow(1 + cagr, 1 / 12) - 1;

        const labels = [];
        const investedData = [];
        const corpusData = [];

        for (let y = 1; y <= years; y++) {
            for (let m = 1; m <= 12; m++) {
                cumulativeInvested += currentMonthly;
                corpus = (corpus + currentMonthly) * (1 + monthlyRate);
            }
            labels.push(`Yr ${y}`);
            investedData.push(Math.round(cumulativeInvested));
            corpusData.push(Math.round(corpus));
            currentMonthly *= (1 + annualStepUp);
        }

        const wealthGain = Math.max(0, corpus - cumulativeInvested);
        const inflationRate = 0.06;
        const realPurchasingPower = corpus / Math.pow(1 + inflationRate, years);

        if (investedVal) investedVal.textContent = formatRupee(cumulativeInvested);
        if (gainVal) gainVal.textContent = "+" + formatRupee(wealthGain);
        if (maturityVal) maturityVal.textContent = formatRupee(corpus);
        if (inflationVal) inflationVal.textContent = formatRupee(realPurchasingPower);

        // Update Projection Area Chart
        if (typeof Chart !== "undefined" && projectionCanvas) {
            const isDark = (document.documentElement.getAttribute("data-theme") || "dark") === "dark";
            const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.08)";
            const textColor = isDark ? "#94A3B8" : "#64748B";

            if (projectionChartInstance) {
                projectionChartInstance.data.labels = labels;
                projectionChartInstance.data.datasets[0].data = corpusData;
                projectionChartInstance.data.datasets[1].data = investedData;
                projectionChartInstance.update();
            } else {
                if (typeof Chart.getChart === "function") {
                    const prev = Chart.getChart(projectionCanvas);
                    if (prev) prev.destroy();
                }

                projectionChartInstance = new Chart(projectionCanvas.getContext("2d"), {
                    type: "line",
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: "Compounded Corpus Growth (₹)",
                                data: corpusData,
                                borderColor: "#10B981",
                                backgroundColor: "rgba(16, 185, 129, 0.18)",
                                fill: true,
                                tension: 0.35,
                                borderWidth: 2.5,
                                pointBackgroundColor: "#10B981",
                                pointRadius: 3
                            },
                            {
                                label: "Cumulative Invested Principal (₹)",
                                data: investedData,
                                borderColor: "#6366F1",
                                backgroundColor: "rgba(99, 102, 241, 0.12)",
                                fill: true,
                                tension: 0.35,
                                borderWidth: 2,
                                pointRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: "index", intersect: false },
                        scales: {
                            y: {
                                grid: { color: gridColor },
                                ticks: {
                                    color: textColor,
                                    callback: val => "₹" + Math.round(val / 100000) + "L"
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: textColor }
                            }
                        },
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: { color: textColor, font: { size: 10.5 }, boxWidth: 10, padding: 8 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        return ` ${ctx.dataset.label}: ${formatRupee(ctx.raw)}`;
                                    }
                                }
                            }
                        }
                    }
                });
                chartInstances.projection = projectionChartInstance;
            }
        }
    }

    [sipSlider, cagrSlider, horizonSlider, stepUpSlider].forEach(slider => {
        if (slider) slider.addEventListener("input", recalculateWhatIf);
    });
    recalculateWhatIf();

    // ==========================================================================
    // FEATURE 2: DEDICATED AI COPILOT CHAT UI
    // ==========================================================================
    const copilotTriggerBtn = document.getElementById("copilotTriggerBtn");
    const copilotCloseBtn = document.getElementById("copilotCloseBtn");
    const copilotDrawer = document.getElementById("copilotDrawer");
    const copilotBackdrop = document.getElementById("copilotBackdrop");
    const copilotForm = document.getElementById("copilotForm");
    const copilotInput = document.getElementById("copilotInput");
    const copilotMessages = document.getElementById("copilotMessages");
    const copilotQuickPills = document.getElementById("copilotQuickPills");

    function openCopilot() {
        copilotDrawer?.classList.add("open");
        copilotBackdrop?.classList.add("open");
        copilotInput?.focus();
    }

    function closeCopilot() {
        copilotDrawer?.classList.remove("open");
        copilotBackdrop?.classList.remove("open");
    }

    if (copilotTriggerBtn) copilotTriggerBtn.addEventListener("click", openCopilot);
    if (copilotCloseBtn) copilotCloseBtn.addEventListener("click", closeCopilot);
    if (copilotBackdrop) copilotBackdrop.addEventListener("click", closeCopilot);

    // Markdown Parser
    function parseSimpleMarkdown(text) {
        if (!text) return "";
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/`([^`]+)`/g, "<code style='background: rgba(255,255,255,0.08); padding: 2px 5px; border-radius: 4px;'>$1</code>")
            .replace(/\n\n/g, "<br><br>")
            .replace(/\n\* /g, "<br>&bull; ")
            .replace(/\n(\d+)\. /g, "<br><strong>$1.</strong> ");
        return formatted;
    }

    function appendMessage(sender, htmlContent) {
        if (!copilotMessages) return;
        const msg = document.createElement("div");
        msg.className = `copilot-message ${sender}`;
        
        const avatarHtml = sender === "user" ? 
            `<div class="user-avatar" style="width: 28px; height: 28px; font-size: 11px;">U</div>` :
            `<div class="copilot-avatar" style="width: 28px; height: 28px; font-size: 13px;">✨</div>`;

        msg.innerHTML = `
            ${avatarHtml}
            <div class="copilot-msg-bubble">${htmlContent}</div>
        `;
        copilotMessages.appendChild(msg);
        copilotMessages.scrollTop = copilotMessages.scrollHeight;
    }

    async function sendCopilotMessage(userText) {
        if (!userText || !userText.trim()) return;
        appendMessage("user", userText);

        // Typing indicator
        const typingEl = document.createElement("div");
        typingEl.className = "copilot-message ai typing-message";
        typingEl.innerHTML = `
            <div class="copilot-avatar" style="width: 28px; height: 28px; font-size: 13px;">✨</div>
            <div class="copilot-msg-bubble">
                <div class="typing-dots">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        copilotMessages.appendChild(typingEl);
        copilotMessages.scrollTop = copilotMessages.scrollHeight;

        try {
            const res = await fetch("/api/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText })
            });
            const data = await res.json();
            typingEl.remove();

            if (data.reply) {
                appendMessage("ai", parseSimpleMarkdown(data.reply));
            } else {
                appendMessage("ai", "I've reviewed your financial balance sheet. Maintain your monthly surplus disciplined in index funds and liquid reserves for optimal growth.");
            }
        } catch (err) {
            typingEl.remove();
            console.error("Copilot request error:", err);
            appendMessage("ai", "I am currently running in offline advisory mode: Your monthly surplus of **" + formatRupee(netCashflow) + "** is best divided into 50% core index SIP and 25% emergency reserve enhancement.");
        }
    }

    if (copilotForm) {
        copilotForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = copilotInput.value.trim();
            if (text) {
                copilotInput.value = "";
                sendCopilotMessage(text);
            }
        });
    }

    if (copilotQuickPills) {
        copilotQuickPills.addEventListener("click", (e) => {
            const pill = e.target.closest(".copilot-pill");
            if (pill) {
                const prompt = pill.getAttribute("data-prompt");
                sendCopilotMessage(prompt);
            }
        });
    }
});
