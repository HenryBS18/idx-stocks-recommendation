from flask import Flask
from dotenv import load_dotenv
from routes.api import api
import os

load_dotenv()

app = Flask(__name__)

app.register_blueprint(api, url_prefix='/api')

if __name__ == '__main__':
    host = os.getenv('HOST')
    port = int(os.getenv('PORT'))
    debug = os.getenv('ENV') == 'development'

    app.run(host=host, port=port, debug=debug)