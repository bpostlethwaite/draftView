var engine = require("engine.io-stream")
  , MuxDemux = require('mux-demux')

var estream = engine("/draft")

var mx = MuxDemux()

var textContainer = document.querySelector('#text-container')
var htmlContainer = document.querySelector('#html-container')


var authInput = document.querySelector('#auth-input')
var authButton = document.querySelector('#auth-button')

enterToClick(authInput, authButton)

authButton.addEventListener('click', function () {
  var pxx = authInput.value
  authInput.value = ''
  var cs = mx.createWriteStream("auth")
  cs.write(pxx)
  cs.end()

  setTimeout( function () {
    location.reload()
  }, 500)
})



estream.pipe(mx).pipe(estream)


function enterToClick(keyPressElem, clickElem) {
  keyPressElem.onkeypress = function (e) {
    var code = (e.keyCode ? e.keyCode : e.which)
    if (code === 13) {
      clickElem.click()
    }
  }
}