/**
 * Module dependencies
 */
process.env.TZ = 'UTC';

var _ = require('lodash');
var common = require('evergram-common');
var moment = require('moment');
var printManager = common.print.manager;
var userManager = common.user.manager;
var printConsumer = require('../app/consumer');
var logger = common.utils.logger;

//init db
common.db.connect();

var options = {criteria: {'instagram.username': 'obrien.kimberley.a'}};
var start_date = "2015-09-27 14:00:00.000Z";
var end_date = "2015-10-27 14:00:00.000Z";



// print specific imageset fo user and date range
userManager.findAll(options).then(function(users) {
    var processUsers = [];
    _.forEach(users, function(user) {
        logger.info('user found ' + user.instagram.username);
        processUsers.push(user);
    });

    try {
	    var current = 0;
	    var run = function() {
	        logger.info('Processing ' + processUsers[current].instagram.username);

	        var query = {
	            criteria: { 
	                $and: [
	                    { "user.instagram.username" : processUsers[current].instagram.username },
	                    { startDate: {$eq: moment(start_date)} },
	                    { endDate: {$eq: moment(end_date)} }
	                ]
	            }
	        };

	        // get imageset for startdate provided
	        printManager.find(query).then(function(printableImageSet) {
	        // then find and save images for this user & imageset
	            logger.info('Printing Imageset for ' + processUsers[current].instagram.username + ' for period ' + printableImageSet.period);
	            return printConsumer.consume({ 
			            		data: { "id": printableImageSet._id }
			            	});

	        }).then(function(){
	            logger.info('Done processing ' + current);
	            current++;
	            if (current < processUsers.length) {
	                run();
	            } else {
	                logger.info('Done processing all');
	                process.exit(0);
	            }
	        }).fail(function(err) {
		        logger.error(err);
		        process.exit(1);
		    });
	    };

	    run();
	} catch(e) {
		logger.error(e);
		process.exit(1);
	}
});