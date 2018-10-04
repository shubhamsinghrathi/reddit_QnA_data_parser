var fs = require('fs');
var es = require('event-stream');
var waterfall = require('async').waterfall;
var mongoose = require("mongoose");
var QnA = require('./redditQnA.model.js');
var num = 0;

mongoose.connect('mongodb://localhost:27017/reddit_question_data').then(
    () => {
        console.log('Connected to the database');
        theFunction();
    },
).catch(err => {
    // logger.error('Error in connecting to the database');
    process.exit();
});

var badBody = {
    "[deleted]": 1,
    "[removed]": 2
}

var regexForQuestion = /\bwhen|\bwhy|\bwho|\bhow|\bwhere|\bis|\bare|\bwas|\bwere |\bdid|\bdoes|\bdo |\bwhose\bwhom|\b\?|\\b/ig;
// var regexForQMark = /\?/g;
// var regexForExtraWords = /\\n|\\r|\\t|\\b/g;

const checkedAndSaver = (data, callback) => {
    ++num
    // console.log("in the function for " + num + " time");
    global.fileStream.pause(); //this pause the stream reading

    // const returnr = () => {
    //     global.fileStream.resume();
    //     return callback();
    // }

    let isQuestion = false;
    let found = false;
    let found2 = false;
    let foundData = {};
    try{
        data = JSON.parse(data);
        if(badBody[data.body] || data["score"] < 4 || data.body.length > 1000) {
            global.fileStream.resume();
            return callback();
        }

        let wordArr = data.body.split(" ");
        if(wordArr[0].search(regexForQuestion) > -1) isQuestion = true;
        else if(data.body[data.body.length - 1] == '?') isQuestion = true;

        data.body = data.body.replace(/(?:\r\n|\r|\n)/g, "");
    } catch(er) {
        global.fileStream.resume();
        return callback();
    }

    waterfall([
        function (cb) {
            // console.log(0)
            QnA.findOne({ $or: [ { parent_id: data["parent_id"] }, { parent_id: `t1_${data["id"]}` } ] }, (er1, dt1) => {
                // console.log(1)
                if(dt1) {
                    if(data["parent_id"] == dt1["parent_id"]) found = true;
                    else found2 = true;
                    foundData = dt1 || {};
                }
                return cb(null);
            });
        },
        function (cb) {
            // console.log(2)
            if(found && !isQuestion && (!foundData["score"] || data["score"] > foundData["score"])) {
                // console.log(3)
                QnA.updateOne({ _id: foundData._id }, { $set: { id: data["id"], body_comment: data["body"], score: data["score"] } }, (er1, dt1) => {
                    return cb(null);
                });
            } else {
                // console.log(4)
                return cb(null);
            }
        },
        function (cb) {
            // console.log(5)
            if(isQuestion) {
                // console.log(6)
                if(found2) {
                    // console.log(7)
                    QnA.updateOne({ _id: foundData._id }, { $set: { parent_id: `t1_${data["id"]}`, body_parent: data["body"] } }, (er1, dt1) => {
                        return cb(null);
                    });
                } else {
                    let to_save = new QnA({
                        // id: "",
                        parent_id: `t1_${data["id"]}`,
                        // score: 0,
                        subreddit_id: data["subreddit_id"],
                        body_parent: data["body"],
                        body_comment: ""
                    });
                    to_save.save((er, dt)=>{
                        return cb(null);
                    })
                }
            } else {
                if(!found) {
                    let to_save = new QnA({
                        id: data["id"],
                        parent_id: data["parent_id"],
                        score: data["score"],
                        subreddit_id: data["subreddit_id"],
                        body_parent: "",
                        body_comment: data["body"]
                    });
                    to_save.save((er, dt)=>{
                        return cb(null);
                    })
                } else {
                    return cb(null);
                }
            }
        }
    ], function (er) {
        // console.log("er: ", er);
        global.fileStream.resume();
        return callback();
    })
}

const theFunction = () => {
    global.fileStream = fs.createReadStream('data/RC_2007-03', { encoding: 'utf8', highWaterMark: 100 * 1024 });

    global.fileStream.pipe(es.split())
    .pipe(es.map(checkedAndSaver))
    .on('error', function(err){
        console.log('Error while reading file.', err);
    })
    .on('end', function(){
        console.log('Read entire file.')
        console.log("total read lines " + num);
    });
}