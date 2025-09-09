# LLM_MODES Backend API

A professional, secure, and scalable FastAPI-based backend for user authentication, chat management, and AI-powered interactions.

## Features

### Authentication & Security
- 🔐 JWT-based authentication with access/refresh tokens
- 🛡️ Password security with bcrypt hashing
- 🔒 Account lockout protection against brute force attacks
- 📧 Email verification system
- 🔑 Password reset functionality
- 📱 Multi-factor authentication (MFA) support
- 📝 Password history tracking
- ⚡ Rate limiting on sensitive endpoints

### Chat & AI Integration
- 💬 Multi-mode chat system (Similar Questions, Image Processing)
- 📊 Message persistence and history
- 🎯 Chat organization (pinning, archiving)
- ⚙️ Configurable chat settings per mode

### Professional Standards
- 📚 Comprehensive API documentation
- 🏗️ Clean architecture with proper separation of concerns
- 🔍 Structured logging with rotation
- ⚙️ Environment-based configuration
- 🧪 Type hints throughout the codebase
- 📈 Health check endpoints
- 🚀 Production-ready deployment configuration

## Tech Stack

- **Framework**: FastAPI 0.104.1
- **Database**: SQLAlchemy with SQLite/PostgreSQL support
- **Authentication**: JWT with python-jose
- **Password Hashing**: bcrypt
- **Rate Limiting**: SlowAPI
- **Validation**: Pydantic v2
- **Environment Management**: python-dotenv + pydantic-settings
- **Security**: Comprehensive security middleware stack

## Quick Start

### Prerequisites

- Python 3.8+
- pip or pipenv for package management

### Installation

1. **Clone and navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Generate a secure secret key**
   ```bash
   python -c "import secrets; print(f'SECRET_KEY={secrets.token_urlsafe(32)}')"
   ```
   Add this to your `.env` file.

6. **Run the development server**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at:
- API: http://localhost:8000
- Documentation: http://localhost:8000/docs (Swagger UI)
- Alternative docs: http://localhost:8000/redoc

## Project Structure

```
backend/
├── __init__.py              # Package initialization
├── main.py                  # FastAPI application entry point
├── config.py                # Configuration and logging setup
├── database.py              # Database configuration and session management
├── models.py                # SQLAlchemy database models
├── schemas.py               # Pydantic request/response schemas
├── auth.py                  # Authentication and authorization logic
├── routes.py                # Authentication API routes
├── chat_routes.py           # Chat management API routes
├── requirements.txt         # Python dependencies with versions
├── .env.example            # Environment variables template
├── README.md               # This file
└── logs/                   # Application logs (created automatically)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Verify email address

### Chat Management
- `GET /api/chats` - List user chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/{chat_id}` - Get specific chat
- `PUT /api/chats/{chat_id}` - Update chat
- `DELETE /api/chats/{chat_id}` - Delete chat
- `POST /api/chats/{chat_id}/messages` - Send message

### System
- `GET /` - Basic health check
- `GET /health` - Detailed health check with database status

## Configuration

### Environment Variables

Key configuration options (see `.env.example` for complete list):

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key (required) | None |
| `DATABASE_URL` | Database connection string | `sqlite:///./app.db` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access token lifetime | `15` |
| `MAX_LOGIN_ATTEMPTS` | Login attempts before lockout | `5` |
| `DEBUG` | Enable debug mode | `false` |
| `LOG_LEVEL` | Logging verbosity | `INFO` |

### Security Configuration

The application implements multiple layers of security:

- **Password Requirements**: Minimum 12 characters with complexity rules
- **Account Lockout**: Configurable attempts and duration
- **Token Security**: Short-lived access tokens with secure refresh mechanism
- **Rate Limiting**: Endpoint-specific limits to prevent abuse
- **Input Validation**: Comprehensive request validation with Pydantic

## Database

### SQLite (Default)
Perfect for development and small deployments. No additional setup required.

### PostgreSQL (Production)
For production environments:

1. Install PostgreSQL
2. Create a database
3. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   ```

### Migrations
Database tables are created automatically on startup. For production, consider using Alembic for migrations:

```bash
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Development

### Code Style
The codebase follows professional Python standards:
- Type hints throughout
- Comprehensive docstrings
- PEP 8 compliance
- Separation of concerns

### Logging
Structured logging is configured with:
- Console output for development
- File rotation for production
- Different log levels per module
- Automatic log directory creation

### Testing
To run tests (when implemented):
```bash
pytest
```

## Deployment

### Production Checklist
- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Use a strong, unique `SECRET_KEY`
- [ ] Configure PostgreSQL database
- [ ] Set up proper CORS origins
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up SSL/TLS certificates
- [ ] Configure log rotation
- [ ] Set up monitoring and health checks

### Docker (Optional)
Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "main.py"]
```

## Contributing

1. Follow the existing code style and structure
2. Add type hints to all functions
3. Include docstrings for public methods
4. Update tests for new functionality
5. Update this README for significant changes

## Security

This application implements security best practices:
- Secure password hashing with bcrypt
- JWT tokens with proper expiration
- SQL injection prevention with SQLAlchemy
- Input validation and sanitization
- Rate limiting and DDoS protection
- Security headers and CORS configuration

For security issues, please follow responsible disclosure practices.

## License

This project is licensed under the MIT License - see the LICENSE file for details.