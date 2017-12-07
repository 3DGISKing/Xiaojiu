var logger = require('../utils/logger');

var db = require('../utils/db');
var configs = require(process.argv[2]);

//init db pool.
db.init(configs.mysql());

var config = configs.manager_server();
var as = require('./manager_server');
as.start(config);

process.on('uncaughtException', function (err) {
    logger.log(' Caught exception: ' + err.stack, "0000000_manager_server_exception");
    logger.log("manager server exited", "exception");
    process.exit(1);
});