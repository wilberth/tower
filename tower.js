// (C) Wilbert van Ham 2017-2019, released under GNU affero public license
/* dialog: dialogWelcome (visible), dialogCongratulate, dialogContinue, dialogTime, dialogMoves
 * dialogTime, show on timesout for all games instead of dialogCongratulate
 * dialogContinue, show after a single games when there are more games to come
 * dialogMoves, show after maxMoves is reach for that games, reset current game
 */
// constants
var nDisk = 7
var nPeg = 3
// globals
var pegDisk = [[],[],[]] // list of stacks 
var disk = [], yPos = [], dx
var diskGhost = [], yPosGhost = [], dxGhost
var iGame = 0 // counter in startPositions, goalPositions and maxMoves
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

// set parameters from query string
var debug = false
if("debug" in qsParm)
	debug = true

var hanoi = false
if("hanoi" in qsParm)
	hanoi = true

var ppn = 0
if("ppn" in qsParm)
	ppn = Number(qsParm["ppn"])
	
// initialialize initial and final disk position for up to 7 disks
startPositions = [ [[0,1,2,3,4,5,6],[],[]] ]
goalPositions = [ [[0,1,2,3,4,5,6],[],[]] ]
maxMoves = [Number.MAX_SAFE_INTEGER]
if('games' in qsParm && qsParm['games']!=""){
	// games of fform: 01||.||01.3,012||.||012.7
	startPositions = []
	goalPositions = []
	maxMoves = []
	var games = decodeURIComponent(qsParm['games']).split(',')
	games.forEach( function(s) {
		var game = s.split('.')
		var towers = game[0].split("|")
		startPositions.push([towers[0].split("").map(Number), towers[1].split("").map(Number), towers[2].split("").map(Number)])
		var towers = game[1].split("|")
		goalPositions.push([towers[0].split("").map(Number), towers[1].split("").map(Number), towers[2].split("").map(Number)])
		maxMoves.push(parseInt(game[2]))
	} )
}
if (startPositions.length != goalPositions.length)
	console.log("ERROR: startPositions length does not match goalPositions length")
if (startPositions.length != maxMoves.length)
	console.log("ERROR: startPositions length does not match maxMoves length")

maxHeight = [nDisk, nDisk, nDisk]
if('maxHeight' in qsParm && qsParm['maxHeight']!="")
	maxHeight = decodeURIComponent(qsParm['maxHeight']).split("").map(Number)



maxTime = Number.MAX_SAFE_INTEGER
if('maxTime' in qsParm && qsParm['maxTime']!=""){
	maxTime = parseInt(decodeURIComponent(qsParm['maxTime']))*1000
}
	
function padNumber(n, width, z) {
	z = z || '0'
	n = n + ''
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}

// override of datahandler version with check on timely response
function saveRemoteData2(api_key, ppn, data, timestamp){
	// not using fetch yet for mobile compatibility
	data["timestamp"] = timestamp
	var xhr = new XMLHttpRequest()
	xhr.open("POST", save_data_url, true)

	// json style:
	//xhr.setRequestHeader("Content-type","application/json")
	//var encodedData = JSON.stringify(data)
	// url (post) style:
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
	var encodedData = "api_key=" + api_key + 
		"&ppn=" + ppn + 
		"&data=" + encodeURIComponent(JSON.stringify(data))

	var myTimeout = setTimeout( () => alert("Warning: data not saved"), 3000)
	xhr.onreadystatechange = function(){
		if (xhr.readyState==4 && xhr.status==200){
			clearTimeout(myTimeout)
			console.log("Server answer 2: " + xhr.responseText);
			if (xhr.responseText.startsWith("ERROR"))
				alert(xhr.responseText)
		}
	}
	xhr.send(encodedData)
}


function saveMove(ppn, t, data, verbose=true){
	// save move to localstorage
	//var key = "tower&" + padNumber(ppn, 4) + "&" + t
	//var value = JSON.stringify(data)
	//localStorage.setItem(key, value)
	
	// show
	//if(verbose)
		//console.log(key +": "+value)
		
	// send ajax
	//var xhttp = new XMLHttpRequest()
	/*xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200)
			console.log("success: " + xhttp.responseText)
	}*/
	//xhttp.open("POST", "/data", true)
	//xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	//xhttp.send("data="+encodeURIComponent(JSON.stringify(data)))
	if(debug)
		console.log(data)
	else
		saveRemoteData2("9B41D449", ppn, data, new Date().valueOf())

}
		
		
function setPos(iDisk, iPeg, iPos){
	// low level
	//disk[iDisk].style.transform = "translate("+iPeg*dx+"px,0)"
	// using transform allows for different x values for all disks
	//console.log("setPos: "+iDisk+", "+iPeg+", "+iPos)
	disk[iDisk].setAttribute('transform', "translate("+iPeg*dx+",0)")
	disk[iDisk].setAttribute('y', yPos[iPos])
	disk[iDisk].setAttribute('cy', yPos[iPos])
}

function setPosGhost(iDisk, iPeg, iPos){
	console.log("setPosGhost: "+iDisk+", "+iPeg+", "+iPos+", "+yPosGhost[iPos])
	diskGhost[iDisk].setAttribute('transform', "translate("+iPeg*dxGhost+",0)")
	diskGhost[iDisk].setAttribute('y', yPosGhost[iPos])
	diskGhost[iDisk].setAttribute('cy', yPosGhost[iPos])
}

function unloggedMove(a, b){
	// high level, keep track of state and check legality
	if (a == b)
		return "ERROR: moving to source peg"
	var iDiskA = pegDisk[a][pegDisk[a].length-1]
	if (typeof iDiskA == 'undefined')
		return "ERROR: no disk on peg "+a
		
	var iDiskB = pegDisk[b][pegDisk[b].length-1]
	if(hanoi && typeof iDiskB != 'undefined' && iDiskB > iDiskA)
		// b not empty and b disk smaller than a disk (hanoi constraint)
		return "ERROR: larger disk on top of smaller one"
		
	if(pegDisk[b].length >= maxHeight[b])
		// disk on full tower (london constraint)
		return "ERROR: destination peg full"

	// move is valid
	iMove++
	setPos(iDiskA, b, pegDisk[b]?pegDisk[b].length:0)
	pegDisk[b].push(pegDisk[a].pop())
	
	// remove eventlistener from pegDisk[b][pegDisk[b].length-1] (if existent)
	// add eventlistener to pegDisk[a][pegDisk[a].length-1] ( if existent)
	initDiskInteractivity()
	
	// check if game has ended
	//if(pegDisk[0].length==0 && pegDisk[1].length==0){ 
	if(JSON.stringify(pegDisk) == JSON.stringify(goalPositions[iGame])){
		iGame++
		if(iGame==startPositions.length){
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
		if("noErrorRepeat" in qsParm){ // go to next game if maximum moves has been reached
			iGame++ 
			if(iGame==startPositions.length){
				document.getElementById('dialogCongratulate').style.display = "block"
				return "INFO: valid, last of experiment"
			} else {
				iAttempt = 0 
				initGame()
				//document.getElementById('dialogContinue').style.display = "block"
				return "INFO: valid, too many moves, no repeat"
			}
		} else {
			iAttempt++
			initGame()
			document.getElementById('dialogMoves').style.display = "block"
			return "INFO: valid, reached maxMoves"
		}
	}
	
	return "INFO: valid"
}

function move(a, b){
	var t = new Date().getTime()
	var position = pegDisk[0].join("") + "|" + pegDisk[1].join("") + "|" + pegDisk[2].join("")
	var start = startPositions[iGame][0].join("") + "|" + startPositions[iGame][1].join("") + "|" + startPositions[iGame][2].join("")
	var goal = goalPositions[iGame][0].join("") + "|" + goalPositions[iGame][1].join("") + "|" + goalPositions[iGame][2].join("")
	var d = {'ppn': ppn, 'iGame': iGame, 'iAttempt': iAttempt, 'iMove': iMove, 'from': a, 'to': b, 
		'time': t, 'timeExperiment':t-t0, 'timeAttempt':t-tAttempt, 'start': start, 'current' :position, 'goal': goal, 'maxMoves':maxMoves[iGame]}
	
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

async function sendMarker(i){
	data = await fetch(`http://localhost:5000?marker=${i}`)
		.then(response => response.json())
		.catch(error => console.error("no marker server"))
	if(data) console.log(data)
}

function initGame(){
	sendMarker(iGame)
	// initAttempt would be a better name for this function
	iMove = 0
	document.getElementById("iGame").textContent = iGame + 1
	tAttempt = new Date().getTime()
	// initialize disks
	pegDisk = JSON.parse(JSON.stringify(startPositions[iGame])) // deep please
	// disable all disks
	for(var i=0; i<nDisk; i++)
		disk[i].style.display = "none" 
	// enable disks that are present in this game and do not exceed the tower height
	for(var iPeg=0; iPeg<nPeg; iPeg++){
		while(pegDisk[iPeg].length > maxHeight[iPeg])
			// task is invalid, make the best of it
			pegDisk[iPeg].pop()
		for(var iPos=0; iPos<pegDisk[iPeg].length && iPos<maxHeight[iPeg]; iPos++){
			var iDisk = pegDisk[iPeg][iPos]
			if(iDisk>=nDisk){
				// task is invalid, make the best of it
				console.error("disk " + iDisk + "not present in template")
				pegDisk[iPeg].pop()
				continue
			}
			disk[iDisk].style.display = "block"
			setPos(iDisk, iPeg, iPos)
		}
	}
	// now the same for the ghost image
	try {
		// disable all disks
		for(var i=0; i<nDisk; i++)
			diskGhost[i].style.display = "none" 
		pegDiskGhost = JSON.parse(JSON.stringify(goalPositions[iGame]))
		for(var iPeg=0; iPeg<nPeg; iPeg++){
			while(pegDiskGhost[iPeg].length > maxHeight[iPeg])
				pegDiskGhost[iPeg].pop()
			for(var iPos=0; iPos<pegDiskGhost[iPeg].length && iPos<maxHeight[iPeg]; iPos++){
				var iDisk = pegDiskGhost[iPeg][iPos]
				// 
				if(iDisk>=nDisk){
					console.error("disk " + iDisk + "not present in template")
					pegDiskGhost[iPeg].pop()
					continue
				}
				diskGhost[iDisk].style.display = "block"
				setPosGhost(iDisk, iPeg, iPos)
			}
		}
	} catch (error) { 
		console.error("no ghost found: "+ error)
	}

	initDiskInteractivity()
}

function init(){
	resize()
	window.addEventListener("resize", resize)
	document.getElementById("nGame").textContent = startPositions.length
	
	if("noErrorRepeat" in qsParm){
		document.getElementById("tspan4399").innerHTML="" // remove "goed gedaan" making next puzzel dialog neutral
	}
		

	// welcome dialog
	document.getElementById('okWelcome').addEventListener("click", start)
	if(debug) 
		start()
		
	// do not show number of games
	if(!("nogames" in qsParm)){
		document.getElementById("nGameSlash").style.display = 'none'
		document.getElementById("nGame").style.display = 'none'
	}

	// get distance between pegs (dx) and vertical position of disks (yPos)
	var peg = []
	var xPos = []
	for(var i=0; i<nPeg; i++){ 
		peg.push(document.getElementById("peg"+i))
		xPos[i] = peg[i].x.baseVal.value
	}
	dx = xPos[1] - xPos[0]
	
	// get y-position of disks
	for(var i=0; i<nDisk; i++){
		try {
			var d = document.getElementById("disk"+i)
			disk.push(d)
			try{
				yPos[i] = disk[i].y.baseVal.value // rectangle
			} catch(error) {
				yPos[i] = disk[i].cy.baseVal.value // circle or ellipse
			}
		} catch(error) {
			console.log("number of disks in template: "+i)
			nDisk = i
			break
		}
	}
	
	// alter peg height
	for(var i=0; i<nPeg; i++){
		var y = peg[i].y.baseVal.value
		var height = peg[i].height.baseVal.value
		var newHeight = 10 + (height-10) / nDisk * maxHeight[i]
		peg[i].y.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, y+height-newHeight)
		peg[i].height.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, newHeight)
		console.log("new pegHeight:" + newHeight)
	}
	
	// same for the ghost image
	try{
		// get distance between pegs (dx) and vertical position of disks (yPos)
		var pegGhost = []
		var xPosGhost = []
		for(var i=0; i<nPeg; i++){ 
			pegGhost.push(document.getElementById("ghost_peg"+i))
			xPosGhost[i] = pegGhost[i].x.baseVal.value
			console.log("ghost x: "+xPosGhost[i])
		}
		dxGhost = xPosGhost[1] - xPosGhost[0]
		
		// get y-position of ghost disks
		for(var i=0; i<nDisk; i++){
			try {
				var d = document.getElementById("ghost_disk"+i)
				diskGhost.push(d)
				try{
					yPosGhost[i] = diskGhost[i].y.baseVal.value // rectangle
				} catch(error) {
					yPosGhost[i] = diskGhost[i].cy.baseVal.value // circle or ellipse
				}
			} catch(error) {
				console.log("number of disks in template: "+i)
				nDisk = i
				break
			}
		}
		// alter peg height
		for(var i=0; i<nPeg; i++){
			let y = pegGhost[i].y.baseVal.value
			let height = pegGhost[i].height.baseVal.value
			let newHeight = 5 + (height-5) / nDisk * maxHeight[i]
			pegGhost[i].y.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, y+height-newHeight)
			pegGhost[i].height.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, newHeight)
			console.log("new pegHeight ghost:" + newHeight)
		}
	} catch (error) { 
		console.error("no ghost found")
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

