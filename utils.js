const app = require('./app');

const sprintf = require('sprintf-js').sprintf;
const chalk = require('chalk');
const Enum = require('enum');

module.exports.Utils = function() {
	this.Level = Object.freeze(new Enum({
		DISABLE: -1,
		DEBUG: 1,
		INFO: 2,
		WARN: 3,
		ERROR: 4,
		FATAL: 5
	}));

	this.log = function(message, module, level, show_time) {
		var result = String();

		if((show_time === undefined) || (show_time === true)) {
			result += sprintf(
				chalk.white("[%s] "),
				this.formatTime()
			);
		}

		if(module === undefined) {
			result += chalk.keyword('lime').bold("[Application]");
		} else {
			result += chalk.keyword('lime').bold(sprintf("[%s]", module));
		}

		switch(level) {
			case this.Level.DEBUG:
				result += chalk.keyword('violet').bold(sprintf(" [%s]", "DEBUG"));
				break;
			case this.Level.INFO:
				result += chalk.keyword('lime').bold(sprintf(" [%s]", "INFO"));
				break;
			case this.Level.WARN:
				result += chalk.keyword('orange').bold(sprintf(" [%s]", "WARN"));
				break;
			case this.Level.ERROR:
				result += chalk.keyword('red').bold(sprintf(" [%s]", "ERROR"));
				break;
			case this.Level.FATAL:
				//Dark red color
				result += chalk.hex(0x8B0000).bold(sprintf(" [%s]", "FATAL"));
				break;
			default:
				break;
		}
		result += chalk.keyword('lime').bold(": ");

		result += message;

		console.log(result);
	};

	/* Using: 
	 *	async function() {
	 *		await sleep(ms);
	 *	}
	*/
	this.sleep = function(ms){
		return new Promise(resolve => {
			setTimeout(resolve,ms)
		});
	};

	this.formatTime = function() {
		var date = new Date();
		return sprintf(
			"%02d:%02d:%02d",
			date.getHours(),
			date.getMinutes(),
			date.getSeconds()
		);
	};
}