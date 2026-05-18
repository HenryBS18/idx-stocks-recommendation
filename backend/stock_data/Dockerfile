FROM python:3.11.1-alpine

WORKDIR /app

COPY requirements.txt .

RUN pip3 install -r requirements.txt --no-cache-dir

COPY . .

CMD ["sh", "-c", "gunicorn --bind ${HOST}:${PORT} --workers 4 main:app"]