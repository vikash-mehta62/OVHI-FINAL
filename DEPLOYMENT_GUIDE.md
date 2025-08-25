# RCM Application Deployment Guide

This guide provides comprehensive instructions for deploying the RCM (Revenue Cycle Management) application across different environments using various deployment methods.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 20GB free space (100GB+ recommended for production)
- **Network**: Stable internet connection for downloading dependencies

### Required Software

- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Node.js**: Version 18+ (for local development)
- **Git**: Latest version
- **kubectl**: Latest version (for Kubernetes deployment)

### Installation Commands

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

## Environment Configuration

### Development Environment

1. **Copy environment file**:
   ```bash
   cp .env.development .env
   ```

2. **Update configuration** as needed for your local setup.

### Production Environment

1. **Create production environment file**:
   ```bash
   cp .env.production.example .env.production
   ```

2. **Update all placeholder values** with your actual production credentials:
   - Database credentials
   - JWT secrets (minimum 64 characters)
   - Redis password
   - Payment gateway keys
   - AWS credentials
   - Domain configuration

3. **Secure the environment file**:
   ```bash
   chmod 600 .env.production
   ```

## Docker Deployment

### Development Deployment

1. **Start the application**:
   ```bash
   ./scripts/deploy.sh development deploy
   ```

2. **Check status**:
   ```bash
   ./scripts/deploy.sh development status
   ```

3. **View logs**:
   ```bash
   ./scripts/deploy.sh development logs
   ```

### Production Deployment

1. **Prepare environment**:
   ```bash
   # Ensure production environment file exists
   cp .env.production.example .env.production
   # Edit .env.production with your values
   ```

2. **Deploy to production**:
   ```bash
   ./scripts/deploy.sh production deploy
   ```

3. **Verify deployment**:
   ```bash
   ./scripts/deploy.sh production health
   ```

### Available Commands

```bash
# Deploy application
./scripts/deploy.sh [environment] deploy

# Start services
./scripts/deploy.sh [environment] start

# Stop services
./scripts/deploy.sh [environment] stop

# Restart services
./scripts/deploy.sh [environment] restart

# View logs
./scripts/deploy.sh [environment] logs

# Check status
./scripts/deploy.sh [environment] status

# Create backup
./scripts/deploy.sh [environment] backup

# Restore from backup
./scripts/deploy.sh [environment] restore

# Update application
./scripts/deploy.sh [environment] update

# Rollback to previous version
./scripts/deploy.sh [environment] rollback

# Check health
./scripts/deploy.sh [environment] health

# Clean up resources
./scripts/deploy.sh [environment] cleanup
```

## Kubernetes Deployment

### Prerequisites

1. **Kubernetes cluster** (local or cloud-based)
2. **kubectl** configured to connect to your cluster
3. **Docker registry** access for pushing images

### Deployment Steps

1. **Update registry configuration**:
   ```bash
   # Edit scripts/k8s-deploy.sh
   # Replace 'your-registry' with your actual registry URL
   ```

2. **Update Kubernetes manifests**:
   ```bash
   # Edit k8s/secrets.yaml with base64 encoded secrets
   echo -n "your-secret" | base64
   ```

3. **Deploy to Kubernetes**:
   ```bash
   ./scripts/k8s-deploy.sh deploy
   ```

4. **Check deployment status**:
   ```bash
   ./scripts/k8s-deploy.sh status
   ```

### Kubernetes Commands

```bash
# Deploy application
./scripts/k8s-deploy.sh deploy

# Delete application
./scripts/k8s-deploy.sh delete

# Update deployment
./scripts/k8s-deploy.sh update

# Show status
./scripts/k8s-deploy.sh status

# View logs
./scripts/k8s-deploy.sh logs [POD_NAME]

# Scale deployment
./scripts/k8s-deploy.sh scale [REPLICAS]

# Rollback deployment
./scripts/k8s-deploy.sh rollback
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database backup created
- [ ] DNS records configured
- [ ] Monitoring setup verified
- [ ] Security scan completed
- [ ] Load testing performed

### SSL Certificate Setup

1. **Using Let's Encrypt**:
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Obtain certificate
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

2. **Update Nginx configuration** to use SSL certificates.

### Database Setup

1. **Initialize database**:
   ```bash
   # Run database migrations
   docker exec rcm-db-prod mysql -u root -p < server/sql/rcm_schema.sql
   ```

2. **Create database backup**:
   ```bash
   ./scripts/deploy.sh production backup
   ```

### Security Hardening

1. **Update system packages**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure firewall**:
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **Set up fail2ban**:
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

## Monitoring and Maintenance

### Health Checks

The application provides several health check endpoints:

- **Application Health**: `GET /api/v1/monitoring/health`
- **Database Health**: `GET /api/v1/monitoring/db-health`
- **Redis Health**: `GET /api/v1/monitoring/redis-health`

### Monitoring Stack

The deployment includes:

- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Nginx**: Access logs and metrics

### Access Monitoring

1. **Grafana Dashboard**: `https://your-domain.com/grafana`
   - Username: `admin`
   - Password: Set in environment variables

2. **Prometheus**: `https://your-domain.com/prometheus`

### Backup Strategy

1. **Automated backups** run daily at 2 AM
2. **Backup retention**: 30 days
3. **Backup location**: `/var/backups/rcm/`

### Log Management

1. **Application logs**: `/var/log/rcm/`
2. **Nginx logs**: `/var/log/nginx/`
3. **Log rotation**: Configured automatically

## Troubleshooting

### Common Issues

#### Application Won't Start

1. **Check logs**:
   ```bash
   ./scripts/deploy.sh production logs
   ```

2. **Verify environment variables**:
   ```bash
   docker exec rcm-app-prod env | grep -E "(DB_|REDIS_|JWT_)"
   ```

3. **Check database connection**:
   ```bash
   docker exec rcm-db-prod mysql -u root -p -e "SHOW DATABASES;"
   ```

#### Database Connection Issues

1. **Check MySQL status**:
   ```bash
   docker exec rcm-db-prod mysqladmin ping -u root -p
   ```

2. **Verify network connectivity**:
   ```bash
   docker exec rcm-app-prod nc -zv rcm-db-prod 3306
   ```

#### High Memory Usage

1. **Check container resources**:
   ```bash
   docker stats
   ```

2. **Optimize MySQL configuration**:
   - Adjust `innodb_buffer_pool_size`
   - Tune query cache settings

#### SSL Certificate Issues

1. **Check certificate expiry**:
   ```bash
   sudo certbot certificates
   ```

2. **Renew certificates**:
   ```bash
   sudo certbot renew
   ```

### Performance Optimization

1. **Database optimization**:
   - Regular ANALYZE TABLE
   - Index optimization
   - Query performance tuning

2. **Application optimization**:
   - Enable compression
   - Optimize bundle size
   - Implement caching

3. **Infrastructure optimization**:
   - Load balancing
   - CDN implementation
   - Database read replicas

### Emergency Procedures

#### Rollback Deployment

```bash
./scripts/deploy.sh production rollback
```

#### Restore from Backup

```bash
./scripts/deploy.sh production restore [BACKUP_NAME]
```

#### Scale Down for Maintenance

```bash
# Docker
docker-compose -f docker-compose.prod.yml scale rcm-app=0

# Kubernetes
./scripts/k8s-deploy.sh scale 0
```

## Support and Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Full security audit and penetration testing

### Contact Information

For deployment issues or questions:
- **Technical Support**: [support@your-domain.com]
- **Emergency Contact**: [emergency@your-domain.com]
- **Documentation**: [docs.your-domain.com]

---

**Note**: Always test deployments in a staging environment before deploying to production.