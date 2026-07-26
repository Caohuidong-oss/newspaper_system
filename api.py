"""
报刊订阅系统 REST API v1
支持微信小程序前端调用，返回 JSON 格式数据。
同时保留原有网页路由（app.py）不受影响。
"""
import os
import json
import time
import hmac
import hashlib
import base64
from datetime import datetime, timedelta
from functools import wraps

import jwt
import requests
from flask import Blueprint, request, jsonify, current_app

from models import db, User, Newspaper, Order, Subscription, LoginUser
from werkzeug.security import generate_password_hash, check_password_hash

# ── 配置 ──────────────────────────────────────────
JWT_SECRET = os.environ.get('JWT_SECRET') or os.environ.get('SECRET_KEY') or 'api-jwt-dev-key'
JWT_EXPIRY_HOURS = 72
# 微信小程序配置（后补）
WX_APPID = os.environ.get('WX_APPID', '')
WX_SECRET = os.environ.get('WX_SECRET', '')

api = Blueprint('api', __name__, url_prefix='/api')

# ── 工具函数 ──────────────────────────────────────

def make_jwt(openid, username, role):
    """生成 JWT 令牌"""
    payload = {
        'openid': openid,
        'username': username,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def parse_jwt(token):
    """解析 JWT，返回 payload 或 None"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def login_required_api(f):
    """API 登录验证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]

        if not token:
            token = request.args.get('token')

        if not token:
            return jsonify({'code': 401, 'msg': '未登录，请先登录'}), 401

        payload = parse_jwt(token)
        if not payload:
            return jsonify({'code': 401, 'msg': '登录已过期，请重新登录'}), 401

        request.current_user = payload
        return f(*args, **kwargs)
    return decorated

def admin_required_api(f):
    """API 管理员验证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        if not token:
            token = request.args.get('token')
        if not token:
            return jsonify({'code': 401, 'msg': '未登录'}), 401
        payload = parse_jwt(token)
        if not payload:
            return jsonify({'code': 401, 'msg': '登录已过期'}), 401
        if payload.get('role') != 'admin':
            return jsonify({'code': 403, 'msg': '需要管理员权限'}), 403
        request.current_user = payload
        return f(*args, **kwargs)
    return decorated

def ok(data=None, msg='success'):
    """统一成功响应"""
    return jsonify({'code': 0, 'msg': msg, 'data': data})

def fail(msg='操作失败', code=400):
    """统一失败响应"""
    return jsonify({'code': code, 'msg': msg}), code

def newspaper_to_dict(n):
    return {
        'id': n.newspaper_id,
        'name': n.name,
        'type': n.type or '',
        'price': float(n.price),
        'period': n.period or '',
        'description': n.description or '',
        'image': n.image or '',
        'image_url': f"/static/uploads/{n.image}" if n.image else '',
    }

def order_to_dict(o):
    return {
        'order_id': o.order_id,
        'user_id': o.user_id,
        'user_name': o.user.real_name if o.user else '',
        'user_phone': o.user.phone if o.user else '',
        'order_date': o.order_date.strftime('%Y-%m-%d %H:%M:%S') if o.order_date else '',
        'total_amount': float(o.total_amount),
        'status': o.status,
        'status_text': {1: '待处理', 2: '已确认', 3: '已取消'}.get(o.status, '未知'),
        'note': o.note or '',
        'subscriptions': [{
            'newspaper_id': s.newspaper_id,
            'newspaper_name': s.newspaper.name if s.newspaper else '',
            'quantity': s.quantity,
            'subtotal': float(s.subtotal),
        } for s in o.subscriptions],
    }

def user_to_dict(u):
    return {
        'user_id': u.user_id,
        'username': u.username,
        'real_name': u.real_name,
        'phone': u.phone or '',
        'address': u.address or '',
        'register_date': u.register_date.strftime('%Y-%m-%d') if u.register_date else '',
    }

# ── 认证接口 ──────────────────────────────────────

@api.route('/auth/login', methods=['POST'])
def api_login():
    """
    微信登录：小程序 wx.login() → code → 后端换 openId
    POST {"code": "xxx"}
    调试模式：POST {"username": "xxx", "password": "xxx"} 直接账号登录
    """
    data = request.get_json(force=True, silent=True) or {}
    code = data.get('code', '')
    username = data.get('username', '')
    password = data.get('password', '')

    # 调试模式：用户名密码直接登录
    if username and password:
        user = LoginUser.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return fail('用户名或密码错误')
        token = make_jwt(f'dev_{username}', user.username, user.role)
        return ok({
            'token': token,
            'username': user.username,
            'role': user.role,
            'is_admin': user.role == 'admin',
        })

    # 微信 code 登录（需配置 WX_APPID + WX_SECRET）
    if code and WX_APPID and WX_SECRET:
        try:
            resp = requests.get(
                'https://api.weixin.qq.com/sns/jscode2session',
                params={'appid': WX_APPID, 'secret': WX_SECRET, 'js_code': code, 'grant_type': 'authorization_code'},
                timeout=10
            )
            wx_data = resp.json()
            if 'openid' not in wx_data:
                return fail('微信登录失败：' + wx_data.get('errmsg', '未知错误'))
            openid = wx_data['openid']
            # 查找或创建登录用户
            user = LoginUser.query.filter_by(username=f'wx_{openid[:16]}').first()
            if not user:
                user = LoginUser(
                    username=f'wx_{openid[:16]}',
                    password_hash=generate_password_hash(openid),
                    role='user',
                    created_at=datetime.now()
                )
                db.session.add(user)
                db.session.commit()
            token = make_jwt(openid, user.username, user.role)
            return ok({'token': token, 'username': user.username, 'role': user.role, 'is_admin': user.role == 'admin'})
        except Exception as e:
            return fail(f'微信登录请求失败：{str(e)}')

    return fail('请提供 code（微信登录）或 username/password（调试登录）')


@api.route('/auth/dev_login', methods=['POST'])
def api_dev_login():
    """开发调试登录：直接使用账号密码"""
    data = request.get_json(force=True, silent=True) or {}
    username = data.get('username', '')
    password = data.get('password', '')
    if not username or not password:
        return fail('请输入用户名和密码')
    user = LoginUser.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return fail('用户名或密码错误')
    token = make_jwt(f'dev_{username}', user.username, user.role)
    return ok({'token': token, 'username': user.username, 'role': user.role, 'is_admin': user.role == 'admin'})


@api.route('/auth/register', methods=['POST'])
def api_register():
    """小程序注册接口（普通用户）
    POST {username, password, real_name, phone='', address=''}
    """
    data = request.get_json(force=True, silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    real_name = (data.get('real_name') or username).strip()
    phone = (data.get('phone') or '').strip()
    address = (data.get('address') or '').strip()

    if not username:
        return fail('请输入用户名')
    if len(username) < 3:
        return fail('用户名至少 3 个字符')
    if len(password) < 6:
        return fail('密码至少 6 位')

    # 用户名已存在？
    if LoginUser.query.filter_by(username=username).first():
        return fail('用户名已存在')

    try:
        # 创建登录账号
        login_user = LoginUser(
            username=username,
            password_hash=generate_password_hash(password),
            role='user',
            created_at=datetime.now(),
        )
        db.session.add(login_user)
        db.session.flush()

        # 同时创建订户记录（用于下单）
        if not User.query.filter_by(username=username).first():
            subscriber = User(
                username=username,
                password='',  # 不存明文（实际认证走 LoginUser）
                real_name=real_name,
                phone=phone,
                address=address,
            )
            db.session.add(subscriber)

        db.session.commit()
        token = make_jwt(f'dev_{username}', login_user.username, login_user.role)
        return ok({
            'token': token,
            'username': login_user.username,
            'role': 'user',
            'is_admin': False,
        }, '注册成功！')
    except Exception as e:
        db.session.rollback()
        return fail(f'注册失败：{str(e)}')


@api.route('/auth/profile', methods=['GET'])
@login_required_api
def api_profile():
    """获取当前用户信息"""
    cu = request.current_user
    login_user = LoginUser.query.filter_by(username=cu['username']).first()
    subscriber = User.query.filter_by(username=cu['username']).first()
    return ok({
        'username': cu['username'],
        'role': cu['role'],
        'is_admin': cu['role'] == 'admin',
        'subscriber': user_to_dict(subscriber) if subscriber else None,
        'has_security_question': bool(login_user and login_user.security_question),
    })


# ── 报刊接口 ──────────────────────────────────────

@api.route('/newspapers', methods=['GET'])
def api_newspapers():
    """报刊列表，支持 keyword 搜索"""
    keyword = request.args.get('keyword', '').strip()
    query = Newspaper.query
    if keyword:
        query = query.filter(Newspaper.name.contains(keyword))
    newspapers = query.order_by(Newspaper.newspaper_id).all()
    return ok({'newspapers': [newspaper_to_dict(n) for n in newspapers], 'total': len(newspapers)})


@api.route('/newspapers/<int:newspaper_id>', methods=['GET'])
def api_newspaper_detail(newspaper_id):
    """报刊详情"""
    n = Newspaper.query.get(newspaper_id)
    if not n:
        return fail('报刊不存在', 404)
    return ok({'newspaper': newspaper_to_dict(n)})


# ── 订单接口 ──────────────────────────────────────

@api.route('/orders', methods=['GET'])
@login_required_api
def api_orders():
    """订单列表，管理员看全部，普通用户看自己的"""
    cu = request.current_user
    keyword = request.args.get('keyword', '').strip()
    status_filter = request.args.get('status', '').strip()

    query = Order.query
    if cu['role'] != 'admin':
        subscriber = User.query.filter_by(username=cu['username']).first()
        if not subscriber:
            return ok({'orders': [], 'total': 0})
        query = query.filter(Order.user_id == subscriber.user_id)
    elif keyword:
        query = query.join(User).filter(User.real_name.contains(keyword))
    if status_filter:
        query = query.filter(Order.status == int(status_filter))

    orders = query.order_by(Order.order_id.desc()).all()
    return ok({'orders': [order_to_dict(o) for o in orders], 'total': len(orders)})


@api.route('/orders', methods=['POST'])
@login_required_api
def api_order_create():
    """创建订单
    POST {"user_id": 1, "items": [{"newspaper_id": 1, "qty": 2}], "note": "xxx"}
    """
    cu = request.current_user
    data = request.get_json(force=True, silent=True) or {}

    # 确定订户
    if cu['role'] == 'admin' and data.get('user_id'):
        subscriber = User.query.get(int(data['user_id']))
    else:
        subscriber = User.query.filter_by(username=cu['username']).first()
    if not subscriber:
        return fail('订户不存在，请先注册')

    items = data.get('items', [])
    if not items:
        return fail('请至少选择一种报刊')

    total = 0
    subs = []
    for item in items:
        nid = item.get('newspaper_id')
        qty = int(item.get('qty', 0))
        if qty <= 0:
            continue
        newspaper = Newspaper.query.get(nid)
        if not newspaper:
            continue
        subtotal = float(newspaper.price) * qty
        total += subtotal
        subs.append(Subscription(newspaper_id=nid, quantity=qty, subtotal=subtotal))

    if not subs:
        return fail('请至少选择一种有效报刊')

    order = Order(
        user_id=subscriber.user_id,
        total_amount=total,
        status=1,
        note=data.get('note', ''),
        order_date=datetime.now(),
    )
    db.session.add(order)
    db.session.flush()

    for s in subs:
        s.order_id = order.order_id
        db.session.add(s)

    db.session.commit()
    return ok({'order_id': order.order_id}, '订单创建成功')


@api.route('/orders/<int:order_id>', methods=['GET'])
@login_required_api
def api_order_detail(order_id):
    """订单详情"""
    cu = request.current_user
    order = Order.query.get(order_id)
    if not order:
        return fail('订单不存在', 404)
    if cu['role'] != 'admin' and not User.query.filter_by(username=cu['username'], user_id=order.user_id).first():
        return fail('无权查看此订单', 403)
    return ok({'order': order_to_dict(order)})


@api.route('/orders/<int:order_id>/cancel', methods=['POST'])
@login_required_api
def api_order_cancel(order_id):
    """取消订单"""
    cu = request.current_user
    order = Order.query.get(order_id)
    if not order:
        return fail('订单不存在', 404)
    if cu['role'] != 'admin' and not User.query.filter_by(username=cu['username'], user_id=order.user_id).first():
        return fail('无权操作此订单', 403)
    if order.status != 1:
        return fail('只能取消待处理的订单')
    order.status = 3
    db.session.commit()
    return ok({}, '订单已取消')


@api.route('/orders/<int:order_id>/confirm', methods=['POST'])
@admin_required_api
def api_order_confirm(order_id):
    """确认订单（管理员）"""
    order = Order.query.get(order_id)
    if not order:
        return fail('订单不存在', 404)
    if order.status != 1:
        return fail('只能确认待处理的订单')
    order.status = 2
    db.session.commit()
    return ok({}, '订单已确认')


# ── 订户接口 ──────────────────────────────────────

@api.route('/users', methods=['GET'])
@admin_required_api
def api_users():
    """订户列表（管理员）"""
    keyword = request.args.get('keyword', '').strip()
    query = User.query
    if keyword:
        query = query.filter(db.or_(User.real_name.contains(keyword), User.username.contains(keyword)))
    users = query.order_by(User.user_id.desc()).all()
    return ok({'users': [user_to_dict(u) for u in users], 'total': len(users)})


@api.route('/users/<int:user_id>', methods=['GET'])
@login_required_api
def api_user_detail(user_id):
    """订户详情"""
    cu = request.current_user
    u = User.query.get(user_id)
    if not u:
        return fail('订户不存在', 404)
    if cu['role'] != 'admin' and u.username != cu['username']:
        return fail('无权查看', 403)
    return ok({'user': user_to_dict(u)})


# ── 统计接口 ──────────────────────────────────────

@api.route('/stats', methods=['GET'])
@login_required_api
def api_stats():
    """统计数据"""
    cu = request.current_user
    if cu['role'] == 'admin':
        total_users = User.query.count()
        total_newspapers = Newspaper.query.count()
        total_orders = Order.query.count()
        total_revenue = db.session.query(db.func.sum(Order.total_amount)).scalar() or 0
        total_subscriptions = db.session.query(db.func.sum(Subscription.quantity)).scalar() or 0
        # 类型分布
        type_stats = db.session.query(
            Newspaper.type, db.func.sum(Subscription.quantity)
        ).join(Subscription, Newspaper.newspaper_id == Subscription.newspaper_id
        ).group_by(Newspaper.type).all()
    else:
        subscriber = User.query.filter_by(username=cu['username']).first()
        total_users = 0
        total_newspapers = Newspaper.query.count()
        if subscriber:
            total_orders = Order.query.filter_by(user_id=subscriber.user_id).count()
            total_revenue = db.session.query(db.func.sum(Order.total_amount)).filter(
                Order.user_id == subscriber.user_id).scalar() or 0
            total_subscriptions = db.session.query(db.func.sum(Subscription.quantity)).join(
                Order, Subscription.order_id == Order.order_id
            ).filter(Order.user_id == subscriber.user_id).scalar() or 0
        else:
            total_orders = 0
            total_revenue = 0
            total_subscriptions = 0
        type_stats = []

    # 热门报刊
    top_newspapers = db.session.query(
        Newspaper.name, db.func.sum(Subscription.quantity).label('total_qty')
    ).join(Subscription, Newspaper.newspaper_id == Subscription.newspaper_id
    ).group_by(Newspaper.newspaper_id
    ).order_by(db.desc('total_qty')).limit(5).all()

    return ok({
        'total_users': total_users,
        'total_newspapers': total_newspapers,
        'total_orders': total_orders,
        'total_revenue': float(total_revenue),
        'total_subscriptions': float(total_subscriptions),
        'top_newspapers': [{'name': n[0], 'count': int(n[1])} for n in top_newspapers],
        'type_stats': [{'type': t[0] or '其他', 'count': int(t[1])} for t in type_stats],
    })


# ── 管理接口 ──────────────────────────────────────

@api.route('/admin/users', methods=['GET'])
@admin_required_api
def api_admin_users():
    """管理员列表"""
    users = LoginUser.query.order_by(LoginUser.id).all()
    return ok({
        'users': [{
            'id': u.id,
            'username': u.username,
            'role': u.role,
            'created_at': u.created_at.strftime('%Y-%m-%d %H:%M') if u.created_at else '',
            'has_security': bool(u.security_question),
        } for u in users]
    })


@api.route('/admin/users/<int:user_id>/role', methods=['PUT'])
@admin_required_api
def api_admin_set_role(user_id):
    """设置角色"""
    data = request.get_json(force=True, silent=True) or {}
    login_user = LoginUser.query.get(user_id)
    if not login_user:
        return fail('用户不存在', 404)
    if login_user.id == request.current_user.get('user_id'):
        return fail('不能修改自己的权限')
    role = data.get('role', '')
    if role not in ('admin', 'user'):
        return fail('无效的角色')
    login_user.role = role
    db.session.commit()
    return ok({}, '角色更新成功')


# ── 健康检查 ──────────────────────────────────────

@api.route('/ping', methods=['GET'])
def api_ping():
    return ok({'status': 'ok', 'time': datetime.now().isoformat()})
