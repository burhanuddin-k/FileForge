# FileForge

Professional browser-based image and PDF utility platform.

## Current stack

- HTML/CSS/JavaScript frontend
- Node.js + Express backend
- MySQL 8.4
- Docker + Docker Compose
- Nginx reverse proxy
- Jenkins CI/CD
- bcrypt password hashing
- JWT stored in an HTTP-only cookie

## Authentication

Registration is mandatory before using FileForge tools.
Registration requires only:

- Full name
- Valid email address
- Password

The password is hashed with bcrypt before it is stored in MySQL.

## Important

Do **not** open `index.html` directly with `file://`. The login/register page is served by Express at `/` and `/login`/`/register`. Run the application through Docker or Node.js.

## Local Docker run

```bash
cp .env.example .env
nano .env
# Set DB_PASSWORD, MYSQL_ROOT_PASSWORD and JWT_SECRET

docker compose up -d --build
docker compose ps
curl http://127.0.0.1/api/health
```

Open `http://SERVER_IP/`.

## Jenkins on EC2

Jenkins should check out this repository, build the Docker image, run Docker Compose, and perform a health check. See `Jenkinsfile`.

The Jenkins user must be allowed to run Docker. A common EC2 setup is:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

Treat Docker socket access as privileged access.

## Production

Use HTTPS before setting `COOKIE_SECURE=true`. Keep MySQL private and do not expose port 3306 in the EC2 security group.
