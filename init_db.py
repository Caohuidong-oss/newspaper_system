"""Railway 部署初始化脚本：创建表 + 导入初始数据"""
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

    # 3. 创建默认管理员（如果不存在）
    if not LoginUser.query.filter_by(username='admin').first():
        admin = LoginUser(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            created_at=datetime.now()
        )
        db.session.add(admin)
        db.session.commit()
        print("✅ 默认管理员已创建（用户名: admin，密码: admin123）")
    else:
        print("⏭️  管理员账号已存在，跳过")

    print("\n🎉 初始化完成！")
