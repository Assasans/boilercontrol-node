var ws;

function connect() {
	ws = new WebSocket("ws://assasans.local:1338/");

	ws.onopen = function() {
		console.log("Connection opened.");
	};

	ws.onclose = function() {
		console.log("Connection closed.");
	};

	ws.onmessage = function(event) {
		console.log(`Message: ${event}`);
	};
}