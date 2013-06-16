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


var server = http.createServer(handler)

var engine = EngineServer(socketHandler)

engine.attach(server, "/draft")

server.listen(9001, function() {
    console.log("Listening on port 9001")
})

function handler (req, res) {
  var remoteIP = req.headers["x-forwarded-for"]
  console.log("authenticating", remoteIP)
  authenticate(remoteIP, function (authd) {
    if (authd) return mountMain(req, res)
    else return mountAuth(req,res)
  })
}


function socketHandler (stream) {

  var mx = MuxDemux()

  mx.on('error', function () {
    stream.destroy()
  })

  stream.on('error', function () {
    mx.destroy()
  })

  mx.on('connection', function (conn) {

    if (conn.meta === "compile") {

      //Save input field to file
      var fstream = fs.createWriteStream(textfile, fsops)
      conn.pipe(fstream)

      fstream.on('close', function () {
        compileStream(mx)
      })
    }

    if (conn.meta === "data") {
      compileStream(mx)
    }

    if (conn.meta === "auth") {

      var pxx = ''
      conn.on('data', function (data) {
        pxx += data
      })

      conn.on('end', function ()  {
        if (pxx === "conrad") {
          console.log("adding", stream.remoteAddress)
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


function compileStream (mx) {

  var child = exec('htlatex ' + "draftBP.tex", {"cwd": "static"}, html2latex)

  function html2latex (error, stdout, stderr) {

    if (error) return console.log(error)

    fs.createReadStream(textfile, fsops).pipe(mx.createWriteStream('text'))

    fs.createReadStream(htmlfile, fsops)
    .pipe(mx.createWriteStream('html'))

  }
}

function authenticate (addr, cb) {
  db.get(addr, function (err, value) {
    if (err && !value) return cb(false)
    else return cb(true)
  })
}