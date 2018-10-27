var sanitizeHtml = require('sanitize-html');

var obj = {
    clean: cleanHTML
}

function cleanHTML(dirty) {
    return sanitizeHtml(dirty);
}

exports.utils = obj;
