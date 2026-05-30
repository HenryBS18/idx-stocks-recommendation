from routes.api import api
from services.stock import StockService
from flask import  send_file

stock_service = StockService()

@api.get('/stock/<ticker>/price-historical')
def get_price_historical_route(ticker):
	try:
		file_path, filename = stock_service.get_price_historical(ticker)

		return send_file(
			file_path,
			as_attachment=True,
			download_name=filename,
			mimetype='text/csv'
		)
	except Exception:
		return {'message': f'{ticker} not found'}, 404

@api.get('/stock/<ticker>/financials')
def get_financials_route(ticker: str):
	try:
		file_path, filename = stock_service.get_financials(ticker)

		return send_file(
			file_path,
			as_attachment=True,
			download_name=filename,
			mimetype='text/csv'
		)
	except Exception:
		return {'message': f'{ticker} not found'}, 404

@api.get('/stock/<ticker>/balance-sheet')
def get_balance_sheet_route(ticker: str):
	try:
		file_path, filename = stock_service.get_balance_sheet(ticker)

		return send_file(
			file_path,
			as_attachment=True,
			download_name=filename,
			mimetype='text/csv'
		)
	except Exception:
		return {'message': f'{ticker} not found'}, 404

@api.get('/stock/<ticker>/broker-summary')
def get_broker_summary_route(ticker: str):
	try:
		file_path, filename = stock_service.get_broker_summary(ticker)

		return send_file(
			file_path,
			as_attachment=True,
			download_name=filename,
			mimetype='text/csv'
		)
	except Exception:
		return {'message': f'{ticker} not found'}, 404

@api.get('/stock/<ticker>/name')
def get_name_route(ticker: str):
	name = stock_service.get_name(ticker)

	if name == None:
		return {'message': f'{ticker} not found'}, 404
	
	return {'name': name}