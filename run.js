var CronJob = require('cron').CronJob;
var request = require('request');
var http = require('http');
var fs = require('fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var punycode = require('punycode');
var dateFormat = require('dateformat');
var now = new Date();
var matchGame = require('./tool/notice');
var fbBot = require('./fbbot');

var Bot_runStatus=1;
exports.Bot_runStatus=Bot_runStatus;

try {
    service1 = JSON.parse(fs.readFileSync('./service/shadow'));
    var groupid = service1['id'];
    var version = service1['version'];
    var limit = service1['limit'];
    var dir = service1['dir'];
    var depth = service1['depth'];

    service2 = JSON.parse(fs.readFileSync('./service/shadowap'));
    var appid = service2['id'];
    var yoyo = service2['yoyo'];

    exports.groupid=groupid;
    exports.version=version;
    exports.limit=limit;
    exports.dir=dir;
    exports.depth=depth;
    exports.appid=appid;
    exports.yoyo=yoyo;
    //console.log("id:"+appid+" yoyo:"+yoyo);
    //console.log("https://graph.facebook.com/oauth/access_token?client_id="+appid+"&client_secret="+yoyo+"&grant_type=client_credentials");

    fs.exists(dir+"/"+groupid,function(exists){
        if(!exists){
            fs.mkdir(dir,function(){
                console.log("Create "+dir);
                fs.mkdir(dir+"/"+groupid,function(){
                    console.log("Create "+dir+"/"+groupid);
                    fs.writeFile(dir+"/"+groupid+"/crawled","0",function(){
                    });

                });

            });

        }
    });
}
catch (err) {
    console.error(err);
    process.exit(9);
}
finally{
    get_accessToken(function(token){
        console.log("get token");
        setBot(token);       
    });
}

function get_accessToken(fin){
    //get access token
    request({
        uri:"https://graph.facebook.com/"+version+"/oauth/access_token?client_id="+appid+"&client_secret="+yoyo+"&grant_type=client_credentials",
    //uri: "https://graph.facebook.com/"+version+"/"+groupid+"/feed?access_token="+accesst+"&limit="+limit,
    },function(error, response, body){
        var token = JSON.parse(body);
        //console.log(token['access_token']);
        //crawlerFB(token['access_token']);
        fin(token['access_token']);
    });

}

function setBot(token){
    //console.log("access:"+token);
    //fbBot.crawlerFB(token);
    var per=1;
    new CronJob('00 */2 7-23,0-1 * * *', function() {//http://sweet.io/p/ncb000gt/node-cron
        /*
        var now = new Date();
        service1 = JSON.parse(fs.readFileSync('./service/shadow'));
        per = parseInt(service1['readperm']);
        */
        //console.log("per:"+per+" run:"+now);
        fbBot.crawlerFB(token);
    }, null, true, 'Asia/Taipei');
    
}
