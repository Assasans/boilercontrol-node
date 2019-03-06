const sprintf = require('sprintf-js').sprintf;
const chalk = require('chalk');

module.exports.Utils = function() {
	this.log = function(message, module, show_time) {
		var result = String();

		if((show_time === undefined) || (show_time === true)) {
			result += sprintf(
				chalk.white("[%s] "),
				this.formatTime()
			);
		}

		if(module === undefined) {
			result += chalk.keyword('lime').bold("[Application]: ");
		} else {
			result += chalk.keyword('lime').bold(sprintf("[%s]: ", module));
		}

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