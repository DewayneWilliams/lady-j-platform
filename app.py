"""Backward-compatible entrypoint — prefer `python wsgi.py` or `flask --app wsgi run`."""

from wsgi import app

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
