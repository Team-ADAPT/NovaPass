# NovaPass - Secure Password Manager

A modern, secure password management system built with Spring Boot backend and JavaFX desktop client.

## 🚀 Features

- **End-to-End Encryption**: AES-256 encryption for all vault data
- **Zero-Knowledge Architecture**: Master password never leaves the client
- **Multi-Device Sync**: Seamless synchronization across devices
- **2FA Support**: TOTP-based two-factor authentication
- **Secure Password Generation**: Cryptographically secure password generator
- **Browser Extension**: Auto-fill credentials (optional)
- **Biometric Authentication**: Passkey support (optional)

## 🏗️ Architecture

- **Backend**: Spring Boot REST API with JWT authentication
- **Desktop Client**: JavaFX cross-platform application
- **Database**: PostgreSQL/MySQL
- **Encryption**: AES-256-GCM, Argon2 password hashing
- **Security**: JWT tokens, CORS protection, rate limiting

## 📋 Prerequisites

- Java 17 or higher
- Maven 3.8+
- PostgreSQL 14+ or MySQL 8+
- Docker (optional, for containerized deployment)

## 🛠️ Setup & Installation

### Backend Setup

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

### Desktop Client Setup

```bash
cd desktop-client
mvn clean install
mvn javafx:run
```

### Docker Deployment

```bash
docker-compose up -d
```

## 📚 Documentation

- [System Architecture](docs/architecture/)
- [API Specification](docs/api-specification/openapi.yaml)
- [Database Schema](docs/database-schema/schema-design.sql)
- [Project Report](docs/project-report/)

## 🧪 Testing

```bash
# Run all tests
mvn test

# Run integration tests
mvn verify
```

## 🔒 Security

- All passwords are hashed using Argon2
- Vault data is encrypted with AES-256-GCM
- Zero-knowledge architecture ensures server never sees plaintext
- Regular security audits and dependency updates

## 📄 License

MIT License - see LICENSE file for details

## 👥 Contributors

- Your Name - Initial work

## 🙏 Acknowledgments

- Spring Boot team
- JavaFX community
- Open source security libraries
