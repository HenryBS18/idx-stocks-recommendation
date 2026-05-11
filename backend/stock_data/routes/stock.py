from routes.api import api
from services.stock import get_history
from flask import  send_file

@api.get('/stock/<ticker>')
def get_stock_history_route(ticker):
    file_path, filename = get_history(ticker)

    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype='text/csv'
    )