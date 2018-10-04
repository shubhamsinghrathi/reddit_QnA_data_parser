var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const redditQnASchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        required: true,
        auto: true
    },
    id: {
        type: String,
        default: null,
        index: true
    },
    parent_id: {
        type: String,
        default: null,
        index: true
    },
    score: {
        type: Number,
        default: null
    },
    subreddit_id: {
        type: String,
        default: "",
        index: true
    },
    body_parent: {
        type: String,
        default: "",
        trim: true
    },
    body_comment: {
        type: String,
        default: "",
        trim: true
    }
},
    {
        timestamps: true
    }
);

redditQnASchema.index({parent_id: 1, score: 1}, {unique: false});

module.exports = mongoose.model('redditQnA', redditQnASchema);
