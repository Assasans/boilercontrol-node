var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(request, response, next) {
	console.log("Entry point of GET('/users')");
	//if((request.vhost.length !== 1) && (!/boiler/i.test(request.vhost[1]))) return;
	var value = Math.round(Math.random() * 10000);

	console.log(sprintf("Number: %d", value));
	response.send(sprintf("Random number: %d", value));
});

module.exports = router;
