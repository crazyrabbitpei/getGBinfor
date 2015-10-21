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
    //console.log("id:"+appid+" yoyo:"+yoyo);
    //console.log("https://graph.facebook.com/oauth/access_token?client_id="+appid+"&client_secret="+yoyo+"&grant_type=client_credentials");

    fs.exists(dir,function(exists){
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

}

get_accessToken();

function get_accessToken(){
    //get access token
    request({
    uri:"https://graph.facebook.com/"+version+"/oauth/access_token?client_id="+appid+"&client_secret="+yoyo+"&grant_type=client_credentials",
    //uri: "https://graph.facebook.com/"+version+"/"+groupid+"/feed?access_token="+accesst+"&limit="+limit,
    },function(error, response, body){
        token = JSON.parse(body);
        //console.log(token['access_token']);
        crawlerFB(token['access_token']);
    });

}


function crawlerFB(token){
    request({
    uri: "https://graph.facebook.com/"+version+"/"+groupid+"/feed?access_token="+token+"&limit="+limit,
    },function(error, response, body){
        feeds = JSON.parse(body);
        //console.log(feeds['paging'].next);
        fs.writeFile(dir+"/"+groupid+"/nextpage",feeds['paging'].next,function(){
        });
        getFeedsContent(feeds,token);
        /*
        for(var i=0;i < feeds['data'].length;i++){
            article_id = feeds['data'][i].id.split("_");
            fs.readFile(dir+"/"+groupid+"/crawled",function(err,data){
                datablock = data.split(",");
                for(var j=1;j<datablock.length;j++){
                    if(datablock[j]==article_id[i]){
                        fs.appendFile(dir+"/"+groupid+"/last",","+article_id[1],function(){
                                    
                        });
                    }
                    else{
                        
                    }
                }

            });
            fs.appendFile(dir+"/"+groupid+"/crawled",","+article_id[1],function(){
            });
            fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+feeds['data'][i].updated_time+"\nMessage:\n"+feeds['data'][i].message+"\nLink:"+"https://www.facebook.com/groups/"+groupid+"/permalink/"+article_id[1]+"/\n\n",function(){
            });
        }
        */
        try{
            nextPage(feeds['paging'].next,depth-1,token);
        }
        catch(e){
        }
    });
}

function nextPage(npage,depth_link,token){
    request({
    uri:npage,
    },function(error, response, body){
        feeds = JSON.parse(body);
        try{
            //console.log(feeds['paging'].next);
            fs.writeFile(dir+"/"+groupid+"/nextpage",feeds['paging'].next,function(){
            });
            getFeedsContent(feeds,token);
            /*
            for(var i=0;i < feeds['data'].length;i++){
                article_id = feeds['data'][i].id.split("_");
                fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+feeds['data'][i].updated_time+"\nMessage:\n"+feeds['data'][i].message+"\nLink:"+"https://www.facebook.com/groups/"+groupid+"/permalink/"+article_id[1]+"/\n\n",function(){
                });
            }
            */
            if(depth_link-1!=0){
                nextPage(feeds['paging'].next,depth_link-1,token);
            }

        }
        catch(e){
            console.log("fin");
        }
    });
        
}

function getFeedsContent(feeds,token){
      for(var i=0;i < feeds['data'].length;i++){
            article_id = feeds['data'][i].id.split("_");
            isCrawled(feeds['data'][i],feeds['data'][i].id,article_id[1],feeds['data'][i].updated_time,token,function(result){
                    if(result==0){
                        //i = feeds['data'].length;
                    }
            });
    }
}

function isCrawled(feed,full_id,article_id,article_updated,token,fin){
    //read crawled file
    fs.readFile(dir+"/"+groupid+"/crawled","utf-8",function(err,data){
        //console.log(data);
            //if exists in crawled 
            if((data.indexOf(article_id))!=-1){
                //check updated time(article_updated) create time(in crawled file)
                    terms = data.split(",");
                    for(var i=terms.length-1;i>0;i--){
                        if(terms[i].indexOf(article_id)!=-1){
                            old_time = terms[i].split("@");
                            break;
                        }
                    }
                    //if the same, then skip it, and end the crawler round
                    if(old_time[1]==article_updated){
                        console.log("old time="+old_time[1]+" article_updated="+article_updated);
                        fin(0);        
                    }
                    //if not, check whether the article is updated by the author or not. 
                    else{
                        //console.log("https://graph.facebook.com/"+version+"/"+full_id+"/?fields=from,comments&access_token="+token);
                        request({
                            uri: "https://graph.facebook.com/"+version+"/"+full_id+"/?fields=from,comments&access_token="+token,
                            },function(error, response, body){
                               detail  = JSON.parse(body);
                               //console.log("detail:"+body);
                               if(detail['comments']){
                                   comments_length = detail['comments'].data.length;
                                   console.log("comments_length="+comments_length);
                                   for(i=comments_length-1;i>=0;i--){
                                       console.log("author:"+detail['comments'].data[i].from.id+" comments newest pid:"+detail['from'].id);
                                       if(detail['comments'].data[i].from.id==detail['from'].id){
                                           i=-1;
                                           break;
                                        }
                                    }
                               }
                               
                               //if yes, grab the aritcle, and the comment which is writen by author.
                                //write the new message to cralwed file
                                if(i==-1){
                                    fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+feed.updated_time+"\nMessage:\n"+feed.message+"\nLink:"+"https://www.facebook.com/groups/"+groupid+"/permalink/"+article_id+"/\n\n",function(){
                                    });
                                    fs.appendFile(dir+"/"+groupid+"/crawled",","+article_id+"@"+feed.updated_time,function(){
                                    });
                                    fin(i);
                                }
                               //if not, skip it, and coutinue looking for the rest. 
                                else{
                                    fin(1);   
                                }

                        });
                    }
            }
            else{
                    fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+feed.updated_time+"\nMessage:\n"+feed.message+"\nLink:"+"https://www.facebook.com/groups/"+groupid+"/permalink/"+article_id+"/\n\n",function(){
                    });
                    fs.appendFile(dir+"/"+groupid+"/crawled",","+article_id+"@"+feed.updated_time,function(){
                    });
                    fin(-1);
            }
    });

}
function makeArequest(full_id,token){
                console.log("https://graph.facebook.com/"+version+"/"+full_id+"/?fields=from,comments&access_token="+token);
                        request({
                            uri: "https://graph.facebook.com/"+version+"/"+full_id+"/?fields=from,comments&access_token="+token,
                            },function(error, response, body){
                               detail  = JSON.parse(body);
                               console.log("detail:"+body);
                               comments_length = detail['comments'].data.length;
                               //console.log("comments_length="+comments_length);

                               for(i=comments_length-1;i>=0;i++){
                                   if(detail['comments'].data[i].from.id==detail['from'].id){
                                       i=-1;
                                       break;
                                   }
                               }
                               
                               //if yes, grab the aritcle, and the comment which is writen by author.
                                //write the new message to cralwed file
                                if(i==-1){
                                    fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+feed.updated_time+"\nMessage:\n"+feed.message+"\nLink:"+"https://www.facebook.com/groups/"+groupid+"/permalink/"+article_id+"/\n\n",function(){
                                    });
                                    fs.appendFile(dir+"/"+groupid+"/crawled",","+article_id+"@"+feed.updated_time,function(){
                                    });
                                    fin(i);
                                }
                               //if not, skip it, and coutinue looking for the rest. 
                                else{
                                    fin(1);   
                                }

                        });
}
