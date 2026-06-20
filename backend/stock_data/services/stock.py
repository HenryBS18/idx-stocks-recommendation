import yfinance as yf
from datetime import datetime, timedelta
from utils import normalize_price, delete_file_later
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import csv
import os
import requests
import uuid
import pandas as pd

class StockService:
	def __init__(self):
		self.dir_name = 'result'

		os.makedirs(self.dir_name, exist_ok=True)

	def get_price_historical(self, ticker: str, timeframe: str) -> tuple[str, str]:
		filename = f'{ticker.upper()}_price_historical_{uuid.uuid4()}.csv'
		file_path = os.path.join(self.dir_name, filename)

		if os.path.exists(file_path):
			return file_path, filename
		
		ticker_valid = self.get_name(ticker)

		if ticker_valid == None:
			raise Exception

		yf_ticker = yf.Ticker(f'{ticker.upper()}.JK')

		end_date = datetime.now() + timedelta(days=1)
		start_date = end_date - timedelta(days=90 if timeframe == 'short' else 1820)

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
				fieldnames=['date', 'open', 'high', 'low', 'close', 'volume']
			)

			writer.writeheader()

			for i, (index, row) in enumerate(df.iterrows()):
				volume = row['Volume']

				if pd.isna(volume) or volume == 0:
					if i > 0:
						volume = df.iloc[i - 1]['Volume']

					if (pd.isna(volume) or volume == 0) and i < len(df) - 1:
						volume = df.iloc[i + 1]['Volume']

				writer.writerow({
					'date': index.strftime('%Y-%m-%d'),
					'open': normalize_price(row['Open']),
					'high': normalize_price(row['High']),
					'low': normalize_price(row['Low']),
					'close': normalize_price(row['Close']) if not pd.isna(row['Close']) else normalize_price(row['High']),
					'volume': int(volume) if not pd.isna(volume) else 0
				})

		delete_file_later(file_path)

		return file_path, filename

	def get_financials(self, ticker: str) -> tuple[str, str]:
		filename = f'{ticker.upper()}_financials_{uuid.uuid4()}.csv'
		file_path = os.path.join(self.dir_name, filename)

		if os.path.exists(file_path):
			return file_path, filename
		
		ticker_valid = self.get_name(ticker)

		if ticker_valid == None:
			raise Exception
		
		yf_ticker = yf.Ticker(f'{ticker.upper()}.JK')

		df = yf_ticker.get_financials(freq='quarterly')
		df = df.T

		wanted_columns = [
    'TotalRevenue',
    'GrossProfit',
    'OperatingIncome',
    'EBITDA',
    'NetIncome',
    'PretaxIncome',
    'TaxProvision',
    'DilutedEPS',
    'BasicEPS',
    'InterestExpense',
    'InterestIncome',
    'ReconciledDepreciation',
    'TotalExpenses',
    'CostOfRevenue',
		]

		existing_columns = [col for col in wanted_columns if col in df.columns]
		df = df[existing_columns]

		float_columns = [
			'BasicEPS',
			'DilutedEPS',
		]

		for column in df.columns:
			df[column] = df[column].fillna(0)

			if column not in float_columns:
				df[column] = df[column].astype(int)
			else:
				df[column] = df[column].astype(float).round(2)

		df.to_csv(file_path, float_format='%.2f', index_label='date')

		delete_file_later(file_path)

		return file_path, filename

	def get_balance_sheet(self, ticker: str) -> tuple[str, str]:
		filename = f'{ticker.upper()}_balance_sheet_{uuid.uuid4()}.csv'
		file_path = os.path.join(self.dir_name, filename)

		if os.path.exists(file_path):
			return file_path, filename
		
		ticker_valid = self.get_name(ticker)

		if ticker_valid == None:
			raise Exception
		
		yf_ticker = yf.Ticker(f'{ticker.upper()}.JK')

		df = yf_ticker.get_balance_sheet(freq='quarterly')
		df = df.T

		wanted_columns = [
		'date',
		'TotalAssets',
		'TotiabilitiesNetMinorityInterest',
		'StockholdersEquity',
		'CommonStockEquity',
		'TotalDebt',
		'CashAndCashEquivalents',
		'Receivables',
		'NetPPE',
		'RetainedEarnings',
		'TangibleBookValue',
		'InvestedCapital',
		'Payables',
		'LongTermDebtAndCapiteaseObligation',
		'GoodwillAndOtherIntangibleAssets',
		]

		existing_columns = [col for col in wanted_columns if col in df.columns]
		df = df[existing_columns]

		for column in df.columns:
			df[column] = df[column].fillna(0)
			df[column] = df[column].astype(int)

		df.to_csv(file_path, float_format='%.2f', index_label='date')

		delete_file_later(file_path)

		return file_path, filename

	def get_broker_summary(self, ticker: str) -> tuple[str, str]:
		filename = f'{ticker.upper()}_broker_summary_{uuid.uuid4()}.csv'
		file_path = os.path.join(self.dir_name, filename)

		if os.path.exists(file_path):
			return file_path, filename
		
		ticker_valid = self.get_name(ticker)

		if ticker_valid == None:
			raise Exception

		broksum_html_str = self.get_broker_summary_raw(ticker)['broksum']

		soup = BeautifulSoup(broksum_html_str, 'html.parser')
		rows = soup.select('tbody tr')

		with open(file_path, 'w', newline='', encoding='utf-8') as file:
			writer = csv.writer(file)

			writer.writerow([
				'buy_broker',
				'buy_lot',
				'buy_value',
				'buy_avg',

				'sell_broker',
				'sell_lot',
				'sell_value',
				'sell_avg',
			])

			for row in rows:
				cols = row.find_all('td')

				if len(cols) < 8:
					continue

				buy_broker = cols[0].get_text(strip=True)
				buy_lot = '' if cols[1].get_text(strip=True) == '' else int(cols[1].get_text(strip=True).replace(',', ''))
				buy_value = cols[2].get_text(strip=True)
				buy_avg = '' if cols[3].get_text(strip=True) == '' else float(cols[3].get_text(strip=True).replace(',', ''))

				sell_broker = cols[4].get_text(strip=True)
				sell_lot = '' if cols[5].get_text(strip=True) == '' else int(cols[5].get_text(strip=True).replace(',', ''))
				sell_value = cols[6].get_text(strip=True)
				sell_avg = '' if cols[7].get_text(strip=True) == '' else float(cols[7].get_text(strip=True).replace(',', ''))

				writer.writerow([
					buy_broker,
					buy_lot,
					buy_value,
					buy_avg,
					sell_broker,
					sell_lot,
					sell_value,
					sell_avg,
				])

		delete_file_later(file_path)

		return file_path, filename
	
	def get_broker_summary_raw(self, ticker: str) -> dict[str, str]:
		url = os.getenv('NEOBDM_URL')
		session_id = os.getenv('NEOBDM_SESSIONID')
		csrf_token = os.getenv('NEOBDM_CSRF_TOKEN')
		csrf_middleware_token = os.getenv('NEOBDM_CSRF_MIDDLEWARE_TOKEN')

		end_date = datetime.now() + timedelta(days=1)
		start_date = end_date - timedelta(days=90)

		data = {
			'tick': ticker,
			'start_date': start_date.strftime('%d %b %Y'),
			'end_date': end_date.strftime('%d %b %Y'),
			'event': 'load',
			'foreign_only': 'false',
			'domestic_only': 'false',
			'net': 'true',
			'show_broker_inventory': 'false',
			'csrfmiddlewaretoken': csrf_middleware_token,
		}

		headers = {
			'Referer': url
		}

		cookies = {
			'sessionid': session_id,
			'csrftoken': csrf_token,
		}

		res = requests.post(
			url,
			data=data,
			headers=headers,
			cookies=cookies
		)

		broksum_html_str = res.json()['broksum_html']

		return {
			'date': f"{start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')} (3 bulan)",
			'broksum': str(broksum_html_str).replace('\n', '').replace('        ', '').replace('    ', '').replace('<form id=\"broksum-form\" method=\"post\">', '').replace('</form>', '').replace('w-100', 'w-full sm:w-110').replace('text-green', 'text-green-600 text-xs pb-3 sm:text-sm').replace('text-red', 'text-red-600 text-xs pb-3 sm:text-sm').replace('pr-1', 'pr-2').replace('text-sm', 'text-xs sm:text-sm'),
		}

	def get_name(self, ticker: str) -> str:
		url = os.getenv('IDX_OWNERSHIP_API_URL')

		res = requests.get(f'{url}/stock/{ticker}/name')

		if not res.ok:
			return None
		
		name = res.json()['name']

		return name