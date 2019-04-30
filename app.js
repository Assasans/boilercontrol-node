/* Basic I/O */
const sprintf = require('sprintf-js').sprintf;
const chalk = require('chalk');
const readline = require('readline');

/* Shared code */
var utils = require('./utils');
utils = new utils.Utils();
module.exports.utils = utils;

utils.log(
	sprintf(
		"%s",
		chalk.blue("Loading libraries, please wait...")
	),
	undefined,
	utils.Level.INFO
);

const express = require('express');

const createError = require('http-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs = require('express-handlebars');

const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

//Local
const websocket = require('./websocket');

var api = require('./api');
api = new api.API();
module.exports.api = api;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

utils.log(
	sprintf(
		"%s",
		chalk.blue("Done!")
	),
	undefined,
	utils.Level.INFO
);

const bcrypt = require('bcrypt');
rl.on('line', (input) => {
	bcrypt.hash(input, 10, function(error, hash) {
		if(error) throw error;
		console.log(
			sprintf(
				"Hash (%s): %s",
				input,
				hash
			)
		);
	});
});

utils.log(
	sprintf(
		"%s %s %s",
		chalk.yellow.bold("HTTP"),
		chalk.blue("server started on port"),
		chalk.red.bold(process.env.HTTP_PORT || 1337)
	),
	undefined,
	utils.Level.INFO
);

//Keyboard interrupt
rl.on('SIGINT', function() {
	utils.log(
		sprintf(
			"%s %s",
			chalk.red.bold("Caught keyboard interrupt!"),
			chalk.yellow("Exiting...")
		),
		undefined,
		utils.Level.INFO
	);

	rl.close();
	api.close();
	//ws_server.stop();

	process.exit();
});

//View engine setup
//const views = path.join(__dirname, 'views');
//app.set('views', views);
app.set('view engine', 'hbs');
app.engine('hbs', hbs({
	extname: 'hbs', 
	defaultLayout: 'layout', 
	layoutsDir: path.join(__dirname, 'views'),
	partialsDir: [
		//  path to your partials
		path.join(__dirname, 'views/partials'),
	]
}));

//app.use(logger('dev')); //Request logger
//app.use(express.json());
app.use(bodyParser.json());
app.use(methodOverride());

app.use(express.urlencoded({
	extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(request, response, next) {
	next(createError(404));
});

//Error handler
app.use(errorHandler);
function errorHandler(error, request, response, next) {
	response.status(error.status || 500);
  response.render('error', {
		error: error,
		layout: false
	});
}

const ws_server = new websocket.WebSocket(process.env.WS_PORT || 1338);
api.open();

module.exports = app;