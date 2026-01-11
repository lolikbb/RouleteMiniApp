// roulette_data.js - эмуляция API на клиенте
class LocalStorageAPI {
    constructor() {
        this.storageKey = 'neverlose_roulette_data';
        this.initData();
    }

    initData() {
        if (!localStorage.getItem(this.storageKey)) {
            const defaultData = {
                users: {},
                history: {},
                lastInit: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    async spinRoulette(userId) {
        const data = this.getData();
        
        // Инициализируем пользователя если его нет
        if (!data.users[userId]) {
            data.users[userId] = {
                balance: 10.0,
                daily_available: true,
                last_spin: null,
                created_at: new Date().toISOString()
            };
            data.history[userId] = [];
        }

        const user = data.users[userId];
        const now = new Date();

        // Проверяем доступность
        if (!user.daily_available && user.last_spin) {
            const lastSpin = new Date(user.last_spin);
            const hoursDiff = (now - lastSpin) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                const nextSpin = new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000);
                return {
                    error: 'Рулетка доступна раз в 24 часа',
                    next_spin_time: nextSpin.toISOString(),
                    hours_remaining: Math.ceil(24 - hoursDiff)
                };
            } else {
                user.daily_available = true;
            }
        }

        if (!user.daily_available) {
            return { error: 'Рулетка недоступна' };
        }

        // Определяем призы
        const prizes = [
            { name: 'NEVERLOSE Чит', type: 'cheat', probability: 2 },
            { name: '500 NLE', type: 'nle', probability: 5, amount: 500 },
            { name: 'Премиум Конфиг', type: 'config', probability: 8 },
            { name: 'Lua Скрипт', type: 'lua', probability: 10 },
            { name: '250 NLE', type: 'nle', probability: 15, amount: 250 },
            { name: '100 NLE', type: 'nle', probability: 20, amount: 100 },
            { name: 'Попробуйте снова', type: 'retry', probability: 40 }
        ];

        // Выбираем приз
        const totalProb = prizes.reduce((sum, p) => sum + p.probability, 0);
        const roll = Math.floor(Math.random() * totalProb) + 1;
        let cumulative = 0;
        let selected = prizes[prizes.length - 1];

        for (const prize of prizes) {
            cumulative += prize.probability;
            if (roll <= cumulative) {
                selected = prize;
                break;
            }
        }

        // Обновляем данные
        user.last_spin = now.toISOString();
        user.daily_available = false;

        // Формируем результат
        const result = {
            success: selected.type !== 'retry',
            prize_name: selected.name,
            prize_type: selected.type,
            next_spin_time: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            spin_time: now.toISOString()
        };

        // Обработка выигрыша
        if (selected.type === 'cheat') {
            result.key = `NL-ROULETTE-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
            result.message = 'Вы выиграли чит на 30 дней!';
        } else if (selected.type === 'config') {
            result.download_url = 'https://neverlose.cc/roulette/config.zip';
            result.message = 'Вы выиграли премиум конфиг!';
        } else if (selected.type === 'lua') {
            result.download_url = 'https://neverlose.cc/roulette/script.lua';
            result.message = 'Вы выиграли Lua скрипт!';
        } else if (selected.type === 'nle') {
            result.amount = selected.amount;
            user.balance += selected.amount / 100;
            result.new_balance = user.balance;
            result.message = `Вы выиграли ${selected.amount} NLE!`;
        } else {
            result.message = 'Попробуйте снова завтра!';
        }

        // Сохраняем в историю
        data.history[userId].push({
            date: now.toISOString(),
            prize: selected.name,
            type: selected.type,
            description: result.message
        });

        // Ограничиваем историю (последние 20 записей)
        if (data.history[userId].length > 20) {
            data.history[userId] = data.history[userId].slice(-20);
        }

        this.saveData(data);

        return result;
    }

    async getUserData(userId) {
        const data = this.getData();
        
        if (!data.users[userId]) {
            data.users[userId] = {
                balance: 10.0,
                daily_available: true,
                last_spin: null,
                created_at: new Date().toISOString()
            };
            data.history[userId] = [];
            this.saveData(data);
        }

        const user = data.users[userId];
        let nextSpinTime = null;
        let dailyAvailable = user.daily_available;

        if (user.last_spin && !user.daily_available) {
            const lastSpin = new Date(user.last_spin);
            const now = new Date();
            const hoursDiff = (now - lastSpin) / (1000 * 60 * 60);
            
            if (hoursDiff >= 24) {
                dailyAvailable = true;
                user.daily_available = true;
                this.saveData(data);
            } else {
                nextSpinTime = new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000).toISOString();
            }
        }

        return {
            balance: user.balance,
            daily_available: dailyAvailable,
            next_spin_time: nextSpinTime,
            user_id: userId
        };
    }

    async getHistory(userId) {
        const data = this.getData();
        return data.history[userId] || [];
    }

    async clearHistory(userId) {
        const data = this.getData();
        if (data.history[userId]) {
            data.history[userId] = [];
            this.saveData(data);
        }
        return { success: true };
    }
}

// Создаем глобальный экземпляр
window.RouletteAPI = new LocalStorageAPI();