var resource  = require('resource'),
    replicator = resource.define('replicator'),
    path = require('path'),
    fs = require('fs');

replicator.schema.description = "replicator service for big instances";

replicator.method('push', push, {
  "description": "pushes current big instance to a remote big instance",
  "properties": {
    "options": {
      "type": "object",
      "properties": {
        "path": {
          "description": "the path of the big instance to push",
          "type": "string",
          "default": "."
        },
        "location": {
          "description": "the location to push the big instance",
          "type": "string",
          "default": "localhost"
        }
      }
    },
    "callback": {
      "type": "function"
    }
  }
});

replicator.method('pull', pull, {
  "description": "pulls a big instance from a remote big instance",
  "properties": {
    "options": {
      "type": "object",
      "properties": {
        "path": {
          "description": "the path to pull the big instance from",
          "type": "string"
        },
        "location": {
          "description": "the type of location big is pulling from",
          "type": "string",
          "enum": ["fs", "http"]
        },
        "targetDir": {
          "description": "the location to extract big instance",
          "type": "string"
        }
      }
    },
    "callback": {
      "type": "function"
    }
  }
});

replicator.method('listen', listen, {
  "description": "starts a listening replicator service capable of recieving big push requests"
});

function listen () {

  resource.http.app.get('/replicator', function(req, res) {
    // TODO: build replicator status page
    //       - list of snapshots
    //       - replication log
    //       - replication sources
    res.send('<form method="post" enctype="multipart/form-data">'
        + '<p>snapshot: <input type="file" name="snapshot" /></p>'
        + '<p><input type="submit" value="Upload" /></p>'
        + '</form>');
  });

  resource.http.app.post('/replicator', function(req, res, next){

    //
    // Get the temporary upload location of the file
    //
    var tmpPath = req.files.snapshot.path;

    //
    // Set destination path
    //
    var targetPath = process.env.HOME + '/.big/snapshots/remote/' + req.files.snapshot.name,
        targetDir = process.env.HOME + '/.big/snapshots/remote/' + req.files.snapshot.name + '/';

    //
    // TODO only allow tar files
    //

    //
    // Move the file from temporary location to destination
    //
    fs.rename(tmpPath, targetPath, function(err) {
       if (err) {
         throw err;
       }
       //
       // Remove the temporary file from upload folder
       //
       fs.unlink(tmpPath, function() {
           if (err) {
             throw err;
           }
           res.send('File uploaded to: ' + targetPath + ' - ' + req.files.snapshot.size + ' bytes');
           res.end('snapshot uploaded');
           //
           // Now that the snapshot has been uploaded, trigger the pull
           //
           replicator.pull({
             path: targetPath,
             targetDir: targetDir,
             location: "fs"
           }, function(err, result){
             if (err) {
               throw err;
             }

             console.log('pulled remote snapshot to ' + targetDir);

             //
             // Prepare the current big instance for an update
             // This includes creating a backup of the current instance in ~./.big/snapshots/local/
             //
             prepareForUpdate(function(err, result) {
               //
               // After the current instance has been prepared for an update,
               // actually run the update
               //
               update(targetPath + '/package', path.resolve('.'), function(err, result){
                 if (err) {
                   throw err;
                 }
                 console.log('moved remote snapshot to ' + path.resolve('.'));
                 console.log('restart needed to update');
                 console.log('exiting process.... ( there should be a process monitor watching this )');
                 process.exit();
               });
             });
           });
       });
    });

  });

};

function prepareForUpdate (callback) {

  var path = require('path'),
      ncp = require('ncp').ncp,
      name = tarName();

  //
  // Create a backup of the current version ( just in case )
  //
  compress({
    path: '.',
    targetPath: process.env.HOME + '/.big/snapshots/local/' + name,
    name: name
  }, function(err, result) {

    if (err) {
      //
      // It's important to not continue if the backup was not made,
      // without a backup, deleting the local could cause loss of files
      //
      console.log('error in backing up local copy. do not continue.')
      throw err;
      return;
    }

   console.log('current instance has been backed up to ', err, result);

    //
    // TODO: Remove the current source directory
    //
    // Leaving this commented out for development
    // The current update behavior will overwrite older copies of files
    //
    // console.log('WARN: about to delete' + path.resolve('.'));
    // fs.rmdir(path, [callback])

    callback(null);
  });

}

function update (source, target, callback) {

  var ncp = require('ncp').ncp;

  //
  // Set ncp max concurrency to 16
  //
  ncp.limit = 16;

  //
  // Copy all the files from /.big/snapshots/remote/the-snapshot/ to the current working directory
  //
  ncp(source, target, function (err) {
   if (err) {
     return callback(err);
     return console.error(err);
   }
   callback(null, 'copied');
  });

}

// pushes current big instance to another
function push (options, callback) {

  var request = require('request');

  options.name = tarName();
  options.targetPath = process.env.HOME + '/.big/snapshots/local/' + options.name;

  // create tarball of local instance
  compress(options, function(err, result){

    //
    // Connect to remote server
    //
    var r = request.post('http://localhost:8888/replicator');
    var form = r.form();

    //
    // Upload local instance to remote
    //
    form.append('snapshot', fs.createReadStream(process.env.HOME + '/.big/snapshots/local/' + result));
    r.on('end', callback);

    // TODO: remote instance restarts and pipes back success / fail message

    //
    // TODO:
    //
      // if no connection can be found, throw error
      // in the future, we could add prompt to noc noc over ssh and try push again

  });

}

//
// "Pulls" a big instance from a local or remote source,
//  and extracts it
//
function pull (options, callback) {
  //
  // Extract tarball into the /.big/snapshots/remote/ folder
  //
  extract(options, function(err, result){
    callback(err, result);
  });
  //
  // TODO: determine if path to pull is a remote of local file
  //
    // if local, extract to hd
    // if remote, fetch tar from remote server, then extract to hd
}

function extract (options, callback) {

  var fstream = require('fstream'),
  fstreamNpm = require('fstream-npm'),
  zlib = require('zlib'),
  tar = require('tar');

  //
  // Choose the directory where the snapshot will be extracted
  //
  var extractor = new tar.Extract({
    path: options.targetDir
  });

  //
  // Read in the contents of the snapshot as a stream,
  // and pipe that to Gunzip which will extract the contents of the tar
  //
  fs.createReadStream(options.path).pipe(zlib.Gunzip()).pipe(extractor).on('end', function () {
    callback(null, {
      source: options.path,
      target: options.targetDir
    });
  });

};

function compress (options, callback) {

  var fstream = require('fstream'),
  fstreamNpm = require('fstream-npm'),
  zlib = require('zlib'),
  tar = require('tar');

  fstreamNpm({ path: options.path })
    .on('error', callback)
    .pipe(tar.Pack())
    .on('error', callback)
    .pipe(zlib.Gzip())
    .on('error', callback)
    .pipe(fstream.Writer({ type: "File", path: options.targetPath }))
    .on('close', function () {
      callback(null, options.name);
    });

};

//
// Creates a new tar file name based on current time
//
function tarName () {
  var name = '',
      now = new Date();
  name = now.toString();
  name = name.replace(/ /g, '-');
  name = name.replace(/\)/g, '');
  name = name.replace(/\(/g, '');
  name += ('-' + miniID());
  name += '.tar';
  return name;
};

//
// Since date/times are being used as unique ids for tars,
// a small unique indentifer needs to be appended to the tar name,
// to ensure uniqueness in case multiple tars are,
// generated in the same second ( yes, that can happen )
//
function miniID () {
  var text = "",
      possible = "0123456789ABCDEFxx";
  for( var i=0; i < 5; i++ ) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

exports.replicator = replicator;

exports.dependencies = {
  "fstream": "*",
  "fstream-npm": "*",
  "tar": "*",
  "request": "*",
  "ncp": "*"
};