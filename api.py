from aiohttp import web
import json
import hashlib
import hmac
import config
from database import Session, User, check_daily_roll_available
from datetime import datetime, timedelta
import secrets
import random

async def verify_telegram_data(data):
    """Верификация данных от Telegram"""
    try:
        if not data:
            return False
            
        # Получаем хэш из данных
        data_hash = data.get('hash', '')
        data_dict = {k: v for k, v in data.items() if k != 'hash'}
        
        # Сортируем ключи
        data_check_string = '\n'.join([f"{k}={v}" for k, v in sorted(data_dict.items())])
        
        # Создаем секретный ключ
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=config.Config.BOT_TOKEN.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Проверяем хэш
        hmac_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return hmac_hash == data_hash
    except Exception as e:
        print(f"Verification error: {e}")
        return False

async def get_user_data(request):
    """Получение данных пользователя"""
    data = await request.json()
    
    if not await verify_telegram_data(data.get('initData', {})):
        return web.json_response({'error': 'Invalid data'}, status=403)
    
    user_id = data['user_id']
    
    with Session() as session:
        user = session.query(User).filter_by(user_id=user_id).first()
        
        if user:
            next_roll_time = None
            if user.last_daily_roll:
                next_roll_time = user.last_daily_roll + timedelta(hours=24)
                if datetime.now() >= next_roll_time:
                    user.daily_roll_available = True
                    session.commit()
                    next_roll_time = None
            
            return web.json_response({
                'balance': user.balance,
                'daily_available': user.daily_roll_available,
                'next_roll_time': next_roll_time.isoformat() if next_roll_time else None
            })
    
    return web.json_response({'error': 'User not found'}, status=404)

async def spin_roulette(request):
    """Обработка спина рулетки с проверкой времени"""
    data = await request.json()
    
    if not await verify_telegram_data(data.get('initData', {})):
        return web.json_response({'error': 'Invalid data'}, status=403)
    
    user_id = data['user_id']
    
    with Session() as session:
        user = session.query(User).filter_by(user_id=user_id).first()
        
        if not user:
            return web.json_response({'error': 'User not found'}, status=404)
        
        # Проверяем доступность рулетки
        if not user.daily_roll_available:
            # Проверяем, прошло ли 24 часа
            if user.last_daily_roll:
                time_since_last_roll = datetime.now() - user.last_daily_roll
                if time_since_last_roll < timedelta(hours=24):
                    next_roll_time = user.last_daily_roll + timedelta(hours=24)
                    return web.json_response({
                        'error': 'Рулетка доступна раз в 24 часа',
                        'next_roll_time': next_roll_time.isoformat()
                    })
                else:
                    user.daily_roll_available = True
                    session.commit()
            else:
                user.daily_roll_available = True
                session.commit()
        
        # Рулетка недоступна
        if not user.daily_roll_available:
            return web.json_response({'error': 'Рулетка недоступна'}, status=400)
        
        # Определяем призы и их вероятности
        prizes = [
            {'name': 'NEVERLOSE Чит', 'type': 'cheat', 'probability': 2},
            {'name': 'Премиум Конфиг', 'type': 'config', 'probability': 8},
            {'name': 'Lua Скрипт', 'type': 'lua', 'probability': 15},
            {'name': '500 NLE', 'type': 'nle', 'probability': 10, 'amount': 500},
            {'name': '250 NLE', 'type': 'nle', 'probability': 15, 'amount': 250},
            {'name': '100 NLE', 'type': 'nle', 'probability': 20, 'amount': 100},
            {'name': 'Попробуйте снова', 'type': 'retry', 'probability': 30}
        ]
        
        # Выбираем случайный приз
        total_probability = sum(p['probability'] for p in prizes)
        random_value = random.uniform(0, total_probability)
        
        cumulative = 0
        selected_prize = None
        
        for prize in prizes:
            cumulative += prize['probability']
            if random_value <= cumulative:
                selected_prize = prize
                break
        
        if not selected_prize:
            selected_prize = prizes[-1]
        
        # Обновляем время последнего спина
        user.last_daily_roll = datetime.now()
        user.daily_roll_available = False
        
        result = {
            'success': True,
            'prize_name': selected_prize['name'],
            'prize_type': selected_prize['type'],
            'next_roll_time': (datetime.now() + timedelta(hours=24)).isoformat()
        }
        
        # Обработка выигрыша
        roll_history = user.roll_history or []
        
        if selected_prize['type'] == 'cheat':
            # Генерируем ключ для чита
            cheat_key = f"NL-{secrets.token_hex(8).upper()}"
            user.has_cheat = True
            user.cheat_key = cheat_key
            user.cheat_loader_url = "https://neverlose.cc/download/loader.exe"
            user.cheat_expires = datetime.now() + timedelta(days=30)
            result['key'] = cheat_key
            
            roll_history.append({
                'date': datetime.now().isoformat(),
                'prize': selected_prize['name'],
                'type': 'cheat',
                'description': '30 дней подписки'
            })
            
        elif selected_prize['type'] == 'config':
            # Добавляем конфиг
            configs = user.configs or []
            config_id = len(configs) + 1
            configs.append({
                'id': config_id,
                'name': 'Premium Config',
                'download_url': 'https://neverlose.cc/configs/premium.zip'
            })
            user.configs = configs
            result['download_url'] = 'https://neverlose.cc/configs/premium.zip'
            
            roll_history.append({
                'date': datetime.now().isoformat(),
                'prize': selected_prize['name'],
                'type': 'config',
                'description': 'Профессиональная настройка'
            })
            
        elif selected_prize['type'] == 'lua':
            # Добавляем Lua скрипт
            luas = user.luas or []
            lua_id = len(luas) + 1
            luas.append({
                'id': lua_id,
                'name': 'Premium Lua Script',
                'download_url': 'https://neverlose.cc/luas/premium.lua'
            })
            user.luas = luas
            result['download_url'] = 'https://neverlose.cc/luas/premium.lua'
            
            roll_history.append({
                'date': datetime.now().isoformat(),
                'prize': selected_prize['name'],
                'type': 'lua',
                'description': 'Эксклюзивные функции'
            })
            
        elif selected_prize['type'] == 'nle':
            # Добавляем NLE
            amount = selected_prize.get('amount', 0)
            user.balance += amount
            result['amount'] = amount
            result['new_balance'] = user.balance
            
            roll_history.append({
                'date': datetime.now().isoformat(),
                'prize': selected_prize['name'],
                'type': 'nle',
                'description': f'{amount} внутренней валюты'
            })
            
        else:  # retry
            result['success'] = False
            result['message'] = 'Попробуйте снова завтра!'
            
            roll_history.append({
                'date': datetime.now().isoformat(),
                'prize': selected_prize['name'],
                'type': 'retry',
                'description': 'Повторите попытку'
            })
        
        # Сохраняем историю
        user.roll_history = roll_history
        session.commit()
        
        return web.json_response(result)

async def get_history(request):
    """Получение истории рулетки пользователя"""
    data = await request.json()
    
    if not await verify_telegram_data(data.get('initData', {})):
        return web.json_response({'error': 'Invalid data'}, status=403)
    
    user_id = data['user_id']
    
    with Session() as session:
        user = session.query(User).filter_by(user_id=user_id).first()
        
        if user:
            history = user.roll_history or []
            # Сортируем по дате (новые первыми)
            history.sort(key=lambda x: x.get('date', ''), reverse=True)
            return web.json_response(history)
    
    return web.json_response([])

async def clear_history(request):
    """Очистка истории рулетки"""
    data = await request.json()
    
    if not await verify_telegram_data(data.get('initData', {})):
        return web.json_response({'error': 'Invalid data'}, status=403)
    
    user_id = data['user_id']
    
    with Session() as session:
        user = session.query(User).filter_by(user_id=user_id).first()
        
        if user:
            user.roll_history = []
            session.commit()
            return web.json_response({'success': True})
    
    return web.json_response({'error': 'User not found'}, status=404)

# Настройка routes
app = web.Application()
app.router.add_post('/api/user-data', get_user_data)
app.router.add_post('/api/spin-roulette', spin_roulette)
app.router.add_post('/api/get-history', get_history)
app.router.add_post('/api/clear-history', clear_history)

if __name__ == '__main__':
    web.run_app(app, port=8081)