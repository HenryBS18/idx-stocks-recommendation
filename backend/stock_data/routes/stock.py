from routes.api import api
from services.stock import get_history

@api.get('/stock/<ticker>')
def get_stock_history_route(ticker):
    stock = get_history(ticker)

    return stock