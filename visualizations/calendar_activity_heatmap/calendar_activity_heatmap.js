/**
 * Calendar Activity Heatmap - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Visualizes daily metrics over a rolling 365-day (or filtered date range)
 * calendar grid, inspired by GitHub contribution graphs.
 *
 * Supports:
 * - 1 Date dimension (YYYY-MM-DD)
 * - 1 Numeric measure (Count, Revenue, Events, etc.)
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.timeWeek === 'function') {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.timeWeek === 'function') {
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

  var PALETTES = {
    github_green: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    electric_blue: ['#f0f7ff', '#bae0ff', '#69b1ff', '#1677ff', '#003eb3'],
    solar_ember: ['#fff7ed', '#fed7aa', '#fb923c', '#ea580c', '#9a3412'],
    cyber_purple: ['#faf5ff', '#e9d8fd', '#b794f4', '#805ad5', '#553c9a']
  };

  var visObject = {
    id: 'calendar_activity_heatmap',
    label: 'Calendar Activity Heatmap',
    options: {
      colorPalette: {
        type: 'string',
        label: 'Color Theme',
        display: 'select',
        values: [
          { 'GitHub Classic': 'github_green' },
          { 'Electric Blue': 'electric_blue' },
          { 'Solar Ember': 'solar_ember' },
          { 'Cyber Purple': 'cyber_purple' }
        ],
        default: 'github_green',
        section: 'Theme & Colors',
        order: 1
      },
      cellSize: {
        type: 'number',
        label: 'Cell Size (px)',
        display: 'range',
        min: 10,
        max: 22,
        step: 1,
        default: 13,
        section: 'Grid Style',
        order: 2
      },
      cellRadius: {
        type: 'number',
        label: 'Corner Radius (px)',
        display: 'range',
        min: 0,
        max: 6,
        step: 1,
        default: 3,
        section: 'Grid Style',
        order: 3
      },
      cellSpacing: {
        type: 'number',
        label: 'Cell Spacing (px)',
        display: 'range',
        min: 1,
        max: 5,
        step: 1,
        default: 3,
        section: 'Grid Style',
        order: 4
      },
      showSummary: {
        type: 'boolean',
        label: 'Show Metric Summary Header',
        default: true,
        section: 'Header & Summary',
        order: 5
      },
      summaryTitle: {
        type: 'string',
        label: 'Custom Activity Title',
        default: '',
        section: 'Header & Summary',
        order: 6
      },
      showMonthLabels: {
        type: 'boolean',
        label: 'Show Month Labels',
        default: true,
        section: 'Axes & Labels',
        order: 7
      },
      showDayLabels: {
        type: 'boolean',
        label: 'Show Day Labels',
        default: true,
        section: 'Axes & Labels',
        order: 8
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Intensity Legend',
        default: true,
        section: 'Axes & Labels',
        order: 9
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.fontFamily =
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.overflow = 'auto';
      element.style.padding = '16px';
      element.style.boxSizing = 'border-box';
      element.style.position = 'relative';

      var wrapper = document.createElement('div');
      wrapper.className = 'calendar-heatmap-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'flex-start';
      wrapper.style.minWidth = '750px';
      element.appendChild(wrapper);

      var tooltip = document.createElement('div');
      tooltip.className = 'cal-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.padding = '8px 12px';
      tooltip.style.background = 'rgba(32, 33, 36, 0.94)';
      tooltip.style.color = '#ffffff';
      tooltip.style.borderRadius = '6px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontWeight = '500';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.opacity = '0';
      tooltip.style.transition = 'opacity 0.15s ease-in-out';
      tooltip.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
      tooltip.style.zIndex = '9999';
      document.body.appendChild(tooltip);
      element._calTooltip = tooltip;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      var self = this;
      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var wrapper = element.querySelector('.calendar-heatmap-wrapper');
      var tooltip = element._calTooltip;
      if (!wrapper) {
        done();
        return;
      }
      wrapper.innerHTML = '';

      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no results to display.'
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = fields.dimensions || [];
      var measures = fields.measures || [];

      if (dimensions.length === 0) {
        this.addError({
          title: 'Date Dimension Required',
          message: 'Please add a Date dimension (e.g. Created Date) to populate the calendar.'
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: 'Measure Required',
          message: 'Please add at least one measure (e.g. Count, Total Sales) to measure daily volume.'
        });
        done();
        return;
      }

      var dateDim = dimensions[0];
      var measure = measures[0];

      // Parse data map: dateStr -> { value, rendered }
      var dateMap = {};
      var minDate = null;
      var maxDate = null;
      var totalSum = 0;
      var maxVal = 0;
      var maxDateStr = '';
      var activeDays = 0;

      data.forEach(function (row) {
        var rawDate = row[dateDim.name].value;
        if (!rawDate) return;
        var dateObj = d3.timeParse('%Y-%m-%d')(rawDate.substring(0, 10));
        if (!dateObj) return;

        var val = Number(row[measure.name].value) || 0;
        var rendered = row[measure.name].rendered || d3.format(',')(val);

        dateMap[d3.timeFormat('%Y-%m-%d')(dateObj)] = {
          value: val,
          rendered: rendered,
          date: dateObj
        };

        totalSum += val;
        if (val > 0) activeDays++;
        if (val > maxVal) {
          maxVal = val;
          maxDateStr = d3.timeFormat('%b %d, %Y')(dateObj);
        }

        if (!minDate || dateObj < minDate) minDate = dateObj;
        if (!maxDate || dateObj > maxDate) maxDate = dateObj;
      });

      if (!minDate || !maxDate) {
        this.addError({
          title: 'Invalid Date Format',
          message: 'Could not parse dates from the first dimension. Format should be YYYY-MM-DD.'
        });
        done();
        return;
      }

      // Default range: if less than a year, anchor to full calendar weeks
      var startDate = d3.timeSunday(minDate);
      var endDate = d3.timeSaturday(maxDate);

      // Color scale
      var palette = PALETTES[config.colorPalette] || PALETTES.github_green;
      var nonZeroVals = Object.keys(dateMap)
        .map(function (k) {
          return dateMap[k].value;
        })
        .filter(function (v) {
          return v > 0;
        });

      var colorScale = d3
        .scaleQuantile()
        .domain(nonZeroVals.length > 0 ? nonZeroVals : [0, 1])
        .range(palette.slice(1));

      // Header summary
      if (config.showSummary !== false) {
        var header = document.createElement('div');
        header.style.marginBottom = '16px';
        header.style.display = 'flex';
        header.style.flexWrap = 'wrap';
        header.style.gap = '24px';
        header.style.alignItems = 'baseline';

        var titleText =
          config.summaryTitle ||
          (measure.label_short || measure.label || 'Activity') + ' Calendar';

        var titleEl = document.createElement('h3');
        titleEl.textContent = titleText;
        titleEl.style.margin = '0';
        titleEl.style.fontSize = '18px';
        titleEl.style.fontWeight = '600';
        titleEl.style.color = '#202124';
        header.appendChild(titleEl);

        var statsEl = document.createElement('div');
        statsEl.style.display = 'flex';
        statsEl.style.gap = '16px';
        statsEl.style.fontSize = '13px';
        statsEl.style.color = '#5f6368';

        var totalFormatted = d3.format(',')(Math.round(totalSum));
        statsEl.innerHTML =
          '<span>Total: <b style="color:#202124">' +
          totalFormatted +
          '</b></span>' +
          '<span>Active Days: <b style="color:#202124">' +
          activeDays +
          '</b></span>' +
          (maxVal > 0
            ? '<span>Peak: <b style="color:#202124">' +
              d3.format(',')(maxVal) +
              '</b> (' +
              maxDateStr +
              ')</span>'
            : '');

        header.appendChild(statsEl);
        wrapper.appendChild(header);
      }

      // Sizing
      var cellSize = Number(config.cellSize) || 13;
      var cellRadius = Number(config.cellRadius) || 3;
      var cellSpacing = Number(config.cellSpacing) || 3;
      var step = cellSize + cellSpacing;

      var daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var leftMargin = config.showDayLabels !== false ? 34 : 10;
      var topMargin = config.showMonthLabels !== false ? 24 : 10;

      // Weeks range
      var weeks = d3.timeWeeks(startDate, d3.timeDay.offset(endDate, 1));
      var svgWidth = leftMargin + weeks.length * step + 20;
      var svgHeight = topMargin + 7 * step + 15;

      var svg = d3
        .select(wrapper)
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .style('display', 'block');

      var g = svg
        .append('g')
        .attr('transform', 'translate(' + leftMargin + ',' + topMargin + ')');

      // Day of week labels
      if (config.showDayLabels !== false) {
        var dayLabelsGroup = svg
          .append('g')
          .attr('transform', 'translate(0,' + topMargin + ')');

        [1, 3, 5].forEach(function (dIdx) {
          dayLabelsGroup
            .append('text')
            .attr('x', leftMargin - 6)
            .attr('y', dIdx * step + cellSize * 0.8)
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('fill', '#80868b')
            .text(daysOfWeek[dIdx]);
        });
      }

      // Month labels
      if (config.showMonthLabels !== false) {
        var monthLabelsGroup = svg
          .append('g')
          .attr('transform', 'translate(' + leftMargin + ', 0)');

        var monthWeeks = {};
        weeks.forEach(function (w, i) {
          var m = d3.timeFormat('%b')(w);
          if (!monthWeeks[m]) {
            monthWeeks[m] = i;
          }
        });

        Object.keys(monthWeeks).forEach(function (mName) {
          var colIdx = monthWeeks[mName];
          monthLabelsGroup
            .append('text')
            .attr('x', colIdx * step)
            .attr('y', topMargin - 8)
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', '#5f6368')
            .text(mName);
        });
      }

      // Render Days
      var allDays = d3.timeDays(startDate, d3.timeDay.offset(endDate, 1));

      g.selectAll('.cal-day')
        .data(allDays)
        .enter()
        .append('rect')
        .attr('class', 'cal-day')
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', cellRadius)
        .attr('ry', cellRadius)
        .attr('x', function (d) {
          return d3.timeWeek.count(startDate, d) * step;
        })
        .attr('y', function (d) {
          return d.getDay() * step;
        })
        .attr('fill', function (d) {
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          if (!entry || entry.value === 0) {
            return palette[0];
          }
          return colorScale(entry.value);
        })
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('stroke', '#1f2937').attr('stroke-width', 1.5);
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          var dateFormatted = d3.timeFormat('%A, %b %d, %Y')(d);
          var measLabel = measure.label_short || measure.label || 'Value';

          var valStr =
            entry && entry.value > 0
              ? '<b>' + entry.rendered + '</b> ' + measLabel
              : 'No ' + measLabel.toLowerCase();

          tooltip.style.opacity = '1';
          tooltip.innerHTML =
            '<div style="font-weight:600;margin-bottom:2px">' +
            dateFormatted +
            '</div>' +
            '<div style="font-size:11px;color:#d1d5db">' +
            valStr +
            '</div>';
        })
        .on('mousemove', function (event) {
          tooltip.style.left = event.clientX + 12 + 'px';
          tooltip.style.top = event.clientY + 12 + 'px';
        })
        .on('mouseout', function () {
          d3.select(this).attr('stroke', 'none');
          tooltip.style.opacity = '0';
        });

      // Intensity Legend
      if (config.showLegend !== false) {
        var legendEl = document.createElement('div');
        legendEl.style.display = 'flex';
        legendEl.style.alignItems = 'center';
        legendEl.style.gap = '4px';
        legendEl.style.marginTop = '12px';
        legendEl.style.fontSize = '11px';
        legendEl.style.color = '#5f6368';

        var lessLabel = document.createElement('span');
        lessLabel.textContent = 'Less';
        legendEl.appendChild(lessLabel);

        palette.forEach(function (col) {
          var box = document.createElement('span');
          box.style.width = cellSize + 'px';
          box.style.height = cellSize + 'px';
          box.style.borderRadius = cellRadius + 'px';
          box.style.background = col;
          box.style.display = 'inline-block';
          box.style.border = '1px solid rgba(0,0,0,0.05)';
          legendEl.appendChild(box);
        });

        var moreLabel = document.createElement('span');
        moreLabel.textContent = 'More';
        legendEl.appendChild(moreLabel);

        wrapper.appendChild(legendEl);
      }

      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
