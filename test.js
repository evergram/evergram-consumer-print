/**
 * Module dependencies.
 */

var common = require('evergram-common');
var instagram = common.instagram;
var User = common.models.User;
var PrintableImageSet = common.models.PrintableImageSet;
var printManager = common.print.manager;
var consumer = require('./app/consumer');

//init db
common.db.connect();

var josh = '550e6a662e76ea053d98e64c';
var luisa = '550ce83feb09674d27237923';

User.findOne({'_id': josh}, function (err, user) {
    if (user != null) {
        printManager.findCurrentByUser(user).then(function (imageSet) {
            consumer.saveFiles(imageSet);
        });
    }
});