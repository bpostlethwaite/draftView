var engine = require("engine.io-stream")
  , MuxDemux = require('mux-demux')

var estream = engine("/draft")

var mx = MuxDemux()

var textContainer = document.querySelector('#text-container')
var htmlContainer = document.querySelector('#html-container')

mx.on('connection', function (stream) {

  if (stream.meta === "html") {

    htmlContainer.innerHTML = ''
    stream.on('data', function (data) {

      htmlContainer.innerHTML += data
    })
  }

  if (stream.meta === "text") {
    textContainer.value = ''
    stream.on('data', function (data) {

      textContainer.value += data
    })

  }
})


var compile = document.querySelector('.compile')

compile.addEventListener('click', function () {
  var cs = mx.createWriteStream("compile")
  cs.write(textContainer.value)
  cs.end()
})

var cs = mx.createWriteStream("data")
cs.end()

estream.pipe(mx).pipe(estream)