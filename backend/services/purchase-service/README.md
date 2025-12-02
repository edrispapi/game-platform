# Purchase Service

Purchase and order management service for the Steam-like platform.

## Features

- Order creation and management
- Payment transaction processing
- Refund handling
- Order status tracking
- Order history and statistics

## API Endpoints

### Orders
- `POST /api/v1/purchases/` - Create a new order
- `GET /api/v1/purchases/{order_id}` - Get order by ID
- `GET /api/v1/purchases/number/{order_number}` - Get order by order number
- `GET /api/v1/purchases/user/{user_id}` - Get user's orders
- `PATCH /api/v1/purchases/{order_id}/status` - Update order status

### Payments
- `POST /api/v1/purchases/{order_id}/payment` - Create payment transaction
- `PATCH /api/v1/purchases/payment/{transaction_id}/status` - Update payment status

### Refunds
- `POST /api/v1/purchases/{order_id}/refund` - Create refund

### Statistics
- `GET /api/v1/purchases/stats/summary` - Get order summary statistics

## Database Schema

- **orders**: Order information and status
- **order_items**: Individual items in orders
- **payment_transactions**: Payment processing records
- **refunds**: Refund records

## Environment Variables

- `PURCHASE_DATABASE_URL`: PostgreSQL database URL
- `REDIS_URL`: Redis cache URL
- `SECRET_KEY`: JWT secret key

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload
```

## Docker

```bash
# Build image
docker build -t purchase-service .

# Run container
docker run -p 8005:8005 purchase-service
```