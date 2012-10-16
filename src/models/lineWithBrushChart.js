
nv.models.lineWithBrushChart = function(options) {

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var lines = nv.models.line()
    , xAxis = nv.models.axis()
    , yAxis = nv.models.axis()
    , legend = nv.models.legend()
    ;

    var margin = {top: 30, right: 20, bottom: 50, left: 60}
    , color = nv.utils.defaultColor()
    , width = null
    , height = null
    , showLegend = true
    , tooltips = true
    , getX = function(d) { return d.x } // accessor to get the x value from a data point
    , getY = function(d) { return d.y } // accessor to get the y value from a data point
    , brush = d3.svg.brush()
    , brushCallback = options.callback
    , trendlines = options.trendlines
    , minmax = options.minmax
    , brushExtent = null
    , trendlinesDone = false
    , tooltip = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
            '<p>' +  y + ' at ' + x + '</p>'
    }
    , x
    , y
    , noData = 'No Data Available.'
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush')
    ;


    lines.
	interactive(false)
    ;
    xAxis
	.orient('bottom')
	.tickPadding(5)
    ;
    yAxis
	.orient('left')
    ;

    //============================================================






    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var showTooltip = function(e, offsetElement) {

	// New addition to calculate position if SVG is scaled with viewBox, may move TODO: consider implementing everywhere else
	if (offsetElement) {
	    var svg = d3.select(offsetElement).select('svg');
	    var viewBox = svg.attr('viewBox');
	    if (viewBox) {
		viewBox = viewBox.split(' ');
		var ratio = parseInt(svg.style('width')) / viewBox[2];
		e.pos[0] = e.pos[0] * ratio;
		e.pos[1] = e.pos[1] * ratio;
	    }
	}

	var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
        y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

	nv.tooltip.show([left, top], content, null, null, offsetElement);
    };

    //============================================================


    function chart(selection) {


	// Trendlines
	if ((trendlines || minmax) && trendlinesDone == false) {
	    var xm = {} , ym = {} , xym = {} , x2m = {}, 
	    n = {}, m = {}, q = {}, i, ymax = {}, ymin = {};

	    selection.each(function(data) {
		for (i=0; i < data.length; i++) {
		    var k = data[i].key;
		    if (!n[k]) {
			xm[k] = 0;
			ym[k] = 0;
			xym[k] = 0;
			x2m[k] = 0;
			n[k] = 0;
			m[k] = 0;
			q[k] = 0;
			ymax[k] = + getY(data[i].values[0]);
			ymin[k] = + getY(data[i].values[0]);
			
			//			ymax[k] = minmax(data[i].values[0]);
		    }

		    for (j in data[i].values) {
			var point = data[i].values[j];
			xm[k] += + getX(point);
			ym[k] += +getY(point);
			xym[k] += (+getX(point) * +getY(point));
			x2m[k] += (+getX(point) * +getX(point));
			n[k]++;
			if (getY(point) < ymin[k]) {
			    ymin[k] = +getY(point);
			}
			if (getY(point) > ymax[k]) {
			    ymax[k] = +getY(point);
			}
		    }

		    xm[k] /= n[k];
		    ym[k] /= n[k];
		    xym[k] /= n[k];
		    x2m[k] /= n[k];

		    // update coefficients
		    m[k] = (xym[k] - (xm[k] * ym[k])) / (x2m[k] - (xm[k]*xm[k]));
		    q[k] = ym[k] - (m[k] * xm[k]);
		    
		}


		var max = data.length;
		for (i=0; i<max; i++) {

		    var k = data[i].key;

		    // add new series
		    var x0 = getX(data[i].values[0]),
		    x1 = getX(data[i].values[data[i].values.length - 1]);
		    
		    if (trendlines) {
			var y0 = m[k] * x0 + q[k],
			y1 = m[k] * x1 + q[k];
			var values = [];
			values[0] = {'x':x0, 'y':y0};
			values[1] = {'x':x1, 'y':y1};
			data.push({'key': k+'-trend', 'color': data[i].color, 'values': values, 'dash': '10', 'opacity':0.6, 'generated':true});
			
		    }

		    
		    if (minmax) {
			var _min = [], _max = [];
			_min[0] = {'x': x0, 'y': ymin[k]};
			_min[1] = {'x': x1, 'y': ymin[k]};
			_max[0] = {'x': x0, 'y': ymax[k]};
			_max[1] = {'x': x1, 'y': ymax[k]};

			data.push({'key': k + "-min", 'color': data[i].color, 'values': _min, 'dash': '5', 'opacity':0.4, 'generated':true});
			data.push({'key': k + "-max", 'color': data[i].color, 'values': _max, 'dash': '5', 'opacity':0.4, 'generated':true});

		    }
		    
		}
		

	    });
	    
	    trendlinesDone = true;
	    
	}

	selection.each(function(data) {
	    var container = d3.select(this),
            that = this;

	    var availableWidth = (width  || parseInt(container.style('width')) || 960)
                - margin.left - margin.right,
            availableHeight = (height || parseInt(container.style('height')) || 400)
                - margin.top - margin.bottom;


	    chart.update = function() { chart(selection) };
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

	    x = lines.xScale();
	    y = lines.yScale();

	    //------------------------------------------------------------


	    //------------------------------------------------------------
	    // Setup containers and skeleton of chart

	    var wrap = container.selectAll('g.nv-wrap.nv-lineWithBrushChart').data([data]);
	    var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineWithBrushChart').append('g');
	    var g = wrap.select('g');

	    gEnter.append('g').attr('class', 'nv-x nv-axis');
	    gEnter.append('g').attr('class', 'nv-y nv-axis');
	    gEnter.append('g').attr('class', 'nv-linesWrap');
	    gEnter.append('g').attr('class', 'nv-legendWrap');
	    

	    //------------------------------------------------------------
	    // Setup Brush

	    if (brushCallback != null) {
		gEnter.append('g').attr('class', 'nv-brushBackground');
		gEnter.append('g').attr('class', 'nv-x nv-brush');
	    }


	    //------------------------------------------------------------




	    //------------------------------------------------------------


	    //------------------------------------------------------------
	    // Legend

	    if (showLegend) {
		legend.width(availableWidth);

		g.select('.nv-legendWrap')
		    .datum(data)
		    .call(legend);

		if ( margin.top != legend.height()) {
		    margin.top = legend.height();
		    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;
		}

		wrap.select('.nv-legendWrap')
		    .attr('transform', 'translate(0,' + (-margin.top) +')')
	    }

	    //------------------------------------------------------------

	    wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


	    //------------------------------------------------------------
	    // Main Chart Component(s)

	    lines
		.defined(lines.defined())
		.width(availableWidth)
		.height(availableHeight)
		.color(data.map(function(d,i) {
		    return d.color || color(d, i);
		}).filter(function(d,i) { return !data[i].disabled }));


	    var linesWrap = g.select('.nv-linesWrap')
		.datum(data.filter(function(d) { return !d.disabled }))

	    d3.transition(linesWrap).call(lines);

	    //------------------------------------------------------------


	    //------------------------------------------------------------
	    // Brush stuff

	    
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


	    yAxis
		.scale(y)
		.ticks( availableHeight / 36 )
		.tickSize( -availableWidth, 0);

	    d3.transition(g.select('.nv-y.nv-axis'))
		.call(yAxis);

	    //------------------------------------------------------------






	    //============================================================
	    // Functions
	    //------------------------------------------------------------

	    // Taken from crossfilter (http://square.github.com/crossfilter/)
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
		    .data([brush.empty() ? x.domain() : brushExtent])
		    .each(function(d,i) {
			var leftWidth = x(d[0]) - x.range()[0],
			rightWidth = x.range()[1] - x(d[1]);
			d3.select(this).select('.left')
			    .attr('width',  leftWidth < 0 ? 0 : leftWidth);

			d3.select(this).select('.right')
			    .attr('x', x(d[1]))
			    .attr('width', rightWidth < 0 ? 0 : rightWidth);
		    });
	    }



	    function tellModel() {
		brushExtent = brush.empty() ? null : brush.extent();
		extent = brush.empty() ? x.domain() : brush.extent();

		var selected = {};
		
		for (i=0; i < data.length; i++) {
		    if (data[i].generated) {
			continue;
		    }
		    var key = data[i].key;
		    selected[key] = {min: 0, max:0};
		    var values = data[i].values.sort(function(a,b){return (( +getX(a) < +getX(b)) ? -1 : (( +getX(a) > +getX(b)) ? 1 : 0));})
		    
		    // INEFFICIENT find min
		    for (j=0; j < values.length; j++) {
			if (getX(values[j]) > extent[0]) {
			    break;
			}
			selected[key].min = values[j];
		    }

		    //INEFFICIENT find max
		    for (j=values.length -1; j >=0 ; j--) {
			if (getX(values[j]) < extent[1]) {
			    break;
			}
			selected[key].max = values[j];
		    }
		}

		

		/*var j=0;
		  for (i=0; i<data[0].values.length; i++) {
		  if (extent[0] <= x.range()[i]  && x.range()[i] <= extent[1]) {
		  selected[j] = data[0].values[i][0];
		  j++;
		  }
		  }*/


		brushCallback(selected);
	    }

	    function onBrush() {
		brushExtent = brush.empty() ? null : brush.extent();
		extent = brush.empty() ? x.domain() : brush.extent();


		dispatch.brush({extent: extent, brush: brush});
		updateBrushBG();

	    }

	    //============================================================



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

	    /*
	      legend.dispatch.on('legendMouseover', function(d, i) {
              d.hover = true;
              selection.transition().call(chart)
	      });

	      legend.dispatch.on('legendMouseout', function(d, i) {
              d.hover = false;
              selection.transition().call(chart)
	      });
	    */

	    dispatch.on('tooltipShow', function(e) {
		if (tooltips) showTooltip(e, that.parentNode);
	    });

	    //============================================================

	});

	return chart;
    }


    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    lines.dispatch.on('elementMouseover.tooltip', function(e) {
	e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
	dispatch.tooltipShow(e);
    });

    lines.dispatch.on('elementMouseout.tooltip', function(e) {
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
    chart.lines = lines;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;

    d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id', 'interpolate');

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
    /*
      chart.x = function(_) {
      if (!arguments.length) return getX;
      getX = _;
      scatter.x(_);
      return chart;
      };

      chart.y = function(_) {
      if (!arguments.length) return getY;
      getY = _;
      scatter.y(_);
      return chart;
      };
    */
    chart.color = function(_) {
	if (!arguments.length) return color;
	color = nv.utils.getColor(_);
	legend.color(color);
	return chart;
    };

    chart.showLegend = function(_) {
	if (!arguments.length) return showLegend;
	showLegend = _;
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
