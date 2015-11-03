var myModule = require('../run');
var fs = require('fs');
var S = require('string');
var he = require('he');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var page_link;
var article_link = Array();

function convert(time,body,url,comment,from){//from:comment or article

    if(from=="ori"){
        //data = body;
    }
    else if(from=="comment"){
        var list = JSON.parse(fs.readFileSync('./control/list'));
        var comment_list = list['comment_track'];
        var comments = comment_list.split(",");
        var namecheck=0;
        var match=0;
        for(var i=0;i<comments.length;i++){
            if((namecheck=comment.indexOf(comments[i]))!=-1){
                match++;
            }
        }
        if(match==0){
            return;
        }
    }
    if(typeof body == "undefined"){
        return;   
    }
    findBoardGame(body,function(game,matchnums,type,matchlist){
        var record;
        if(game!=-1&&type!=-1){
            if(from=="ori"){
                record = "Match:"+matchlist+"\nMatch nums:"+matchnums+"\nTime:"+time+"\n\n"+body+"\n\nLink:"+url;
                mailto(matchlist,record);
            }
            else if(from=="comment"){
                record = "Match:"+matchlist+"\nMatch nums:"+matchnums+"\nTime:"+time+"\n\nComment:"+comment+"\n\nOri:\n"+body+"\n\nLink:"+url;
                mailto(matchlist,record);
            }

        }
    });
}


function findBoardGame(body,callback){
    var gamelist = JSON.parse(fs.readFileSync('./control/list'));
    var game = gamelist['item'];
    //var type = gamelist['type'];
    //var match = gamelist['match'];
    //var nomatch = gamelist['not'];
    var game_matchnums=0;
    var namecheck=-1,typecheck=0,nomatchcheck=0;
    var games = game.split(",");
    var matchlist="";
    body =  body.toLowerCase();
    //if(type=="none"){
        for(var i=0;i<games.length;i++){
            if((namecheck=body.indexOf(games[i]))!=-1){
                //console.log("["+i+"]games:"+games[i]);
                if(game_matchnums!=0){
                    matchlist+=","+games[i];
                }
                else{
                    matchlist+=games[i];
                }
                game_matchnums++;
            }
        }
        if(game_matchnums==0){//no match game
            callback(-1,0,0,matchlist);
        }
        else if(games.length==game_matchnums){//all match
            callback(2,game_matchnums,0,matchlist);
            //console.log("["+i+"]games:"+games[i]);
        }
        /*
        else if(match<=game_matchnums){//match at least [match] 
            callback(1,game_matchnums,0,matchlist);
        }
        else if(match>game_matchnums){//match nums less than specify range
            callback(0,game_matchnums,0,matchlist);
        }
        */
    //}
    /*
    else{
        if((typecheck=body.indexOf(type))!=-1){
            for(var i=0;i<games.length;i++){
                if((namecheck=body.indexOf(games[i]))!=-1){
                    if(game_matchnums!=0){
                        matchlist+=","+games[i];
                    }
                    else{
                        matchlist+=games[i];
                    }
                    game_matchnums++;

                }
            }
            if(game_matchnums==0){//no match game
                callback(-1,0,1,matchlist);
            }
            else if(games.length==game_matchnums){//all match
                callback(2,game_matchnums,0,matchlist);
            }
            else if(match<=game_matchnums){//match at least [match] 
                callback(1,game_matchnums,0,matchlist);
            }
            else if(match>game_matchnums){//match nums less than specify range
                callback(0,game_matchnums,0,matchlist);
            }
        }
        else{
            callback(0,0,-1,matchlist);
        }
    }
    */
}

function findComment(content,fin){
    var list = JSON.parse(fs.readFileSync('./control/list'));
    var comment_list = list['comment_track'];
    var comments = comment_list.split(",");
    var namecheck=0;
    var match=0;
    for(var i=0;i<comments.length;i++){
        if((namecheck=content.indexOf(comments[i]))!=-1){
            match++;
        }
    }
    fin(match);
}

function mailto(matchlist,record)
{
    var tomail = myModule.tomail;
    var frommail = myModule.frommail;
    console.log("tomail:"+tomail);
    console.log("frommail:"+frommail);
    
    transporter.sendMail({
        from:frommail,
        to:tomail,
        subject:'[FB] '+matchlist,
        text:record
    },function(error,info){
        if(error){
            if(error){
                fs.appendFile(dir+"/"+groupid+"/err_log","Can't send mail:"+error+"\n",function(){});

            }
            return;
        }
    });

}

exports.convert = convert;
//exports.findBoardGame = findBoardGame;

