var express = require('express');
var config = require('./confdata').data; //configdata
var app = express();
var port = process.env.PORT || 8080;


// global for all routes
app.use(function(err, req, res, next) {

    res.set('Access-Control-Allow-Origin', '*'); //using cors
    res.set("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");

    if (err)
        res.status(500).send('Something went wrong: ' + err.message);
    else
        next();
});

// -----------------------------------------------
//route handling is delegated to:
var users = require('./users.js');
app.use('/blogfog/users/', users);

var posts = require('./posts.js');
app.use('/blogfog/posts/', posts);

// -----------------------------------------------
app.listen(port, function () {
  console.log('Server listening on port: ' + port);
})




