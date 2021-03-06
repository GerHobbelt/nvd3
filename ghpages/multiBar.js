
nv.addGraph(function() {
    var chart = nv.models.multiBarChart();

    chart.xAxis
        .tickFormat(d3.format(',f'));

    chart.yAxis
        .tickFormat(d3.format(',.1f'));

    d3.select('#chart1 svg')
        .datum(exampleData())
      .transition().duration(500).call(chart);

    nv.utils.windowResize(chart.update);

    return chart;
});




function exampleData() {
  return stream_layers(3,10+Math.random()*100,0.1).map(function(data, i) {
    return {
      key: 'Stream' + i,
      values: data
    };
  });
}
