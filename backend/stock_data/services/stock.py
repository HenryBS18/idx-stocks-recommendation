import yfinance as yf
from datetime import datetime, timedelta
from utils import normalize_price, delete_file_later, format_number
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

		price_days = {
			'short': 90,
			'medium': 180,
			'long': 365,
			'chart': 1820
		}

		end_date = datetime.now() + timedelta(days=1)
		start_date = end_date - timedelta(days=price_days[timeframe])

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

		df = yf_ticker.get_financials(freq='quarterly').T

		if df.empty:
			raise Exception('Data belum tersedia')

		rev = df.get('TotalRevenue', 0)
		net_inc = df.get('NetIncome', 0)
		pretax = df.get('PretaxIncome', 0)
		interest = df.get('InterestExpense', 0)
		da = df.get('DepreciationAndAmortizationInIncomeStatement', 0)
		op_exp = df.get('OperatingExpense', 0)

		df['OperatingIncome'] = rev - op_exp
		df['EBITDA'] = pretax + interest + da

		df['NPM'] = (net_inc / rev).replace([float('inf'), -float('inf')], 0).fillna(0) * 100
		df['OPM'] = (df['OperatingIncome'] / rev).replace([float('inf'), -float('inf')], 0).fillna(0) * 100

		wanted_columns = [
			'TotalRevenue',
			'OperatingIncome',
			'EBITDA',
			'NetIncome',
			'PretaxIncome',
			'OperatingExpense',
			'InterestExpense',
			'InterestIncome',
		]

		existing_columns = [col for col in wanted_columns if col in df.columns]
		df_metrics = df[existing_columns].copy()

		rename_columns = {
				'TotalRevenue': 'Pendapatan Total',
				'OperatingIncome': 'Laba Operasional',
				'EBITDA': 'EBITDA',
				'NetIncome': 'Laba Bersih',
				'PretaxIncome': 'Laba Sebelum Pajak',
				'OperatingExpense': 'Beban Operasional',
				'InterestExpense': 'Beban Bunga',
				'InterestIncome': 'Pendapatan Bunga',
		}

		df_metrics = df_metrics.rename(columns=rename_columns)

		for column in df_metrics.columns:
			df_metrics[column] = df_metrics[column].fillna(0).apply(format_number)

		df_ratios = df[['NPM', 'OPM']].round(2)
		for column in df_ratios.columns:
			df_ratios[column] = df_ratios[column].apply(lambda x: f"{x:.2f}%")

		df_final = pd.concat([df_ratios, df_metrics], axis=1)

		df_final = df_final[~df_final.isin([0, 0.0, "0", "0.00", "0.00x", "0.00%"]).all(axis=1)]

		dt_index = pd.to_datetime(df_final.index)
		df_final.index = dt_index.year.astype(str) + ' Q' + dt_index.quarter.astype(str)

		df_final.to_csv(file_path, index_label='date')

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

		last_price = yf_ticker.fast_info['lastPrice']

		df_bs = yf_ticker.get_balance_sheet(freq='quarterly').T
		df_is = yf_ticker.get_income_stmt(freq='quarterly').T

		if df_bs.empty:
			raise Exception('Data belum tersedia')

		income_cols = [col for col in ['NetIncome'] if col in df_is.columns]
		df = df_bs.join(df_is[income_cols], how='left')

		ekuitas = df.get('StockholdersEquity', 0)
		liabilitas = df.get('TotalLiabilitiesNetMinorityInterest', 0)
		saham_beredar = df.get('OrdinarySharesNumber', 0)
		laba_bersih = df.get('NetIncome', 0)

		df['EPS'] = (laba_bersih / saham_beredar).replace([float('inf'), -float('inf')], 0).fillna(0)

		df['DER'] = (liabilitas / ekuitas).replace([float('inf'), -float('inf')], 0).fillna(0) * 100
		df['ROE'] = (laba_bersih / ekuitas).replace([float('inf'), -float('inf')], 0).fillna(0) * 4 * 100

		bvps = (ekuitas / saham_beredar).replace([float('inf'), -float('inf')], 0).fillna(0)
		df['PBV'] = (last_price / bvps).replace([float('inf'), -float('inf')], 0).fillna(0)
		df['PER'] = (last_price / (df['EPS'] * 4)).replace([float('inf'), -float('inf')], 0).fillna(0)

		wanted_columns = [
			'TotalAssets', 
			'CashAndCashEquivalents', 
			'Receivables', 
			'NetPPE',
			'TotalLiabilitiesNetMinorityInterest',
			'StockholdersEquity', 
			'RetainedEarnings',
		]

		existing_columns = [col for col in wanted_columns if col in df.columns]

		df_ratios = df[['EPS', 'PER', 'PBV', 'ROE', 'DER']].round(2)
		for col in ['PER', 'PBV']:
			df_ratios[col] = df_ratios[col].apply(lambda x: f"{x:.2f}x")

		for col in ['ROE', 'DER']:
			df_ratios[col] = df_ratios[col].apply(lambda x: f"{x:.2f}%")

		df_metrics = df[existing_columns].copy()

		rename_columns = {
			'TotalAssets': 'Total Aset',
			'CashAndCashEquivalents': 'Kas dan Setara Kas',
			'Receivables': 'Piutang Usaha',
			'NetPPE': 'Aset Tetap Bersih',
			'TotalLiabilitiesNetMinorityInterest': 'Total Liabilitas',
			'StockholdersEquity': 'Total Ekuitas',
			'RetainedEarnings': 'Saldo Laba',
		}

		df_metrics = df_metrics.rename(columns=rename_columns)

		for column in df_metrics.columns:
			df_metrics[column] = df_metrics[column].apply(format_number)

		df_final = pd.concat([df_ratios, df_metrics], axis=1)
		df_final = df_final[~df_final.isin([0, 0.0, "0", "0.00", "0.00x", "0.00%"]).all(axis=1)]

		dt_index = pd.to_datetime(df_final.index)
		df_final.index = dt_index.year.astype(str) + ' Q' + dt_index.quarter.astype(str)

		df_final.to_csv(file_path, float_format='%.2f', index_label='date')

		delete_file_later(file_path)

		return file_path, filename

	def get_broker_summary(self, ticker: str, timeframe: str) -> tuple[str, str]:
		filename = f'{ticker.upper()}_broker_summary_{uuid.uuid4()}.csv'
		file_path = os.path.join(self.dir_name, filename)

		if os.path.exists(file_path):
			return file_path, filename
		
		ticker_valid = self.get_name(ticker)

		if ticker_valid == None:
			raise Exception

		broksum_html_str = self.get_broker_summary_raw(ticker, timeframe)['broksum']

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
	
	def get_broker_summary_raw(self, ticker: str, timeframe: str) -> dict[str, str]:
		url = os.getenv('NEOBDM_URL')
		session_id = os.getenv('NEOBDM_SESSIONID')
		csrf_token = os.getenv('NEOBDM_CSRF_TOKEN')
		csrf_middleware_token = os.getenv('NEOBDM_CSRF_MIDDLEWARE_TOKEN')

		broksum_days = {
			'short': 7,
			'month': 30,
			'medium': 90,
			'long': 180,
			'year': 365,
			'ytd': datetime.now().timetuple().tm_yday
		}

		end_date = datetime.now() + timedelta(days=1)
		start_date = end_date - timedelta(days=broksum_days[timeframe])

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
			'date': f"{start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')}",
			'broksum': str(broksum_html_str).replace('\n', '').replace('        ', '').replace('    ', '').replace('<form id=\"broksum-form\" method=\"post\">', '').replace('</form>', '').replace(' id=\"broker-summary-table\"', '').replace('broksum-broker ', '').replace('w-100', 'w-full sm:w-110').replace('text-green', 'text-green-600 text-xs pb-3 sm:text-sm').replace('text-red', 'text-red-600 text-xs pb-3 sm:text-sm').replace('pr-1', 'pr-2').replace('text-sm', 'text-xs sm:text-sm'),
		}

	def get_name(self, ticker: str) -> str:
		url = os.getenv('IDX_OWNERSHIP_API_URL')

		res = requests.get(f'{url}/stock/{ticker}/name')

		if not res.ok:
			return None
		
		name = res.json()['name']

		return name