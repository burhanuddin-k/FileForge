# EC2 deployment files

## Copy project

```bash
sudo mkdir -p /var/www/fileforge
sudo chown -R $USER:$USER /var/www/fileforge
```

Copy the FileForge project into `/var/www/fileforge`.

## Install dependencies

```bash
cd /var/www/fileforge
npm install --omit=dev
```

## Environment

```bash
cp .env.example .env
nano .env
```

Set the real MySQL password and a long random JWT secret.

## Systemd

Edit `fileforge.service` if your Node path differs, then:

```bash
sudo cp deploy/fileforge.service /etc/systemd/system/fileforge.service
sudo systemctl daemon-reload
sudo systemctl enable --now fileforge
sudo systemctl status fileforge
```

## Nginx

```bash
sudo cp deploy/fileforge.nginx.conf /etc/nginx/sites-available/fileforge
sudo ln -s /etc/nginx/sites-available/fileforge /etc/nginx/sites-enabled/fileforge
sudo nginx -t
sudo systemctl reload nginx
```

Replace `YOUR_DOMAIN_OR_EC2_IP` before reloading Nginx.

Do not expose MySQL port 3306 in the EC2 security group.
