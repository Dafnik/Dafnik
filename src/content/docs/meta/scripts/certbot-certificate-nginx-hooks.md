---
title: Certbot get certificate with nginx hooks
---

```
sudo certbot certonly --standalone --preferred-challenges http -d <DOMAIN> --pre-hook="systemctl stop nginx" --post-hook="systemctl start nginx"
```
