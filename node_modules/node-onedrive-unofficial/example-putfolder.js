#!/usr/bin/env node
var onedrive = require('./');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var url = require('url');
var chalk = require('chalk');
var https = require('https');


// command line
if (require.main === module) {
  uploadFolderAndGetDownloadUrlsToEveryFileInside( argv._[0], argv._[1], function( res, err) {
    if (!err) {
      console.log(chalk.green('Success!'));
      console.log(res);
      process.exit(0);
    } else {
      console.error(chalk.red('Failure.'));
      console.error(err);
      process.exit(1);
    }
  });
}

function uploadFolderAndGetDownloadUrlsToEveryFileInside(sourceFolderPath, destFolderName, callback) {
  destFolderName = destFolderName.replace('/', ''); // no slashes
  onedrive.api(null, {
    path: '/drive/root:/' + destFolderName,
    method: 'DELETE'
  }, function(res, err) {
    // ignore error since we don't care if there's an existing folder
    onedrive.api(null, {
      path: '/drive/root/children',
      method: 'POST',
      bodymime: 'application/json',
      body: '{"name": "' + destFolderName + '", "folder": {}}'
    }, function(res, err) {
      if (err) return callback(res, err);
      
      var filenames = fs.readdirSync(sourceFolderPath);
      var callbackCount = 0;
      var downloadUrls = {};
      
      for (var i=0; i<filenames.length; i++) {
        var srcVideoPath = sourceFolderPath + filenames[i];
        var destVideoPath = '/' + destFolderName + '/' + filenames[i];
        onedrive.put( null, srcVideoPath, destVideoPath, function( res, err ) {
          if (err) return callback(res, err);
          
          var video = res;
          onedrive.api(null, {
            path: '/drive/items/' + res.id + '/content',
            method: 'GET'
          }, function(downloadUrlResponse, err) {
            callbackCount++;
            downloadUrls[res.name] = downloadUrlResponse;
            if (callbackCount == filenames.length) {
              callback(downloadUrls);
            }
          });
        });
      }
      
    });
  });
}



module.exports = uploadFolderAndGetDownloadUrlsToEveryFileInside;
