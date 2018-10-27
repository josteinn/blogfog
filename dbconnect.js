var conf = require('./confdata').data; //configdata
const pgp = require('pg-promise')();
const PrpSt = require('pg-promise').PreparedStatement;

//ensure parity between heroku database and local database
const cn = process.env.DATABASE_URL || "postgres://postgres:root@localhost:5432/blogs";

const db = pgp(cn);

//prepared sql statements we are going to use
const ps = {}; //object that contains the statements
ps.userLogin  = new PrpSt('userLogin' ,'SELECT login, fullname, image, admin FROM users WHERE login=$1 AND password=$2');
ps.userLstOne = new PrpSt('userLstOne','SELECT login, fullname, image FROM users WHERE login=$1');
ps.userLstAll = new PrpSt('userLstAll','SELECT login, fullname, image FROM users');
ps.userDelete = new PrpSt('userDelete', 'DELETE FROM users WHERE login=$1 RETURNING *');
ps.userCreate = new PrpSt('userCreate','INSERT INTO users VALUES(DEFAULT, $1, $2, $3, $4, $5)');

ps.postCreate = new PrpSt('postCreate', 'INSERT INTO posts VALUES(DEFAULT, DEFAULT, $1, $2, $3, $4)');
ps.postDelete = new PrpSt('postDelete', 'DELETE FROM posts WHERE id=$1 AND login=$2 RETURNING *');
ps.postDelAdm = new PrpSt('postDelAdm', 'DELETE FROM posts WHERE id=$1 RETURNING *');
ps.postLstId  = new PrpSt('postLstId' , 'SELECT * FROM postsview WHERE id=$1'); 
ps.postLstAth = new PrpSt('postLstAth', 'SELECT * FROM postsview WHERE login=$1');
ps.postLstAll = new PrpSt('postLstAll', 'SELECT * FROM postsview');

exports.db = db;
exports.ps = ps;

