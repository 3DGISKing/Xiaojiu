var client_service = require("./client_service");
var room_service = require("./room_service");

var configs = require(process.argv[2]);
var config = configs.hall_server();

var db = require('../utils/db');
db.init(configs.mysql());

client_service.start(config);
room_service.start(config);

var logger = require('../utils/logger');

process.on('uncaughtException', function (err) {
    logger.log(' Caught exception: ' + err.stack, "exception.log");
});