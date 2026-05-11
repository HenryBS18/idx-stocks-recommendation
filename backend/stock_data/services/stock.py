import yfinance as yf
from datetime import datetime, timedelta
from utils import normalize_price
import csv
import os

dir_name = 'result'

os.makedirs(dir_name, exist_ok=True)

def get_history(ticker: str) -> tuple[str, str]:
    filename = f'{ticker.upper()}_history.csv'
    file_path = os.path.join(dir_name, filename)

    if os.path.exists(file_path):
        return file_path, filename

    yf_ticker = yf.Ticker(f'{ticker.upper()}.JK')

    end_date = datetime.now() + timedelta(days=1)
    start_date = end_date - timedelta(days=90)

    df = yf_ticker.history(
        start=start_date.strftime('%Y-%m-%d'),
        end=end_date.strftime('%Y-%m-%d'),
        interval='1d',
        auto_adjust=False,
    )

    df = df.iloc[::-1]

    with open(file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(
            file,
            fieldnames=['date', 'open', 'close', 'high', 'low', 'volume']
        )

        writer.writeheader()

        for index, row in df.iterrows():
            writer.writerow({
                'date': index.strftime('%Y-%m-%d'), # type: ignore
                'open': normalize_price(row['Open']),
                'close': normalize_price(row['Close']),
                'high': normalize_price(row['High']),
                'low': normalize_price(row['Low']),
                'volume': int(row['Volume']),
            })

    return file_path, filename