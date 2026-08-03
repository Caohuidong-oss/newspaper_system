import os
import secrets


def _get_secret_key():
    """获取 SECRET_KEY：生产环境优先用环境变量，本地开发回退到随机值。

    生产环境如果没有配置 SECRET_KEY，会打印警告（不影响启动），
    但每次重启 session 都会失效，提醒配置。"""
    key = os.environ.get('SECRET_KEY')
    if key:
        return key
    if os.environ.get('MYSQL_URL') or os.environ.get('MYSQL_HOST'):
        # 生产环境：没有 SECRET_KEY 时生成随机值并告警
        print("⚠️ 警告: 未配置 SECRET_KEY，已生成随机密钥（重启后会话失效，建议在 Railway 配置 SECRET_KEY）")
        return secrets.token_hex(32)
    # 本地开发：固定值方便调试
    return 'dev-local-secret-key-please-change'


class Config:
    SECRET_KEY = _get_secret_key()

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
        # 本地开发：使用本机 MySQL（请按需修改）
        _local_db_pass = os.environ.get('LOCAL_DB_PASSWORD', '123456')
        SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://root:{_local_db_pass}@127.0.0.1:3306/newspaper_subscription'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.environ.get('FLASK_DEBUG') == '1'
