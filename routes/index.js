var pg = require('pg');
var async = require('async');
/* GET home page. */
exports.index = function(req, res){
  var connectionString = 'postgres://bsmith:@localhost/oncetwicesold'
  if (process.env.DATABASE_URL){
    console.log('process.env.DATABASE_URL found');
    connectionString = process.env.DATABASE_URL;
  }else{
    console.log('process.env.DATABASE_URL missing assuming debug database');
  }

  var getUserCosts ='\
    SELECT username, SUM(cost)\
    FROM public.users\
    INNER JOIN public.user_team ON users.uid = user_team.user\
    GROUP BY username\
    ORDER BY username\
  '
  var getUserWinsByDate = '\
    SELECT date_part(\'mon\',date) AS month ,date_part(\'day\',date) as day, username, Count(*)\
    FROM public.games\
    INNER JOIN public.user_team ON games.winner = user_team.team\
    INNER JOIN public.users ON users.uid = user_team.user\
    GROUP BY date,username\
    Order by date';
  var getUserTeamsWithRecord = '\
    Select main.cost as "cost", main.username as "user", main.name as "team", winners.count as "wins", losers.count as "losses"\
    FROM\
    (SELECT *\
      FROM public.users\
      INNER JOIN public.user_team ON users.uid = user_team.user\
      INNER JOIN public.teams ON teams.tid = user_team.team\
    ) main\
    inner join\
    (SELECT team, COUNT(*)\
      FROM public.games\
      INNER JOIN public.user_team ON games.winner = user_team.team\
      INNER JOIN public.teams ON teams.tid = user_team.team\
      GROUP BY team) winners\
      on (winners.team = main.tid)\
      inner join\
    (SELECT team, COUNT(*)\
      FROM public.games\
      INNER JOIN public.user_team ON games.loser = user_team.team\
      INNER JOIN public.teams ON teams.tid = user_team.team\
      GROUP BY team) losers\
    on (losers.team = main.tid)\
    ORDER BY username';
  var getAllUsersWins = '\
    SELECT "user", COUNT(*)\
    FROM public.games\
    INNER JOIN public.user_team ON games.winner = user_team.team\
    INNER JOIN public.teams ON teams.tid = user_team.team\
    GROUP BY "user"\
    ORDER BY "user"';
  var getAllUserStartingWins = '\
    SELECT "user",SUM(cost)\
    FROM public.users\
    INNER JOIN public.user_team ON users.uid = user_team.user\
    GROUP BY "user"\
    ORDER BY "user"';

  var getAllUserWinsIncludingPrice = '\
    SELECT t1."user",t1.count,t2.sum\
    FROM\
    (SELECT "user", COUNT(*)\
    FROM public.games\
    INNER JOIN public.user_team ON games.winner = user_team.team\
    INNER JOIN public.teams ON teams.tid = user_team.team\
    GROUP BY "user"\
    ORDER BY "user") as t1,\
    (SELECT "user",SUM(cost)\
    FROM public.users\
    INNER JOIN public.user_team ON users.uid = user_team.user\
    GROUP BY "user"\
    ORDER BY "user") as t2\
    WHERE t1."user" = t2."user"';


  // The postgres client
  var pgClient = new pg.Client(connectionString);
  var totalWins = new Array();
  var startingPrice = new Array();
  var userCosts = {};
  console.log('request noted')
  // these DB requests could be done in parallel
  async.series([
      // Connect the postgres client
      function(callback){
        pgClient.connect(function(err){
          if(err) return console.error(err);
          callback();
        });
      },
      // Get the starting costs per user from the auction
      function(callback){
        console.log('asking politely for starting costs')
        pgClient.query(getUserCosts, function(err, result) {
          if(err) return console.error(err);
          result.rows.forEach(function(userCost){
            userCosts[userCost.username] = parseInt(userCost.sum);
          });
          callback(null)
        });
      },
      // get the daily win totals by user
      function(callback){
        console.log('asking politely for daily win totals by user');
        console.log(getUserWinsByDate);
        pgClient.query(getUserWinsByDate, function(err, result) {
          console.log('got daily win totals by user');
          if(err) return console.error(err);
          console.log(result.rows.toString());
          // TODO: pull this from DB
          var userWins = {Brent:userCosts['Brent'], Luke:userCosts['Luke'], Aaron:userCosts['Aaron'], Scott:userCosts['Scott'], Gazheek:userCosts['Gazheek'], Harman:userCosts['Harman']};
          var winsByDay = new Array();
          winsByDay.push(['Month-Day', 'Brent','Luke','Aaron', 'Scott', 'Gazheek', 'Harman'])
          var currentDay = result.rows[0].month + '-' + result.rows[0].day;
          result.rows.forEach(function(row){
            if (row.date == currentDay){
              userWins[row.username] += parseInt(row.count);
            }else{
              // Push the previous day's info
              winsByDay.push([currentDay,userWins['Brent'],userWins['Luke'],userWins['Aaron'],userWins['Scott'],userWins['Gazheek'],userWins['Harman']]);
              // update currentDay
              currentDay = row.month + '-' + row.day;
              // account for first data of the day
              userWins[row.username] += parseInt(row.count);
            }
          });
          // the last day won't have been pushed so do that
          winsByDay.push([currentDay,userWins['Brent'],userWins['Luke'],userWins['Aaron'],userWins['Scott'],userWins['Gazheek'],userWins['Harman']]);
          callback(null,winsByDay)
        });
      },
      // get the User/Teams/Record
      function(callback){
        console.log('asking politely for team records');
        pgClient.query(getUserTeamsWithRecord, function(err, result) {
          console.log('got team records');
          if(err) return console.error(err);
          console.log(result.rows.toString());
          var breakDown = new Array();
          result.rows.forEach(function(row){
            var wins = parseInt(row.wins);
            var losses = parseInt(row.losses);
            var cost = parseInt(row.cost);
            var projectedWins = Math.round((wins/(wins+losses) * 162) * 100)/100;
            var projectedValue = Math.round((projectedWins + cost - 81) * 100)/100;
            breakDown.push([row.user, row.team, wins , losses, cost, projectedWins, projectedValue])
          });
          callback(null,breakDown)
        });
      },
      // get the User/Wins/Costs
      function(callback){
        console.log('asking politely for wins')
        pgClient.query(getAllUserWinsIncludingPrice, function(err, result) {
          if(err) return console.error(err);
          totalWins = new Array();
          startingPrice = new Array();
          result.rows.forEach(function(userWins){
            totalWins.push(parseInt(userWins.count) + parseInt(userWins.sum));
            startingPrice.push(parseInt(userWins.sum));
          });
          callback(null,{totalWins:totalWins, startingPrice:startingPrice})
        });
      }
    ],
    // return the page
    function(err,results){
      console.log('rendering page')
      res.render('index', {
        title: 'OnceTwiceSold',
        winsByDay:JSON.stringify(results[2]),
        breakDown:JSON.stringify(results[3]),
        totalWins:results[4].totalWins,
        startingPrice:results[4].startingPrice,
        options: 'options'
      });
    }
  );
};
