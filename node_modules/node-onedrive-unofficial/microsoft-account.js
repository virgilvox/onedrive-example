#!/usr/bin/env node
var https = require('https');
var util = require('util');
var url = require('url');
var fs = require('fs');
var path = require('path');
var querystring = require('querystring');
var argv = require('minimist')(process.argv.slice(2));

if (argv.v) https = require('./https-debug');

/*
  config parameters:
  
    REQUIRED:
    
    clientId: oauth client id
    clientSecret: oauth client secret
    redirectUri: oauth redirect URI
    
    FIRST TIME:

    oneTimeAuthCode: auth code provided by service at https://seattle.gregedmiston.com/scratch/onedrive-auth/
    
    AFTER:
    
    lastAuthTokens {
      access_token
      expires_on
    }

  cb(tokens,error) where tokens is an object with access_token and expires_on
*/

module.exports.getAccessToken = function(config, cb) {
  var now = new Date().getTime();
  
  if (config.oneTimeAuthCode) {
    getTokens(config, cb);
  } else if (config.lastAuthTokens && config.lastAuthTokens.expires_on && config.lastAuthTokens.expires_on > now) {
    var timeLeftInMinutes = Math.floor((config.lastAuthTokens.expires_on - now) / 1000 / 60);
    
    // access token is still valid. return that.
    cb( config.lastAuthTokens );
    
    // if less than softRefreshMinutes are left, then request a new access token anyways
    // client must handle second callback in this case
    if (config.softRefreshMinutes && timeLeftInMinutes < config.softRefreshMinutes ) {
      getTokens(config, cb);
    }
  } else if (config.lastAuthTokens && config.lastAuthTokens.refresh_token) {
    // refresh token needed
    getTokens(config, cb);
  } else {
    cb(null, 'No valid tokens.');
  }
}

module.exports.getConfigFromFiles = function(configFileName, tokenFileName, oneTimeAuthCode, callback) {
  var DEFAULT_CONFIG_PATH = require.resolve('./microsoft-developer-config.json');
  var DEFAULT_TOKENS_PATH = path.resolve(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE, '.microsoft-user-tokens.json');

  var config = {};
  var configFileName = configFileName || DEFAULT_CONFIG_PATH;
  
  try {
    config = JSON.parse(fs.readFileSync(configFileName, 'utf8'));
  } catch (e) {
    return callback(null, 'CONFIG_READ_ERROR')
  }
  
  var tokenFileName = tokenFileName || config.tokenFilePath || DEFAULT_TOKENS_PATH;
  
  config.tokenFileName = tokenFileName;
  
  if (oneTimeAuthCode) {
    config.oneTimeAuthCode = oneTimeAuthCode;
  } else {
    // read token file
    try {
      config.lastAuthTokens = JSON.parse(fs.readFileSync(tokenFileName, 'utf8'));
    } catch (e) {
      return callback(null, 'TOKEN_READ_ERROR');
    }
  }
  
  module.exports.getAccessToken(config, function(tokens, serverError) {
    if (!serverError && tokens && tokens.access_token) {
      fs.writeFileSync(tokenFileName, JSON.stringify(tokens, null, 2));
      config.lastAuthTokens = tokens;
      return callback(config);
    } else {
      return callback(null, serverError);
    }
  });
}


function getTokens(config, cb) {
  if (!config.oneTimeAuthCode && !config.lastAuthTokens.refresh_token) throw Error('getTokens: refreshToken or authCode required');
    
  var postDataOptions = {
    'client_id': config.clientId,
    'client_secret': config.clientSecret,
    'redirect_uri': config.redirectUri
  };
  
  if (config.oneTimeAuthCode) {
    postDataOptions.grant_type = 'authorization_code';
    postDataOptions.code = config.oneTimeAuthCode;
  } else {
    postDataOptions.grant_type = 'refresh_token';
    postDataOptions.refresh_token = config.lastAuthTokens.refresh_token;
  }
  
  var postData = querystring.stringify(postDataOptions);
  var keepAliveAgent = new https.Agent({ keepAlive: true });

  var options = {
    hostname: 'login.live.com',
    port: 443,
    method: 'POST',
    path: '/oauth20_token.srf',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    },
    agent: keepAliveAgent
  };
  
  var authData = '';

  var request = https.request(options, function(response) {
    response.on('data', function(data) {
      authData = authData + data;
    });

    response.on('end', function(e) {
      handleTokenResponse(config, authData, cb);
    });
  });
  
  request.on('error', function(e) {
    cb(null, e);
  });
  
  request.write(postData);
  request.end();
}

function handleTokenResponse(config, data, cb) {
  var tokens = JSON.parse(data);
  
  if (tokens.error) {
    cb(null, tokens.error);
  } else {
    tokens.expires_on = tokens.expires_in * 1000 + (new Date().getTime());
    if (config.oneTimeAuthCode) tokens.code = config.oneTimeAuthCode;
    cb(tokens);
  }
}


// command line
if (require.main === module) {
  var chalk = require('chalk');
  
  module.exports.getConfigFromFiles( argv.config, argv.tokens, argv.code, function(config, err) {
    if (!err) {
      console.log(config);
    } else {
      if (err == 'CONFIG_READ_ERROR') {
        console.error(chalk.red('Could not read Microsoft Acccount dev config file.'));
        console.error(chalk.red('Specify a config file with --config config.json'));
      } else if (err == 'TOKEN_READ_ERROR') {
        console.error(chalk.red('Could not read tokens file.'));
        console.error(chalk.red('Specify a tokens file with --tokens tokenFileName.'));
      } else {
        console.error(chalk.red('Error retrieving tokens: ' + err));
      }
      process.exit(1);
    }
  });
}
