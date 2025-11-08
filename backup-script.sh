#!/bin/bash
# Trafik Manager V3 - Otomatik Backup Script
# Günlük olarak çalıştırılacak

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/root/webapp/backups"
PROD_DIR="/home/root/Trafic-manager-uretim-dosyasi"

# Backup dizinini oluştur
mkdir -p $BACKUP_DIR

echo "🔄 Backup başlatılıyor: $DATE"

# 1. Database Backup
echo "📊 Database backup alınıyor..."
PGPASSWORD=I4z9eP2aD5sQ3wL1 pg_dump -h postgres.dtekai.com -U postgres -d dtektracking > $BACKUP_DIR/db_backup_$DATE.sql
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 2. Code Backup (Git)
echo "💻 Kod backup alınıyor..."
cd $PROD_DIR
git add -A 2>/dev/null
git commit -m "auto-backup: $DATE" 2>/dev/null
git push origin production 2>/dev/null

# 3. Config Files Backup
echo "⚙️ Config dosyaları yedekleniyor..."
tar -czf $BACKUP_DIR/configs_$DATE.tar.gz \
    $PROD_DIR/.env.production \
    $PROD_DIR/ecosystem.config.js \
    /etc/nginx/sites-available/dtektracking.com \
    /etc/nginx/sites-available/dosya.dtektracking.com

# 4. Eski backupları temizle (7 günden eski)
echo "🧹 Eski backuplar temizleniyor..."
find $BACKUP_DIR -type f -mtime +7 -delete

# 5. Backup durumu
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo "✅ Backup tamamlandı!"
echo "📁 Backup dizini: $BACKUP_DIR"
echo "💾 Toplam backup boyutu: $BACKUP_SIZE"

# PM2 ve sistem durumu kaydet
pm2 list > $BACKUP_DIR/system_status_$DATE.txt
df -h >> $BACKUP_DIR/system_status_$DATE.txt

echo "📋 Sistem durumu kaydedildi"
echo "✨ Backup işlemi başarıyla tamamlandı: $(date)"