# 🔬 Causal Impact & Synthetic Control Analyzer (`causal_impact_synthetic_control`)

An interactive D3.js v7 Looker Custom Visualization engineered for **Causal Inference, Geo-Lift Experiments, Marketing Mix Interventions, and Non-Randomized Feature Rollouts**. Directly addresses Looker users needing synchronized pre/post synthetic counterfactual triptychs, pointwise causal lift deltas, cumulative incremental impact cones, and in-space placebo permutation diagnostics.

---

## 🎯 4 Multi-Modal Visual Paradigms

Switchable live in the **Display** tab:

1. **3-Panel Synchronized Causal Triptych (`stacked_triptych`)**:
   - **Panel 1 (Top)**: Observed Trajectory vs. Dashed Synthetic Counterfactual + 95% Credible Interval Ribbon + dual-color Post-Intervention Lift Area Fill (emerald gain vs. crimson regression) + vertical Intervention Launch Gate.
   - **Panel 2 (Middle)**: Pointwise Causal Lift ($\Delta_t = Y_t - \hat{Y}_t$) diverging bars around zero with configurable daily lift goal line.
   - **Panel 3 (Bottom)**: Cumulative Incremental Causal Impact ($\sum_{s \ge t_0} \Delta_s$) with widening credible envelope and final impact callout.
   - Synchronized vertical hover crosshair across all 3 panels with unified breakdown tooltip.
2. **Pre/Post Counterfactual & Donor Fit (`counterfactual_overlay`)**: Full-height counterfactual envelope highlighting pre-period calibration fit and post-period causal divergence.
3. **In-Space Placebo Permutation Diagnostic (`placebo_permutation`)**: Overlays the treated cohort's cumulative lift trajectory against all untreated synthetic control donor placebo curves alongside a **Post/Pre RMSPE Ratio Rank** bar panel.
4. **Multi-Cohort Causal Scorecard Matrix (`intervention_scorecard`)**: Executive comparison matrix across treated and donor cohorts showing Donor Weight %, Pre-Period RMSPE, Post Averages, Relative Lift %, Cumulative Impact, Bayesian Tail $p$-value, Significance Verdict, and Looker drill-down click hooks.

---

## 📊 Domain-Authentic Dataset (`void_weaver_analytics::causal_impact_experiments`)

Demonstrated on a 60-day pre/post geo-lift pricing intervention (`Geo-Lift: Dynamic Battle Pass Pricing`) across 1 treated market (`NA-East`) and 5 synthetic control donor placebo markets (`EU-West`, `NA-West`, `UK-Core`, `APAC-North`, `LATAM-South`, 360 total daily observations).

---

## 🎨 Clean 2-Tab Configuration (`Display` & `Style`)

- **Display**: Visual paradigm selector, live `registerOptions` dynamic field-role dropdowns (`Time Dimension`, `Cohort Dimension`, `Intervention Phase`, `Is-Treated Flag`, `Observed Measure`, `Counterfactual Measure`, `CI Lower/Upper`, `Target Goal Measure`), benchmark lift goal modes (`Fixed Value`, `Measure Column`, `Dataset Mean`, `Median`, `P75`, `P90`, `None`), significance alpha gate (`%`), sorting, Top-N with `'Other'` donor rollup, zero/null suppression, Executive HUD density (`Scorecard`, `Compact Strip`, `Hidden`), label density, custom title/subtitle overrides, interactive cohort search/selector, and legend.
- **Style**: 6 enterprise palettes (`Google Enterprise`, `Modern Slate`, `Cyberpunk Dark`, `Emerald FinOps`, `Sunset Media`, `Wellverse Healthcare`) + `Custom Hex Override` with native `display: 'color'` pickers, metric polarity (`Higher is Better` vs `Lower is Better`), typography scaling, value formatting, credible cone opacity, and gridlines.
