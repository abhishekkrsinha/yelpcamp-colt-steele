var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");

//multer configuration
var multer = require("multer");
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

//cloudinary configuration
var cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "abbykacloud",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


//INDEX- show all campgrounds
router.get("/campgrounds",function(req,res){
  //console.log(req.user);
  var noMatch = null;
  if(req.query.search){
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    //get search campgrounds from db
    Campground.find({name: regex},function(err,allcampgrounds){
      if(err){
        console.log(err);
      } else {
        if(allcampgrounds.length < 1){
          noMatch = "No campgrounds match that query, please try again";
        }
        res.render("campgrounds/index",{campgrounds: allcampgrounds, currentUser: req.user, noMatch: noMatch});
      }
    });
  } else{
  //get all campgrounds from db
  Campground.find({},function(err,allcampgrounds){
    if(err){
      console.log(err);
    } else {
      res.render("campgrounds/index",{campgrounds: allcampgrounds, currentUser: req.user, noMatch: noMatch});
    }
  });
}
});
//CREATE- add new campgroundto Db
router.post("/campgrounds", middleware.isLoggedIn, upload.single("image"), function(req,res){
  cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the campground object under image property
      req.body.campground.image = result.secure_url;
      // add image's public_id to campground object
      req.body.campground.imageId = result.public_id;
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      }
      Campground.create(req.body.campground, function(err, campground) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        res.redirect('/campgrounds/' + campground.id);
      });
    });

});

//NEW- show form to create new campground
router.get("/campgrounds/new", middleware.isLoggedIn, function(req,res){
  res.render("campgrounds/new");
});

//SHOW- shows more info about one campground
router.get("/campgrounds/:id",function(req,res){
  //find the campground with provided
  Campground.findById(req.params.id).populate("comments").exec(function(err,foundCampground){
    if(err){
      console.log(err);
    } else {
      console.log(foundCampground);
      //render show template with that campground.
      res.render("campgrounds/show",{campground: foundCampground});
    }
  });
});

//Edit campground route
router.get("/campgrounds/:id/edit", middleware.checkCampgroundOwnership, function(req,res){
      Campground.findById(req.params.id, function(err,foundCampground){
              res.render("campgrounds/edit", {campground: foundCampground});
      });
});

//update campground route
router.put("/campgrounds/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req,res){
  //find and update the correct campground
  Campground.findById(req.params.id, async function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
              try {
                  await cloudinary.v2.uploader.destroy(campground.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  campground.imageId = result.public_id;
                  campground.image = result.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            campground.name = req.body.name;
            campground.description = req.body.description;
            campground.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
        }
    });
});

//destroy campground route
router.delete("/campgrounds/:id", middleware.checkCampgroundOwnership, function(req,res){
  Campground.findById(req.params.id, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
        await cloudinary.v2.uploader.destroy(campground.imageId);
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/campgrounds');
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;
