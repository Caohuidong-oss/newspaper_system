import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-123456@'

    # Railway 的 MySQL 插件会注入以下变量之一：
    #   MYSQL_URL        完整连接串，如 mysql://user:pass@host:port/dbname
    #   DATABASE_URL     通用连接串
    #   MYSQL_HOST/PORT/USER/PASSWORD/DATABASE  拆分变量
    # 三者取其一即可，优先用完整连接串。
    _mysql_url = os.environ.get('MYSQL_URL') or os.environ.get('DATABASE_URL')
    _mysql_host = os.environ.get('MYSQL_HOST')
    if not _mysql_url and _mysql_host:
        _mysql_url = (
            f"mysql://{os.environ.get('MYSQL_USER', 'root')}:"
            f"{os.environ.get('MYSQL_PASSWORD', '')}@"
            f"{_mysql_host}:{os.environ.get('MYSQL_PORT', '3306')}/"
            f"{os.environ.get('MYSQL_DATABASE', 'railway')}"
        )

    if _mysql_url:
        # 生产环境：替换 mysql:// 为 mysql+pymysql://
        SQLALCHEMY_DATABASE_URI = _mysql_url.replace('mysql://', 'mysql+pymysql://', 1)
    else:
        # 开发环境：本地 MySQL
        SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:123456@127.0.0.1:3306/newspaper_subscription'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.environ.get('FLASK_DEBUG') == '1'
