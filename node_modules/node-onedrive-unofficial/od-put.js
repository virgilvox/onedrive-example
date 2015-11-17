#!/usr/bin/env node
var odApiCall = require('./od-api-call');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var url = require('url');
var chalk = require('chalk');
var https = require('https');

var MAX_CHUNK_RETRIES = 2;

module.exports = function( config, srcFilePath, destinationPath, finalCallback ) {
  new Uploader( config, srcFilePath, destinationPath, finalCallback );
}

function Uploader( config, srcFilePath, destinationPath, finalCallback ) {
  var destinationPathEncoded = escape(destinationPath);
  var createSessionPath = '/v1.0/drive/root:' + destinationPathEncoded + ':/upload.createSession';

  this.config = config; 
  this.srcFileStat = fs.statSync( srcFilePath );
  this.srcFile = fs.openSync( srcFilePath, 'r');
  this.totalFileSize = this.srcFileStat['size'];
  this.uploadUrl = null;
  
  this.initialFragmentSize = 65000000;
  this.maxFragmentSize = 65000000;
  
  var uploadOptions = {
    '@name.conflictBehavior': 'rename'
  };
  
  var self = this;
  
  odApiCall( config, {
    path: createSessionPath,
    method: 'POST',
    body: uploadOptions,
    bodymime: 'application/json'
  }, function( response, updatedToken, error ) {
    if(!error) {
      self.uploadUrl = url.parse(response.uploadUrl);
      self.uploadFirstFragment(self.uploadUrl, finalCallback );
    } else {
      finalCallback(null, error);
    }
  });
}

Uploader.prototype.uploadFirstFragment = function( uploadUrl, finalCallback ) {
  this.uploadFragment(0, this.initialFragmentSize, this.totalFileSize - 1, finalCallback);
};

Uploader.prototype.uploadFragment = function(start, maxFragmentSize, maxEnd, finalCallback, retryCount) {
  if (!retryCount) retryCount = 0;
  var remainingBytes = this.totalFileSize - start;
  var fragmentSize = Math.min(maxFragmentSize, remainingBytes);
  var end = Math.min(start + fragmentSize - 1, maxEnd);
  
  var readBuffer = new Buffer(fragmentSize);
  fs.readSync( this.srcFile, readBuffer, 0, readBuffer.length, start);
  
  var contentRangeHeader = 'bytes ' + start + '-' + end + '/' + this.totalFileSize;
  
  var self = this;
  
  odApiCall( self.config, {
    path: this.uploadUrl.pathname,
    host: this.uploadUrl.hostname,
    method: 'PUT',
    body: readBuffer,
    contentrange: contentRangeHeader,
    contentlength: readBuffer.length
  }, function( response, updatedToken, error ) {
    if(!error) {
      if (argv.v) console.log(chalk.gray('Chunk completed: ' + contentRangeHeader));
      if (response && response.id) {
        finalCallback(response);
        fs.close(self.srcFile);
      } else {
      // queue next chunk
        if (!retryCount && end + 1 < self.totalFileSize) {
          var newStart = end + 1;
          var maxEnd = self.totalFileSize - 1;
          self.uploadFragment(newStart, self.maxFragmentSize, maxEnd, finalCallback );
        }
      }
    } else {
      if (argv.v) console.log(chalk.gray('Chunk failed: ' + contentRangeHeader + ' Retry count: ' + retryCount));
      if (retryCount >= MAX_CHUNK_RETRIES) {
        finalCallback(null, error);
      } else {
        self.uploadFragment(start, maxFragmentSize, maxEnd, finalCallback, retryCount+1);
      }
    }
  });
  
}

// command line
if (require.main === module) {
  var chalk = require('chalk');
  
  new Uploader( null, argv._[0], argv._[1], function( result, err ) {
    if (!err) {
      console.log(chalk.green('Success:'));
      console.log(result);
    } else {
      if (typeof err === 'object') {
        console.error(chalk.red(JSON.stringify(err, null, 2)));
      } else {
        console.error(chalk.red(err));
      }
    }
  });
}
