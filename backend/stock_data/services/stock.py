import yfinance as yf
from datetime import datetime, timedelta
from utils import normalize_price

def get_history(ticker: str) -> list[dict]:
    yf_ticker = yf.Ticker(f'{ticker.upper()}.JK')

    end_date = datetime.now() + timedelta(days=1)
    start_date = end_date - timedelta(days=90)

    df = yf_ticker.history(
        start=start_date.strftime('%Y-%m-%d'),
        end=end_date.strftime('%Y-%m-%d'),
        interval='1d',
        auto_adjust=False,
    )
    print(df)

    result = []

    for index, row in df.iterrows():
        result.append({
            'date': index.strftime('%Y-%m-%d'),
            'open': normalize_price(row['Open']),
            'close': normalize_price(row['Close']),
            'high': normalize_price(row['High']),
            'low': normalize_price(row['Low']),
            'volume': int(row['Volume']),
        })

    result.reverse()

    return result