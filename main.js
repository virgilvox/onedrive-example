var onedrive = require('node-onedrive-unofficial');
var account = null; // use built-in easy authentication

var meshblu = require('meshblu');
var meshbluJSON = require('./meshblu.json');

var uuid    = meshbluJSON.uuid;
var token   = meshbluJSON.token;

var conn = meshblu.createConnection({
  "uuid": uuid,
  "token": token
});

var MESSAGE_SCHEMA = {
  "type": 'object',
  "properties": {
    "url": {
      "type": "string"
    },
    "folder":{
      "type": "string",
      "default": "hp"
    }
  }
};


conn.on('notReady', function(data){
  console.log('UUID FAILED AUTHENTICATION!');
  console.log(data);
});

conn.on('ready', function(data){
  console.log('UUID AUTHENTICATED!');
  console.log(data);

  conn.update({
    "uuid": uuid,
    "messageSchema": MESSAGE_SCHEMA
  });


  conn.on('message', function(data){

    var payload = data.payload;
    var file = {};
    var filename = Date.now() + ".jpg";
    var url = payload.url;
    var folder = payload.folder;

    var bodyJSON = {"name": filename, "@content.sourceUrl":  url, "file": file };

    onedrive.api(null, {
      path: '/drive/items/root:/'+ folder +':/children',
      method: 'POST',
      bodymime: 'application/json',
      headers: {
        "Prefer" : "respond-async"
      },
      body: bodyJSON
    }, function(res, err) {

    });

  });

});

