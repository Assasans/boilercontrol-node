var express = require('express');

var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const http_port = 1337;

const sprintf = require('sprintf-js').sprintf;
const chalk = require('chalk');

const websocket = require('./websocket');
var utils = require('./utils');
utils = new utils.Utils();

utils.log(
	sprintf(
		"%s %s %s",
		chalk.yellow.bold("HTTP"),
		chalk.blue("server started on port"),
		chalk.red.bold(http_port)
	)
);

//Keyboard interrupt
process.on('SIGINT', function() {
	utils.log(
		sprintf(
			"%s %s",
			chalk.red.bold("Caught keyboard interrupt!"),
			chalk.yellow("Exiting...")
		)
	);

	//ws_server.stop();

	process.exit();
});

//View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
	src: path.join(__dirname, 'public'),
	dest: path.join(__dirname, 'public'),
	indentedSyntax: false, // true = .sass and false = .scss
	sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404));
});

// error handler
app.use(function(error, request, response, next) {
	// set locals, only providing error in development
	response.locals.message = error.message;
	response.locals.error = request.app.get('env') === 'development' ? error : {};

	// render the error page
	response.status(error.status || 500);
	response.render('error');
});

const ws_server = new websocket.WebSocket(1338);

module.exports = app;
module.exports.http_port = http_port;