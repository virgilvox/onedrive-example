#!/usr/bin/env node
var odApiCall = require('./od-api-call');
var odPut = require('./od-put');
var microsoftAccount = require('./microsoft-account');

module.exports = {

  signin: function( microsoftAccountConfig, callback ) {
    return microsoftAccount.getAccessToken( microsoftAccountConfig, callback );
  },

  put: function( microsoftAccountConfig, srcFilePath, destinationPath, callback ) {
    return odPut( microsoftAccountConfig, srcFilePath, destinationPath, callback );
  },

  api: function( microsoftAccountConfig, options, callback ) {
    return odApiCall( microsoftAccountConfig, options, callback );
  }

};


// command line
if (require.main === module) {
  var argv = require('minimist')(process.argv.slice(2));
  var chalk = require('chalk');


  var showHelp = function() {
    console.log();
    console.log(chalk.cyan('onedrive ' + chalk.bold('signin') + ' your-one-time-code ' +
      '[--config='+chalk.underline('microsoft-developer-config.json')+'] ' +
      '[--token='+chalk.underline('microsoft-user-tokens.json')+'] [-v]'));
    console.log("\t\t authenticate to your Microsoft account");
    console.log("\t\t Get a code at " + chalk.cyan(chalk.underline("https://seattle.gregedmiston.com/scratch/onedrive-auth/")));
    console.log(chalk.gray("\t\t onedrive signin 9af8a09e-82ad-4ffb-756c-fa4111d0529f"));
    console.log();
    console.log(chalk.cyan('onedrive ' + chalk.bold('put') + ' [-v] sourcefile targetpath'));
    console.log("\t\t upload a file to a OneDrive path");
    console.log(chalk.gray("\t\t onedrive put ~/Documents/foo.txt /foo.txt"));

    console.log();
    console.log(chalk.cyan('onedrive ' + chalk.bold('api') + ' [-v] ' +
     '[--method=' + chalk.underline('POST') + '] ' +
     '[--body=' + chalk.underline("'{body}'") + '] ' +
     '[--bodymime=' + chalk.underline('application/json') + '] ' +
     'apipath'
   ));
    console.log("\t\t send a raw API request via HTTPS");
    console.log(chalk.gray("\t\t onedrive api /drive/root:/Documents:/children"));
    console.log(chalk.gray("\t\t onedrive api --method=DELETE /drive/root:/filetodelete"));
    console.log(chalk.gray("\t\t onedrive api --method=PATCH /drive/root:/oldname --body='{\"name\": \"newname\"}'"));
    console.log(chalk.black('.')); // reset color to fix some consoles
  }

  if (argv._.length < 1) return showHelp();

  switch (argv._[0]) {
    case 'signin':
      if (argv._.length < 2) return showHelp();
      microsoftAccount.getConfigFromFiles( argv.config, argv.tokens, argv._[1], function(config, err) {
        if (!err) {
          console.log(chalk.green('Authentication successful! Saved to ' + chalk.bold(config.tokenFileName)));
          process.exit(0);
        } else {
          if (err == 'CONFIG_READ_ERROR') {
            console.error(chalk.red('Could not read Microsoft Acccount dev config file.'));
            console.error(chalk.red('Specify a config file with --config microsoft-developer-config.json'));
          } else if (err == 'TOKEN_READ_ERROR') {
            console.error(chalk.red('Could not read user token file.'));
            console.error(chalk.red('Specify a tokens file with --tokens microsoft-user-tokens.json.'));
            console.error(chalk.red(''));
            console.error(chalk.red('If you do not have a token file yet, get a code at https://seattle.gregedmiston.com/scratch/onedrive-auth/'));
            console.error(chalk.red('then run signin --code aaaaaaaa-your-code-goes-hereeeeeee'));
          } else {
            console.error(chalk.red('Error retrieving tokens: ' + err));
          }
          process.exit(1);
        }
      });
      break;

    case 'put':
      if (argv._.length < 2) return showHelp();
      odPut(null, argv._[1], argv._[2], function( result, err ) {
        if (!err) {
          if (result) console.log(result);
          console.log(chalk.green(chalk.bold('Success')));
          process.exit(0);
        } else {
          if (typeof err === 'object') {
            console.error(chalk.red(JSON.stringify(err, null, 2)));
          } else if (err) {
            console.error(chalk.red(err));
          }
          console.error(chalk.red(chalk.bold('Failed')));
          process.exit(1);
        }
      });
      break;

    case 'api':
      odApiCall(null, {
        path: (argv._.length >= 2) ? argv._[1] : '',
        method: argv.method,
        body: argv.body,
        bodymime: argv.bodymime
      }, function(result, tokens, err) {
        if (!err) {
          console.log(chalk.green(JSON.stringify(result, null, 2)));
          console.log(chalk.green(chalk.bold('Success')));
          process.exit(0);
        } else {
          console.error(chalk.red(JSON.stringify(result, null, 2)));
          console.error(chalk.red(JSON.stringify(err, null, 2)));
          console.error(chalk.red(chalk.bold('Failed')));
          process.exit(1);
        }
      });
      break;

    default:
      showHelp();

  }

}
