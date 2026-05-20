from flask import Flask
from dotenv import load_dotenv
from routes.api import api
import os

class App:
	def __init__(self):
		load_dotenv()
		
		self.app = Flask(__name__)

		self.app.register_blueprint(api, url_prefix='/api')

	def run(self):
		host = os.getenv('HOST')
		port = int(os.getenv('PORT'))
		debug = os.getenv('ENV') == 'development'

		self.app.run(host=host, port=port, debug=debug)

app = App()

if __name__ == '__main__':
	app.run()