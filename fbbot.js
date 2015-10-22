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

var Bot_runStatus=1;
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
        //getFeedsContent(feeds,token);
        isCrawled(feeds,token,function(result){

        });
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
        if(feeds['paging']){
            //console.log(feeds['paging'].next);
            fs.writeFile(dir+"/"+groupid+"/nextpage",feeds['paging'].next,function(){
            });
            //getFeedsContent(feeds,token,0);
            isCrawled(feeds,token,function(result){

            });
            if(depth_link-1!=0){
                nextPage(feeds['paging'].next,depth_link-1,token);
            }
        }
        else{
            console.log("fin");
        }
    });
        
}

function getFeedsContent(feeds,token,i){
    if(Bot_runStatus!=-1 && i < feeds['data'].length){
      //for(var i=0;i < feeds['data'].length;i++){
            article_id = feeds['data'][i].id.split("_");
            console.log("feeds:"+article_id[1]);
            isCrawled(feeds['data'][i],feeds['data'][i].id,article_id[1],feeds['data'][i].updated_time,token, function(result){
                    if(result==0){
                        //i = feeds['data'].length;
                        console.log("no news");
                        //Bot_runStatus = -1;
                    }
                    else{
                        console.log("Article comments wasn't updated by author");
                        console.log("continue");
                        getFeedsContent(feeds,token,i+1);
                    }


            });
    //}
    }
    else{
        console.log("Bot_runStatus="+Bot_runStatus);
    }
}

function isCrawled(feeds,token,fin){
    var check=-1;
    var full_id,article_id,article_id,article_updated;
    var i;
    //read crawled file
    fs.readFile(dir+"/"+groupid+"/crawled","utf-8",function(err,data){
        for(i=0;i < feeds['data'].length;i++){
            full_id = feeds['data'][i].id;
            article_id = feeds['data'][i].id.split("_");
            article_id = article_id[1];
            article_updated = feeds['data'][i].updated_time;
            //console.log(data);
            //if exists in crawled 
            if((data.indexOf(article_id))!=-1){
                //check updated time(article_updated) create time(in crawled file)
                    terms = data.split(",");
                    for(var j=terms.length-1;j>0;j--){
                        if(terms[j].indexOf(article_id)!=-1){
                            old_time = terms[j].split("@");
                            //console.log("[id]:"+article_id+"'s old_time="+old_time[1]+" terms:"+terms[j]);
                            break;
                        }
                    }

                    //if the same, then skip it, and end the crawler round
                    if(old_time[1]==article_updated){
                        //console.log("id="+article_id);
                        //console.log("old time="+old_time[1]+" article_updated="+article_updated);
                        console.log("[id]:"+article_id+" skip, crawler end.");
                        check = 0;
                        //break;
                        fin(0);        
                    }
                    //if not, check whether the article is updated by the author or not. 
                    else{
                        console.log("[id]:"+article_id+" was updated:");
                        console.log(article_id+"-> old time="+old_time[1]+" article_updated="+article_updated);
                        //console.log("https://graph.facebook.com/"+version+"/"+full_id+"/?fields=from,comments&access_token="+token);
                        request({
                            uri: "https://graph.facebook.com/"+version+"/"+full_id+"/?fields=message,from,comments,updated_time&access_token="+token,
                            },function(error, response, body){
                                var index=-10,index_author="test";
                               detail  = JSON.parse(body);
                               //console.log("detail:"+body);
                               if(detail['comments']){
                                   comments_length = detail['comments'].data.length;
                                   console.log("[id]:"+detail['id']+" has comments_length="+comments_length);
                                   for(j=comments_length-1;j>=0;j--){
                                       //the comment which was written by author is the newset comment.
                                       if(detail['comments'].data[j].from.id==detail['from'].id&&detail['comments'].data[j].created_time==detail['updated_time']){
                                           //console.log("author:"+detail['comments'].data[j].from.id+" comments newest pid:"+detail['from'].id);
                                           index=j;
                                           //j=-10;

                                           //break;
                                        }
                                        //the comment which was written by author is not the newset comment.
                                        else if(detail['comments'].data[j].from.id==detail['from'].id){
                                            index_author = index_author+"~"+j;
                                            //j=-20;
                                            //break;
                                        }
                                    }
                                    console.log("index_author:"+index_author);
                               }
                               
                               //if yes, grab the aritcle, and the comment which is writen by author.
                                updated_id = detail['id'].split("_");
                                //if(j==-10){//comment written by author is the newest
                                if(index!=-10){//comment written by author is the newest
                                    console.log("j=-10");
                                    console.log("[id]:"+updated_id[1]+" was updated to cralwed file, time="+detail['comments'].data[index].created_time+" message:"+detail['message']);
                                    //write the new message to cralwed file

                                    fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+detail['comments'].data[index].created_time+"\nMessage:\n"+detail['message']+"\nComment:\n"+detail['comments'].data[index].message+"\nLink:"+"https://www.facebook.com/groups/"+groupid+"/permalink/"+updated_id[1]+"/\n\n",function(){
                                    });
                                    fs.appendFile(dir+"/"+groupid+"/crawled",","+updated_id[1]+"@"+detail['comments'].data[index].created_time,function(){
                                    });
                                    //fin(j);
                                }
                                //else if(j==-20){//comment written by author is not the newest
                                if(index_author!="test"){//comment written by author is not the newest
                                    console.log("j=-20");
                                    //console.log("->"+index_author);
                                    fs.readFile(dir+"/"+groupid+"/crawled","utf-8",function(err,data){
                                            index_authors_a = index_author.split("~");
                                            a_id = detail['id'].split("_");
                                            for(k=1;k<index_authors_a.length-1;k++){
                                                if(data.indexOf(a_id[1]+"@"+detail['comments'].data[index_authors_a[k]].created_time)==-1){
                                                    console.log("new cra data:"+a_id[1]+"@"+detail['comments'].data[index_authors_a[k]].created_time);
                                                    fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+detail['comments'].data[index_authors_a[k]].created_time+"\nMessage:\n"+detail['message']+"\nComment:\n"+detail['comments'].data[index_authors_a[k]].message+"\nLink:"+"https://www.facebook.com/groups/"+groupid+"/permalink/"+updated_id[1]+"/\n\n",function(){
                                                    });
                                                    fs.appendFile(dir+"/"+groupid+"/crawled",","+a_id[1]+"@"+detail['comments'].data[index_authors_a[k]].created_time,function(){
                                                    });

                                                }
                                                else{
                                                    console.log("none");
                                                }
                                            }
                                            fs.appendFile(dir+"/"+groupid+"/crawled",","+a_id[1]+"@"+detail['updated_time'],function(){
                                            });
                                    });
                                }
                               //if not, skip it, and coutinue looking for the rest. 
                               if(index_author!="test" && index!=-10){
                                    console.log("[id]:"+detail['id']+" was not updated by author skip it");
                                    fs.appendFile(dir+"/"+groupid+"/crawled",","+updated_id[1]+"@"+detail['updated_time'],function(){
                                    });
                                    //fin(1);   
                                }
                                */
                        });
                    }
            }
            else{
                    console.log("new");
                    fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+article_updated+"\nMessage:\n"+feeds['data'][i].message+"\nLink:"+"https://www.facebook.com/groups/"+groupid+"/permalink/"+article_id+"/\n\n",function(){
                    });
                    fs.appendFile(dir+"/"+groupid+"/crawled",","+article_id+"@"+article_updated,function(){
                    });
                    fin(-1);
            }
            if(check==0){
                break;
            }
        }//for loop end
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
