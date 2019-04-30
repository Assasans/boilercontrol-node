var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(request, resopnse, next) {
  resopnse.render('index', {
    logged: Math.random() >= 0.5
  });
});

module.exports = router;
