JS_FILES = \
	src/intro.js \
	src/core.js \
	src/interactiveLayer.js \
	src/tooltip.js \
	src/utils.js \
	src/models/axis.js \
	src/models/boilerplate.js \
	src/models/bullet.js \
	src/models/bulletChart.js \
	src/models/cumulativeLineChart.js \
	src/models/discreteBar.js \
	src/models/discreteBarChart.js \
	src/models/distribution.js \
	src/models/historicalBar.js \
	src/models/historicalBarChart.js \
	src/models/indentedTree.js \
	src/models/legend.js \
	src/models/line.js \
	src/models/lineChart.js \
	src/models/lineDotted.js \
	src/models/lineDottedChart.js \
	src/models/linePlusBarChart.js \
	src/models/linePlusBarWithFocusChart.js \
	src/models/lineWithBrushChart.js \
	src/models/lineWithFisheye.js \
	src/models/lineWithFisheyeChart.js \
	src/models/lineWithFocusChart.js \
	src/models/multiBar.js \
	src/models/multiBarChart.js \
	src/models/multiBarHorizontal.js \
	src/models/multiBarHorizontalChart.js \
	src/models/multiBarTimeSeries.js \
	src/models/multiBarTimeSeriesChart.js \
	src/models/multiBarWithBrushChart.js \
	src/models/multiChart.js \
	src/models/ohlcBar.js \
	src/models/parallelCoordinates.js \
	src/models/pie.js \
	src/models/pieChart.js \
	src/models/scatter.js \
	src/models/scatterChart.js \
	src/models/scatterPlusLineChart.js \
	src/models/sparkline.js \
	src/models/sparklinePlus.js \
	src/models/stackedArea.js \
	src/models/stackedAreaChart.js \
	src/models/trendline.js \
	src/outro.js


JS_COMPILER = \
	cat
#   uglifyjs

all: nv.d3.js
nv.d3.js: $(JS_FILES)
nv.d3.min.js: $(JS_FILES)


nv.d3.js: Makefile
	-rm -f $@
	cat $(filter %.js,$^) >> $@

%.min.js:: Makefile
	-rm -f $@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> $@

clean:
	-rm -rf nv.d3.js nv.d3.min.js
