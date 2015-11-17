'use strict';

var httpsOriginal = require('https');
var util = require('util');
var chalk = require('chalk');

var httpsDebug = Object.create(httpsOriginal);

httpsDebug.request = function(options, cb) {
  var req = httpsOriginal.request(options, function(response) {
    console.log(chalk.gray('Response: '));
    console.log(chalk.blue.bold('HTTP/' + response.httpVersion + ' ' + response.statusCode + ' ' + response.statusMessage));
    if (response.rawHeaders) for (var i=0;i<response.rawHeaders.length;i+=2) {
      console.log( chalk.blue(response.rawHeaders[i] + ': ' + response.rawHeaders[i+1]));
    }

    var responseData = '';
    response.on('data', function(data) {
      responseData += data;
    });
    response.on('end', function(data) {
      console.log('');
      console.log(chalk.blue.bold(responseData));
      console.log(chalk.gray("\nResponse complete"));
    });
    cb(response);
  });
  req.on('error', function(e) {
    console.log('Error in HTTPS request: ' + e);
  });
  req.on('socket', function(e) {
    console.log(chalk.gray('Request: '));
    var reqHeaders = req._header.split("\n");
    console.log(chalk.red(chalk.bold(reqHeaders[0])));
    for (var i=1;i<reqHeaders.length;i++) {
      console.log(chalk.red(reqHeaders[i]));
    } 
    console.log(chalk.red(''));
  });
  return req;
}

module.exports = httpsDebug;
