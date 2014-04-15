// The daily updater for yesterday's games
var pg = require('pg');
var http = require('http');
var async = require('async');

var connectionString = 'postgres://bsmith:@localhost/oncetwicesold'
if (process.env.DATABASE_URL){
  console.log('process.env.DATABASE_URL found');
  connectionString = process.env.DATABASE_URL;
}else{
  console.log('process.env.DATABASE_URL missing assuming debug database');
}

// How many days back do we need to pull the data
// Will only pull this date
var daysPrevious = 1;
if (process.argv.length >= 3){
  daysPrevious = process.argv[2];
  console.log('daysPrevious: ' + daysPrevious);
}
// The postgres client
var pgClient = new pg.Client(connectionString);

var date = new Date();
// we always pull yesterday's data
date.setDate(date.getDate() - daysPrevious);
var day = date.getDate();
day = day < 10 ? '0'+day : ''+day;
var month = date.getMonth() + 1;
month = month < 10 ? '0'+month : ''+month;
var year = date.getFullYear();

// Pull the list of yesterday's games
// TODO: use request.js
function fetchGames(callback){
  var url = 'http://wap.mlb.com/gdcross/components/game/mlb/year_'+year+'/month_'+month+'/day_'+day+'/miniscoreboard.json';
  console.log('fetching url: ' + url);
  http.get(url, function(res){
    var body = '';
    res.on('data', function(chunk) {
        body += chunk;
    });
    res.on('end', function() {
        var mlbResponse = JSON.parse(body)
        callback(mlbResponse.data.games.game);
    });
  });
}

// Insert a completed game into the database
function insertGame(pgClient,date,winner,loser,callback){
  var teamQuery = 'SELECT * FROM public.teams WHERE teams.name LIKE \'' +winner+
                  '\' OR teams.name LIKE \''+loser+'\'';
  console.log ('query: ' + teamQuery);
  pgClient.query(teamQuery , function(err, result) {
    if(err) return console.error(err);
    if (result.rows.length == 2){
      console.log('teams:');
      console.log(result.rows);
      // I'm pretty sure there is a better way to do this...
      var winnerTID = result.rows[0].name == winner ? result.rows[0].tid : result.rows[1].tid;
      var loserTID = result.rows[0].name == winner ? result.rows[1].tid : result.rows[0].tid;
      // INSERT statement for adding the game to the database
      var gameInsert = 'INSERT INTO games (winner, loser, date) VALUES ('+winnerTID+', '+loserTID+', \''+year+'-'+month+'-'+day+'\');'
      console.log(gameInsert);
      pgClient.query(gameInsert,callback);
    }else{
      console.log('incorrect number of team results')
      callback();
    }
  });
}

console.log('Fetching Games for: ' + date.toDateString());
// Get the previous day's games and insert them into the database, closing the
// connection once completed.
fetchGames(function(gameArray){
  console.log("Called Back");
  // Open the connection to the database
  pgClient.connect(function(err) {
    if (err){
      return console.error('could not connect to postgres',err);
    }
    // for each game enter the results into the database
    console.log('Found ' + gameArray.length + ' games');
    if (gameArray.length > 0){
      // This is a simple, once-daily, task. No need for connection pooling
      // just insert them one at a time and close the connection when finished
      async.eachSeries(gameArray, function (game, callback) {
        // If a game is postponed we will see it show up later
        if (game.status != "Postponed"){
          console.log('Home: ' + game.home_team_name + ' Runs: ' + game.home_team_runs + ' Visitor: ' + game.away_team_name + ' Runs: ' + game.away_team_runs);
          var winner = parseInt(game.home_team_runs) > parseInt(game.away_team_runs) ? game.home_team_name : game.away_team_name;
          var loser = parseInt(game.home_team_runs) < parseInt(game.away_team_runs) ? game.home_team_name : game.away_team_name;
          console.log("Winner: " + winner + " Loser: " + loser);
          insertGame(pgClient,date,winner,loser, callback);
        }else{
          console.log("Postponed Game: "+ game.home_team_name + " vs " + game.away_team_name);
          callback();
        }
      },
      //Done all items
      function (err){
        console.log('Completed all games');
        // end DB Connection
        pgClient.end();
      });// close serial games processing
    }else{
      console.log('No Games')
      // end DB Connection
      pgClient.end();
    }
  }); // close database connection callback
}); // close fetchGames call
