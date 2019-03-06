const WebSocket = require('ws');

const sprintf = require('sprintf-js').sprintf;
const chalk = require('chalk');

var utils = require('./utils');
utils = new utils.Utils();

const moduleName = "WebSocket";
module.exports.WebSocket = function(port) {
	const ws = new WebSocket.Server({
		port: port
	});

	utils.log(
		sprintf(
			"%s %s %s",
			chalk.yellow.bold("WebSocket"),
			chalk.blue("server started on port"),
			chalk.red.bold(port)
		)
	);

	var clients = {}; //Connected clients
	ws.on('connection', function connection(client) {
		var id = clients.length + 1;
		client.send(clients.length);
		clients[id] = client;
		client.send(sprintf("Client %d connected.", id));
		utils.log(
			sprintf("Client %d connected.", id),
			moduleName
		);
		
		client.on('message', function(message) {
			utils.log(
				sprintf("Received: %s", message),
				moduleName
			);
			client.send(sprintf("Echo: %s", message));
		});
		
		client.on('close', function() {
			utils.log(
				sprintf("Client %d disconnected.", id),
				moduleName
			);
			delete clients[id];
		});
	});
};