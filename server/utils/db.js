var logger = require('./logger');
var mysql=require("mysql");  
var crypto = require('./crypto');
var assert = require('assert');

var pool = null;

function nop(a,b,c,d,e,f,g){

}
  
function query(sql,callback){  
    pool.getConnection(function(err,conn){  
        if(err){  
            callback(err,null,null);  
        }else{  
            conn.query(sql,function(qerr,vals,fields){  
                //释放连接  
                conn.release();  
                //事件驱动回调  

                callback(qerr,vals,fields);
            });  
        }  
    });  
}

exports.init = function(config){
    pool = mysql.createPool({  
        host: config.HOST,
        user: config.USER,
        password: config.PSWD,
        database: config.DB,
        port: config.PORT,
        charset: 'utf8mb4'
    });
};

exports.is_account_exist = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(false);
        return;
    }

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }
        else{
            if(rows.length > 0){
                callback(true);
            }
            else{
                callback(false);
            }
        }
    });
};

exports.create_account = function(account,password,callback){
    callback = callback == null? nop:callback;
    if(account == null || password == null){
        callback(false);
        return;
    }

    var psw = crypto.md5(password);
    var sql = 'INSERT INTO t_accounts(account,password) VALUES("' + account + '","' + psw + '")';
    query(sql, function(err, rows, fields) {
        if (err) {
            if(err.code == 'ER_DUP_ENTRY'){
                callback(false);
                return;         
            }
            callback(false);
            throw err;
        }
        else{
            callback(true);            
        }
    });
};

exports.get_account_info = function(account,password,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }  

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }
        
        if(rows.length == 0){
            callback(null);
            return;
        }
        
        if(password != null){
            var psw = crypto.md5(password);
            if(rows[0].password == psw){
                callback(null);
                return;
            }    
        }

        callback(rows[0]);
    }); 
};

exports.is_user_exist = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(false);
        return;
    }

    var sql = 'SELECT userid FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        if(rows.length == 0){
            callback(false);
            return;
        }

        callback(true);
    });  
};

exports.get_user_data = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'SELECT userid,account,isvalid,onlinedate,name,sex,lv,coins,gems,roomid, dealer_id FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0]);
    });
};

exports.get_user_data_by_userid = function(userid, callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_users WHERE userid = ' + userid;
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};

/**增加玩家房卡 */
exports.add_user_gems = function(userid,gems,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(false);
        return;
    }
    
    var sql = 'UPDATE t_users SET gems = gems +' + gems + ' WHERE userid = ' + userid;

    query(sql,function(err,rows,fields){
        if(err){
            logger.log(err);
            callback(false);
            return;
        }
        else{
            callback(rows.affectedRows > 0);
            return; 
        } 
    });
};

exports.get_gems = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'SELECT gems FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0]);
    });
};

exports.get_gems_by_userid = function(userid,callback){
    callback = callback == null? nop:callback;

    if(userid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT gems FROM t_users WHERE userid = "' + userid + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0]);
    });
};

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.get_user_history = function(userid,callback){
    callback = callback == null? nop:callback;

    if(userid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT history FROM t_users WHERE userid = "' + userid + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        var history = rows[0].history;

        if(history == null || history == ""){
            callback(null);    
        }
        else{
            if (isJsonString(history) == true) {
                callback(JSON.parse(history));
            }
            else
            {
                logger.log("history error. userId: " + userid, "000000_history_error");
                callback(null);
            }
        }
    });
};

exports.get_charge_history = function(userid, callback){
    callback = callback == null? nop:callback;

    if(userid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT id, total_amount, status, created_at FROM t_orders WHERE user_id = "' + userid + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log( err);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows);
    });
};

exports.update_user_history = function(userid,history,callback){
    callback = callback == null? nop:callback;
    if(userid == null || history == null){
        callback(false);
        return;
    }

    history = JSON.stringify(history);
    var sql = 'UPDATE t_users SET roomid = null, history = \'' + history + '\' WHERE userid = "' + userid + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            logger.log(err);
            throw err;
        }

        if(rows.length == 0){
            callback(false);
            return;
        }

        callback(true);
    });
};

exports.get_games_of_room = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT game_index,create_time,result FROM t_games_archive WHERE room_uuid = "' + room_uuid + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows);
    });
};

exports.get_detail_of_game = function(room_uuid,index,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null || index == null){
        callback(null);
        return;
    }
    var sql = 'SELECT base_info,action_records FROM t_games_archive WHERE room_uuid = "' + room_uuid + '" AND game_index = ' + index ;

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log( err);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        callback(rows[0]);
    });
};

exports.create_user = function(account,name,coins,gems,sex,headimg,callback){
    callback = callback == null? nop:callback;
    if(account == null || name == null || coins==null || gems==null){
        callback(false);
        return;
    }
    if(headimg){
        headimg = '"' + headimg + '"';
    }
    else{
        headimg = 'null';
    }

    var sql = 'INSERT INTO t_users(account,name,coins,gems,sex,headimg,history,createdate) VALUES("{0}","{1}",{2},{3},{4},{5},"",unix_timestamp(now()))';
    sql = sql.format(account,name,coins,gems,sex,headimg);

    query(sql, function(err, rows, fields) {
        if (err) {
            throw err;
        }
        callback(true);
    });
};

exports.update_user_info = function(account,name,headimg,sex,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }
 
    if(headimg){
        headimg = '"' + headimg + '"';
    }
    else{
        headimg = 'null';
    }

    var sql = 'UPDATE t_users SET name="{0}",headimg={1},sex={2} WHERE account="{3}"';

    sql = sql.format(name,headimg,sex,account);

    query(sql, function(err, rows, fields) {
        if (err) {
            throw err;
        }
        callback(rows);
    });
};
exports.update_user_onlinedate = function(account,onlinedate,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET onlinedate="{0}" WHERE account="{1}"';
    sql = sql.format(onlinedate,account);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.get_user_base_info = function(userid,callback){
    callback = callback == null? nop:callback;

    if(userid == null){
        callback(null);
        return;
    }
    var sql = 'SELECT name,sex,headimg FROM t_users WHERE userid={0}';
    sql = sql.format(userid);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};
exports.is_room_exist = function(roomId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT * FROM t_rooms WHERE id = "' + roomId + '"';

    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            logger.log(err);
            throw err;
        }
        else{
            callback(rows.length > 0);
        }
    });
};

exports.cost_gems = function(userid, cost, roomId, callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_users SET gems = gems -' + cost + ' WHERE userid = ' + userid;

    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            logger.log(err, roomId);
            throw err;
        }
        else{
            logger.log("userId: " + userid + " decrease gem by " + cost, roomId);

            callback(rows.length > 0);
        }
    });
};

exports.set_room_id_of_user = function(userid,roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId != null){
        roomId = '"' + roomId + '"';
    }

    var sql = 'UPDATE t_users SET roomid = '+ roomId + ' WHERE userid = "' + userid + '"';

    query(sql, function(err, rows, fields) {
        if(err){
            logger.log(err);
            callback(false);
            logger.log(err);
            throw err;
        }
        else{
            callback(rows.length > 0);
        }
    });
};

exports.get_room_id_of_user = function(userid,callback){
    callback = callback == null? nop:callback;

    var sql = 'SELECT roomid FROM t_users WHERE userid = "' + userid + '"';

    query(sql, function(err, rows, fields) {
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            if(rows.length > 0){
                callback(rows[0].roomid);
            }
            else{
                callback(null);
            }
        }
    });
};

exports.create_room = function(roomId,conf,ip,port,create_time,callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_rooms(uuid,id,base_info,ip,port,create_time,num_of_turns,next_button,user_id0,user_icon0,user_name0,user_score0, \
                                   user_id1, user_icon1,user_name1,user_score1,user_id2, user_icon2,user_name2,user_score2,user_id3, user_icon3,user_name3,user_score3, \
                                   user_id4, user_icon4,user_name4,user_score4,user_id5, user_icon5,user_name5,user_score5)\
                VALUES('{0}','{1}','{2}','{3}',{4},{5},0,0,0,'','',0,0,'','',0,0,'','',0,0,'','',0,0,'','',0,0,'','',0)";

    var uuid = Date.now() + roomId;
    var baseInfo = JSON.stringify(conf);
    sql = sql.format(uuid,roomId,baseInfo,ip,port,create_time);

    query(sql,function(err,row,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(uuid);
        }
    });
};
exports.get_room_uuid = function(roomId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT uuid FROM t_rooms WHERE id = "' + roomId + '"';

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(rows[0].uuid);
        }
    });
};

exports.update_seat_info = function(roomId,seatIndex,userid,icon,name,callback){
    callback = callback == null? nop:callback;

    var sql = 'UPDATE t_rooms SET user_id{0} = {1},user_icon{0} = "{2}",user_name{0} = "{3}" WHERE id = "{4}"';

    sql = sql.format(seatIndex,userid,icon,name,roomId);

    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            callback(true);
        }
    });
};

exports.update_num_of_turns = function(roomId,numOfTurns,callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_rooms SET num_of_turns = {0} WHERE id = "{1}"';
    sql = sql.format(numOfTurns,roomId);

    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            callback(true);
        }
    });
};


exports.update_next_button = function(roomId,nextButton,callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_rooms SET next_button = {0} WHERE id = "{1}"';
    sql = sql.format(nextButton,roomId);

    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            callback(true);
        }
    });
};

//callback 파라메터
//param1   성공이면 true 실패이면 false
//param2   room과 관련된 게임봉사기 ip
//param3   port

exports.get_room_addr = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(false,null,null);
        return;
    }

    var sql = 'SELECT ip,port FROM t_rooms WHERE id = "' + roomId + '"';

    query(sql, function(err, rows, fields) {
        if(err){
            callback(false,null,null);
            logger.log( err);
            throw err;
        }
        if(rows.length > 0){
            callback(true,rows[0].ip,rows[0].port);
        }
        else{
            callback(false,null,null);
        }
    });
};
exports.get_room_data = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_rooms WHERE id = "' + roomId + '"';

    query(sql, function(err, rows, fields) {
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        if(rows.length > 0){
            callback(rows[0]);
        }
        else{
            callback(null);
        }
    });
};
exports.delete_room = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(false);
    }
    var sql = "DELETE FROM t_rooms WHERE id = '{0}'";
    sql = sql.format(roomId);

    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            callback(true);
        }
    });

    var sqlDeleteAvailableRoom = "DELETE FROM t_available_rooms WHERE room_id = '{0}'";
    sqlDeleteAvailableRoom = sqlDeleteAvailableRoom.format(roomId);

    query(sqlDeleteAvailableRoom,function(err,rows,fields){
        if(err){
            // callback(false);
            logger.log( err);
            throw err;
        }
        else{
            // callback(true);
        }
    });

};

exports.create_game = function(room_uuid,index,base_info,createTime, result, roomid, numOfGames, callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_games(room_uuid,game_index,base_info,create_time, end_time, result, room_id, num_of_turns) VALUES('{0}',{1},'{2}',{3},unix_timestamp(now()),'{4}','{5}',{6})";
    sql = sql.format(room_uuid,index,base_info,createTime,result, roomid, numOfGames);

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(rows.insertId);
        }
    });
};
exports.delete_games = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(false);
    }    
    var sql = "DELETE FROM t_games WHERE room_uuid = '{0}'";
    sql = sql.format(room_uuid);

    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            callback(true);
        }
    });
};
exports.archive_games = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(false);
    }
    var sql = "INSERT INTO t_games_archive(SELECT * FROM t_games WHERE room_uuid = '{0}')";
    sql = sql.format(room_uuid);

    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            exports.delete_games(room_uuid,function(ret){
                callback(ret);
            });
        }
    });
};

exports.update_game_action_records = function(room_uuid,index,actions,callback){
    callback = callback == null? nop:callback;
    var sql = "UPDATE t_games SET action_records = '"+ actions +"' WHERE room_uuid = '" + room_uuid + "' AND game_index = " + index ;

    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            callback(true);
        }
    });
};
exports.update_game_result = function(room_uuid,index,result,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null || result){
        callback(false);
    }
    
    result = JSON.stringify(result);
    var sql = "UPDATE t_games SET result = '"+ result +"' WHERE room_uuid = '" + room_uuid + "' AND game_index = " + index ;

    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            callback(true);
        }
    });
};
exports.get_message = function(type,version,callback){
    callback = callback == null? nop:callback;
    
    var sql = 'SELECT * FROM t_message WHERE type = "'+ type + '"';
    
    if(version == "null"){
        version = null;
    }
    
    if(version){
        version = '"' + version + '"';
        sql += ' AND version != ' + version;   
    }
     
    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            logger.log( err);
            throw err;
        }
        else{
            if(rows.length > 0){
                callback(rows[0]);    
            }
            else{
                callback(null);
            }
        }
    });
};

///////终端管理相关函数
exports.read_user_account = function(adminId, adminPwd, token, callback){
    callback = callback == null? nop:callback;

    if((adminId == null || adminPwd== null) && token == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_users WHERE ';

    if (token != null){
        sql = sql + 'token="{0}"';
        sql = sql.format(token);
    } else {
        sql = sql +'id="{0}" and pwd="{1}"';
        sql = sql.format(adminId, adminPwd);
    }
     
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        logger.log( rows);
        callback(rows);
    });
};

exports.update_token = function(account, token, callback){
    callback = callback == null? nop:callback;

    if(account == null || token== null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET token="{0}" WHERE account="{1}"';
    sql = sql.format(token,account);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};


exports.update_valid_state = function(userid, enable, callback){
    callback = callback == null? nop:callback;
    if(userid == null || enable== null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET isvalid="{0}" WHERE userid="{1}"';
    sql = sql.format(enable,userid);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};


exports.read_user_info = function(userid, callback){
    callback = callback == null? nop:callback;

    if(userid == null){
        callback(null);
        return;
    }
    
    var sql = 'SELECT * from t_users ' + 'WHERE userid="{0}"';
    sql = sql.format(userid);
    
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.update_coins = function(userid, newCoins, type, callback){
    callback = callback == null? nop:callback;
    if(userid == null || newCoins== null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET ' + type + '="{0}" WHERE userid="{1}"';
    sql = sql.format(newCoins,userid);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};
exports.update_password = function(userid, newPwd, callback){
    callback = callback == null? nop:callback;

    if(userid == null || newPwd== null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET pwd="{0}" WHERE userid="{1}"';
    sql = sql.format(newPwd,userid);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.read_system_info = function(callback){
    callback = callback == null? nop:callback;
    var sql = 'select * from t_message';
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.update_system_info = function(type, value, callback){
    callback = callback == null? nop:callback;
    var sql = 'update t_message SET msg="{0}", version = version+1 WHERE type="{1}"';
    sql = sql.format(value,type);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.read_user_list = function(account, order_by, userId, nickname, level, callback){
    callback = callback == null? nop:callback;

    if(account == null){
        callback(null);
        return;
    }
    
    var sql = 'SELECT * from t_users '
    + 'WHERE account!="{0}"' + ' and lv >= "{4}" and userid like "%{1}%" and name like "%{2}%" order by {3} ';
    sql = sql.format(account, userId, nickname, order_by, level);
    
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.exist_agent_bind_request = function(try_userid, userid,  callback){
    callback = callback == null? nop:callback;

    var sql = 'SELECT * from t_agent_bind WHERE userid="{0}"' + ' AND userid_bind = "{1}"';
    sql = sql.format(try_userid, userid);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            logger.log(err);
            throw err;
        }

        if (rows.length > 0) {
            callback(true);
        }
        else {
            callback(false);
        }
    });
};

exports.update_valid_state = function(userId, enable, callback){
    callback = callback == null? nop:callback;

    if(userId == null || enable== null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET isvalid="{0}" WHERE userId="{1}"';
    sql = sql.format(enable,userId);
    logger.log( sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.read_user_info = function(userId, callback){
    callback = callback == null? nop:callback;

    if(userId == null){
        callback(null);
        return;
    }
    
    var sql = 'SELECT userid,id,pwd,isvalid,account,lv,onlinedate,createdate,name,sex,headimg,coins,gems,roomid from t_users '
    +'WHERE userid="{0}"';
    sql = sql.format(userId);
    
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.update_password = function(userId, newPwd, callback){
    callback = callback == null? nop:callback;
    if(userId == null || newPwd== null){
        callback(null);
        return;
    }
    var sql = 'UPDATE t_users SET pwd="{0}" WHERE userid="{1}"';
    sql = sql.format(newPwd,userId);
    logger.log( sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};
exports.read_system_info = function(callback){
    callback = callback == null? nop:callback;
    var sql = 'select * from t_message';
    logger.log( sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};
exports.update_system_info = function(type, value, callback){
    callback = callback == null? nop:callback;
    var sql = 'update t_message SET msg="{0}", version = version+1 WHERE type="{1}"';
    sql = sql.format(value,type);
    logger.log( sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};
exports.create_room_archive = function(uuid,roomId,conf,create_time,ip,port,callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_rooms(uuid,id,base_info,create_time,state,ip,port) \
                VALUES('{0}','{1}','{2}',{3},{4},'{5}',{6})";
    var baseInfo = JSON.stringify(conf);
    sql = sql.format(uuid,roomId,baseInfo,create_time,0/*ready to play, 1:playing, 2:finished*/,ip,port);
    logger.log( sql);
    query(sql,function(err,row,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(uuid);
        }
    });
};
exports.update_room_archive = function(uuid,endTime,state,seats,callback){
    callback = callback == null? nop:callback;
    var sql = "";
    if (seats == null){
        sql = "update t_rooms set end_time={0},state={1} where uuid='{2}'";
        sql = sql.format(endTime,state,uuid);
    } else {
        var sql = "update t_rooms set end_time={0},state={1},seats='{2}' where uuid='{3}'";
        var seats_info = JSON.stringify(seats);
        sql = sql.format(endTime,state,seats_info,uuid);
    }
    logger.log( sql);
    query(sql,function(err,row,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(row);
        }
    });
};
exports.update_chuji_account = function(userid, id, pwd, enable, callback){
    callback = callback == null? nop:callback;

    if(userid == null || enable== null || id== null || pwd== null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET id="{0}", pwd="{1}", lv={2} WHERE userid="{3}"';
    sql = sql.format(id, pwd, parseInt(enable),userid);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.count_of_users = function(startDate, endDate, callback){
    callback = callback == null? nop:callback;

    if(startDate == null || endDate== null){
        callback(null);
        return;
    }

    var sql = 'select createdate from t_users where createdate > "{0}" and createdate < "{1}"';
    sql = sql.format(startDate, endDate);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    }); 
};

exports.count_of_rooms = function(sdt, edt,callback){
    callback = callback == null? nop:callback;

    if(sdt == null || edt== null ){
        callback(null);
        return;
    }

    var sql = 'select create_time from t_games where create_time > {0} and create_time < {1} ';
    sql = sql.format(sdt, edt);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.in_of_amount = function(sdt, edt, callback){
    callback = callback == null? nop:callback;

    if(sdt == null || edt== null ){
        callback(null);
        return;
    }

    var sql = 'select total_amount,created_at from t_orders where status = "success" and created_at > {0} and created_at < {1}';
    sql = sql.format(sdt, edt);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.out_of_amount = function(sdt, edt,callback){
    callback = callback == null? nop:callback;

    if(sdt == null || edt== null ){
        callback(null);
        return;
    }

    var sql = 'select amount, permit_date from t_payment where status="{0}"';

    sql = sql.format(1);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};


exports.manual_charge_of_amount = function(sdt, edt, callback){
    callback = callback == null? nop : callback;

    if(sdt == null || edt== null ){
        callback(null);
        return;
    }

    var sql = 'SELECT (after_gem - before_gem) AS amount, datetime FROM t_manual_charge_history';

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.get_goods = function(gems, callback){
    callback = callback == null? nop:callback;

    if(gems == null){
        callback(null);
        return;
    }

    var sql = "SELECT * FROM t_goods WHERE gems='{0}';".format(gems);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows[0]);
    });
};

exports.get_order_by_id = function(order_id, callback){
    callback = callback == null? nop:callback;

    var sql = "SELECT *, o.id as id FROM t_orders AS o INNER JOIN t_goods AS g ON o.goods_id=g.id WHERE o.id='{0}';".format(order_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            callback(null, err);
        }
        if(rows && rows.length > 0){
            callback(rows[0]);
        }
        else {
            callback(null);
        }
    });
};

exports.create_order = function(order_info, callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_orders(goods_name, goods_id, user_id, status, channel, created_at, total_amount) VALUES('{0}','{1}','{2}','{3}','{4}','{5}','{6}')";
    sql = sql.format(order_info.goods_name, order_info.goods_id, order_info.user_id, order_info.status, order_info.channel, order_info.created_at, order_info.total_amount);

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(rows.insertId);
        }
    });
};

exports.update_user_gem_and_charge_amount = function (user_id, gems, charge_amount) {
    if(user_id == null || gems== null){
        return;
    }

    var sql = "UPDATE t_users SET gems='{0}', charge_amount='{1}' WHERE userid='{2}'";
    sql = sql.format(gems, charge_amount, user_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
    });
};

exports.update_goods_sales = function (goods_id, sales) {
    if(goods_id == null || sales== null){
        return;
    }

    var sql = "UPDATE t_goods SET sales='{0}' WHERE id='{1}'";
    sql = sql.format(sales,goods_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
    });
};

exports.update_order_results = function (order_id, status, buyer_id, trade_no) {
    if(order_id == null || status == null){
        return;
    }

    var sql = "UPDATE t_orders SET status='{0}', buyer_id='{1}', trade_no='{2}' WHERE id='{3}'";
    sql = sql.format(status, buyer_id, trade_no,order_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
    });
};

exports.update_order_results_by_order_id = function (order_id, status) {
    if(order_id == null || status == null){
        return;
    }

    var sql = "UPDATE t_orders SET status='{0}' WHERE id='{1}'";
    sql = sql.format(status, order_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
    });
};


exports.is_userId_exist = function(userId,callback){
    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = 'SELECT * FROM t_users WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }
        else{
            if(rows.length > 0){
                callback(true);
            }
            else{
                callback(false);
            }
        }
    });
};

exports.get_dealer_level = function(userId, callback){
    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = 'SELECT lv FROM t_users WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0].lv);
    });
};

exports.update_user_dealer_id = function(userId, dealerId, callback){
    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = 'UPDATE t_users SET dealer_id = ' + dealerId + ' WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }

        if(rows.length == 0){
            callback(false);
            return;
        }

        callback(true);
    });
};

exports.update_user_valance = function(userId, valance, callback){
    console.log("update_user_valance userId: " + userId + " valance: " + valance);

    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = 'UPDATE t_users SET valance = ' + valance + ' WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }

        if(rows.length == 0){
            callback(false);
            return;
        }

        callback(true);
    });
};

exports.update_dealer_level = function(userId,level,callback){
    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = 'UPDATE t_users SET lv = ' + level + ' WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            logger.log(err);
            throw err;
        }

        if(rows.length == 0){
            callback(false);
            return;
        }

        callback(true);
    });
};

exports.set_default_id_and_pwd = function(userId, callback){
    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = "UPDATE t_users SET id = '{0}', pwd = '123456' WHERE userid = {1}";

    sql = sql.format(userId, userId);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
    });
};

exports.update_dealer_id_input_time = function(userId){
    assert.notEqual(userId, null);

    var sql = 'UPDATE t_users SET dealer_id_input_time = unix_timestamp(now()) ' + 'WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
    });
};

exports.update_dealer_become_time = function(userId){
    assert.notEqual(userId, null);

    var sql = 'UPDATE t_users SET dealer_become_time = unix_timestamp(now()) ' + 'WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
    });
};

exports.get_dealer_id = function(userId, callback){
    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = 'SELECT dealer_id FROM t_users WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0].dealer_id);
    });
};

exports.get_valance = function(userId, callback){
    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = 'SELECT valance FROM t_users WHERE userid = "' + userId + '"';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0].valance);
    });
};

exports.get_parent_dealer_id = function(userId, callback){
    assert.notEqual(userId, null);

    callback = callback == null? nop:callback;

    var sql = 'SELECT parent_dealer_id FROM t_users WHERE userid = "{0}"';
    sql=sql.format(userId);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0].parent_dealer_id);
    });
};

exports.create_dealer_profit_record = function(dealerId, providerId, amount, chargeAmount, type, callback){
    callback = callback == null? nop:callback;

    var time = Math.ceil(Date.now()/1000);

    var sql = 'INSERT INTO t_dealer_profit(dealer_id, provider_id, time, amount, charge_amount, type) VALUES("' + dealerId + '","' + providerId +  '","' + time + '","' +  amount + '","' + chargeAmount  +'","' + type  +'")';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }
        else{
            callback(true);
        }
    });
};

function getProfitRateFromDealerLevel(level) {
    if (level == 1) {
        return 0.4;
    }
    else if (level == 2) {
        return 0.5;
    }
    else if (level == 3) {
        return 0.6;
    }
    //admin
    else if (level == 4) {
        return 0.6;
    }
    else {
        throw new Error('internal error!');
    }
}

function update_dealer_dealer_profit(dealerId, amount) {
    exports.get_parent_dealer_id(dealerId, function (parentDealerId) {
        if (parentDealerId == null || parentDealerId == 0){
            return;
        }

            exports.get_dealer_level(dealerId, function (level) {

            var childDealerLevel = level;

            exports.get_dealer_level(parentDealerId, function (level) {
                var parentDealerLevel = level;

                var rate1 = getProfitRateFromDealerLevel(childDealerLevel);
                var rate2 = getProfitRateFromDealerLevel(parentDealerLevel);

                var profit = amount * (rate2 - rate1);

                exports.get_valance(parentDealerId, function (valance) {
                    valance += profit;

                    exports.update_user_valance(parentDealerId, valance);
                });

                //type: 1 means dealer - dealer profit
                exports.create_dealer_profit_record(parentDealerId, dealerId, profit, amount, 1);

                update_dealer_dealer_profit(parentDealerId, amount);
            });
        });
    });
}

exports.update_dealer_profit = function (userId, chargeAmount) {
    exports.get_dealer_id(userId, function(dealerId) {
        if (dealerId == null) {
            return;
        }

        exports.get_dealer_level(dealerId, function (dealerLevel) {
            if (dealerLevel == 0 || dealerLevel == null) {
                return;
            }

            var rate = getProfitRateFromDealerLevel(dealerLevel);

            var profit = chargeAmount * rate;

            //type: 0 means customer - dealer relation profit
            exports.create_dealer_profit_record(dealerId, userId, profit, chargeAmount, 0);

            exports.get_valance(dealerId, function(valance) {
                valance += profit;

                exports.update_user_valance(dealerId, valance);
            });

            update_dealer_dealer_profit(dealerId, chargeAmount);
        });
    }) ;
};

exports.clear_room_table = function(callback){
    callback = callback == null? nop:callback;

    var sql = 'truncate t_rooms';

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }
        else{
            callback(true);
        }
    });
    var sqlClearAvailableRooms = 'truncate t_available_rooms';

    query(sqlClearAvailableRooms, function(err, rows, fields) {
        if (err) {
            // callback(false);
            throw err;
        }
        else{
            // callback(true);
        }
    });
};

exports.clear_room_id_of_users = function (callback) {
    callback = callback == null? nop: callback;

    var sql = "UPDATE t_users SET roomid = null";

    query(sql, function(err) {
        if (err) {
            callback(false);
            logger.error(err);
            return;
        }

        callback(true);
    });
};

exports.clear_history_of_users = function (callback) {
    callback = callback == null? nop: callback;

    var sql = "UPDATE t_users SET history = ''";

    query(sql, function(err) {
        if (err) {
            callback(false);
            logger.error(err);
            return;
        }

        callback(true);
    });
};

exports.insert_available_room = function (userId, roomId, callback) {
    var sql = "INSERT INTO t_available_rooms (user_id, room_id) SELECT * FROM (SELECT '{0}', '{1}') AS tmp WHERE NOT EXISTS ( SELECT room_id FROM t_available_rooms WHERE room_id = '{1}' AND user_id='{0}' )";
    sql = sql.format(userId, roomId);

    query(sql, function(err, rows, fields){
        if(callback){
            callback(rows, err);
        }
    })
};

exports.get_available_rooms_by_user_account = function (account, callback) {
    var sql = "SELECT *, R.id as id FROM t_rooms as R INNER JOIN t_available_rooms as A ON R.id = A.room_id INNER JOIN t_users as U ON A.user_id = U.userid WHERE U.account = '" + account + "';";
    query(sql, function(err, rows, fields){
        if(callback){
            callback(rows, err);
        }
    });
};

exports.read_manual_charge_history = function(order_by, userId, callback) {
    callback = callback == null? nop : callback;

    var sql = 'SELECT t_manual_charge_history.id, t_users.headimg, t_users.userid, t_users.name, t_users.lv,\
                      t_manual_charge_history.before_gem, t_manual_charge_history.after_gem, t_manual_charge_history.datetime \
                      FROM t_manual_charge_history, t_users \
                      WHERE t_users.userid = t_manual_charge_history.userid AND t_users.userid LIKE "%{0}%" ORDER BY {1}';

    sql = sql.format(userId, order_by);

    query(sql, function (err, rows, fields) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.read_transaction=function(order_by, userId, callback) {
    callback = callback == null? nop:callback;

    var sql= 'SELECT t_orders.id, t_users.headimg, t_orders.user_id, t_users.name, ' +
             't_users.lv, t_orders.created_at, t_orders.total_amount, ' +
             't_users.valance, t_orders.status FROM t_users, t_orders WHERE t_users.userid = t_orders.user_id AND t_users.userid like "%{0}%" order by {1}';

    sql = sql.format(userId, order_by);

    query(sql,function (err,rows,fields) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.update_bind = function(userId, parent_dealer_id, callback){
    callback = callback == null? nop:callback;
    if(userId == null || parent_dealer_id== null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET parent_dealer_id="{0}" WHERE userid="{1}"';
    sql = sql.format(parent_dealer_id,userId);
    logger.log( sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.read_agent_promote_request_list = function(userId, callback){
    callback = callback == null? nop:callback;

    if(userId == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_agent WHERE userid = "{0}"';
    sql = sql.format(userId);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(sql);
            throw err;
        }
        else{
            callback(rows);
        }
    });
};

exports.read_agent_promote_unallowed_request_list = function(userId, callback){
    callback = callback == null? nop:callback;

    if(userId == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_agent WHERE userid = "{0}" AND status = 0';
    sql = sql.format(userId);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(sql);
            throw err;
        }
        else{
            callback(rows);
        }
    });
};

exports.read_agent_promote = function(order_by, userId, callback) {
    callback = callback == null? nop:callback;

    var sql;

    if (userId != "") {
        sql = 'SELECT a.userid,a.current_level,a.request_level,a.status,a.rowno,a.request_date,u.headimg,u.name FROM t_agent AS a INNER JOIN t_users AS u ON a.userid=u.userid' + ' WHERE a.userid = {0} ORDER BY {1}';
        sql = sql.format(userId, order_by);
    }
    else {
        sql = 'SELECT a.userid,a.current_level,a.request_level,a.status,a.rowno,a.request_date,u.headimg,u.name FROM t_agent AS a INNER JOIN t_users AS u ON a.userid=u.userid' + ' ORDER BY {0}';
        sql = sql.format(order_by);
    }

    query(sql,function (err, rows, fields) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.update_promote_account = function(userId, level, callback){
    callback = callback == null? nop:callback;
    if(userId == null || level== null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET lv="{0}" WHERE userid="{1}"';
    sql = sql.format(level,userId);
    logger.log( sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.update_promote_status=function (id,callback) {
    callback = callback == null? nop:callback;

    if(id == null ){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_agent SET status="1" WHERE rowno="{0}"';
    sql = sql.format(id);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.update_user_promote_request=function(userId,level,requestLevel,requestDate,callback){
    callback=callback==null?nop:callback;

    if(userId==null || level==null || requestLevel==null || requestDate==null){
        callback(null);
        return;
    }

    var sql='INSERT INTO t_agent(userid,current_level,request_level,request_date) VALUES("{0}","{1}","{2}","{3}")';
    sql=sql.format(userId,level,requestLevel,requestDate);

    query(sql,function (err,rows,fields) {
        if(err){
            logger.log(err);
            throw err;
        }
        callback(rows);
    })
};

exports.update_bind_status=function (id,callback) {
    callback = callback == null? nop:callback;

    if(id == null ){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_agent_bind SET status="1" WHERE id="{0}"';
    sql = sql.format(id);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
        callback(rows);
    });
};

exports.read_agent_account=function(id,callback){
    callback = callback == null? nop:callback;

    var sql = 'SELECT * from t_agent '+'WHERE rowno ="{0}"';
    sql=sql.format(id);

    query(sql,function (err,rows,fields) {
        if(err){
            logger.log(sql);
            throw err;
        }
        callback(rows);
    });
};

exports.read_agent_bind = function(order_by, userId, callback) {
    callback = callback == null? nop:callback;

    var sql = 'SELECT * from t_agent_bind ' + 'WHERE userid like "%{0}%" order by {1}';
    sql = sql.format(userId, order_by);

    query(sql, function (err, rows, fields) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.read_agent_bind_table=function(userId, callback){
    callback = callback == null? nop:callback;

    var sql = 'SELECT * from t_agent_bind ' + 'WHERE id="{0}" ';
    sql = sql.format(userId);

    query(sql, function (err,rows,fields) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.update_gems=function (userId, gems, callback) {
    callback = callback == null? nop:callback;

    if(userId == null || gems==null ){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_users SET gems="{0}" WHERE userid="{1}"';
    sql = sql.format(gems,userId);

    query(sql,function (err,rows,fields) {
        if(err){
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.read_payment=function(order_by,userId,callback) {
    callback = callback == null? nop:callback;

    var sql = 'SELECT p.id,u.headimg,u.userid,u.name,u.lv,p.current_amount,p.amount,p.request_date,p.permit_date,status FROM t_payment AS p INNER JOIN t_users AS u ON u.userid=p.userid';
    query(sql, function (err, rows, fields) {
        if(err){
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.read_payment_request = function (id,callback) {
    callback = callback == null ? nop:callback;

    if(id == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_payment WHERE id="{0}"';
    sql = sql.format(id);

    query(sql, function (err, rows, fields) {
        if(err){
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    })
};

exports.update_users_valance=function (userId, valance, callback) {
    callback = callback == null? nop:callback;

    if(userId == null || valance==null ){
        callback(null);
        return;
    }

    var sql='UPDATE t_users SET valance="{0}" WHERE userid="{1}"';
    sql=sql.format(valance, userId);

    query(sql,function (err, rows, fields) {
        if(err){
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.update_payment_status_to_complete = function(id, callback){
    callback = callback == null ? nop : callback;

    if(id == null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_payment SET status="1", permit_date ={0} WHERE id="{1}"';

    var time = Math.ceil(Date.now()/1000);

    sql = sql.format(time, id);

    query(sql,function (err, rows, fields) {
        if(err){
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    })
};

exports.update_user_payment_request=function(userId,amount,requestAmount,requestDate,callback){
    callback=callback==null?nop:callback;

    if(userId==null || amount==null || requestAmount==null || requestDate==null){
        callback(null);
        return;
    }

    var sql='INSERT INTO t_payment(userid,current_amount,amount,request_date) VALUES("{0}","{1}","{2}","{3}")';
    sql=sql.format(userId,amount,requestAmount,requestDate);

    query(sql,function (err,rows,fields) {
        if(err){
            logger.log(err);
            throw err;
        }
        callback(rows);
    })
};

exports.update_user_bind_request=function(userId, parent_dealer_id, requestDate, callback){
    callback=callback==null?nop:callback;

    if(userId==null || parent_dealer_id==null || requestDate==null){
        callback(null);
        return;
    }

    var sql='INSERT INTO t_agent_bind(userid, userid_bind, request_date) VALUES("{0}","{1}","{2}")';
    sql=sql.format(parent_dealer_id,userId,requestDate);

    query(sql,function (err,rows,fields) {
        if(err){
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    })
};

exports.read_room_list = function(roomType, roomId, callback){
    callback = callback == null? nop:callback;

    if( roomType==null ){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_rooms WHERE id LIKE "%{0}%" AND base_info != "" ';

    if (roomType != ""){
        if (roomType == "all"){}
        else if (roomType == "match")
            sql += 'and base_info like \'%"jushuType":1%\' ';
        else if (roomType == "private")
            sql += 'and base_info like \'%"jushuType":2%\' ';
    }

    sql = sql.format(roomId);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.read_game_list = function(roomType, roomId, callback){
    callback = callback == null? nop:callback;

    if(roomType == null ){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_games WHERE room_id LIKE "%{0}%" AND  base_info != "" ';

    if (roomType != ""){
        if (roomType == "all"){}
        else if (roomType == "match")
            sql += 'and base_info like \'%"jushuType":1%\' ';
        else if (roomType == "private")
            sql += 'and base_info like \'%"jushuType":2%\' ';
    }

    sql = sql.format(roomId);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.read_dealer_profit=function (callback) {
    callback = callback == null? nop:callback;

    var sql = 'SELECT d.id,d.dealer_id,d.provider_id,d.time,d.amount,d.charge_amount,u.name,u.lv,u.headimg FROM t_dealer_profit AS d INNER JOIN t_users AS u ON d.dealer_id=u.userid';

    query(sql,function (err,rows,fields) {
        if(err){
            logger.log(err);
            throw err;
        }
        callback(rows);
    })
};

exports.update_user_names_from_base64_to_origin = function() {
    var sql = 'SELECT userid, name FROM t_users';

    query(sql, function (err, rows, fields) {
        if(err){
            logger.log(err);
            throw err;
        }

        for (var i = 0; i < rows.length; i++) {
            var userid = rows[i].userid;
            var nameBase64 = rows[i].name;

            var nameOrigin = crypto.fromBase64(nameBase64);

            exports.update_user_name(nameOrigin, userid);
        }
    })
};

exports.update_user_name = function (username, userid) {
    var sql = 'UPDATE t_users SET name="{0}" WHERE userid = {1}';

    sql = sql.format(username, userid);

    query(sql, function (err, rows, fields) {
        if(err){
            logger.log( err);
            logger.log('failed userId: ' + userid + ' username: ' + username);
            throw err;
        }

        logger.log('success to convert userId: ' + userid);
    })
};

exports.read_agent_info = function(userid, callback){
    callback = callback == null? nop:callback;

    if(userid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT u1.headimg, u1.userid, u1.name, u1.dealer_become_time, u1.lv, u1.valance, u1.parent_dealer_id, u2.name AS name_up_agent, u2.headimg AS id_up_agent from t_users u1, t_users u2 ';
         +'WHERE userid="{0}" AND u1.parent_dealer_id=u2.userid';
    sql = sql.format(userid);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.read_agent = function(adminId, adminPwd, token, callback){
    callback = callback == null? nop:callback;

    if((adminId == null || adminPwd== null) && token == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_users WHERE ';

    if (token!=null){
        sql = sql + 'token="{0}"';
        sql = sql.format(token);
    }
    else {
        sql = sql +'id="{0}" AND pwd="{1}"';
        sql = sql.format(adminId,adminPwd);
    }

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        logger.log(rows);

        callback(rows);
    });
};

exports.read_link_users=function(userid,callback){
    callback=callback==null?nop:callback;

    if(userid==null){
        callback(null);
        return;
    }

    var sql='SELECT * FROM t_users WHERE dealer_id="{0}"';
    sql=sql.format(userid);

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            throw err;
        }

        callback(rows);
    })
};
exports.read_below_agent=function(userid,callback){
    callback = callback == null ? nop:callback;

    if(userid==null){
        callback(null);
        return;
    }

    var sql='SELECT * FROM t_users WHERE parent_dealer_id="{0}"';

    sql=sql.format(userid);

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            throw err;
        }
        callback(rows);
    })
};

exports.get_parent_agent=function (parent_dealer_id, callback) {
    callback=callback==null?nop:callback;

    if(parent_dealer_id==null){
        callback(null);
        return;
    }

    var sql='SELECT * FROM t_users WHERE userid="{0}"';

    sql = sql.format(parent_dealer_id);

    query(sql,function (err,rows,fields) {
        if(err){
            callback(null);
            throw err;
        }

        callback(rows);
    })
};

exports.read_agent_user_list = function(account, order_by, userId, nickname,level, callback){
    callback = callback == null? nop:callback;

    if(account == null){
        callback(null);
        return;
    }

    var sql = '';

    if(level == 1){
        if(order_by != null){
            order_by = "u." + order_by;
        }

        sql = 'SELECT u.headimg,u.userid,u.name,u.lv,a.permit_date,u.valance FROM t_agent_bind AS a INNER JOIN t_users AS u ON u.userid=a.userid_bind WHERE a.userid="{0}" and a.status="1"' + ' and u.userid like "%{1}%" and u.name like "%{2}%"'+' and u.lv!="0" order by {3}';
        sql = sql.format(account, userId, nickname, order_by, level);
    }
    else if(level == 0){
        sql = 'SELECT * from t_users WHERE dealer_id="{0}" and userid like "%{1}%" and name like "%{2}%"'+' and lv="{4}" order by {3}';
        sql = sql.format(account, userId, nickname, order_by,level);
    }

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.read_agent_profit = function (userId, order_by, callback) {
    callback = callback == null? nop:callback;

    if(userId==null){
        callback(null);
        return;
    }

    if(order_by != null){
        order_by = "d." + order_by;
    }

    var sql = 'SELECT u.userid,d.id, u.headimg,u.name,d.time,d.charge_amount, d.amount FROM t_users AS u INNER JOIN t_dealer_profit AS d ON u.userid=d.provider_id WHERE u.dealer_id="{0}" order by {1}';
    sql = sql.format(userId, order_by);

    query(sql,function (err,rows,fields) {
        if(err){
            logger.log(err);
            throw err;
        }
        callback(rows);
    })
};

exports.read_agent_payment=function(userId, order_by, callback) {
    callback = callback == null? nop:callback;

    var sql = 'SELECT * FROM t_payment WHERE userid = "{0}" order by {1}';

    sql=sql.format(userId, order_by);

    query(sql,function (err,rows,fields) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.clearUserRoomId = function(roomId, callback) {
    callback = callback == null? nop:callback;

    var sql = 'UPDATE t_users SET roomid = null WHERE roomid = "{0}"';
    sql=sql.format(roomId);

    query(sql,function (err, rows) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.clearAvailableRoom = function (roomId, callback) {
    callback = callback == null? nop:callback;

    var sql = 'DELETE FROM t_available_rooms WHERE room_id = "{0}"';
    sql = sql.format(roomId);

    query(sql, function (err, rows) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.write_manual_charge_history = function(userId, beforeGem, afterGem, callback) {
    callback = callback == null? nop:callback;

    var sql = 'INSERT INTO t_manual_charge_history (datetime, userid, before_gem, after_gem) VALUES ({0}, {1}, {2}, {3})';

    var dateTime = Math.ceil(Date.now()/1000);

    sql = sql.format(dateTime, userId, beforeGem, afterGem);

    query(sql, function (err, rows) {
        if(err){
            callback(null);
            logger.log(sql);
            throw err;
        }

        callback(rows);
    });
};

exports.query = query;