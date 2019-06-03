// (C) Wilbert van Ham 2017-2018, released under GNU affero public license
/* dialog: dialogWelcome (visible), dialogCongratulate, dialogContinue, dialogTime, dialogMoves
 * dialogTime, show on timesout for all games instead of dialogCongratulate
 * dialogContinue, show after a single games when there are more games to come
 * dialogMoves, show after maxMoves is reach for that games, reset current game
 */
// constants
var nDisk = 7
var nPeg = 3
// globals
var nDiskUsed
var pegDisk = [[],[],[]] // list of stacks 
var xPos = [], disk = [], yPos = [], dx
var iGame = 0 // counter in diskPos
var iAttempt = 0 // attempt at the game, increments on reaching maxMoves
var iMove = 0 // move number within attempt
var scale = 1
var t0, tAttempt = 0 // ms since 1970 Januari 1, Gregorian UTC

// get query string
var qsParm = new Array()
var query = window.location.search.substring(1)
var parms = query.split('&')
for (var i=0; i<parms.length; i++) {
	var pos = parms[i].indexOf('=')
	if (pos > 0) {
		var key = parms[i].substring(0,pos)
		var val = parms[i].substring(pos+1)
		qsParm[key] = val
	}
}

// set paramaters from query string
var debug = false
if("debug" in qsParm)
	debug = true

var ppn = 0
if("ppn" in qsParm)
	ppn = Number(qsParm["ppn"])
	
// initial disk position for each of 7 disks
diskPos = [[0,0,0,0,0,0,0]]
if('games' in qsParm && qsParm['games']!=""){
	diskPos = []
	decodeURIComponent(qsParm['games']).split('.').forEach( function(element) {
		diskPos.push(element.split(''))
	} )
}

maxMoves = []
for(key of diskPos)
	maxMoves.push(Number.MAX_SAFE_INTEGER)
if('maxMoves' in qsParm && qsParm['maxMoves']!=""){
	maxMoves = []
	decodeURIComponent(qsParm['maxMoves']).split('.').forEach( function(element) {
		maxMoves.push(parseInt(element))
	} )
}

maxTime = Number.MAX_SAFE_INTEGER
if('maxTime' in qsParm && qsParm['maxTime']!=""){
	maxTime = parseInt(decodeURIComponent(qsParm['maxTime']))*1000
}
	
function padNumber(n, width, z) {
	z = z || '0'
	n = n + ''
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}

function saveMove(ppn, t, data, verbose=true){
	// save move to localstorage
	// get unique key
	var key = "hanoi&" + padNumber(ppn, 4) + "&" + t
	var value = JSON.stringify(data)
	localStorage.setItem(key, value)
	if(verbose)
		console.log(key +": "+value)
}
		
		
function setPos(iDisk, iPeg, iPos){
	// low level
	//disk[iDisk].style.transform = "translate("+iPeg*dx+"px,0)"
	disk[iDisk].setAttribute('transform', "translate("+iPeg*dx+",0)")
	//console.log(nDisk, iPos, yPos[nDisk - iPos - 1])
	disk[iDisk].setAttribute('y', yPos[nDisk - iPos - 1])
}

function unloggedMove(a, b){
	// high level, keep track of state and check legality
	if (a == b)
		return "ERROR: moving to source peg"
	var iDiskA = pegDisk[a][pegDisk[a].length-1]
	if (typeof iDiskA == 'undefined')
		return "ERROR: no disk on peg "+a
		
	var iDiskB = pegDisk[b][pegDisk[b].length-1]
	if(typeof iDiskB != 'undefined' && iDiskB > iDiskA)
		// b not empty and b disk smaller than a disk
		return "ERROR: larger disk on top of smaller one"
		
	// move is valid
	iMove++
	setPos(iDiskA, b, pegDisk[b]?pegDisk[b].length:0)
	pegDisk[b].push(pegDisk[a].pop())
	
	// remove eventlistener from pegDisk[b][pegDisk[b].length-1] (if existent)
	// add eventlistener to pegDisk[a][pegDisk[a].length-1] ( if existent)
	initDiskInteractivity()
	
	// check if game has ended
	if(pegDisk[0].length==0 && pegDisk[1].length==0){
		iGame++
		if(iGame==diskPos.length){
			document.getElementById('dialogCongratulate').style.display = "block"
			return "INFO: valid, last of experiment"
		} else {
			iAttempt = 0 
			initGame()
			document.getElementById('dialogContinue').style.display = "block"
			return "INFO: valid, last of game"
		}
	}
	
	if(iMove == maxMoves[iGame]){
		iAttempt++
		initGame()
		document.getElementById('dialogMoves').style.display = "block"
		return "INFO: valid, reached maxMoves"
	}
	
	return "INFO: valid"
}

function move(a, b){
	var t = new Date().getTime()
	var d = {'ppn': ppn, 'iGame': iGame, 'iAttempt': iAttempt, 'iMove': iMove, 'from': a, 'to': b, 
		'time': t, 'timeExperiment':t-t0, 'timeAttempt':t-tAttempt, 'game':diskPos[iGame].join("")}
	
	if(t-t0 > maxTime){
		document.getElementById('dialogTime').style.display = "block"
		d['message'] = "INFO: reached maxTime"
	} else {
		d['message'] = unloggedMove(a, b)
	}
	saveMove(ppn, t, d, true)
}

var dragMouse = [0,0] // current mouse position in device coordinates 
var dragTranslate = [0,0] // translation prior to drag start
var selectedElement, sourcePeg
function selectElement(evt){
	evt.preventDefault() // prevents touchstart to propagate to mousedown
	selectedElement = evt.target
	if(evt.type=="touchstart")
		evt = evt.targetTouches[0]
	dragMouse[0] = evt.clientX // mouse position
	dragMouse[1] = evt.clientY
	var svg   = document.documentElement
	svg.addEventListener("mousemove", moveElement)
	svg.addEventListener("touchmove", moveElement)
	svg.addEventListener("mouseup", releaseElement)
	svg.addEventListener("touchend", releaseElement)
	svg.addEventListener("touchcancel", releaseElement)
	
	var translate = selectedElement.getAttributeNS(null, "transform").slice(10,-1).split(',') // "translate(x, y)"
	dragTranslate[0] = parseFloat(translate[0])
	dragTranslate[1] = parseFloat(translate[1])
	
	/*
	var ghost=selectedElement.cloneNode(true)
	ghost.id="ghost"
	ghost.setAttribute("style", ghost.getAttribute("style")+";"+"opacity: 0.2")
	ghost.setAttribute("transform", "translate("+0+","+0+")")
	document.getElementById('layer1').appendChild(ghost)
	*/
}

function moveElement(evt){
	if(evt.type=="touchmove")
		evt = evt.targetTouches[0]
	var dx = (evt.clientX - dragMouse[0])/scale + dragTranslate[0]
	var dy = (evt.clientY - dragMouse[1])/scale + dragTranslate[1]
	selectedElement.setAttribute("transform", "translate("+dx+","+dy+")")
}
function releaseElement(evt){
	if(evt.type=="touchend")
		evt = evt.changedTouches[0]
	var sourcePeg = Math.round(dragTranslate[0]/dx)
	var destinationPeg = Math.round(((evt.clientX - dragMouse[0])/scale + dragTranslate[0])/dx)
	destinationPeg = Math.min(2, destinationPeg)
	destinationPeg = Math.max(0, destinationPeg)
	var svg   = document.documentElement
	svg.removeEventListener("mousemove", moveElement)
	svg.removeEventListener("touchmove", moveElement)
	svg.removeEventListener("mouseup", releaseElement)
	svg.removeEventListener("touchend", releaseElement)
	
	// reset position in case move fails
	setPos(pegDisk[sourcePeg][pegDisk[sourcePeg].length-1], sourcePeg, pegDisk[sourcePeg].length-1)
	// move (same as with other input methods)
	move(sourcePeg, destinationPeg)
}

function resize(){
	// resize document to window size
	var svg = document.documentElement
	var viewbox = svg.getAttribute('viewBox').split(' ')
	var viewboxSize = [parseFloat(viewbox[2])-parseFloat(viewbox[0]), parseFloat(viewbox[3])-parseFloat(viewbox[1])]
	var width = window.innerWidth
	var height = window.innerHeight
	svg.width.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, width)
	svg.height.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, height)
	scale = Math.min(svg.width.baseVal.value/viewboxSize[0], svg.height.baseVal.value/viewboxSize[1])
}

function start(evt){
	// when participant chooses to start
	document.getElementById('dialogWelcome').style.display='none'
	t0 = new Date().getTime()
	tAttempt = t0
}

function initDiskInteractivity(){
	// make top disks draggable
	for(var i=0; i<pegDisk.length; i++){
		if(pegDisk[i].length){
			var iDisk = pegDisk[i][pegDisk[i].length-1] // top disk
			document.getElementById('disk'+iDisk).addEventListener("mousedown", selectElement)
			document.getElementById('disk'+iDisk).addEventListener("touchstart", selectElement)
		}
		for(j=pegDisk[i].length-2; j>=0; j--){
			var iDisk = pegDisk[i][j]
			document.getElementById('disk'+iDisk).removeEventListener("mousedown", selectElement)
			document.getElementById('disk'+iDisk).removeEventListener("touchstart", selectElement)
		}
	}
}

function initGame(){
	// initAttempt would be a better name for this function
	iMove = 0
	document.getElementById("iGame").textContent = iGame + 1
	tAttempt = new Date().getTime()
	// initialize disks
	nDiskUsed = diskPos[iGame].length
	pegDisk = [[],[],[]]
	for(var i=0; i<nDisk; i++){
		if(i<nDiskUsed){
			disk[i].style.display = "block"
			setPos(i, diskPos[iGame][i], pegDisk[diskPos[iGame][i]].length)
			pegDisk[diskPos[iGame][i]].push(i)
		} else {
			disk[i].style.display = "none"
		}
	}
	initDiskInteractivity()
}

function init(){
	resize()
	window.addEventListener("resize", resize)
	document.getElementById("nGame").textContent = diskPos.length
	
	// welcome dialog
	document.getElementById('okWelcome').addEventListener("click", start)
	if(debug) 
		start()
		
	if(!("nogames" in qsParm)){
		console.log("show nogames")
		document.getElementById("nGameSlash").style.display = 'none'
		document.getElementById("nGame").style.display = 'none'
	}

	var peg = []
	for(var i=0; i<nPeg; i++){ 
		peg.push(document.getElementById("peg"+i))
		xPos[i] = peg[i].x.baseVal.value
	}
	dx = xPos[1] - xPos[0]
	for(var i=0; i<nDisk; i++){
		disk.push(document.getElementById("disk"+i))
		yPos[nDisk-1-i] = disk[i].y.baseVal.value
	}

	if(!("arrows" in qsParm) || qsParm['arrows']==0){
		document.getElementById('arrow01').style.display = "none"
		document.getElementById('arrow10').style.display = "none"
		document.getElementById('arrow12').style.display = "none"
		document.getElementById('arrow21').style.display = "none"
		document.getElementById('arrow02').style.display = "none"
		document.getElementById('arrow20').style.display = "none"
	} else {
		document.getElementById('arrow01').onclick = function(){ move(0, 1) }
		document.getElementById('arrow10').onclick = function(){ move(1, 0) }
		document.getElementById('arrow12').onclick = function(){ move(1, 2) }
		document.getElementById('arrow21').onclick = function(){ move(2, 1) }
		document.getElementById('arrow02').onclick = function(){ move(0, 2) }
		document.getElementById('arrow20').onclick = function(){ move(2, 0) }
	}
	initGame()
}
window.onload = init
