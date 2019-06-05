#!/usr/bin/env python2
# first part of this file describes the flask server that receives and saves the data
# the part in "main" starts the server and start the client
from flask import Flask, send_file, request
import json
import sys

app = Flask(__name__.split('.')[0])

@app.route("/")
def hello():
	return "Hello World!"

@app.route("/tower.html")
def tower():
	try:
		return send_file('tower.html')
	except Exception as e:
		return str(e)

@app.route("/tower.js")
def js():
	try:
		return send_file('tower.js')
	except Exception as e:
		return str(e)

@app.route("/hanoi.svg")
def hanoi():
	try:
		return send_file('hanoi.svg')
	except Exception as e:
		return str(e)

@app.route("/london.svg")
def hanoi():
	try:
		return send_file('hanoi.svg')
	except Exception as e:
		return str(e)

@app.route("/data", methods = ['POST', 'GET']) # GET is just for testing, experiment uses POST
def data():
	if request.method == 'POST':
		data = request.form # flat: only first of multiple
	elif request.method == 'GET':
		data = request.args 
	else:
		data = {"data": "ERROR: neither post nor get in flask"}
	d = data['data']
	with open("data.dat", "a") as file:
		file.write(d + ",\n")
		return "data received: " + d 

if __name__ == "__main__":
	import sys
	import subprocess
	import os
	import urllib
	print("Starting Tower server")
	myEnv = os.environ.copy()
	myEnv["FLASK_APP"] = "tower.py"
	
	server = subprocess.Popen(['flask', 'run'],
		env=myEnv,
		cwd=os.path.dirname(os.path.abspath(__file__)),
		#stdout=open("info.log", "a"),
		stderr=open("error.log", "a")
		)

	if(len(sys.argv)<2 or sys.argv[1]!="--server"):
		print("Starting Tower client")
		args = {'ppn': 0, 'hanoi': 'on', 'games':'0123456||.||0123456.127'}
		url = "http://localhost:5000/hanoi.svg?" + urllib.urlencode(args)
		try:
			client = subprocess.Popen(['chromium-browser', '--kiosk', '--no-default-browser-check', '--disable-translate', 
				'--disable-features=TranslateUI', url],
				stdout=subprocess.PIPE,
				stderr=subprocess.PIPE)
		except:
			#os.system('taskkill /im chrome.exe')
			client = subprocess.call(['C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '--kiosk', '--no-default-browser-check', 
				'--disable-translate', '--disable-features=TranslateUI', url],
				stdout=subprocess.PIPE,
				stderr=subprocess.PIPE)
		client.wait()
