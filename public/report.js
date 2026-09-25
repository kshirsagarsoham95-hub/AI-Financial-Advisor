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
    if (analysis.wealthAdvisorVerdict) {
        advisorClosingVerdict.textContent = `"${analysis.wealthAdvisorVerdict}"`;
    }

    // ==========================================================================
    // DATA VISUALIZATION: CHARTS VIA CHART.JS
    // ==========================================================================
    if (typeof Chart !== "undefined") {
        try {
            // Chart 1: Donut Chart of Outflows
            const donutCtx = document.getElementById("outflowDonutChart").getContext("2d");
            
            const expenseLabels = [];
            const expenseValues = [];
            const expenseColors = [];

            if (metrics.rent > 0) { expenseLabels.push("Rent / Housing"); expenseValues.push(metrics.rent); expenseColors.push("#6366f1"); }
            if (metrics.food > 0) { expenseLabels.push("Groceries & Food"); expenseValues.push(metrics.food); expenseColors.push("#38bdf8"); }
            if (metrics.transport > 0) { expenseLabels.push("Commute"); expenseValues.push(metrics.transport); expenseColors.push("#a855f7"); }
            if (metrics.bills > 0) { expenseLabels.push("Bills & Utilities"); expenseValues.push(metrics.bills); expenseColors.push("#f59e0b"); }
            if (metrics.entertainment > 0) { expenseLabels.push("Leisure & Dining"); expenseValues.push(metrics.entertainment); expenseColors.push("#f43f5e"); }
            if (metrics.other > 0) { expenseLabels.push("Other"); expenseValues.push(metrics.other); expenseColors.push("#64748b"); }
            if (netCashflow > 0) { expenseLabels.push("Unallocated Surplus"); expenseValues.push(netCashflow); expenseColors.push("#10b981"); }

            new Chart(donutCtx, {
                type: "doughnut",
                data: {
                    labels: expenseLabels,
                    datasets: [{
                        data: expenseValues,
                        backgroundColor: expenseColors,
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
                                    return ` ${context.label}: ₹${val.toLocaleString("en-IN")} (${pct}%)`;
                                }
                            }
                        }
                    }
                }
            });

            // Chart 2: 50 / 30 / 20 Rule Compliance Bar Chart
            const barCtx = document.getElementById("benchmarkBarChart").getContext("2d");

            const actualNeedsPct = metrics.needsPct || 0;
            const actualWantsPct = metrics.wantsPct || 0;
            const actualSavingsPct = metrics.surplusPct || 0;

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
                            max: Math.max(100, actualNeedsPct + 10),
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
                                    return ` ${context.dataset.label}: ${context.raw}%`;
                                }
                            }
                        }
                    }
                }
            });

        } catch (chartErr) {
            console.error("Chart generation error:", chartErr);
        }
    }
});
