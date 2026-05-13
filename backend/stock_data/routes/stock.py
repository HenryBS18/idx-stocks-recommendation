from routes.api import api
from services.stock import get_price_historical, get_financials, get_balance_sheet, get_broker_summary, get_name
from flask import  send_file

@api.get('/stock/<ticker>/price-historical')
def get_price_historical_route(ticker):
	file_path, filename = get_price_historical(ticker)

	return send_file(
		file_path,
		as_attachment=True,
		download_name=filename,
		mimetype='text/csv'
	)

@api.get('/stock/<ticker>/financials')
def get_financials_route(ticker: str):
	file_path, filename = get_financials(ticker)

	return send_file(
		file_path,
		as_attachment=True,
		download_name=filename,
		mimetype='text/csv'
	)

@api.get('/stock/<ticker>/balance-sheet')
def get_balance_sheet_route(ticker: str):
	file_path, filename = get_balance_sheet(ticker)

	return send_file(
		file_path,
		as_attachment=True,
		download_name=filename,
		mimetype='text/csv'
	)

@api.get('/stock/<ticker>/broker-summary')
def get_broker_summary_route(ticker: str):
	file_path, filename = get_broker_summary(ticker)

	return send_file(
		file_path,
		as_attachment=True,
		download_name=filename,
		mimetype='text/csv'
	)

@api.get('/stock/<ticker>/name')
def get_name_route(ticker: str):
	name = get_name(ticker)

	if name != None:
		return {
			'name': name
		}
	
	return {'message': f'{ticker} not found'}, 404