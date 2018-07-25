var mongoose = require("mongoose");

//Schema Setup
var campgroundsSchema = new mongoose.Schema({
  name: String,
  price: String,
  image: String,
  imageId: String,
  describe: String,
  author:{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
      username: String
  },
  comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
      }
    ]
});

// var Campground = mongoose.model("Campground",campgroundsSchema);
// module.exports = Campground;

module.exports = mongoose.model("Campground",campgroundsSchema);
