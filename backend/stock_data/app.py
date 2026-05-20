from flask import Flask
from dotenv import load_dotenv
from routes.api import api
import os

class App:
	def __init__(self):
		load_dotenv()
		
		self.app = Flask(__name__)

		self.app.register_blueprint(api, url_prefix='/api')

	def get_app(self) -> Flask:
		return self.app
	
	def run(self) -> None:
		host = os.getenv('HOST')
		port = int(os.getenv('PORT'))
		debug = os.getenv('ENV') == 'development'

		self.app.run(host=host, port=port, debug=debug)