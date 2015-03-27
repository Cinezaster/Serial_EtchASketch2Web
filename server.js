var Hapi = require('hapi');
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var sp;
var fs = require('fs');
var midiConverter = require('midi-converter');


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
	        message: 'mlksdj' 
	    };
        return reply.view('index.hbs',context);
    }
});

server.route({
    method: 'GET',
    path: '/xy',
    handler: function (request, reply) {
    	var context = {
	        title: 'Views Example',
	        message: 'mlksdj' 
	    };
        return reply.view('xy.hbs',context);
    }
});

server.route({
    method: 'GET',
    path: '/midi',
    handler: function (request, reply) {
    	var midiSong = fs.readFileSync('hot_butter-popcorn.mid', 'binary');
		var jsonSong = midiConverter.midiToJson(midiSong);
		var track = jsonSong.tracks[1];

		//fs.writeFileSync('example.json', JSON.stringify(jsonSong));

		var toneArray = [1,1,0.7,0.7,0.65,0.65,0.6,0.6,0.55,0.5,0.5,0.45,0.45];
		var octaafArray = [1,0.7,0.65,0.6,0.55,0.5,0.45];
		var durationArray = [1,0.75,0.7,0.65,0.6,0.55,0.5,0.45,0.4,0.35,0.3];

		var parsedSong = [];

		for (var i = 0; i < track.length; i++) {
			var element = track[i];
			var nextElement = track[i+1];
			if (element.type === "channel" && element.subtype === "noteOn") {
				var deltatimeOn = element.deltaTime;
				var deltatimeOff = nextElement.deltaTime;
				var duration = Math.round(((deltatimeOff - deltatimeOn)/0.002)/15000);
				var noteNumber= element.noteNumber;

				var octaaf = Math.ceil((noteNumber-23)/12);
				var tone = (noteNumber-9)%12;

				if (duration > 0) {
					parsedSong.push({
						duration: durationArray[duration],
						octaaf: octaafArray[octaaf],
						tone: toneArray[tone],
						original: {
							duration: duration*15000,
							octaaf: octaaf,
							tone: tone
						}
					});
				}
			}
		}

    	var context = {
	        title: 'Views Example',
	        midiJSON: parsedSong
	    };
        return reply.view('midi.hbs',context);
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
						//parser: serialport.parsers.readline("\n")
					});
					//SerialConnect();

					Socket2Serial();
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

Socket2Serial = function () {
	sp.on("open", function () {
		console.log("open");
		if (globalSocket !== 'undefined') {
			globalSocket.on("xy", function(data){
				console.log(data);
				var dataString = "{\"pos\":{\"x\":"+data.pos.x +",\"y\": "+data.pos.y+ "}}\n";
				console.info(dataString);
				sp.write(dataString, function(err, results) {
				    console.log('err ' + err);
				    console.log('results ' + results);
				  });
			});
		}
	});
	
};

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