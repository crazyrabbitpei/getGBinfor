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
var myModule = require('./run');

var count=0;

function crawlerFB(token){
    var groupid = myModule.groupid;
    var version = myModule.version;
    var limit = myModule.limit;
    var dir = myModule.dir;
    var depth = myModule.depth;
    var appid = myModule.appid;
    var yoyo = myModule.yoyo;
    //console.log("url:"+"https://graph.facebook.com/"+version+"/"+groupid+"/feed?access_token="+token+"&limit="+limit);
    request({
        uri: "https://graph.facebook.com/"+version+"/"+groupid+"/feed?access_token="+token+"&limit="+limit,
    },function(error, response, body){
        try{
            feeds = JSON.parse(body);
        }
        catch(e){
            console.log("crawlerFB:"+e);
            fs.appendFile(dir+"/"+groupid+"/err_log","error:"+e+"\ncrawlerFB:"+body+"\n",function(){});
            return;
        }
        finally{
            if(feeds['error']){
                fs.appendFile(dir+"/"+groupid+"/err_log","crawlerFB:"+body+"\n",function(){});
                console.log("error");
                return;
            }
            //console.log(feeds['paging'].next);
            fs.writeFile(dir+"/"+groupid+"/nextpage",feeds['paging'].next,function(){
            });
            //getFeedsContent(feeds,token);
            isCrawled(feeds,token,function(result){
                if(result!=-1){
                    try{
                        nextPage(feeds['paging'].next,depth-1,token);
                    }
                    catch(e){
                        console.log("crawlerFB:"+e);
                    }
                }
                else{
                    return;
                }
            });


        }
    });
}

exports.crawlerFB = crawlerFB;

function nextPage(npage,depth_link,token){
    var groupid = myModule.groupid;
    var version = myModule.version;
    var limit = myModule.limit;
    var dir = myModule.dir;
    var depth = myModule.depth;
    var appid = myModule.appid;
    var yoyo = myModule.yoyo;
    request({
        uri:npage,
    },function(error, response, body){
        try{
            feeds = JSON.parse(body);
        }
        catch(e){
            console.log("nextPage:"+e);
            fs.appendFile(dir+"/"+groupid+"/err_log","error:"+e+"\nnextPage:"+body+"\n",function(){});
            return;
        }
        finally{
            if(feeds['error']){
                fs.appendFile(dir+"/"+groupid+"/err_log","nextPage:"+body+"\n",function(){});
                console.log("error");
                return;
            }
            if(feeds['data']){
                //console.log(feeds['paging'].next);
                fs.writeFile(dir+"/"+groupid+"/nextpage",feeds['paging'].next,function(){
                });
                //getFeedsContent(feeds,token,0);
                isCrawled(feeds,token,function(result){
                    if(result!=-1){
                        if(depth_link-1!=0){
                            nextPage(feeds['paging'].next,depth_link-1,token);
                        }
                    }
                    else{
                        return;
                    }
                });
            }

        }
    });

}

function isCrawled(feeds,token,fin){
    var check=-1;
    var full_id,article_id,article_id,article_updated,blink;
    var i;
    var groupid = myModule.groupid;
    var version = myModule.version;
    var limit = myModule.limit;
    var dir = myModule.dir;
    var depth = myModule.depth;
    var appid = myModule.appid;
    var yoyo = myModule.yoyo;
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
                    fin(-1);
                    return;
                }
                //if not, check whether the article is updated by the author or not. 
                else{
                    console.log("[id]:"+article_id+" was updated:");
                    //console.log(article_id+"-> old time="+old_time[1]+" article_updated="+article_updated);
                    //console.log("https://graph.facebook.com/"+version+"/"+full_id+"/?fields=from,comments&access_token="+token);
                    request({
                        uri: "https://graph.facebook.com/"+version+"/"+full_id+"/?fields=message,from,comments,updated_time&access_token="+token,
                    },function(error, response, body){
                        var index=-10,index_author="test";
                        try{
                            detail  = JSON.parse(body);
                        }
                        catch(e){
                            console.log("isCrawled:"+e);
                            fs.appendFile(dir+"/"+groupid+"/err_log","error:"+e+"\nisCrawled:"+body+"\n",function(){});
                            return;

                        }
                        finally{
                            //console.log("detail:"+body);
                            if(detail['error']){
                                fs.appendFile(dir+"/"+groupid+"/err_log","isCrawled:"+body+"\n",function(){});
                                console.log("error");
                                return;
                            }
                            if(detail['comments']){
                                comments_length = detail['comments'].data.length;
                                //console.log("[id]:"+detail['id']+" has comments_length="+comments_length);
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
                                //console.log("index_author:"+index_author);
                            }

                            //if yes, grab the aritcle, and the comment which is writen by author.
                            updated_id = detail['id'].split("_");
                            if(index!=-10){//comment written by author is the newest
                                console.log("comment written by author is the newest");
                                //console.log("[id]:"+updated_id[1]+" was updated to cralwed file, time="+detail['comments'].data[index].created_time+" message:"+detail['message']);
                                //
                                blink="https://www.facebook.com/groups/"+groupid+"/permalink/"+updated_id[1];
                                matchGame.convert(detail['comments'].data[index].created_time,detail['message'],blink,detail['comments'].data[index].message,"comment");
                                //write the new message to cralwed file
                                /*
                                   fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+detail['comments'].data[index].created_time+"\nMessage:\n"+detail['message']+"\nComment:\n"+detail['comments'].data[index].message+"\nLink:"+blink+"/\n\n",function(){
                                   });
                                   */
                                fs.appendFile(dir+"/"+groupid+"/crawled",","+updated_id[1]+"@"+detail['comments'].data[index].created_time,function(){
                                });
                                //fin(j);
                            }
                            if(index_author!="test"){//comment written by author is not the newest
                                console.log("=>comment written by author is not the newest");
                                //console.log("->"+index_author);
                                fs.readFile(dir+"/"+groupid+"/crawled","utf-8",function(err,data){
                                    index_authors_a = index_author.split("~");
                                    //console.log("index_authors_a.length:"+index_authors_a.length);
                                    a_id = detail['id'].split("_");
                                    //console.log("a_id[1]:"+a_id[1]);
                                    for(k=1;k<index_authors_a.length;k++){
                                        if(typeof detail['comments'].data[index_authors_a[k]]=="undefined"){
                                            break;
                                        }
                                        //console.log("=>"+index_authors_a[k]);
                                        //console.log(":"+detail['comments'].data[index_authors_a[k]].message);
                                        //console.log(":"+detail['comments'].data[index_authors_a[k]].created_time);

                                        if(data.indexOf(a_id[1]+"@"+detail['comments'].data[index_authors_a[k]].created_time)==-1){
                                            //console.log("new cra data:"+a_id[1]+"@"+detail['comments'].data[index_authors_a[k]].created_time);
                                            blink="https://www.facebook.com/groups/"+groupid+"/permalink/"+a_id[1];
                                            matchGame.convert(detail['comments'].data[index_authors_a[k]].created_time,detail['message'],blink,detail['comments'].data[index_authors_a[k]].message,"comment");
                                            /*
                                               fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+detail['comments'].data[index_authors_a[k]].created_time+"\nMessage:\n"+detail['message']+"\nComment:\n"+detail['comments'].data[index_authors_a[k]].message+"\nLink:"+blink+"/\n\n",function(){
                                               });
                                               */
                                            fs.appendFile(dir+"/"+groupid+"/crawled",","+a_id[1]+"@"+detail['comments'].data[index_authors_a[k]].created_time,function(){
                                            });

                                        }
                                        else{
                                            console.log(a_id[1]+"@"+detail['comments'].data[index_authors_a[k]].created_time+" has crawled");
                                            break;
                                        }

                                    }
                                    fs.appendFile(dir+"/"+groupid+"/crawled",","+a_id[1]+"@"+detail['updated_time'],function(){
                                    });
                                });
                            }
                            //if not, skip it, and coutinue looking for the rest. 
                            if(index_author=="test" && index==-10){
                                console.log("[id]:"+detail['id']+" was not updated by author skip it");
                                fs.appendFile(dir+"/"+groupid+"/crawled",","+updated_id[1]+"@"+detail['updated_time'],function(){
                                });
                                //fin(1);   
                            }

                        }
                    });
                }
            }
            else{
                console.log("new");
                blink="https://www.facebook.com/groups/"+groupid+"/permalink/"+article_id;
                matchGame.convert(article_updated,feeds['data'][i].message,blink,"","ori");
                /*
                   fs.appendFile(dir+"/"+groupid+"/body","Updated Time:"+article_updated+"\nMessage:\n"+feeds['data'][i].message+"\nLink:"+blink+"/\n\n",function(){
                   });
                   */
                fs.appendFile(dir+"/"+groupid+"/crawled",","+article_id+"@"+article_updated,function(){
                });
                fin(1);
            }
            if(check==0){
                break;
            }
        }//for loop end
    });

}
