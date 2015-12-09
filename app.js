var Slack = require('slack-client');
var events = require('events');
var emitter = new events.EventEmitter();
var PUBLIC_CHANNEL_ID = 'your-channel-id-here';
var slackToken = 'your-token-here'; // Add a bot at https://my.slack.com/services/new/bot and copy the token here.
var autoReconnect = true; // Automatically reconnect after an error response from Slack.
var autoMark = true; // Automatically mark each message as read after it is processed.

var slack = new Slack(slackToken, autoReconnect, autoMark);


slack.login();

var WebSocketServer = require('ws').Server;
var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname+'/public/index.html'));
});

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
  var wss = new WebSocketServer({server: server});
  console.log("websocket server created");

  wss.on('connection', function (ws) {
    slack._apiCall('channels.history', {
      channel: PUBlIC_CHANNEL_ID
    }, function (result) {
      var send = {
        type: 'history',
        data: result.messages.reverse()
      };
      send.data.forEach(function (message) {
        var user = slack.getUserByID(message.user);
        message.user_name = user.name;
        message.user_image = user.profile.image_48;
      });
      ws.send(JSON.stringify(send));
    });
    slack.on('message', function (data) {
      if (data.channel != PUBLIC_CHANNEL_ID) return;
      var _ = require('underscore');
      var message = _.pick(data, 'channel', 'text', 'ts', 'user');
      var user = slack.getUserByID(message.user);
      if (!user) return;
      message.user_name = user.name;
      message.user_image = user.profile.image_48;
      var send = {
        type: 'single',
        data: message
      };
      if (ws && ws.readyState === 1) ws.send(JSON.stringify(send));
    });
    console.log("websocket connection open")
    ws.on("close", function() {
      console.log("websocket connection close")
    });
  });
});
