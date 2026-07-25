import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-123456@'
    # Railway 部署时会在环境变量中提供 MYSQL_URL
    # 格式如: mysql://user:pass@host:port/dbname
    DATABASE_URL = os.environ.get('MYSQL_URL') or os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        # 生产环境：替换 mysql:// 为 mysql+pymysql://
        SQLALCHEMY_DATABASE_URI = DATABASE_URL.replace('mysql://', 'mysql+pymysql://')
    else:
        # 开发环境：本地 MySQL
        SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:123456@127.0.0.1:3306/newspaper_subscription'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.environ.get('FLASK_DEBUG') == '1'
