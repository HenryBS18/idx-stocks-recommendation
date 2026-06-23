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

		df_final.to_csv(file_path, index_label='Periode')

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

		df_final.to_csv(file_path, float_format='%.2f', index_label='Periode')

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
			'short': 3,
			'week': 7,
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
	
	def get_financials_sb(self, ticker: str):
		url = f'{os.getenv("STOCKBIT_API_URL")}/findata-view/company/financial?symbol={ticker}&data_type=1&report_type=1&statement_type=1'
		token = os.getenv('STOCKBIT_TOKEN')		
		
		headers = {
			'Authorization': f'Bearer {token}',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept': 'application/json, text/plain, */*',
			'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
			'Origin': 'https://stockbit.com',
			'Referer': 'https://stockbit.com/'
		}

		res = requests.get(
			url,
			headers=headers
		)

		html = res.json()['data']['html_report']

		kuartal_target = [
			'Q1 2026', 'Q4 2025', 'Q3 2025', 'Q2 2025', 
			'Q1 2025', 'Q4 2024', 'Q3 2024', 'Q2 2024', 'Q1 2024'
		]

		konfigurasi_tabel = {
			'data_table_1': [
				"Total Pendapatan",
				'Pemilik Entitas Induk',
				'Laba Usaha',
				'Total Beban Usaha',
				'Laba Sebelum Pajak',
				'Pendapatan Bunga',
				'Beban Bunga',
			],
			'data_table_keyratio_1': [
				'EPS (Quarter)',
				'PE Ratio (Quarter)',
				'EBITDA (Quarter)',
				'Return on Assets (Quarter)',
				'Return on Equity (Quarter)',
			]
		}

		rename_columns = {
			'Pemilik Entitas Induk': 'Laba Bersih',
			'Laba Usaha': 'Laba Operasional',
			'Total Beban Usaha': 'Beban Operasional',
			'EPS (Quarter)': 'EPS',
			'PE Ratio (Quarter)': 'PER',
			'EBITDA (Quarter)': 'EBITDA',
			'Return on Assets (Quarter)': 'ROA',
			'Return on Equity (Quarter)': 'ROE',
		}

		file_path, filename = self.extract_multiple_financials(
			ticker=ticker, 
			html_string=html, 
			table_configs=konfigurasi_tabel, 
			target_quarters=kuartal_target,
			rename_columns=rename_columns
		)	

		return file_path, filename

	def get_balance_sheet_sb(self, ticker: str):
		url = f'{os.getenv("STOCKBIT_API_URL")}/findata-view/company/financial?symbol={ticker}&data_type=1&report_type=2&statement_type=1'
		token = os.getenv('STOCKBIT_TOKEN')

		headers = {
			'Authorization': f'Bearer {token}',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept': 'application/json, text/plain, */*',
			'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
			'Origin': 'https://stockbit.com',
			'Referer': 'https://stockbit.com/'
		}

		res = requests.get(
			url,
			headers=headers
		)

		html = res.json()['data']['html_report']

		kuartal_target = [
				'Q1 2026', 'Q4 2025', 'Q3 2025', 'Q2 2025', 
				'Q1 2025', 'Q4 2024', 'Q3 2024', 'Q2 2024', 'Q1 2024'
		]

		konfigurasi_tabel = {
			'data_table_1': [
				'Aset',
				'Liabilitas',
				'Ekuitas',
				'Kas Dan Setara Kas',
				'Saldo Laba'
			],
			'data_table_keyratio_1': [
				'Price to Book Value (Quarter)',
			]
		}

		rename_columns = {
			'Aset': 'Total Aset',
			'Liabilitas': 'Total Liabilitas',
			'Ekuitas': 'Total Ekuitas',
			'Price to Book Value (Quarter)': 'PBV',
			'Kas Dan Setara Kas': 'Kas dan Setara Kas',
		}

		file_path, filename = self.extract_multiple_balance_sheet(
			ticker=ticker, 
			html_string=html, 
			table_configs=konfigurasi_tabel, 
			target_quarters=kuartal_target,
			rename_columns=rename_columns
		)	

		return file_path, filename

	def extract_multiple_financials(self, ticker, html_string, table_configs, target_quarters, rename_columns=None) -> tuple[str, str]:
		soup = BeautifulSoup(html_string, 'html.parser')

		raw_results = {q: {} for q in target_quarters}

		for table_id, target_metrics in table_configs.items():
			table = soup.find('table', id=table_id)
			
			if not table:
				print(f"Warning: Tabel {table_id} tidak ditemukan.")
				continue

			headers = [th.text.strip() for th in table.find('thead').find_all('th')[1:]]
			
			for metric in target_metrics:
				metric_span = table.find('span', attrs={'data-lang-0': metric})
				
				if not metric_span:
					for q in target_quarters:
						raw_results[q][metric] = None
					continue

				row = metric_span.find_parent('tr')
				cells = row.find_all('td', class_=['rowval', 'row-ratio-val'])
				
				for header, cell in zip(headers, cells):
					if header in target_quarters:
						if metric in ['Return on Assets (Quarter)', 'Return on Equity (Quarter)']:
							raw_results[header][metric] = float(cell['data-value-idr']) * 4
						else:
							raw_results[header][metric] = float(cell['data-value-idr'])

		formatted_result = []
		for q in target_quarters:
			data_row = {"Periode": q}
			data_row.update(raw_results[q])
			formatted_result.append(data_row)

		if rename_columns and isinstance(rename_columns, dict):
			for data_row in formatted_result:
				for old_key, new_key in rename_columns.items():
					if old_key in data_row:
						data_row[new_key] = data_row.pop(old_key)

		for data_row in formatted_result:
			rev = data_row.get("Total Pendapatan")
			net_inc = data_row.get("Laba Bersih")
			op_inc = data_row.get("Laba Operasional")

			if rev and net_inc and rev != 0:
				data_row["NPM"] = round((net_inc / rev) * 100, 2)
			else:
				data_row["NPM"] = None

			if rev and op_inc and rev != 0:
				data_row["OPM"] = round((op_inc / rev) * 100, 2)
			else:
				data_row["OPM"] = None

		for data_row in formatted_result:
			for key, val in data_row.items():
				if key == "Periode" or val is None:
					continue
				
				if key == 'PER':
					data_row[key] = f'{val / 4:.2f}x'
				elif key in ["NPM", "OPM", "RoA", "RoE"]:
					data_row[key] = f"{val}%"
				else:
					data_row[key] = format_number(val)

		data = formatted_result
		if not data or all(len(row) == 1 for row in data): 
			print("Gagal menyimpan: Data kosong atau hanya berisi period.")
			return "", ""

		headers = list(data[0].keys())

		filename = f'{ticker.upper()}_financials_{uuid.uuid4()}.csv'
		file_path = os.path.join(self.dir_name, filename)

		with open(file_path, mode='w', newline='', encoding='utf-8') as file:
			writer = csv.DictWriter(file, fieldnames=headers)
			writer.writeheader()
			writer.writerows(data)

		return file_path, filename

	def extract_multiple_balance_sheet(self, ticker, html_string, table_configs, target_quarters, rename_columns=None) -> tuple[str, str]:
		soup = BeautifulSoup(html_string, 'html.parser')

		raw_results = {q: {} for q in target_quarters}

		for table_id, target_metrics in table_configs.items():
			table = soup.find('table', id=table_id)
			
			if not table:
				print(f"Warning: Tabel {table_id} tidak ditemukan.")
				continue

			headers = [th.text.strip() for th in table.find('thead').find_all('th')[1:]]
			
			for metric in target_metrics:
				metric_spans = table.find_all('span', attrs={'data-lang-0': metric})
				
				row = None
				cells = None
				
				if metric in ['Aset', 'Liabilitas', 'Ekuitas']:
					target_chart = 'total'
				else:
					target_chart = 'default'
				
				for span in metric_spans:
					p_row = span.find_parent('tr')
					if p_row:
						chart_icon = p_row.find('i', attrs={'data-chart': target_chart})
						
						if chart_icon:
							row = p_row
							cells = p_row.find_all('td', class_=['rowval', 'row-ratio-val'])
							break 
				
				if not row and metric_spans:
					row = metric_spans[0].find_parent('tr')
					cells = row.find_all('td', class_=['rowval', 'row-ratio-val']) if row else []
						
				if not row:
					for q in target_quarters:
						raw_results[q][metric] = None
					continue
						
				for header, cell in zip(headers, cells):
					if header in target_quarters:
						try:
							raw_results[header][metric] = float(cell['data-value-idr'])
						except (ValueError, KeyError, TypeError):
							raw_results[header][metric] = None

		formatted_result = []
		for q in target_quarters:
			data_row = {"Periode": q}
			data_row.update(raw_results[q])
			formatted_result.append(data_row)

		if rename_columns and isinstance(rename_columns, dict):
			for data_row in formatted_result:
				for old_key, new_key in rename_columns.items():
					if old_key in data_row:
						data_row[new_key] = data_row.pop(old_key)

		for data_row in formatted_result:
			liabilities = data_row.get("Total Liabilitas")
			equity = data_row.get("Total Ekuitas")

			if liabilities and equity and liabilities != 0:
				data_row["DER"] = round((liabilities / equity) * 100, 2)
			else:
				data_row["DER"] = None

		for data_row in formatted_result:
			for key, val in data_row.items():
				if key == "Periode" or val is None:
					continue
				
				if key in ["DER"]:
					data_row[key] = f"{val}%"
				elif key in ["PBV"]:
					data_row[key] = f"{val}x"
				else:
					data_row[key] = format_number(val)

		data = formatted_result
		if not data or all(len(row) == 1 for row in data): 
			print("Gagal menyimpan: Data kosong atau hanya berisi period.")
			return "", ""

		headers = list(data[0].keys())

		filename = f'{ticker.upper()}_balance_sheet_{uuid.uuid4()}.csv'
		file_path = os.path.join(self.dir_name, filename)

		with open(file_path, mode='w', newline='', encoding='utf-8') as file:
			writer = csv.DictWriter(file, fieldnames=headers)
			writer.writeheader()
			writer.writerows(data)
				
		return file_path, filename