//it's good practice to place this file in
//another folder than the server-files

var confdata = {
    dbpass: 'root',
    secret: 'fizzysoda',
    multer: {
        dest: 'uploads/',
        limits: {
            fieldSize: 1000,
            fields: 5,
            fileSize: 1000000,
            parts: 6
        },
        fileFilter: function (req, file, cb) {

            var filetypes = /jpeg|jpg|png/;
            var ext =/\.(jpg|jpeg|png)$/;

            var chk1 = filetypes.test(file.mimetype);
            var chk2 = ext.test(file.originalname.toLowerCase());

            if (chk1 && chk2) {
              return cb(null, true);
            }

            cb("filetype_error");
        }
    },
    err: {
        server_err: {
            code: 1,
            msg: "Server error - something went wrong",
            dscr: ""
        },
        upload_err: {
            code: 10,
            msg: "Upload error - something went wrong",
            dscr: ""
        },
        upload_err_filesize: {
            code: 11,
            msg: "Upload error - file to big",
            dscr: ""
        },
        upload_err_filetype: {
            code: 12,
            msg: "Upload error - wrong filetype",
            dscr: ""
        },
        upload_err_filecontent: {
            code: 13,
            msg: "Upload error - invalid content",
            dscr: ""
        },
        db_err: {
            code: 20,
            msg: "Database error - something went wrong",
            dscr: ""
        },
        db_err_null_field: {
            code: 21,
            msg: "Database error - empty or wrong field data",
            dscr: ""
        },
        db_err_not_unique: {
            code: 22,
            msg: "Database error - field-data is not unique",
            dscr: ""
        },
        db_err_busy: {
            code: 23,
            msg: "Database error - database busy",
            dscr: ""
        },
        db_err_can_not_delete: {
            code: 24,
            msg: "Database error - can't delete row",
            dscr: ""
        },
        db_err_invalid_post_id: {
            code: 25,
            msg: "Database error - invalid post ID",
            dscr: ""
        },
        auth_err_no_token: {
            code: 31,
            msg: "Authorization error - no token",
            dscr: ""
        },
        auth_err_invalid_token: {
            code: 32,
            msg: "Authorization error - invalid token",
            dscr: ""
        },
        auth_err_user_passw: {
            code: 33,
            msg: "Authorization error - wrong username or password",
            dscr: ""
        },
        auth_err_adm_required: {
            code: 34,
            msg: "Authorization error - only adminstrators can perform this task",
            dscr: ""
        }
    }
}

exports.data = confdata;
