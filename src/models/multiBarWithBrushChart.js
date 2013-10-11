
nv.models.multiBarWithBrushChart = function(options) {

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var multibar = nv.models.multiBar()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , legend = nv.models.legend()
    , controls = nv.models.legend()
    , brushCallback = options.callback || null
    , brush = d3.svg.brush()
    , brushExtent = null
    ;

    var margin = {top: 30, right: 20, bottom: 50, left: 60}
    , width = null
    , height = null
    , color = nv.utils.defaultColor()
    , showControls = true
    , showLegend = true
    , reduceXTicks = true // if false a tick will show for every data point
    , rotateLabels = 0
    , getX = function(d) { return d.x } // accessor to get the x value from a data point
    , getY = function(d) { return d.y } // accessor to get the y value from a data point
    , tooltips = true
    , tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
            '<p>' +  y + ' on ' + x + '</p>'
    }
    , x //can be accessed via chart.xScale()
    , y //can be accessed via chart.yScale()
    , noData = "No Data Available."
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush')
    ;

    multibar
    .stacked(false)
    ;
    xAxis
    .orient('bottom')
    .tickPadding(5)
    .highlightZero(false)
    .showMaxMin(false)
    .tickFormat(function(d) { return d })
    ;
    yAxis
    .orient('left')
    .tickFormat(d3.format(',.1f'))
    ;

    //============================================================


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var showTooltip = function(e, offsetElement) {
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(multibar.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(multibar.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    };

    //============================================================


    function chart(selection) {
    selection.each(function(data) {
        var container = d3.select(this),
            that = this;

        var availableWidth = (width  || parseInt(container.style('width'), 10) || 960)
                - margin.left - margin.right,
            availableHeight = (height || parseInt(container.style('height'), 10) || 400)
                - margin.top - margin.bottom;

        chart.update = function() { selection.transition().call(chart) };
        chart.container = this;


        //------------------------------------------------------------
        // Display noData message if there's nothing to show.

        if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
            .attr('class', 'nvd3 nv-noData')
            .attr('dy', '-.7em')
            .style('text-anchor', 'middle');

        noDataText
            .attr('x', margin.left + availableWidth / 2)
            .attr('y', margin.top + availableHeight / 2)
            .text(function(d) { return d });

        return chart;
        } else {
        container.selectAll('.nv-noData').remove();
        }

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Setup Scales

        x = multibar.xScale();
        y = multibar.yScale();

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap = container.selectAll('g.nv-wrap.nv-multiBarWithLegend').data([data]);
        var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multiBarWithLegend').append('g');
        var g = wrap.select('g');

        gEnter.append('g').attr('class', 'nv-x nv-axis');
        gEnter.append('g').attr('class', 'nv-y nv-axis');
        gEnter.append('g').attr('class', 'nv-barsWrap');
        gEnter.append('g').attr('class', 'nv-legendWrap');
        gEnter.append('g').attr('class', 'nv-controlsWrap');

        //------------------------------------------------------------



        //------------------------------------------------------------
        // Setup Brush

        if (brushCallback != null) {
        gEnter.append('g').attr('class', 'nv-brushBackground');
        gEnter.append('g').attr('class', 'nv-x nv-brush');
        }

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Legend

        if (showLegend) {
        legend.width(availableWidth / 2);

        g.select('.nv-legendWrap')
            .datum(data)
            .call(legend);

        if ( margin.top != legend.height()) {
            margin.top = legend.height();
            availableHeight = (height || parseInt(container.style('height'), 10) || 400)
                        - margin.top - margin.bottom;
        }

        g.select('.nv-legendWrap')
            .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')');
        }

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Controls

        if (showControls) {
        var controlsData = [
            { key: 'Grouped', disabled: multibar.stacked() },
            { key: 'Stacked', disabled: !multibar.stacked() }
        ];

        controls.width(180).color(['#444', '#444', '#444']);
        g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
        }

        //------------------------------------------------------------


        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        //------------------------------------------------------------
        // Main Chart Component(s)

        multibar
        .width(availableWidth)
        .height(availableHeight)
        .color(data.map(function(d,i) {
            return d.color || color(d, i);
        }).filter(function(d,i) { return !data[i].disabled }))


        var barsWrap = g.select('.nv-barsWrap')
        .datum(data.filter(function(d) { return !d.disabled }))

        d3.transition(barsWrap).call(multibar);

        //------------------------------------------------------------

        if (brushCallback != null) {

        brush
            .x(x)
            .on('brush', onBrush).
            on('brushend', tellModel)
        ;

        if (brushExtent) brush.extent(brushExtent);

        var brushBG = g.select('.nv-brushBackground').selectAll('g')
            .data([brushExtent || brush.extent()])

        var brushBGenter = brushBG.enter()
            .append('g');

        brushBGenter.append('rect')
            .attr('class', 'left')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', availableHeight);

        brushBGenter.append('rect')
            .attr('class', 'right')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', availableHeight);

        gBrush = g.select('.nv-x.nv-brush')
            .call(brush);
        gBrush.selectAll('rect')
        //.attr('y', -5)
            .attr('height', availableHeight);
        gBrush.selectAll('.resize').append('path').attr('d', resizePath);

        onBrush();

        }


        //------------------------------------------------------------
        // Setup Axes

        xAxis
        .scale(x)
        .ticks( availableWidth / 100 )
        .tickSize(-availableHeight, 0);

        g.select('.nv-x.nv-axis')
        .attr('transform', 'translate(0,' + y.range()[0] + ')');
        d3.transition(g.select('.nv-x.nv-axis'))
        .call(xAxis);

        var xTicks = g.select('.nv-x.nv-axis > g').selectAll('g');

        xTicks
        .selectAll('line, text')
        .style('opacity', 1)

        if (reduceXTicks)
        xTicks
        .filter(function(d,i) {
            return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
        })
        .selectAll('text, line')
        .style('opacity', 0);

        if(rotateLabels)
        xTicks
        .selectAll('text')
        .attr('transform', function(d,i,j) { return 'rotate('+rotateLabels+' 0,0)' })
        .attr('text-transform', rotateLabels > 0 ? 'start' : 'end');

        yAxis
        .scale(y)
        .ticks( availableHeight / 36 )
        .tickSize( -availableWidth, 0);

        d3.transition(g.select('.nv-y.nv-axis'))
        .call(yAxis);

        //------------------------------------------------------------


        //------------------------------------------------------------
        // Functions

        function resizePath(d) {
        var e = +(d == 'e'),
        x = e ? 1 : -1,
        y = availableHeight  / 3;
        return 'M' + (.5 * x) + ',' + y
            + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
            + 'V' + (2 * y - 6)
            + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
            + 'Z'
            + 'M' + (2.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8)
            + 'M' + (4.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8);
        }


        function updateBrushBG() {

        if (!brush.empty()) brush.extent(brushExtent);

        brushBG
            .data([brush.empty() ? x.rangeExtent() : brushExtent])
            .each(function(d,i) {
            var leftWidth = d[0] - x.rangeExtent()[0],
            rightWidth = x.rangeExtent()[1] - d[1];
            d3.select(this).select('.left')
                .attr('width',  leftWidth < 0 ? 0 : leftWidth);

            d3.select(this).select('.right')
                .attr('x', d[1])
                .attr('width', rightWidth < 0 ? 0 : rightWidth);

            });
        }



        function tellModel() {
        brushExtent = brush.empty() ? null : brush.extent();
        extent = brush.empty() ? x.range() : brush.extent();
        //      alert('x1= '+extent[0]+' , x1= '+extent[1]);

        //alert('domain: '+x.domain(extent[0])+'\nrange: '+x.range(extent[0]));
        var selected = {};

        for(k=0; k < data.length; k++){
            selected[k] = [];
            var j=0;
            for (i=0; i<data[k].values.length; i++) {

            if (extent[0] <= x.range()[i]  && x.range()[i] <= extent[1]) {
                selected[k][j] = data[k].values[i];
                j++;
            }
            }
        }
//      alert(extent);
//      alert(selected);
        brushCallback(selected);


        }


        function onBrush() {
        brushExtent = brush.empty() ? null : brush.extent();
        extent = brush.empty() ? x.domain() : brush.extent();


        dispatch.brush({extent: extent, brush: brush});


        updateBrushBG();

        // tell controller

        /*
        // Update Main (Focus)
        var focusLinesWrap = g.select('.nv-focus .nv-linesWrap')
        .datum(
        data
                .filter(function(d) { return !d.disabled })
                .map(function(d,i) {
                return {
                key: d.key,
                values: d.values.filter(function(d,i) {
                return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                })
                }
                })
        );
        d3.transition(focusLinesWrap).call(lines);


        // Update Main (Focus) Axes
        d3.transition(g.select('.nv-focus .nv-x.nv-axis'))
        .call(xAxis);
        d3.transition(g.select('.nv-focus .nv-y.nv-axis'))
        .call(yAxis);
        */
        }



        //------------------------------------------------------------



        //============================================================
        // Event Handling/Dispatching (in chart's scope)
        //------------------------------------------------------------

        legend.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled }).length) {
            data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.nv-series').classed('disabled', false);
            return d;
            });
        }

        selection.transition().call(chart);
        });

        controls.dispatch.on('legendClick', function(d,i) {
        if (!d.disabled) return;
        controlsData = controlsData.map(function(s) {
            s.disabled = true;
            return s;
        });
        d.disabled = false;

        switch (d.key) {
        case 'Grouped':
            multibar.stacked(false);
            break;
        case 'Stacked':
            multibar.stacked(true);
            break;
        }

        selection.transition().call(chart);
        });

        dispatch.on('tooltipShow', function(e) {
        if (tooltips) showTooltip(e, that.parentNode)
        });

        //============================================================


    });

    return chart;
    }


    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    multibar.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
    });

    multibar.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
    });
    dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
    });

    //============================================================


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.multibar = multibar;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;

    d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id', 'stacked', 'delay');

    chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
    };

    chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
    };

    chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
    };

    chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
    };

    chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
    };

    chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
    };

    chart.reduceXTicks= function(_) {
    if (!arguments.length) return reduceXTicks;
    reduceXTicks = _;
    return chart;
    };

    chart.rotateLabels = function(_) {
    if (!arguments.length) return rotateLabels;
    rotateLabels = _;
    return chart;
    }

    chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
    };

    chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
    };

    chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
    };

    chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
    };

    //============================================================


    return chart;
}
