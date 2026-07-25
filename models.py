from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'user'
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    real_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(200))
    register_date = db.Column(db.DateTime, default=datetime.now)

    orders = db.relationship('Order', backref='user', lazy=True)

class Newspaper(db.Model):
    __tablename__ = 'newspaper'
    newspaper_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50))
    price = db.Column(db.Numeric(10,2), nullable=False)
    period = db.Column(db.String(20))
    description = db.Column(db.Text)
    image = db.Column(db.String(255), default='')

    subscriptions = db.relationship('Subscription', backref='newspaper', lazy=True)

class Order(db.Model):
    __tablename__ = 'order_main'
    order_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    order_date = db.Column(db.DateTime, default=datetime.now)
    total_amount = db.Column(db.Numeric(12,2), nullable=False, default=0)
    status = db.Column(db.SmallInteger, default=1)
    note = db.Column(db.String(500), default='')  # 订单备注

    subscriptions = db.relationship('Subscription', backref='order', lazy=True, cascade='all, delete-orphan')

class Subscription(db.Model):
    __tablename__ = 'subscription'
    subscription_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order_main.order_id'), nullable=False)
    newspaper_id = db.Column(db.Integer, db.ForeignKey('newspaper.newspaper_id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    subtotal = db.Column(db.Numeric(12,2), nullable=False)

class LoginUser(db.Model):
    __tablename__ = 'login_user'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user', nullable=False)  # admin / user
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 找回密码用
    security_question = db.Column(db.String(200), default='')
    security_answer_hash = db.Column(db.String(255), default='')
