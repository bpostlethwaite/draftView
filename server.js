var http = require("http")
  , EngineServer = require("engine.io-stream")
  , st = require('st')
  , MuxDemux = require('mux-demux')
  , fs = require('fs')
  , exec = require('child_process').exec
  , levelup = require('levelup')
  , db = levelup('authdb')


var staticOptions = {
  path: './static/'
, url: '/'
, index: 'index.html' // use 'index.html' file as the index
, dot: false // default: return 403 for any url with a dot-file part
, passthrough: false // calls next instead of returning a 404 error
}


var mountMain = st(staticOptions)
staticOptions.index = 'auth.html'
var mountAuth = st(staticOptions)

var textfile = 'static/draftBP.tex'
var htmlfile = 'static/draftBP.html'

var fsops = {encoding: 'utf8'}

function handler (req, res) {

  authenticate(req.socket.remoteAddress, function (authd) {
    if (authd) return mountMain(req, res) //serve main site
    else return mountAuth(req,res)
    //    else return req.pipe(filed('static/auth.html')).pipe(res)
  })
}

var server = http.createServer(handler)

var engine = EngineServer(socketHandler)

/*
 * Warning HACK
 * Assign http connection info over to stream object
 * Note it would be better to do this in the module
 */
server.on('connection', function (conn) {
  engine.on('connection', function (estream) {
    estream.remoteAddress = conn.remoteAddress
  })
})

function socketHandler (stream) {
  // send back some numbers, you know...for fun

  var mx = MuxDemux()

  mx.on('error', function () {
    stream.destroy()
  })

  stream.on('error', function () {
    mx.destroy()
  })

  compileStream(mx)

  mx.on('connection', function (conn) {

    if (conn.meta === "compile") {
      conn.pipe(fs.createWriteStream(textfile, fsops))
      conn.on('end', function () {
        compileStream(mx)
      })
    }

    if (conn.meta === "auth") {

      var pxx = ''
      conn.on('data', function (data) {
        pxx += data
      })

      conn.on('end', function ()  {
        if (pxx === "conrad") {
          db.put(stream.remoteAddress, true, function (err) {
            if (err) return console.log('Ooops!', err) // some kind of I/O error
            else return true
          })
        }
      })
    }
  })

  stream.pipe(mx).pipe(stream)
}

// expose the engine instance at this url
engine.attach(server, "/draft")

server.listen(9002, function() {
    console.log("Listening on port 9002")
})


function compileStream (mx) {

  var child = exec('htlatex ' + "draftBP.tex", {"cwd": "static"}, html2latex)

  function html2latex (error, stdout, stderr) {

    if (error) return console.log(error)

    console.log('compiled ' + textfile)

    fs.createReadStream(textfile, fsops).pipe(mx.createWriteStream('text'))

    fs.createReadStream(htmlfile, fsops)
    .pipe(mx.createWriteStream('html'))

    return true
  }
}

function authenticate (addr, cb) {
  db.get(addr, function (err, value) {
    if (err && !value) return cb(false)
    else return cb(true)
  })
}