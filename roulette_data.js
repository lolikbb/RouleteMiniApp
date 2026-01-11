// trust_market_roulette.js - хранилище данных для Trust Market Roulette
class TrustMarketRoulette {
    constructor() {
        this.storageKey = 'trust_market_roulette';
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            const defaultData = {
                version: '1.0',
                created_at: new Date().toISOString(),
                users: {},
                stats: {
                    total_spins: 0,
                    total_wins: 0,
                    last_update: new Date().toISOString()
                }
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

    getUser(userId) {
        const data = this.getData();
        if (!data.users) data.users = {};
        
        if (!data.users[userId]) {
            data.users[userId] = {
                id: userId,
                created_at: new Date().toISOString(),
                last_spin: null,
                total_spins: 0,
                total_wins: 0,
                history: []
            };
            this.saveData(data);
        }
        
        return data.users[userId];
    }

    canSpin(userId) {
        const user = this.getUser(userId);
        
        if (!user.last_spin) {
            return { canSpin: true };
        }
        
        const lastSpin = new Date(user.last_spin);
        const now = new Date();
        const hoursDiff = (now - lastSpin) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            const nextSpin = new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000);
            const hoursLeft = Math.ceil(24 - hoursDiff);
            return {
                canSpin: false,
                next_spin_time: nextSpin.toISOString(),
                hours_left: hoursLeft
            };
        }
        
        return { canSpin: true };
    }

    spin(userId) {
        const canSpin = this.canSpin(userId);
        if (!canSpin.canSpin) {
            return {
                success: false,
                error: `Рулетка доступна раз в 24 часа. Осталось: ${canSpin.hours_left}ч`,
                next_spin_time: canSpin.next_spin_time
            };
        }

        // Выбираем приз
        const prize = this.selectPrize();
        
        // Обновляем данные
        const data = this.getData();
        const user = data.users[userId];
        
        user.last_spin = new Date().toISOString();
        user.total_spins = (user.total_spins || 0) + 1;
        
        if (prize.success) {
            user.total_wins = (user.total_wins || 0) + 1;
        }
        
        // Добавляем в историю
        user.history = user.history || [];
        user.history.push({
            date: new Date().toISOString(),
            prize: prize.prize_name,
            type: prize.prize_type,
            success: prize.success,
            details: prize
        });
        
        // Ограничиваем историю
        if (user.history.length > 50) {
            user.history = user.history.slice(-50);
        }
        
        // Обновляем статистику
        data.stats.total_spins = (data.stats.total_spins || 0) + 1;
        if (prize.success) {
            data.stats.total_wins = (data.stats.total_wins || 0) + 1;
        }
        data.stats.last_update = new Date().toISOString();
        
        this.saveData(data);
        
        return {
            success: prize.success,
            prize_name: prize.prize_name,
            prize_type: prize.prize_type,
            message: prize.message,
            next_spin_time: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
            ...(prize.key && { key: prize.key }),
            ...(prize.download_url && { download_url: prize.download_url }),
            ...(prize.amount && { amount: prize.amount })
        };
    }

    selectPrize() {
        const prizes = [
            { name: "Neverlose Cs2 30d", type: "cheat", probability: 2 },
            { name: "5 NLE", type: "nle", probability: 5, amount: 5 },
            { name: "gamesense beta cfg", type: "config", probability: 8 },
            { name: "evalate beta", type: "lua", probability: 10 },
            { name: "2.5 NLE", type: "nle", probability: 15, amount: 2.5 },
            { name: "1 NLE", type: "nle", probability: 20, amount: 1 },
            { name: "Попробуйте снова", type: "retry", probability: 40 }
        ];

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

        const result = {
            success: selected.type !== "retry",
            prize_name: selected.name,
            prize_type: selected.type,
            message: ""
        };

        switch(selected.type) {
            case "cheat":
                result.key = `TM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
                result.message = "🎮 Поздравляем! Вы выиграли Neverlose Cs2 30d";
                break;
            case "config":
                result.download_url = "https://trustmarket.store/downloads/config_premium.zip";
                result.message = "Вы выиграли gamesense beta cfg";
                break;
            case "lua":
                result.download_url = "https://trustmarket.store/downloads/script_ultimate.lua";
                result.message = "Вы выиграли evalate beta";
                break;
            case "nle":
                result.amount = selected.amount;
                result.message = `💎 Вы выиграли ${selected.amount} NLE!`;
                break;
            default:
                result.message = "🔄 Попробуйте снова завтра!";
        }

        return result;
    }

    getHistory(userId) {
        const user = this.getUser(userId);
        return user.history || [];
    }

    clearHistory(userId) {
        const data = this.getData();
        if (data.users[userId]) {
            data.users[userId].history = [];
            this.saveData(data);
        }
        return { success: true };
    }

    getUserStats(userId) {
        const user = this.getUser(userId);
        const canSpin = this.canSpin(userId);
        
        return {
            user_id: userId,
            total_spins: user.total_spins || 0,
            total_wins: user.total_wins || 0,
            win_rate: user.total_spins ? ((user.total_wins || 0) / user.total_spins * 100).toFixed(1) : 0,
            can_spin: canSpin.canSpin,
            next_spin_time: canSpin.next_spin_time,
            last_spin: user.last_spin
        };
    }
}

// Создаем глобальный экземпляр
window.TrustMarketRoulette = new TrustMarketRoulette();