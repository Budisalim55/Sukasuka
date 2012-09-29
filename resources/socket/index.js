var resource  = require('resource'),
    socket = resource.define('socket');

socket.schema.description = "socket.io websocket resource";

socket.method('start', start, {
  "description": "starts a socket.io server",
  "properties": {
    "callback": {
      "description": "the callback executed after server listen",
      "type": "function",
      "required": false
    }
  }
});

function start (options, callback) {
  options = options || {};
  var server;
  var socketful = require('socketful');
  socket.server = server = socketful.createServer(big.resources, { server: big.http.server });
}

exports.socket = socket;

exports.dependencies = {
  "socketful": "*"
};