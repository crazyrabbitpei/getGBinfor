此版本目前只能一次追蹤一個id
執行方式:node run.js

執行前，請到servive資料夾下修改兩個檔案 shadow, shadowap

shadow格式
{
        "id":"track id",    //追蹤的社團或粉絲頁id
        "limit":20  //一次抓多少筆record,
        "version":"v2.5",   //graph api version
        "dir":"./fb_data",  //追蹤id詳細資料的預設存放路徑，包含已爬過的清單、error log、next page紀錄
        "depth":2,  //每次請求會回傳limit個結果，若需繼續往下找，可在這邊設定next page 深度
        "readInterval":""   //多久發一次graph api去抓頁面 Crontab格式 秒 分 時 日 月 星期
}

shadowap格式
{
        "id":"App ID",  //須申請開法者專案
        "yoyo":"App Secret", //須申請開法者專案
        "tomail":"",    //通知哪個信箱
        "frommail":"",  //發信者
        "mailNoticeTime":"* * * * * *" //Crawler通知還活著的時間  Crontab格式 秒 分 時 日 月 星期
}

以及到control資料夾下修改list file

list格式
{
        "item":"item1,item2....,itemN",
        "type":"none",
        "not":"none",
        "match":0,
        comment_track":"comment1,comment2...commentN"
}

每筆想追蹤的物品、留言 都用逗號做為分隔，type,not match目前皆為保留欄位，此版本尚未用到，
