/**
 * Radial KPI Progress Gauge - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Features:
 * - Multi-tier concentric radial progress rings (Apple Fitness / Quota style)
 * - Smooth animated arc transitions
 * - Dynamic percentage calculations based on configurable target goals
 * - Center KPI summary readout with formatted numbers
 * - Rich tooltips on ring hover
 * - Full Looker options palette (custom colors, ring thickness, track opacity, goal target)
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.arc === 'function') {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.arc === 'function') {
          clearInterval(interval);
          callback(window.d3);
        }
      }, 50);
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://d3js.org/d3.v7.min.js';
    script.onload = function () {
      callback(window.d3);
    };
    document.head.appendChild(script);
  }

  var defaultColors = [
    '#4285F4', // Google Blue
    '#34A853', // Google Green
    '#FBBC04', // Google Yellow
    '#EA4335', // Google Red
    '#9C27B0', // Purple
    '#00ACC1', // Cyan
    '#FF7043'  // Deep Orange
  ];

  var visObject = {
    id: 'radial_progress_gauge',
    label: 'Radial KPI Progress Gauge',
    options: {
      targetValue: {
        type: 'number',
        label: 'Goal / Target Value (0 = Auto)',
        default: 0,
        section: 'Goals & Targets',
        order: 1
      },
      targetField: {
        type: 'string',
        label: 'Optional Target Measure/Dimension Name',
        default: '',
        section: 'Goals & Targets',
        order: 2
      },
      colorPalette: {
        type: 'string',
        label: 'Color Theme',
        display: 'select',
        values: [
          { 'Google Vibrant': 'google' },
          { 'Cyber Neon': 'neon' },
          { 'Emerald Ocean': 'ocean' },
          { 'Sunset Warmth': 'sunset' }
        ],
        default: 'google',
        section: 'Style',
        order: 3
      },
      ringThickness: {
        type: 'number',
        label: 'Ring Thickness (px)',
        display: 'range',
        min: 6,
        max: 36,
        step: 2,
        default: 16,
        section: 'Style',
        order: 4
      },
      ringSpacing: {
        type: 'number',
        label: 'Ring Spacing (px)',
        display: 'range',
        min: 2,
        max: 20,
        step: 1,
        default: 6,
        section: 'Style',
        order: 5
      },
      trackOpacity: {
        type: 'number',
        label: 'Background Track Opacity (%)',
        display: 'range',
        min: 5,
        max: 50,
        step: 5,
        default: 18,
        section: 'Style',
        order: 6
      },
      showCenterText: {
        type: 'boolean',
        label: 'Show Center Metric & %',
        default: true,
        section: 'Center KPI',
        order: 7
      },
      centerTitle: {
        type: 'string',
        label: 'Custom Center Title',
        default: '',
        section: 'Center KPI',
        order: 8
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Metric Legend',
        default: true,
        section: 'Legend',
        order: 9
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.fontFamily =
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.overflow = 'hidden';
      element.style.position = 'relative';

      var container = document.createElement('div');
      container.className = 'radial-gauge-container';
      container.style.width = '100%';
      container.style.flex = '1 1 auto';
      container.style.minHeight = '0';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.position = 'relative';
      element.appendChild(container);

      // Create floating tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'radial-gauge-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.padding = '8px 12px';
      tooltip.style.background = 'rgba(32, 33, 36, 0.92)';
      tooltip.style.color = '#fff';
      tooltip.style.borderRadius = '6px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontWeight = '500';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.opacity = '0';
      tooltip.style.transition = 'opacity 0.2s ease-in-out';
      tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      tooltip.style.zIndex = '100';
      element.appendChild(tooltip);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      var self = this;
      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var container = element.querySelector('.radial-gauge-container');
      var tooltip = element.querySelector('.radial-gauge-tooltip');
      if (!container) {
        done();
        return;
      }
      container.innerHTML = '';

      // Clean up any existing legend elements to prevent duplicate stacking on re-renders
      var oldLegends = element.querySelectorAll('.radial-gauge-legend');
      for (var lIdx = 0; lIdx < oldLegends.length; lIdx++) {
        oldLegends[lIdx].remove();
      }

      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no results to display.'
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var measures = fields.measures || [];
      var dimensions = fields.dimensions || [];

      if (measures.length === 0) {
        this.addError({
          title: 'Measure Required',
          message: 'Please add at least one measure to power the radial gauge.'
        });
        done();
        return;
      }

      // Palettes
      var palettes = {
        google: ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#9C27B0', '#00ACC1'],
        neon: ['#00F5D4', '#7B2CBF', '#F72585', '#4CC9F0', '#FFBE0B', '#3A0CA3'],
        ocean: ['#0077B6', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF', '#ADE8F4'],
        sunset: ['#F72585', '#B5179E', '#7209B7', '#560BAD', '#480CA8', '#3F37C9']
      };
      var colorList = palettes[config.colorPalette] || palettes.google;

      // Extract items to plot
      // Case A: Multiple measures in 1 row (or aggregated single row)
      // Case B: 1 measure broken down by 1 dimension (each row is a ring)
      var ringsData = [];

      if (dimensions.length > 0 && data.length > 1) {
        var dim = dimensions[0];
        var meas = measures[0];
        var maxVal = 0;
        var maxItems = Math.min(data.length, 6);

        for (var i = 0; i < maxItems; i++) {
          var val = data[i][meas.name].value || 0;
          if (val > maxVal) maxVal = val;
        }

        for (var i = 0; i < maxItems; i++) {
          var row = data[i];
          var rawVal = row[meas.name].value || 0;
          var labelText = row[dim.name].rendered || row[dim.name].value || ('Item ' + (i + 1));
          var target = config.targetValue > 0 ? config.targetValue : (maxVal * 1.15 || 100);
          var pct = Math.min(1, Math.max(0, rawVal / target));

          ringsData.push({
            id: 'ring_' + i,
            label: labelText,
            value: rawVal,
            rendered: row[meas.name].rendered || d3.format(',.2f')(rawVal),
            target: target,
            pct: pct,
            color: colorList[i % colorList.length]
          });
        }
      } else {
        // Multiple measures on row 0
        var firstRow = data[0];
        for (var i = 0; i < measures.length; i++) {
          var m = measures[i];
          var rawVal = firstRow[m.name].value || 0;
          var target = config.targetValue > 0 ? config.targetValue : (rawVal * 1.25 || 100);
          var pct = Math.min(1, Math.max(0, rawVal / target));

          ringsData.push({
            id: 'ring_' + i,
            label: m.label_short || m.label || m.name,
            value: rawVal,
            rendered: firstRow[m.name].rendered || d3.format(',.2f')(rawVal),
            target: target,
            pct: pct,
            color: colorList[i % colorList.length]
          });
        }
      }

      var width = container.clientWidth || 400;
      var height = container.clientHeight || 400;
      var margin = 20;
      var minDim = Math.min(width, height) - margin * 2;
      var outerRadius = minDim / 2;

      var thickness = Number(config.ringThickness) || 16;
      var spacing = Number(config.ringSpacing) || 6;
      var trackOpacity = (Number(config.trackOpacity) || 18) / 100;

      // Adjust thickness if too many rings
      var totalNeeded = ringsData.length * (thickness + spacing);
      if (totalNeeded > outerRadius - 30) {
        thickness = Math.max(6, Math.floor((outerRadius - 30) / ringsData.length) - spacing);
      }

      var svg = d3
        .select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('style', 'max-width: 100%; height: 100%; display: block;');

      var g = svg
        .append('g')
        .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

      // Gradients & Defs
      var defs = svg.append('defs');
      ringsData.forEach(function (d, i) {
        var grad = defs
          .append('linearGradient')
          .attr('id', 'grad_' + i)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '100%');

        grad
          .append('stop')
          .attr('offset', '0%')
          .attr('stop-color', d.color)
          .attr('stop-opacity', 0.85);

        grad
          .append('stop')
          .attr('offset', '100%')
          .attr('stop-color', d.color)
          .attr('stop-opacity', 1);
      });

      // Background Tracks & Foreground Arcs
      ringsData.forEach(function (d, i) {
        var rOuter = outerRadius - i * (thickness + spacing);
        var rInner = rOuter - thickness;

        if (rInner <= 5) return;

        // Background Track
        var trackArc = d3
          .arc()
          .innerRadius(rInner)
          .outerRadius(rOuter)
          .startAngle(0)
          .endAngle(2 * Math.PI)
          .cornerRadius(thickness / 2);

        g.append('path')
          .attr('d', trackArc)
          .attr('fill', d.color)
          .attr('opacity', trackOpacity);

        // Foreground Arc
        var fgArc = d3
          .arc()
          .innerRadius(rInner)
          .outerRadius(rOuter)
          .startAngle(0)
          .cornerRadius(thickness / 2);

        var path = g
          .append('path')
          .datum({ endAngle: 0 })
          .attr('d', fgArc)
          .attr('fill', 'url(#grad_' + i + ')')
          .style('cursor', 'pointer');

        // Smooth Entrance Animation
        path
          .transition()
          .duration(1200)
          .ease(d3.easeCubicOut)
          .attrTween('d', function () {
            var interpolate = d3.interpolate(0, d.pct * 2 * Math.PI);
            return function (t) {
              return fgArc.endAngle(interpolate(t))();
            };
          });

        // Hover events
        path
          .on('mouseover', function (event) {
            d3.select(this).attr('opacity', 0.8);
            tooltip.style.opacity = '1';
            tooltip.innerHTML =
              '<div style="font-weight:700;margin-bottom:2px;color:' +
              d.color +
              '">' +
              d.label +
              '</div>' +
              '<div>Value: <b>' +
              d.rendered +
              '</b></div>' +
              '<div>Progress: <b>' +
              Math.round(d.pct * 100) +
              '%</b> of target</div>';
          })
          .on('mousemove', function (event) {
            var bounds = element.getBoundingClientRect();
            var x = event.clientX - bounds.left + 15;
            var y = event.clientY - bounds.top + 15;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', 1);
            tooltip.style.opacity = '0';
          });
      });

      // Center Readout
      if (config.showCenterText !== false && ringsData.length > 0) {
        var primary = ringsData[0];
        var avgPct = Math.round(
          (ringsData.reduce(function (acc, curr) {
            return acc + curr.pct;
          }, 0) /
            ringsData.length) *
            100
        );

        var centerG = g.append('g').attr('class', 'center-kpi-text');

        centerG
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '-0.1em')
          .attr('fill', '#202124')
          .attr('font-size', Math.max(16, Math.floor(outerRadius * 0.24)) + 'px')
          .attr('font-weight', '700')
          .text(avgPct + '%');

        var sub = config.centerTitle || (ringsData.length === 1 ? primary.label : 'Avg Completion');
        centerG
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '1.4em')
          .attr('fill', '#5F6368')
          .attr('font-size', Math.max(10, Math.floor(outerRadius * 0.11)) + 'px')
          .attr('font-weight', '500')
          .text(sub);
      }

      // Legend if enabled
      if (config.showLegend !== false && ringsData.length > 1) {
        var legendContainer = document.createElement('div');
        legendContainer.className = 'radial-gauge-legend';
        legendContainer.style.display = 'flex';
        legendContainer.style.flexWrap = 'wrap';
        legendContainer.style.justifyContent = 'center';
        legendContainer.style.gap = '12px';
        legendContainer.style.padding = '8px 12px';
        legendContainer.style.fontSize = '12px';
        legendContainer.style.color = '#3C4043';
        legendContainer.style.flexShrink = '0';
        legendContainer.style.position = 'relative';
        legendContainer.style.zIndex = '10';

        ringsData.forEach(function (d) {
          var item = document.createElement('div');
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.gap = '6px';
          item.innerHTML =
            '<span style="width:10px;height:10px;border-radius:50%;background:' +
            d.color +
            ';display:inline-block;"></span>' +
            '<span>' +
            d.label +
            ' (<b>' +
            Math.round(d.pct * 100) +
            '%</b>)</span>';
          legendContainer.appendChild(item);
        });

        element.appendChild(legendContainer);
      }

      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
