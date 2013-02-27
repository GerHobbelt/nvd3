nv.models.legend = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 5, right: 0, bottom: 5, left: 0}
    , width = 400
    , height = 20
    , maxRows = false 
    , getKey = function(d) { return d.key }
    , color = nv.utils.defaultColor()
    , align = true
	, legendOffset = 0
	, dispatch = d3.dispatch('legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout')
    ;

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          container = d3.select(this);


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-legend').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-legend').append('g');
      var g = wrap.select('g');
      var wrapTran = [margin.left, margin.top];
      wrap.attr('transform', 'translate(' + wrapTran[0] + ',' + wrapTran[1] + ')');

      //------------------------------------------------------------


      var series = g.selectAll('.nv-series')
          .data(function(d) { return d });
      var seriesEnter = series.enter().append('g').attr('class', 'nv-series')
          .on('mouseover', function(d,i) {
            dispatch.legendMouseover(d,i);  //TODO: Make consistent with other event objects
          })
          .on('mouseout', function(d,i) {
            dispatch.legendMouseout(d,i);
          })
          .on('click', function(d,i) {
            dispatch.legendClick(d,i);
          })
          .on('dblclick', function(d,i) {
            dispatch.legendDblclick(d,i);
          });
      seriesEnter.append('circle')
          .style('stroke-width', 2)
          .attr('r', 5);
      seriesEnter.append('text')
          .attr('text-anchor', 'start')
          .attr('dy', '.32em')
          .attr('dx', '8');
      series.classed('disabled', function(d) { return d.disabled });
      series.exit().remove();
      series.select('circle')
          .style('fill', function(d,i) { return d.color || color(d,i)})
          .style('stroke', function(d,i) { return d.color || color(d, i) });
      series.select('text').text(getKey);


      //TODO: implement fixed-width and max-width options (max-width is especially useful with the align option)

      // NEW ALIGNING CODE, TODO: clean up
      if (align)  {
        var seriesWidths = [];
        series.each(function(d,i) {
	      // 28 is ~ the width of the circle plus some padding
              seriesWidths.push(d3.select(this).select('text').node().getComputedTextLength() + 28); 
        });

        //nv.log('Series Widths: ', JSON.stringify(seriesWidths));
        var seriesPerRow = 0;
        var legendWidth = 0;
        var legendHeight = 0;
        var columnWidths = [];
	var xPositions = [];
    	var isColumnVisible = [];

	while ( legendWidth < availableWidth && seriesPerRow < seriesWidths.length) {
	  columnWidths[seriesPerRow] = seriesWidths[seriesPerRow];
	  isColumnVisible[seriesPerRow] = true;
	  legendWidth += seriesWidths[seriesPerRow++];
	}

	while ( legendWidth > availableWidth && seriesPerRow > 1 ) {
	  columnWidths = [];
	  seriesPerRow--;

	  for (k = 0; k < seriesWidths.length; k++) {
	    if (seriesWidths[k] > (columnWidths[k % seriesPerRow] || 0) )
	      columnWidths[k % seriesPerRow] = seriesWidths[k];
	  }

	  legendWidth = columnWidths.reduce(function(prev, cur, index, array) {
			  return prev + cur;
	  });
	}
        var showLegendSlider = false;	
	var numRows = Math.ceil(seriesWidths.length / seriesPerRow)+1
	
	// Check if our number of rows exceeds the maximum. If it does,
	// recalculate things.
	if (maxRows !== false && numRows > maxRows ) {
		numRows = maxRows;
		seriesPerRow = Math.ceil(seriesWidths.length/numRows);
		for (var i = 0; i < seriesWidths.length; i++) {
			var col = i % seriesPerRow 
			if(columnWidths[col] === undefined) {
				columnWidths[col] = 0;
			}
			columnWidths[col] = Math.max(seriesWidths[i],columnWidths[col])
		};
		legendWidth = 0;
		for(i =0;i<seriesPerRow;i++) {
			legendWidth += columnWidths[i];
			if (legendWidth > availableWidth) {
				isColumnVisible[i] = false;
				showLegendSlider = true;
			}
		}
	}
	
	for (var i = 0, curX = 0; i < seriesPerRow; i++) {
	    xPositions[i] = curX;
	    curX += columnWidths[i];
	}

        series
            .attr('transform', function(d, i) {
              return 'translate(' + xPositions[i % seriesPerRow] + ',' + (5 + Math.floor(i / seriesPerRow) * 20) + ')';
            });
        series
            .style('display',function(d, i) {
	    	return isColumnVisible[ i % seriesPerRow] ? 'block' : 'none';
	    });

        //position legend as far right as possible within the total width
        g.attr('transform', 'translate(' + Math.max(0,width - margin.right - legendWidth) + ',' + margin.top + ')');

        height = margin.top + margin.bottom + (Math.ceil(seriesWidths.length / seriesPerRow) * 20);
	if (showLegendSlider) {
			if (container.selectAll("path[class^=nv-legend-]")[0].length == 0 ) {
				var elm1 = container.append("svg:path").attr("class","nv-legend-right").style("cursor","pointer")
					.attr("d", d3.svg.symbol().type("triangle-down").size(32))
				.attr("transform", 'translate(' + availableWidth + ',' + (numRows * 20)/2 + ') rotate(-90)');
				var elm2 = container.append("svg:path").attr("class","nv-legend-left").style("cursor","pointer")
					.attr("d", d3.svg.symbol().type("triangle-down").size(32))
				.attr("transform", 'translate(-20,' + (numRows * 20)/2 + ') rotate(90)')
				.style("display","none");
			}
			//attr that allows us to specify the context of the function so that we can
			//call it manually
			container.selectAll("path[class^=nv-legend-]").on('click', function(d,i,that) {
					var left = d3.select(that?that:this).attr("class") == "nv-legend-left";
					var mode = 0;
					var toHideIdx = -1;
					var toShowIdx = -1;
					if (!left) {
						if (isColumnVisible[isColumnVisible.length-1]) { return}
						
						//if that is set, then we called this manually and don't
						// want to adjust the global offset state
						if(!that) legendOffset--;
						//Loop through column visiblities and make the first visible
						//one hidden and the first hidden on visble
						for (var i = 0; i < isColumnVisible.length; i++) {
							if (mode == 0 && isColumnVisible[i]) {
								isColumnVisible[i] = false;;
								toHideIdx = i;
								mode = 1;
							} else if(mode == 1 && !isColumnVisible[i]) {
								isColumnVisible[i] = true;;
								toShowIdx = i;
								break;
							}
						};
							wrapTran[0] -= columnWidths[toHideIdx];
					} else {
						if (isColumnVisible[0]) { return}
						//Loop through column visiblities and make the first last invisible
						//one visible and the last visble one hidden
						for (var i = 0; i < isColumnVisible.length; i++) {
							if (mode == 0 && isColumnVisible[i]) {
								isColumnVisible[i-1] = true;
								toShowIdx = i-1;
								mode = 1;
							} else if(mode == 1 && !isColumnVisible[i]) {
								isColumnVisible[i-1] = false;
								toHideIdx = i-1;
								break;
							}
						};
						
						//if that is set, then we called this manually and don't
						// want to adjust the global offset state
						if(!that) legendOffset++;
						if (toHideIdx == -1) {
							isColumnVisible[isColumnVisible.length-1] = false;
						}
							wrapTran[0] += columnWidths[toShowIdx];
					}
					series.style("display",function(d, i) {
						return isColumnVisible[i % seriesPerRow] ? "block" : "none";
					});
					if (isColumnVisible[0]) {
						container.select(".nv-legend-left").style("display","none");
					} else {
						container.select(".nv-legend-left").style("display","block");
					}
					if (isColumnVisible[isColumnVisible.length-1]) {
						container.select(".nv-legend-right").style("display","none");
					}else{
						container.select(".nv-legend-right").style("display","block");
					}
					wrap.attr('transform', 'translate(' + wrapTran[0] + ',' + wrapTran[1] + ')');
				})
			}
		if (legendOffset > 0) {
				for (var i = 0; i <legendOffset; i++) {
					container.selectAll(".nv-legend-left").each(function(d, i) {
						d3.select(this).on("click")(d, i,this);
					});
				};
		} else if (legendOffset < 0) {
				for (var i = 0; i > legendOffset; i--) {
					container.selectAll(".nv-legend-right").each(function(d, i) {
						d3.select(this).on("click")(d, i,this);
					});
				};
		}
      } else {

        var ypos = 5,
            newxpos = 5,
            maxwidth = 0,
            xpos;
        series
            .attr('transform', function(d, i) {
              var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
              xpos = newxpos;

              if (width < margin.left + margin.right + xpos + length) {
                newxpos = xpos = 5;
                ypos += 20;
              }

              newxpos += length;
              if (newxpos > maxwidth) maxwidth = newxpos;

              return 'translate(' + xpos + ',' + ypos + ')';
            });

        //position legend as far right as possible within the total width
        g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');

        height = margin.top + margin.bottom + ypos + 15;

      }

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

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
  
  chart.maxRows = function(_) {
    if (!arguments.length) return maxRows;
    maxRows = _;
    return chart;
  };

  chart.key = function(_) {
    if (!arguments.length) return getKey;
    getKey = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.align = function(_) {
    if (!arguments.length) return align;
    align = _;
    return chart;
  };

  //============================================================


  return chart;
}
