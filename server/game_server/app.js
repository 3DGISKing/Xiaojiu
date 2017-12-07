var http_service = require("./http_service");
var socket_service = require("./socket_service");

//从配置文件获取服务器信息
var configs = require(process.argv[2]);
var config = configs.game_server();

var db = require('../utils/db');
db.init(configs.mysql());

db.clear_room_table();
db.clear_room_id_of_users();
db.clear_history_of_users();

//开启HTTP服务
http_service.start(config);

//开启外网SOCKET服务
socket_service.start(config);

var logger = require('../utils/logger');

process.on('uncaughtException', function (err) {
    logger.log(' Caught exception: ' + err.stack, "0000000_game_server_exception");
});

