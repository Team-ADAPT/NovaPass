# NovaPass Deployment Guide

## Local Development

```bash
# 1. Start infrastructure
cp .env.example .env   # fill in secrets
cd docker && docker-compose up -d postgres redis

# 2. Backend
cd backend && mvn spring-boot:run

# 3. Web app
cd web-app && npm install && npm run dev

# 4. Desktop (requires Rust + Tauri CLI)
cd desktop && npm install && npm run dev
```

## Docker (all-in-one)

```bash
cp .env.example .env   # fill in secrets
# Place TLS certs at docker/certs/fullchain.pem and docker/certs/privkey.pem
cd docker && docker-compose up -d
```

## Cloud Deployment (AWS example)

### Infrastructure

```
Route 53 → CloudFront (CDN for web app) → ALB → ECS Fargate
                                                    ├── novapass-backend  (2+ tasks)
                                                    └── novapass-web      (2+ tasks)
                                         → RDS PostgreSQL (Multi-AZ)
                                         → ElastiCache Redis
```

### Steps

1. Build and push images to ECR:
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker build -f docker/Dockerfile-backend -t novapass-backend .
   docker tag novapass-backend:latest <ecr-uri>/novapass-backend:latest
   docker push <ecr-uri>/novapass-backend:latest
   ```

2. Create ECS task definitions referencing the ECR images.

3. Store secrets in AWS Secrets Manager; inject as environment variables into ECS tasks.

4. Set `JWT_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD` as Secrets Manager secrets.

5. Enable CloudFront in front of the web app for global CDN delivery.

6. Use ACM for TLS certificates.

### Kubernetes (optional)

Helm chart structure:
```
helm/novapass/
  Chart.yaml
  values.yaml
  templates/
    deployment-backend.yaml
    deployment-web.yaml
    service-backend.yaml
    service-web.yaml
    ingress.yaml          # nginx-ingress with cert-manager
    configmap.yaml
    secret.yaml           # sealed-secrets or external-secrets
```

## Desktop App Distribution

```bash
cd desktop
npm run build
# Outputs:
#   macOS:   src-tauri/target/release/bundle/dmg/NovaPass.dmg
#   Windows: src-tauri/target/release/bundle/msi/NovaPass.msi
#   Linux:   src-tauri/target/release/bundle/appimage/NovaPass.AppImage
```

## Security Checklist

- [ ] JWT_SECRET is random, ≥32 chars, stored in secrets manager
- [ ] TLS 1.2+ enforced on all endpoints
- [ ] CORS restricted to known origins
- [ ] Rate limiting active on /api/auth/*
- [ ] Database not exposed to public internet
- [ ] Redis password set
- [ ] Docker containers run as non-root
- [ ] Dependency vulnerability scan (mvn dependency-check:check)
