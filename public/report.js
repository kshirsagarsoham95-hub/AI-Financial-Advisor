// ==========================================================================
// AI FINANCIAL ADVISOR - EXECUTIVE REPORT ENGINE
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    const noDataBanner = document.getElementById("noDataBanner");
    const reportContent = document.getElementById("reportContent");

    // Print handlers
    const btnPrint = document.getElementById("btnPrintReport");
    const btnBottomPrint = document.getElementById("btnBottomPrint");
    [btnPrint, btnBottomPrint].forEach(btn => {
        if (btn) {
            btn.addEventListener("click", () => {
                window.print();
            });
        }
    });

    // Format Rupee
    function formatRupee(amount) {
        return "₹" + Math.round(Number(amount) || 0).toLocaleString("en-IN");
    }

    // Try reading cached report from sessionStorage first
    let reportData = null;
    const sessionCached = sessionStorage.getItem("financialReport");
    if (sessionCached) {
        try {
            reportData = JSON.parse(sessionCached);
        } catch (e) {
            console.error("Error parsing sessionStorage report:", e);
        }
    }

    // If not in sessionStorage (e.g. page refreshed or direct URL), fetch from backend session
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
        noDataBanner.style.display = "block";
        reportContent.style.display = "none";
        return;
    }

    // Active data found -> render report
    noDataBanner.style.display = "none";
    reportContent.style.display = "block";

    const analysis = reportData.analysis;
    const metrics = reportData.metrics || {};
    const clientEmail = reportData.client || reportData.userEmail || "client@finadvisor.ai";

    // Update user profile badges
    const reportUserEmail = document.getElementById("reportUserEmail");
    const reportUserAvatar = document.getElementById("reportUserAvatar");
    const dossierClientEmail = document.getElementById("dossierClientEmail");
    if (reportUserEmail) reportUserEmail.textContent = clientEmail;
    if (reportUserAvatar) reportUserAvatar.textContent = clientEmail.charAt(0).toUpperCase();
    if (dossierClientEmail) dossierClientEmail.textContent = clientEmail;

    // Assessment date
    const dateEl = document.getElementById("dossierDate");
    if (dateEl) {
        const now = new Date(reportData.generatedAt || Date.now());
        dateEl.textContent = now.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    }

    // Header goal heading
    const clientGoalHeading = document.getElementById("clientGoalHeading");
    if (clientGoalHeading && metrics.goal) {
        clientGoalHeading.textContent = `Strategic Roadmap: ${metrics.goal}`;
    }

    // Financial Health Score
    const score = Math.max(0, Math.min(100, Math.round(analysis.financialHealthScore || 75)));
    const scoreDial = document.getElementById("scoreDial");
    const healthScoreNum = document.getElementById("healthScoreNum");
    const healthScoreBadge = document.getElementById("healthScoreBadge");

    healthScoreNum.textContent = score;
    scoreDial.style.setProperty("--score-pct", score);

    const scoreColor = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
    scoreDial.style.background = `conic-gradient(${scoreColor} calc(${score} * 1%), #1e293b 0)`;
    healthScoreBadge.textContent = analysis.healthStatus || "Financial Assessment Completed";
    healthScoreBadge.style.color = scoreColor;

    // Top KPIs
    const netCashflow = metrics.remaining !== undefined ? metrics.remaining : 0;
    const kpiNetCashflow = document.getElementById("kpiNetCashflow");
    const kpiNetCashflowSub = document.getElementById("kpiNetCashflowSub");
    kpiNetCashflow.textContent = (netCashflow >= 0 ? "+" : "-") + formatRupee(Math.abs(netCashflow));
    if (netCashflow >= 0) {
        kpiNetCashflow.style.color = "#34d399";
        kpiNetCashflowSub.textContent = `Surplus (${metrics.surplusPct || 0}% of monthly income)`;
    } else {
        kpiNetCashflow.style.color = "#fb7185";
        kpiNetCashflowSub.textContent = `Deficit (${Math.abs(metrics.surplusPct || 0)}% negative cashflow)`;
    }

    const kpiSavingsRate = document.getElementById("kpiSavingsRate");
    const kpiSavingsRateSub = document.getElementById("kpiSavingsRateSub");
    const savingsRate = metrics.savingsRate !== undefined ? metrics.savingsRate : 0;
    kpiSavingsRate.textContent = `${savingsRate}%`;
    kpiSavingsRateSub.textContent = savingsRate >= 20 ? "Optimal (meets 20% benchmark)" : "Under 20% ideal accumulation target";

    const kpiRunway = document.getElementById("kpiRunway");
    const kpiRunwaySub = document.getElementById("kpiRunwaySub");
    const runway = metrics.emergencyRunwayMonths || (analysis.riskRadar && analysis.riskRadar.emergencyFundRunwayMonths) || 0;
    kpiRunway.textContent = `${runway} Mo`;
    kpiRunwaySub.textContent = runway >= 3 ? "Healthy emergency reserve (>3 mo)" : "Under-funded emergency reserve (<3 mo)";

    const kpiGoalStatus = document.getElementById("kpiGoalStatus");
    const kpiGoalSub = document.getElementById("kpiGoalSub");
    const goalFeasibility = (analysis.goalRoadmap && analysis.goalRoadmap.feasibility) || "On Track";
    kpiGoalStatus.textContent = goalFeasibility;
    kpiGoalSub.textContent = `Required: ${formatRupee(metrics.monthlyGoalSaving || 0)}/mo`;

    // Executive Summary
    const executiveSummaryText = document.getElementById("executiveSummaryText");
    executiveSummaryText.textContent = analysis.executiveSummary || "Financial audit completed based on current income and expense allocation.";

    // Spending Diagnostics
    const spendingSummaryText = document.getElementById("spendingSummaryText");
    const spendingLeaksText = document.getElementById("spendingLeaksText");
    const topCostCategory = document.getElementById("topCostCategory");

    if (analysis.spendingDiagnostics) {
        spendingSummaryText.textContent = analysis.spendingDiagnostics.summary || "";
        spendingLeaksText.textContent = analysis.spendingDiagnostics.leaksOrOpportunities || "";
        topCostCategory.textContent = analysis.spendingDiagnostics.topExpenseCategory || "Living Expenses";
    }

    // Goal Realization Roadmap
    const goalVerdictText = document.getElementById("goalVerdictText");
    const goalFeasibilityBadge = document.getElementById("goalFeasibilityBadge");
    const milestonesTimeline = document.getElementById("milestonesTimeline");

    if (analysis.goalRoadmap) {
        goalVerdictText.textContent = analysis.goalRoadmap.feasibilityVerdict || "";
        goalFeasibilityBadge.textContent = analysis.goalRoadmap.feasibility || "Evaluated";

        const milestones = analysis.goalRoadmap.milestones || [];
        milestonesTimeline.innerHTML = "";

        if (milestones.length > 0) {
            milestones.forEach((ms) => {
                const step = document.createElement("div");
                step.className = "milestone-step";
                step.innerHTML = `
                    <div class="milestone-period">${ms.period || "Milestone"} ${ms.targetAmount ? `&bull; ${ms.targetAmount}` : ""}</div>
                    <div class="milestone-focus">${ms.focus || ""}</div>
                `;
                milestonesTimeline.appendChild(step);
            });
        } else {
            milestonesTimeline.innerHTML = `
                <div class="milestone-step">
                    <div class="milestone-period">Phased Execution</div>
                    <div class="milestone-focus">Automate ₹${formatRupee(metrics.monthlyGoalSaving || 0)} monthly transfers directly on salary receipt.</div>
                </div>
            `;
        }
    }

    // Strategic Recommendations
    const recsContainer = document.getElementById("recommendationsContainer");
    recsContainer.innerHTML = "";
    const recommendations = analysis.strategicRecommendations || [];

    if (recommendations.length > 0) {
        recommendations.forEach(rec => {
            const priorityClass =
                (rec.priority || "").toLowerCase().includes("high") ? "priority-high" :
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
        riskPrimaryText.textContent = analysis.riskRadar.primaryRisk || "Concentration of fixed expenditures with minimal liquid buffers.";
        riskSafeguardText.textContent = analysis.riskRadar.protectiveMeasure || "Establish an automated liquid emergency reserve prior to aggressive discretionary expansion.";
    }

    // Wealth Advisor Verdict
    const advisorClosingVerdict = document.getElementById("advisorClosingVerdict");
    if (advisorClosingVerdict && analysis.wealthAdvisorVerdict) {
        advisorClosingVerdict.textContent = `"${analysis.wealthAdvisorVerdict}"`;
    }

    // ==========================================================================
    // COLUMN 1: MONTHLY OUTFLOW DISTRIBUTION BREAKDOWN & DONUT VISUALIZATION
    // ==========================================================================
    const incomeTotal = Math.max(0, Number(metrics.income) || 0);
    const outflowItems = [
        { label: "Rent / Housing", value: Math.max(0, Number(metrics.rent) || 0), color: "#6366f1" },
        { label: "Groceries & Food", value: Math.max(0, Number(metrics.food) || 0), color: "#38bdf8" },
        { label: "Transit & Commute", value: Math.max(0, Number(metrics.transport) || 0), color: "#a855f7" },
        { label: "Utilities & Bills", value: Math.max(0, Number(metrics.bills) || 0), color: "#f59e0b" },
        { label: "Leisure & Dining", value: Math.max(0, Number(metrics.entertainment) || 0), color: "#f43f5e" },
        { label: "Other Expenses", value: Math.max(0, Number(metrics.other) || 0), color: "#64748b" }
    ];

    if (netCashflow > 0) {
        outflowItems.push({ label: "Unallocated Monthly Surplus", value: netCashflow, color: "#10b981" });
    }

    const activeOutflowItems = outflowItems.filter(item => item.value > 0);
    const totalOutflowBase = activeOutflowItems.reduce((acc, cur) => acc + cur.value, 0) || Math.max(1, incomeTotal);

    // Update Subtitle with Total Inflow / Outflow
    const outflowTotalSubtitle = document.getElementById("outflowTotalSubtitle");
    if (outflowTotalSubtitle) {
        outflowTotalSubtitle.textContent = `Total Monthly Base: ${formatRupee(totalOutflowBase)} (Inflow: ${formatRupee(incomeTotal)})`;
    }

    // 1. Render Itemized Outflow Breakdown List (Always rendered & accessible)
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
        } else {
            distList.innerHTML = `<div style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 12px;">No monthly outflows recorded.</div>`;
        }
    }

    // ==========================================================================
    // COLUMN 2: 50 / 30 / 20 BUDGET COMPLIANCE UNITS & BENCHMARK VISUALIZATION
    // ==========================================================================
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
            const statusColor = item.isGood ? "#34d399" : "#fb7185";
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
                    <div style="position: absolute; left: ${item.idealPct}%; top: -2px; bottom: -2px; width: 2px; background: #ffffff; opacity: 0.75; border-radius: 1px;" title="Ideal Benchmark: ${item.idealPct}%"></div>
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
    // CHART.JS ENGINE FOR BOTH COLUMNS
    // ==========================================================================
    if (typeof Chart !== "undefined") {
        try {
            const donutCanvas = document.getElementById("outflowDonutChart");
            if (donutCanvas && activeOutflowItems.length > 0) {
                // Destroy previous instance to avoid canvas reuse errors
                if (typeof Chart.getChart === "function") {
                    const existingDonut = Chart.getChart(donutCanvas);
                    if (existingDonut) existingDonut.destroy();
                }

                const donutCtx = donutCanvas.getContext("2d");
                new Chart(donutCtx, {
                    type: "doughnut",
                    data: {
                        labels: activeOutflowItems.map(i => i.label),
                        datasets: [{
                            data: activeOutflowItems.map(i => i.value),
                            backgroundColor: activeOutflowItems.map(i => i.color),
                            borderWidth: 2,
                            borderColor: "#0d1322",
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
                                labels: {
                                    color: "#94a3b8",
                                    font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
                                    padding: 12,
                                    boxWidth: 12
                                }
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

        try {
            const barCanvas = document.getElementById("benchmarkBarChart");
            if (barCanvas) {
                // Destroy previous instance to avoid canvas reuse errors
                if (typeof Chart.getChart === "function") {
                    const existingBar = Chart.getChart(barCanvas);
                    if (existingBar) existingBar.destroy();
                }

                const barCtx = barCanvas.getContext("2d");
                new Chart(barCtx, {
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
                                backgroundColor: "rgba(148, 163, 184, 0.25)",
                                borderColor: "rgba(148, 163, 184, 0.5)",
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
                                ticks: {
                                    callback: val => val + "%",
                                    color: "#64748b",
                                    font: { size: 11 }
                                },
                                grid: { color: "rgba(255, 255, 255, 0.05)" }
                            },
                            x: {
                                ticks: {
                                    color: "#94a3b8",
                                    font: { size: 11, weight: "600" }
                                },
                                grid: { display: false }
                            }
                        },
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: {
                                    color: "#94a3b8",
                                    font: { size: 11 },
                                    boxWidth: 12,
                                    padding: 12
                                }
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
            console.error("Benchmark chart generation error:", chartErr);
        }
    }
});
