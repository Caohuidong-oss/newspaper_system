"""Railway 部署初始化脚本：创建表 + 导入初始数据"""
import os
from app import app, db
from models import User, Newspaper, LoginUser
from werkzeug.security import generate_password_hash
from datetime import datetime
from sqlalchemy import text

with app.app_context():
    # 1. 创建所有表
    db.create_all()
    print("数据库表创建完成")

    # 1.5 在线迁移：给 order_main 表加 delivery_address 列（不存在才加）
    try:
        result = db.session.execute(text(
            "SHOW COLUMNS FROM order_main LIKE 'delivery_address'"
        ))
        if result.fetchone() is None:
            db.session.execute(text(
                "ALTER TABLE order_main ADD COLUMN delivery_address VARCHAR(500) DEFAULT ''"
            ))
            db.session.commit()
            print("已添加 order_main.delivery_address 列")
        else:
            print("delivery_address 列已存在")
    except Exception as e:
        print(f"迁移检查跳过: {e}")
        db.session.rollback()

    # 1.6 在线迁移：给 order_main.user_id 的外键加上 ON DELETE CASCADE（兼容旧表）
    try:
        result = db.session.execute(text(
            "SELECT rc.CONSTRAINT_NAME, rc.DELETE_RULE "
            "FROM information_schema.REFERENTIAL_CONSTRAINTS rc "
            "JOIN information_schema.KEY_COLUMN_USAGE kcu "
            "  ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME "
            "  AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA "
            "WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.TABLE_NAME = 'order_main' "
            "AND kcu.COLUMN_NAME = 'user_id' AND kcu.REFERENCED_TABLE_NAME IS NOT NULL"
        ))
        row = result.fetchone()
        if row:
            fk_name, delete_rule = row
            if delete_rule.upper() != 'CASCADE':
                db.session.execute(text(
                    f"ALTER TABLE order_main DROP FOREIGN KEY {fk_name}, "
                    f"ADD CONSTRAINT {fk_name} FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE"
                ))
                db.session.commit()
                print(f"已更新 order_main 外键 {fk_name} -> ON DELETE CASCADE")
            else:
                print(f"order_main 外键 {fk_name} 已是 ON DELETE CASCADE，无需更新")
        else:
            print("未找到 order_main.user_id 外键，跳过")
    except Exception as e:
        print(f"外键迁移跳过: {e}")
        db.session.rollback()

    # 1.7 在线迁移：给 subscription 表的外键加上 ON DELETE CASCADE（兼容旧表）
    _fk_migrations = [
        ('subscription', 'order_id', 'order_main(order_id)'),
        ('subscription', 'newspaper_id', 'newspaper(newspaper_id)'),
    ]
    for _table, _col, _ref in _fk_migrations:
        try:
            result = db.session.execute(text(
                "SELECT rc.CONSTRAINT_NAME, rc.DELETE_RULE "
                "FROM information_schema.REFERENTIAL_CONSTRAINTS rc "
                "JOIN information_schema.KEY_COLUMN_USAGE kcu "
                "  ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME "
                "  AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA "
                "WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.TABLE_NAME = :t "
                "AND kcu.COLUMN_NAME = :c AND kcu.REFERENCED_TABLE_NAME IS NOT NULL"
            ), {'t': _table, 'c': _col})
            row = result.fetchone()
            if row:
                fk_name, delete_rule = row
                if delete_rule.upper() != 'CASCADE':
                    db.session.execute(text(
                        f"ALTER TABLE {_table} DROP FOREIGN KEY {fk_name}, "
                        f"ADD CONSTRAINT {fk_name} FOREIGN KEY ({_col}) REFERENCES {_ref} ON DELETE CASCADE"
                    ))
                    db.session.commit()
                    print(f"已更新 {_table}.{_col} 外键 -> ON DELETE CASCADE")
                else:
                    print(f"{_table}.{_col} 外键已是 ON DELETE CASCADE，无需更新")
            else:
                print(f"未找到 {_table}.{_col} 外键，跳过")
        except Exception as e:
            print(f"{_table}.{_col} 外键迁移跳过: {e}")
            db.session.rollback()

    # 1.8 在线迁移：给 newspaper 表加上架/截止日期列（兼容旧表）
    for _col in ('available_from', 'available_until'):
        try:
            result = db.session.execute(text(
                "SHOW COLUMNS FROM newspaper LIKE :col"
            ), {'col': _col})
            if result.fetchone() is None:
                col_type = 'DATE'
                db.session.execute(text(
                    f"ALTER TABLE newspaper ADD COLUMN {_col} {col_type} DEFAULT NULL"
                ))
                db.session.commit()
                print(f"已添加 newspaper.{_col} 列")
            else:
                print(f"newspaper.{_col} 列已存在")
        except Exception as e:
            print(f"列迁移跳过: {e}")
            db.session.rollback()

    # 2. 如果报刊表为空，导入初始报刊
    if Newspaper.query.count() == 0:
        newspapers = [
            Newspaper(name='人民日报', type='日报', price=1.50, period='日报', description='中国共产党中央委员会机关报', image='1_renminribao.png'),
            Newspaper(name='参考消息', type='日报', price=2.00, period='日报', description='新华通讯社主办，转载海外媒体报道', image='2_cankaoxiaoxi.png'),
            Newspaper(name='南方周末', type='周报', price=5.00, period='周报', description='中国发行量最大的周报之一', image='3_nanfangzhoumo.png'),
            Newspaper(name='读者', type='半月刊', price=4.00, period='半月刊', description='中国最具影响力的文摘杂志', image='4_duzhe.png'),
            Newspaper(name='计算机世界', type='周刊', price=3.50, period='周刊', description='中国IT领域专业报刊', image='5_jisuanjishijie.png'),
            Newspaper(name='环球时报', type='日报', price=2.50, period='日报', description='人民日报社主办的国际新闻日报', image='6_huanqiushibao.png'),
            Newspaper(name='三联生活周刊', type='周刊', price=8.00, period='周刊', description='中国著名文化综合类周刊', image='7_sanlianshenghuozhoukan.png'),
            Newspaper(name='财经周刊', type='周刊', price=6.00, period='周刊', description='中国最具影响力的财经刊物', image='8_caijingzhoukan.png'),
            Newspaper(name='科技日报', type='日报', price=2.00, period='日报', description='中国科技领域权威日报', image='9_kejiribao.png'),
            Newspaper(name='体育周报', type='周报', price=4.00, period='周报', description='综合性体育新闻周报', image='10_tiyuzhoubao.png'),
        ]
        for n in newspapers:
            db.session.add(n)
        db.session.commit()
        print(f"✅ 已导入 {len(newspapers)} 种报刊")
    else:
        print(f"⏭️  报刊表已有数据，跳过导入")

    # 3. 创建/更新默认管理员
    admin_user = LoginUser.query.filter_by(username='admin').first()
    env_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_user:
        import secrets as _secrets
        # 生产环境用环境变量 ADMIN_PASSWORD，否则生成随机密码
        admin_password = env_password or _secrets.token_urlsafe(12)
        admin_user = LoginUser(
            username='admin',
            password_hash=generate_password_hash(admin_password),
            role='admin',
            created_at=datetime.now()
        )
        db.session.add(admin_user)
        db.session.commit()
        if env_password:
            print("✅ 默认管理员已创建（用户名: admin，密码来自环境变量 ADMIN_PASSWORD）")
        else:
            print(f"✅ 默认管理员已创建（用户名: admin）")
            print(f"🔑 初始密码: {admin_password}")
            print("⚠️  请尽快登录后修改密码！")
    elif env_password:
        # 管理员已存在且配置了 ADMIN_PASSWORD → 同步更新密码
        if not check_password_hash(admin_user.password_hash, env_password):
            admin_user.password_hash = generate_password_hash(env_password)
            db.session.commit()
            print("✅ 管理员密码已同步更新（来自环境变量 ADMIN_PASSWORD）")
        else:
            print("✅ 管理员密码已是最新，无需更新")
    else:
        print("⏭️  管理员账号已存在，未配置 ADMIN_PASSWORD，保持原密码不变")

    print("\n🎉 初始化完成！")
