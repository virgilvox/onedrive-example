# node-onedrive-unofficial v0.0.6

`node-onedrive-unofficial` is a limited OneDrive client using the [new OneDrive API](http://dev.onedrive.com).

What works:

* authentication
* uploading a single file using the chunked uploader
* raw API calls

What doesn't work yet:

* convenience methods for everything else
* Passport integration for OAuth2 (currently manual)
* self-hosted authentication server


## Getting started
1. [Install Node.js](https://nodejs.org/download/) (includes npm)

   _Note to Windows users installing Node.js for the first time: You may need to sign out of your Windows account for your PATH changes to take effect._
	
2. Install **node-onedrive-unofficial** using npm
	
	``npm -g install node-onedrive-unofficial``
	
3. Get a **one-time sign-in code** for your Microsoft account here:
	[https://seattle.gregedmiston.com/scratch/onedrive-auth](https://seattle.gregedmiston.com/scratch/onedrive-auth/)
	
	_Want to use your own app ID and sign-in page for redistribution?  See "Advanced authentication" section near the bottom._

4. **Redeem your sign-in code using onedrive.js**

   * If you installed globally using ``npm -g``, then run:
     
     ``onedrive signin YOURCODEHERE``          

   * If you installed the package locally or don't have your PATH configured for npm, you can run it locally:
   
     ``node ./node-modules/node-onedrive-unofficial/onedrive.js signin YOURCODEHERE``
     
5. Try it out using the command line first.

   **For help:**
   
   ``onedrive --help ``
   
   **Get a folder listing of your OneDrive:**
	
   ``onedrive api /drive/root/children ``
   
###Using the command line
   
**Upload ./localfolder/foo.txt to /destination.txt**

``onedrive put ./localfolder/foo.txt /destination.txt``

**Get a folder listing of your OneDrive:**

``onedrive api /drive/root/children``

**Delete file /filetodelete.txt**

``onedrive api --method=DELETE /drive/root:/filetodelete.txt``
   
**Rename /oldname.txt to /newname.txt:**

``onedrive api --method=PATCH /drive/root:/oldname.txt --body='{"name": "newname.txt"}``

See the [full list of OneDrive APIs](http://onedrive.github.io/README.htm#root-resources).

### Using the npm package in node.js

**Include the package**

```js
var onedrive = require('node-onedrive-unofficial');
var account = null; // use built-in easy authentication
```

The examples below use the built-in app ID.  These assume that you have already signed in using the command line **signin** command described in *Getting started*. 

**Upload ./localfolder/foo.txt to /destination.txt**

```js
onedrive.put( account, './localfolder/foo.txt', '/destination.txt', function(uploadedItem, err) {
  if (!err) {
  	// do something with uploadedItem
  }
});
```

**Get a folder listing of your OneDrive:**

```js
onedrive.api( account, {
  path: '/drive/root/children'
}, function(folderListing, err) {
  if (!err) {
    // do something with folderListing
  }
});
```

**Rename /oldname.txt to /newname.txt**

```js
onedrive.api( account, {
  path: '/drive/root:/oldname.txt',
  method: 'PATCH',
  body: {"name": "newname.txt"}
}, function(response, err) {
  if (!err) {
    // success
  }
});
```

**Delete file /filetodelete.txt**

```js
onedrive.api( account, {
  path: '/drive/root:/filetodelete.txt',
  method: 'DELETE'
}, function(response, err) {
  if (!err) {
    // success
  }
});
```

## Advanced authentication
### Developer IDs
There are 2 options for developer IDs:

1. **Use the default developer ID.**  Requires authenticating using my janky website. The default developer config is provided in the `microsoft-developer-config.json` file in the npm package.
   * **command line**:  No arguments are necessary.
   * **node**: Passing `null` for the first argument will use the default developer config.
2. **Make your own developer ID and OAuth2 callback website.** Read more in the [OneDrive API docs](http://onedrive.github.io/auth/msa_oauth.htm).  You can [sign up for a Microsoft developer ID](http://go.microsoft.com/fwlink/p/?LinkId=193157).
   * You will need to store your `clientId`, `clientSecret`, and `redirectUri` in a JSON object.
   * **command line**: Save a file with your developer config JSON.  Provide that JSON file with `--config=myDevConfig.json` during any call.
   * **node**: Pass the developer config JSON object as the first parameter to any of the OneDrive methods.
   
### Token storage
There are 2 options for storing user tokens:

1. **Use the default user token storage.**  After signin, tokens are stored as `.microsoft-user-tokens.json` in your user's home folder. By default, tokens are automatically read from this path and written with updated tokens. 
   * **command line**:  No arguments are necessary.
   * **node**: Passing `null` for the first argument will use the default token storage.
2. **Provide your own token storage.**
   * **command line**:  Provide `--token myTokenFile.json` with every call.
   * **node**:  Pass the developer config JSON object (see section above) as the first parameter to any of the OneDrive methods.  You should append a `lastAuthTokens` section to the config.  With every response, you will get an updated token.
