var Hapi = require('hapi');
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var sp;

// Create a server with a host and port
var server = new Hapi.Server();
server.connection({ 
    host: 'localhost', 
    port: 8000 
});
var globalSocket;

var io = require("socket.io")(server.listener);

server.views({
    engines: {
        hbs: require('handlebars')
    },
    path: __dirname + '/templates'
});

io.on("connection", function (socket) {
	console.log('connected');
	globalSocket = socket;
});


server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
    	var context = {
	        title: 'Views Example',
	        message: 'Hello, World'
	    };
        return reply.view('index.hbs',context);
    }
});

server.route({
    method: 'GET',
    path: '/list',
    handler: function (request, reply) {
        serialport.list(function (err, ports) {
	       	var text = "";
			ports.forEach(function(port) {
				text = text + port.comName;
				text = text + ", ";
				console.info(port);
			});
			reply(text);
		});
    }
});

server.route({
	method: 'GET',
	path: '/connect',
	handler: function (request, reply) {
		serialport.list(function (err, ports) {
			ports.forEach(function(port) {
				if (port.manufacturer.contains("Arduino")) {
					console.info(port);
					sp = new SerialPort(port.comName, {
						baudrate: 9600,
						parser: serialport.parsers.readline("\n")
					});
					SerialConnect();
					return reply.continue();
				}
			});
		});
	}
});

server.route({
	method: 'GET',
	path: '/disconnect',
	handler: function (request, reply) {
		sp.close();
		return reply.continue();

	}
});

SerialConnect = function () {
	sp.on("open", function () {
		console.log("open");
		sp.on('data', function(data) {
			if (IsJsonString(data)) {
				var jsonData = JSON.parse(data);
				if (globalSocket !== 'undefined') {
					console.log(jsonData);
					globalSocket.emit('coord', jsonData);
				}
			}
		});
	});
};

// Start the server
server.start(function () {
    console.log('Server running at:', server.info.uri);
});

String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}