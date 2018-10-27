// the route handling for 'posts' ---------------------------------
var express = require('express');
var router = express.Router();
var multer = require('multer'); //image and formdata upload
var fs = require("fs"); //file system - needed for image upload
var jimp = require("jimp"); //for image processing
var jwt = require("jsonwebtoken"); //for creating and verifying tokens
var utils = require('./utils').utils; //utilities
var cfg = require('./confdata').data; //configdata
var db = require('./dbconnect').db; //database
var ps = require('./dbconnect').ps; //prepared statements

var upload = multer(cfg.multer).single('image'); //for upload image + formdata
var getfrmdata = multer().none(); //for upload formdata only

//All methods --------------------------------------------
router.use(function (req, res, next) {
    res.set('Access-Control-Allow-Origin', '*'); //using cors
    res.set("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.set("Access-Control-Allow-Headers", "x-access-token");
    res.set('Content-Type', 'application/json');
    next();
});

//POST create new blog post -------------------------------
router.post('/', function (req, res, next) {

    var img; //image
    var logindata; //data fra token

    //multer upload for formdata and image ---------
    upload(req, res, function (err) {

        // ******************* auth. **************************
        var tok = req.body.token || req.headers['x-access-token'] || req.query['token'];

        if (!tok) {
            res.status(403).json(cfg.err.auth_err_no_token); //send
            return;
        }
        else {
            try {
              logindata = jwt.verify(tok, cfg.secret);
            } catch(err) {
              res.status(403).json(cfg.err.auth_err_invalid_token); //send
              return;
            }
        }
        // ****************************************************

        if (err) {
            if (err.code == 'LIMIT_FILE_SIZE') {
                res.status(403).json(cfg.err.upload_err_filesize); //send
            } else if (err == "filetype_error") {
                res.status(403).json(cfg.err.upload_err_filetype); //send
            } else {
               res.status(500).json(cfg.err.upload_err); //send
            }
            return;
        }

        if (req.file) { //do we have a file?
            jimp.read(req.file.path, function(err, img){
                if (err)
                    res.status(403).json(cfg.err.upload_err_filecontent); //send
                else
                    do_image_stuff(req, res, img);

                fs.unlinkSync(req.file.path); //remove the file from fs
            });
        }
        else {
            img = "";
            do_db_stuff(req, res);
        }
    });

    //handle image ---------------------------------
    function do_image_stuff(req, res, theimage) {

        theimage.resize(300, 300)
         .getBase64(jimp.MIME_PNG, function(err, imgdata){

            if (err) {
                res.status(403).json(cfg.err.upload_err_filecontent); //send
                return;
            }

            img = imgdata;            
            do_db_stuff(req, res);
        });
    }

    //handle db ---------------------------------
    async function do_db_stuff(req, res) {

        var b = req.body;
        b.blogpost = utils.clean(b.blogpost);
        b.title = utils.clean(b.title);
        
        var sql = ps.postCreate;
        sql.values = [logindata.loginname, b.blogpost, b.title, img];
        
        try {
            await db.any(sql); //run sql
            
            //adding response data
            var respmsg = {message: "Your blog-post was created successfully"};
            res.status(200).json(respmsg); //send success and data!!
            
        } catch(err) {
            
            if (err.code == '42P05') {
                res.status(500).json(cfg.err.db_err_busy); //send
            } else {
               res.status(500).json(cfg.err.db_err); //send
            }
        }
    }

});


//DELETE a post -------------------------------------------
router.delete('/', async function (req, res, next) {

    // ******************* auth. **************************
    var logindata;
    var tok = req.headers['x-access-token'] || req.query['token'];

    if (!tok) {
        res.status(403).json(cfg.err.auth_err_no_token); //send
        return;
    }
    else {
        try {
          logindata = jwt.verify(tok, cfg.secret);
        } catch(err) {
          res.status(403).json(cfg.err.auth_err_invalid_token); //send
          return;
        }
    }
    // ****************************************************

    if (!logindata.admin) { 
        var sql = ps.postDelete;
        sql.values = [req.query.blogpost_id, logindata.loginname];
        
    } else {        
        var sql = ps.postDelAdm;
        sql.values = [req.query.blogpost_id];
    }
    
    try {        
        var data = await db.any(sql); //run sql
        
        if (data.length > 0) {
            var respmsg = {message: "Delete successful!"};
            res.status(200).json(respmsg); //send success and data!!
        }
        else {
            res.status(500).json(cfg.err.db_err_can_not_delete); //send
        }
        
    } catch(err) {
        
        if (err.code == '42P05') {
            res.status(500).json(cfg.err.db_err_busy); //send
        } else {
           res.status(500).json(cfg.err.db_err); //send
        }
    }
});

//GET a post (single and list) ----------------------------
router.get('/', async function (req, res, next) {

    // ******************* auth. **************************
    var logindata;
    var tok = req.headers['x-access-token'] || req.query['token'];

    if (!tok) {
        res.status(403).json(cfg.err.auth_err_no_token); //send
        return;
    }
    else {
        try {
          logindata = jwt.verify(tok, cfg.secret);
        } catch(err) {
          res.status(403).json(cfg.err.auth_err_invalid_token); //send
          return;
        }
    }
    // ****************************************************

    //single (id or author) or all?
    if (req.query['blogpost_id']) {
        var sql = ps.postLstId;
        sql.values = [req.query.blogpost_id];
    }    
    else if (req.query['login']) {
        var sql = ps.postLstAth;
        sql.values = [req.query.login];
    }
    else {
        var sql = ps.postLstAll;
    }
    
    try {
        
        var data = await db.any(sql); //run sql
        
        //converting imagebuffer to string (easier for the client)
        for (var i = 0; i < data.length; i++) {
            data[i].avatar = data[i].avatar ? data[i].avatar.toString() : "";
            data[i].image = data[i].image ? data[i].image.toString() : "";
        }

        res.status(200).json(data); //send success and data!!
        
    } catch(err) {
        
        if (err.code == '42P05') {
            res.status(500).json(cfg.err.db_err_busy); //send
        } else {
           res.status(500).json(cfg.err.db_err); //send
        }
    } 
    
});


//export --------------------------------------------------
module.exports = router;





