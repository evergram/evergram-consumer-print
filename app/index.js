'use strict';

/**
 * Module dependencies.
 */

var common = require('evergram-common');
var newrelic = require('newrelic');
var logger = common.utils.logger;
var config = require('./config');
var consumer = require('./consumer');
var Queue = require('slipstream');
var Sqs = require('slipstream-sqs');

//watch for kill/shutdown
process.on('SIGINT', function() {
    logger.warning('Shutting down');
});

//init db
common.db.connect();

//create queue consumer
var queue = new Queue({
    batchSize: 10,
    shutdownMaxWait: 300 * 1000,
    shutdownRetryWait: 5 * 1000,
    provider: new Sqs({
        region: config.aws.region,
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
        queueUrl: config.aws.sqs.print.url,
        visibilityTimeout: config.sqs.visibilityTime,
        waitTimeSeconds: config.sqs.waitTime
    })
});

queue.on(queue.EVENTS.ERROR, function(err) {
    logger.error(err);
});

queue.on(queue.EVENTS.QUEUE_PROCESSED, function() {
    logger.info('Queue processed');
});

queue.on(queue.EVENTS.MESSAGE_RECEIVED,
    newrelic.createBackgroundTransaction('message:process', function(message, done) {
        logger.info('Received message');

        if (message.data.hasPhotos === 'true') {
            consumer.consume(message).
                then(function() {
                    logger.info('Completed print & close account processing message for user ' + message.data.id);
                }).
                fail(function(err) {
                    logger.error(err);
                }).
                finally(function() {
                    newrelic.endTransaction();
                    done();
                });
        } else {
            consumer.closeAccountConsume(message).
                then(function() {
                    logger.info('Completed close account processing message for user ' + message.data.id);
                }).
                fail(function(err) {
                    logger.error(err);
                }).
                finally(function() {
                    newrelic.endTransaction();
                    done();
                });
        }
    }));

//kick off the process
logger.info('Started processing queue.');
queue.process();
