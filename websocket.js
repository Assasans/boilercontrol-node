const app = require('./app');

const WebSocket = require('ws');

const sprintf = require('sprintf-js').sprintf;
const uuidv4 = require('uuid/v4');
const chalk = require('chalk');
const Enum = require('enum');

const moduleName = "WebSocket";
module.exports.WebSocket = function(port) {
	const ClientType = new Enum({
		Unknown: 0,

		MCU: 1,
		Web: 2,
		PC: 3,
		Mobile: 4,
	});

	const ws = new WebSocket.Server({
		port: port
	});

	app.utils.log(
		sprintf(
			"%s %s %s",
			chalk.yellow.bold("WebSocket"),
			chalk.blue("server started on port"),
			chalk.red.bold(port)
		),
		undefined,
		app.utils.Level.INFO
	);

	var clients = new Array(); //Connected clients
	ws.on('connection', function connection(client, request) {
		var length = clients.length || 0;
		var uuid = uuidv4();
		var clientInfo = {
			uuid: uuid,
			api: null, //Work in progress
			ip: request.connection.remoteAddress
		};
		var clientObject = {
			info: clientInfo,
			instance: client
		};

		clients[uuid] = clientObject;

		client.send(sprintf("Client [%s => %s] connected.", clientObject.info.uuid, clientObject.info.ip));
		app.utils.log(
			sprintf("Client [%s => %s ] connected.", clientObject.info.uuid, clientObject.info.ip),
			moduleName,
			app.utils.Level.DEBUG
		);
		
		client.on('message', function(message) {
			app.utils.log(
				sprintf("Received: %s", message),
				moduleName,
				app.utils.Level.DEBUG
			);
			app.api.handleCommand(message, client, clientInfo);
		});
		
		client.on('close', function() {
			app.utils.log(
				sprintf("Client [%s => %s] disconnected.", clientObject.info.uuid, clientObject.info.ip),
				moduleName,
				app.utils.Level.DEBUG
			);
			
			delete clients[uuid];
		});
	});
};