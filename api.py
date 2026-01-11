from aiohttp import web
import json
import hashlib
import hmac
from datetime import datetime, timedelta
import random
import secrets

# Для тестирования без проверки Telegram
DEBUG_MODE = True

async def verify_telegram_data(data):
    """Верификация данных от Telegram"""
    if DEBUG_MODE:
        return True  # Пропускаем проверку для тестирования
    
    try:
        if not data:
            return False
            
        data_hash = data.get('hash', '')
        data_dict = {k: v for k, v in data.items() if k != 'hash'}
        
        data_check_string = '\n'.join([f"{k}={v}" for k, v in sorted(data_dict.items())])
        
        # Здесь должен быть ваш BOT_TOKEN
        BOT_TOKEN = "8539456626:AAFTKxd-RFtmuEAJEFLvtWKV85yDFr9ffoQ"
        
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=BOT_TOKEN.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        hmac_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return hmac_hash == data_hash
    except:
        return False

# Хранилище данных (вместо БД для тестирования)
users_data = {}
history_data = {}

async def handle_user_data(request):
    """Получение данных пользователя"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        
        if not user_id:
            return web.json_response({'error': 'No user_id'}, status=400)
        
        # Инициализируем пользователя если его нет
        if user_id not in users_data:
            users_data[user_id] = {
                'balance': 10.0,
                'daily_available': True,
                'last_roll': None,
                'next_roll_time': None
            }
        
        user = users_data[user_id]
        
        # Проверяем доступность рулетки
        if user['last_roll']:
            last_roll = datetime.fromisoformat(user['last_roll'])
            next_roll = last_roll + timedelta(hours=24)
            now = datetime.now()
            
            if now >= next_roll:
                user['daily_available'] = True
                user['next_roll_time'] = None
            else:
                user['daily_available'] = False
                user['next_roll_time'] = next_roll.isoformat()
        
        return web.json_response({
            'balance': user['balance'],
            'daily_available': user['daily_available'],
            'next_roll_time': user['next_roll_time']
        })
        
    except Exception as e:
        print(f"Error in handle_user_data: {e}")
        return web.json_response({'error': str(e)}, status=500)

async def handle_spin_roulette(request):
    """Обработка спина рулетки"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        
        if not user_id:
            return web.json_response({'error': 'No user_id'}, status=400)
        
        # Проверяем пользователя
        if user_id not in users_data:
            users_data[user_id] = {
                'balance': 10.0,
                'daily_available': True,
                'last_roll': None
            }
        
        user = users_data[user_id]
        
        # Проверяем доступность
        if not user['daily_available']:
            return web.json_response({
                'error': 'Рулетка доступна раз в 24 часа',
                'next_roll_time': user.get('next_roll_time')
            }, status=400)
        
        # Определяем призы
        prizes = [
            {'name': 'NEVERLOSE Чит', 'type': 'cheat', 'probability': 2},
            {'name': '10 NLE', 'type': 'nle', 'probability': 5, 'amount': 10},
            {'name': 'Премиум Конфиг', 'type': 'config', 'probability': 8},
            {'name': 'Lua Скрипт', 'type': 'lua', 'probability': 10},
            {'name': '5 NLE', 'type': 'nle', 'probability': 15, 'amount': 5},
            {'name': '1 NLE', 'type': 'nle', 'probability': 20, 'amount': 1},
            {'name': 'Попробуйте снова', 'type': 'retry', 'probability': 40}
        ]
        
        # Выбираем приз
        total = sum(p['probability'] for p in prizes)
        roll = random.randint(0, total)
        cumulative = 0
        selected = None
        
        for prize in prizes:
            cumulative += prize['probability']
            if roll <= cumulative:
                selected = prize
                break
        
        if not selected:
            selected = prizes[-1]
        
        # Обновляем данные пользователя
        user['last_roll'] = datetime.now().isoformat()
        user['daily_available'] = False
        user['next_roll_time'] = (datetime.now() + timedelta(hours=24)).isoformat()
        
        result = {
            'success': selected['type'] != 'retry',
            'prize_name': selected['name'],
            'prize_type': selected['type'],
            'next_roll_time': user['next_roll_time']
        }
        
        # Обрабатываем выигрыш
        if selected['type'] == 'cheat':
            result['key'] = f"NL-{secrets.token_hex(8).upper()}"
        elif selected['type'] in ['config', 'lua']:
            result['download_url'] = "https://neverlose.cc/download"
        elif selected['type'] == 'nle':
            result['amount'] = selected['amount']
            user['balance'] += selected['amount'] / 100
            result['new_balance'] = user['balance']
        else:
            result['message'] = 'Попробуйте снова завтра!'
        
        # Сохраняем в историю
        if user_id not in history_data:
            history_data[user_id] = []
        
        history_data[user_id].append({
            'date': datetime.now().isoformat(),
            'prize': selected['name'],
            'type': selected['type'],
            'description': selected.get('amount', 'Приз')
        })
        
        return web.json_response(result)
        
    except Exception as e:
        print(f"Error in handle_spin_roulette: {e}")
        return web.json_response({'error': str(e)}, status=500)

async def handle_get_history(request):
    """Получение истории"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        
        if not user_id:
            return web.json_response([], status=200)
        
        history = history_data.get(user_id, [])
        # Сортируем по дате (новые первыми)
        history.sort(key=lambda x: x['date'], reverse=True)
        
        return web.json_response(history[:10])  # Последние 10 записей
        
    except Exception as e:
        print(f"Error in handle_get_history: {e}")
        return web.json_response([], status=200)

async def handle_clear_history(request):
    """Очистка истории"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        
        if user_id and user_id in history_data:
            history_data[user_id] = []
        
        return web.json_response({'success': True})
        
    except Exception as e:
        print(f"Error in handle_clear_history: {e}")
        return web.json_response({'error': str(e)}, status=500)

# Настройка routes
app = web.Application()

app.router.add_post('/api/user-data', handle_user_data)
app.router.add_post('/api/spin-roulette', handle_spin_roulette)
app.router.add_post('/api/get-history', handle_get_history)
app.router.add_post('/api/clear-history', handle_clear_history)

# Статические файлы
app.router.add_static('/', path='./', name='static')

if __name__ == '__main__':
    print("🚀 Mini App API запущен на http://localhost:8080")
    print("📱 Для Telegram используйте ngrok с HTTPS")
    web.run_app(app, port=8080)