// the route handling for 'users' ---------------------------------
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

var upload = multer(cfg.multer).single('avatar'); //for upload image + formdata
var getfrmdata = multer().none(); //for upload formdata only

//All methods --------------------------------------------
router.use(function (req, res, next) {
    res.set('Access-Control-Allow-Origin', '*'); //using cors
    res.set("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.set("Access-Control-Allow-Headers", "x-access-token");
    res.set('Content-Type', 'application/json');
    next();
});

//POST new user -------------------------------------------
router.post('/', function (req, res, next) {

    var respmsg = {}; //response message

    //multer upload for formdata and image ---------
    upload(req, res, function (err) {

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

                fs.unlinkSync(req.file.path);
            });
        }
        else {
            respmsg.image = "";
            do_db_stuff(req, res);
        }
    });

    //handle image ---------------------------------
    function do_image_stuff(req, res, img) {

        img.resize(50, 50)
         .getBase64(jimp.MIME_PNG, function(err, imgdata){

            if (err) {
                res.status(403).json(cfg.err.upload_err_filecontent); //send
                return;
            }

            //adding image to response data
            respmsg.image = imgdata;
            do_db_stuff(req, res);

        });
    }

    //handle db ---------------------------------
    async function do_db_stuff(req, res) {
        
        //clean and insert to database
        var b = req.body;
        b.loginname = utils.clean(b.loginname);
        b.fullname = utils.clean(b.fullname);
        
        var sql = ps.userCreate;
        sql.values = [b.loginname, b.password, b.fullname, respmsg.image, false];
        
        try {
            
            await db.any(sql); //run sql            
            
            //create auth. token
            var payload = {loginname: b.loginname, fullname: b.fullname, admin:false};
            var tok = jwt.sign(payload, cfg.secret, {
              expiresIn: "12h"
            });

            //adding response data
            respmsg.loginname = b.loginname;
            respmsg.fullname = b.fullname;
            respmsg.message = "Your account was created successfully";
            respmsg.token = tok;

            res.status(200).json(respmsg); //send success and data!!
            
        } catch(err) {
            
            if (err.code == 23505) {
                res.status(403).json(cfg.err.db_err_not_unique); //send
            } else if (err.code == 23514) {
                res.status(403).json(cfg.err.db_err_null_field); //send
            } else if (err.code == '42P05') {
                res.status(500).json(cfg.err.db_err_busy); //send
            } else {
               res.status(500).json(cfg.err.db_err); //send
            }
        }        
    }
});

//PUT change user data ------------------------------------
router.put('/', async function (req, res, next) {

    //multer upload for formdata ------------------
    getfrmdata(req, res, function(err) {

        var logindata;

        // ******************* auth. **************************
        var tok = req.body.token || req.query.token || req.headers['x-access-token'];

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


        res.send({msg: "hallo fra put"});

    });
});

//DELETE a user -------------------------------------------
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

        //if you'r not admin you can only delete yourself
        if (logindata.loginname != req.query.login) {
            res.status(403).json(cfg.err.auth_err_adm_required); //send
            return;
        }
    }

    var sql = ps.userDelete;
    sql.values = [req.query.login];
    
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

//GET a user (single and list) ----------------------------
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

    //single or all?
    if (req.query['login']) {
       var sql = ps.userLstOne;
       sql.values = [req.query.login]; 
    }        
    else {
        var sql = ps.userLstAll;
    }
        
    try {
        
        var data = await db.any(sql); //run sql
        
        //converting imagebuffer to string (easier for the client)
        for (var i = 0; i < data.length; i++) {
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

// - login ------------------------------------------------
router.post('/auth/', function (req, res, next) {

    //multer upload for formdata ------------------
    getfrmdata(req, res, async function(err) {

        //clean search words
        var b = req.body;
        b.loginname = utils.clean(b.loginname);
        b.password = utils.clean(b.password);

        var sql = ps.userLogin;
        sql.values = [b.loginname, b.password];
        
        try {

            var data = await db.any(sql); //run sql

            if (data.length <= 0) {
                res.status(403).json(cfg.err.auth_err_user_passw); //send
                return;
            }

            //create token
            var payload = {loginname: b.loginname, fullname: b.fullname, admin: data[0].admin};
            var tok = jwt.sign(payload, cfg.secret, {
                expiresIn: "12h"
            });

            var respmsg = {};
            respmsg.loginname = data[0].login;
            respmsg.fullname = data[0].fullname;
            respmsg.message = "Login successful!";
            respmsg.image = data[0].image.toString();
            respmsg.admin = data[0].admin;
            respmsg.token = tok;

            res.status(200).json(respmsg); //send success and data!!

        } catch(err) {
            
            if (err.code == '42P05') {
                res.status(500).json(cfg.err.db_err_busy); //send
            } else {
               res.status(500).json(cfg.err.db_err); //send
            }
        };

    });

});


//export --------------------------------------------------
module.exports = router;





