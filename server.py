#!/usr/bin/env python2
# start with:
# FLASK_APP=tower.py flask run # (posix)
# 

from flask import Flask
from flask import send_file
from flask import request

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

