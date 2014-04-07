// Load the Visualization API and the piechart package.
google.load('visualization', '1.0', {'packages':['corechart']});

// Set a callback to run when the Google Visualization API is loaded.
google.setOnLoadCallback(drawChart);

// Callback that creates and populates a data table,
// instantiates the pie chart, passes in the data and
// draws it.
function drawChart() {
  var totalwins = new Array();
  totalWins = [!{totalWins}];
  // Create the data table.
  var data = new google.visualization.DataTable();
  data.addColumn('string', 'Label');
  data.addColumn('number', 'Value');
  data.addRows(6);
  data.setCell(0, 0, 'Brent');
  data.setCell(1, 0, 'Luke');
  data.setCell(2, 0, 'Scott');
  data.setCell(3, 0, 'Gazheek');
  data.setCell(4, 0, 'Aaron');
  data.setCell(5, 0, 'Harman');
  data.setCell(0, 1, (totalWins[0] < 0 ? 0 : totalWins[0]), totalWins[0].toString());
  data.setCell(1, 1, (totalWins[1] < 0 ? 0 : totalWins[1]), totalWins[1].toString());
  data.setCell(2, 1, (totalWins[2] < 0 ? 0 : totalWins[2]), totalWins[2].toString());
  data.setCell(3, 1, (totalWins[3] < 0 ? 0 : totalWins[3]), totalWins[3].toString());
  data.setCell(4, 1, (totalWins[4] < 0 ? 0 : totalWins[4]), totalWins[4].toString());
  data.setCell(5, 1, (totalWins[5] < 0 ? 0 : totalWins[5]), totalWins[5].toString());
  // Set chart options
  var options = {title: 'Wins', type:'baseball'};

  // Instantiate and draw our chart, passing in some options.
  chart = new BarsOfStuff(document.getElementById('chartdiv'));
  chart.draw(data, options);
}
