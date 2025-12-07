FROM python:3.11-slim-bookworm

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Run the application with Gunicorn (multiprocess ASGI)
# Use UvicornWorker for ASGI support with multiprocessing
CMD ["gunicorn", "app.main:app", "-c", "gunicorn_config.py", "--worker-class", "uvicorn.workers.UvicornWorker"]