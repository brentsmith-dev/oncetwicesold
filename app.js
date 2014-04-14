var express = require("express");
var logfmt = require("logfmt");
var pg = require('pg');
var http = require('http');

var app = express();

app.use(logfmt.requestLogger());
app.get('/', function(req, res) {
  res.send('Hello World!');
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});

var connectionInfo = {
  "user": "bsmith",
  "password": "",
  "database": "oncetwicesold",
  "port": 5432,
  "host": "localhost"
}
pg.connect(connectionInfo, function(err, client, done) {
  client.query('SELECT * FROM teams', function(err, result) {
    done();
    if(err) return console.error(err);
    console.log(result.rows);
  });
});
