#!/usr/bin/env python2
import subprocess
import os
myEnv = os.environ.copy()
myEnv["FLASK_APP"] = "server.py"
p = subprocess.Popen(['flask', 'run'],
	env=myEnv,
	cwd=os.path.dirname(os.path.abspath(__file__)),
	stdout=subprocess.PIPE,
	stderr=subprocess.PIPE)

p.wait()

