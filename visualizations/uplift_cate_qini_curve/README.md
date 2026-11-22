# 🎯 Uplift Modeling, Qini Gain & CATE Persuasion Analyzer (`uplift_cate_qini_curve`)

An interactive D3.js v7 Looker Custom Visualization engineered for **Heterogeneous Treatment Effects (CATE), Uplift Modeling, Qini Gain Curves, and Promo Targeting ROI Optimization**. Resolves Looker's inability to plot Qini uplift gain curves against random/oracle baselines, 4-quadrant Persuasion Matrices (*Persuadables*, *Sure Things*, *Lost Causes*, *Sleeping Dogs*), decile-level CATE confidence intervals, and net incremental profit frontiers.

---

## 🎯 4 Multi-Modal Visual Paradigms

Switchable live in the **Display** tab:

1. **Cumulative Qini & AUUC Uplift Gain Curve (`qini_gain_curve`)**: Plots cumulative incremental conversions across targeting depth (`10%–100%`) against both the uniform Random Targeting diagonal and the Oracle Upper Bound, highlighting green positive-lift area, red **Sleeping Dogs** negative-ROI zones, and the optimal targeting cutoff percentage.
2. **4-Quadrant Persuasion Matrix (`persuasion_quadrant`)**: Maps Baseline Control Rate ($Y_0$) vs. Treatment Uplift CATE ($\hat{\tau}$), sizing bubbles by cohort population and segmenting cohorts into **Persuadables** (Target), **Sure Things** (Skip Discount), **Lost Causes**, and **Sleeping Dogs** (Suppress).
3. **CATE Decile Waterfall & 95% CI Whiskers (`cate_decile_bars`)**: Displays `D01`–`D10` conditional uplift bars with 95% confidence interval whiskers and configurable target reference lines.
4. **Targeting Depth & Net Profit ROI Frontier (`policy_roi_frontier`)**: Compares Gross Incremental Revenue, Promotional Cost, and Net Incremental Profit across targeting depth, pinpointing the peak-ROI cutoff before marginal promotional spend destroys margin.

---

## 📊 Domain-Authentic Dataset (`void_weaver_analytics::uplift_cate_telemetry`)

Demonstrated against 4 Void Weaver Interactive LiveOps promotional & retention uplift campaigns (`Battle Pass 30% Flash Offer`, `Churn Win-Back 500 Gem Grant`, `Starter Bundle Welcome Discount`, `Ranked Shield Loss-Forgiveness`) across 10 CATE deciles each (40 rows total), complete with control/treatment conversion rates, 95% CATE confidence bounds, cumulative Qini gain, AUUC scores, promotional spend, and net incremental profit.

---

## 🎨 Clean 2-Tab Configuration (`Display` & `Style`)

- **Display**: Layout paradigm, live `registerOptions` dynamic field-role dropdowns (`Campaign`, `Decile`, `Segment`, `Quadrant`, `CATE Lift`, `Qini Gain`, `Baseline`, `Control Rate`, `Net Profit`, `Target Measure`), benchmark target modes (`Measure Column`, `Fixed Value`, `Mean`, `Median`, `P75`, `P90`, `None`), Sleeping-Dog alert threshold, campaign sorting, Top-N with `'Other'` rollup, null suppression, HUD density, label density, custom title/subtitle, interactive campaign focus pills, and live search bar.
- **Style**: 6 enterprise palettes + Custom Hex Override with native `display: 'color'` pickers, metric polarity (`Higher is Better` vs `Lower is Better`), typography scaling, and value formatting.
