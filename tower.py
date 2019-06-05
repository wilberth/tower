#!/usr/bin/env python2
# start with:
# FLASK_APP=tower.py flask run # (posix)
# 

from flask import Flask, send_file, request

app = Flask(__name__)

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

@app.route("/data")
def data():
	return "data received"
	with open("/tmp/tt.dat", "a") as file:
		json = request.get_json(force=True)
		file.write(json)
		return "data received: " + json

if __name__ == "__main__":
	import subprocess
	import os
	print("Starting Tower server")
	myEnv = os.environ.copy()
	myEnv["FLASK_APP"] = "tower.py"
	
	server = subprocess.Popen(['flask', 'run'],
		env=myEnv,
		cwd=os.path.dirname(os.path.abspath(__file__)),
		stdout=subprocess.PIPE,
		stderr=subprocess.PIPE)

	print("Starting Tower client")
	try:
		client = subprocess.Popen(['chromium-browser', '--kiosk', '--no-default-browser-check', '--disable-translate', '--disable-features=TranslateUI',
			'http://localhost:5000/hanoi.svg?ppn=0&hanoi=on&maxHeight=&maxTime=&games=0123456%7C%7C.%7C%7C0123456.127'],
			stdout=subprocess.PIPE,
			stderr=subprocess.PIPE)
	except:
		os.system('taskkill /im chrome.exe')
		client = subprocess.call(['C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 
			'--kiosk', '--no-default-browser-check', '--disable-translate', '--disable-features=TranslateUI',
			'http://localhost:5000/hanoi.svg?ppn=0&hanoi=on&maxHeight=&maxTime=&games=0123456%7C%7C.%7C%7C0123456.127'],
			stdout=subprocess.PIPE,
			stderr=subprocess.PIPE)
	client.wait()
