#!/usr/bin/env node
var http = require('http');
var https = require('https');
var util = require('util');
var url = require('url');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

if (argv.v) https = require('./https-debug');

var microsoftAccount = require('./microsoft-account');
var DEFAULT_API_VERSION = '1.0';

module.exports = function(microsoftAccountConfig, options, callback) {
  var method = options.method ? options.method.toUpperCase() : 'GET';
  var path = options.path || '';
  var body = options.body || null;
  var headerParams = options.headers || null;
  if (body != null && typeof body === 'object' && body.constructor.name === 'Object') body = JSON.stringify(body, null, 2);

  if (!options.host) path = getValidPath(path);

  // if no config file provided, read it from the filesystem
  if (!microsoftAccountConfig) {
    microsoftAccount.getConfigFromFiles( null, null, null, function( config, err ) {
      if (!err) {
        module.exports( config, options, callback );
      } else {
        callback(null, null, err);
      }
    });
    return;
  }

  microsoftAccount.getAccessToken(microsoftAccountConfig, function(updatedTokens, err) {
    if (err) {
      callback(null, updatedTokens, err);
    } else {
      var headers = {};
      if (options.contentlength) {
        headers['Content-Length'] = options.contentlength;
      } else if (body) {
        headers['Content-Length'] = body.length;
      }
      if (options.contentrange) headers['Content-Range'] = options.contentrange;
      if (options.bodymime) {
        headers['Content-Type'] = options.bodymime;
      } else {
        if (body && body.substr &&
          (body.substr(0,1) == '{' || body.substr(0,1) == '[') ) {
        // assume json
        headers['Content-Type'] = 'application/json';
        }
      }
      headers['Authorization'] = 'Bearer ' + updatedTokens.access_token;

      Object.keys(headerParams).forEach(function(key) {
          headers[key]= headerParams[key];
        });


      var reqOptions = {
        hostname: options.host || 'api.onedrive.com',
        port: 443,
        method: method,
        path: path,
        agent: options.agent,
        headers: headers
      };

      var responseData = '';

      var request = https.request(reqOptions, function(response) {
        response.on('data', function(data) {
          responseData += data;
        });
        response.on('end', function() {
          var responseBody = responseData;
          if (response.headers['content-type'] && response.headers['content-type'].indexOf('application/json') == 0) {
            responseBody = JSON.parse(responseData);
          }
          if (response.statusCode >= 400) {
            callback( responseBody, updatedTokens, {
              'statusCode': response.statusCode,
              'statusMessage': response.statusMessage
            });
          } else {
            if (response.statusCode >= 300) responseBody = response.headers['location'];
            callback( responseBody, updatedTokens );
          }
        });
        response.on('err', function(e) {
          callback( null, updatedTokens, e);
        });
      });

      request.on('err', function(e) {
        callback( null, updatedTokens, e);
      });

      if (body) request.write(body);

      request.end();
    }
  });

}

function getValidPath(path) {
  var trailingSlashIfNeeded = path.indexOf('/') == 0 ? '' : '/';
  if (path.length == 0) {
    // '' becomes '/v1.0/drive'
    return '/v' + DEFAULT_API_VERSION + '/drive';
  } else if (path.indexOf('/drive') < 0) {
    // 'root' becomes '/v1.0/drive/root'
    return '/v' + DEFAULT_API_VERSION + '/drive' + trailingSlashIfNeeded + path;
  } else if (path.indexOf('/v') != 0) {
    // '/drive/root' becomes '/v1.0/drive/root'
    return '/v' + DEFAULT_API_VERSION + trailingSlashIfNeeded + path;
  } else {
    return path;
  }
}

// command line
if (require.main === module) {
  var argv = require('minimist')(process.argv.slice(2));
  var chalk = require('chalk');
  var path = (argv._.length > 0) ? argv._[0] : '';

  module.exports(null, {
    path: path,
    method: argv.method,
    body: argv.body,
    bodymime: argv.bodymime
  }, function(result, tokens, err) {
    if (!err) {
      console.log(chalk.green(JSON.stringify(result, null, 2)));
      process.exit(0);
    } else {
      console.error(chalk.red(err));
      process.exit(1);
    }
  });
}
