var pg = require('pg');
/* GET home page. */
exports.index = function(req, res){
  var connectionInfo = {
    "user": "bsmith",
    "password": "",
    "database": "oncetwicesold",
    "port": 5432,
    "host": "localhost"
  }

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

  //var getUserWinsQuery = 'SELECT Count(*) FROM public.games WHERE games.winner IN (SELECT tid FROM public.user_team INNER JOIN public.teams ON teams.tid = user_team.team AND user_team.user = '+1+');';
  pg.connect(connectionInfo, function(err, client, done) {
    client.query(getAllUserWinsIncludingPrice, function(err, result) {
      done();
      if(err) return console.error(err);
      var totalWins = new Array();
      var startingPrice = new Array();
      result.rows.forEach(function(userWins){
        totalWins.push(parseInt(userWins.count) + parseInt(userWins.sum));
        startingPrice.push(parseInt(userWins.sum));
      });
      console.log(totalWins);

      res.render('index', { title: 'OnceTwiceSold', totalWins:totalWins, startingPrice:startingPrice, options: 'options'});
    });
  });

};
