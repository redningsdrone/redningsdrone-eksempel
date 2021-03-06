var mode="production";

var express = require('express');
var WebSocketServer = require('ws').Server;
var http = require('http');

var FileTail = require('file-tail');

var port = process.env.PORT || 5000;

var app = express();

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/static/index.html');
});
app.use(express.static('static'));
app.use('/bower_components', express.static(__dirname + '/bower_components'));


var server = http.createServer(app);
server.listen(port);
console.log('Listening on ' + port);

var wss = new WebSocketServer({server: server});
console.log('websocket server created');


var currentInfo = function (date) {
    var signalPos = [61.937012, 10.480614];

    var ts = date.getTime();
    var r = ts/1000.0 / 60.0 * Math.PI * 2;

    var circleRadius = 0.1;

    var lat = signalPos[0] + Math.sin(r) * circleRadius;
    var lon = signalPos[1] + Math.cos(r) * circleRadius / Math.cos(lat * Math.PI/180);

    var dronePos = [lat,lon];

    return {
        drone: {
            pos: dronePos,
            time: date
        },
        signals: [
            {
                pos: signalPos,
                radius: 500,
                time: date
            }]
    };
};

var sockets = new Set();

wss.on('connection', function (ws) {
    console.log('websocket connection open');
    sockets.add(ws);
    
    ws.on('close', function () {
        console.log('websocket connection close');
        sockets.remove(ws);
    })
});

if(mode !== "production") {
setInterval(function () {
    sockets.forEach(function(ws) {
    ws.send(currentInfo(new Date()));
  });
}, 1000);
}

// Start listening on meas messages


var ft = FileTail.startTailing('/var/log/meas_json/current');

ft.on('line', function(line) {
  console.log('Received meas: ' + line);
  var obj = JSON.parse(line);
  var time = new Date(obj.time * 1000);
  var msg = currentInfo(time);
  msg.meas = obj;
  sockets.forEach(function(ws) {
    ws.send(JSON.stringify(msg));
  });
  
});
