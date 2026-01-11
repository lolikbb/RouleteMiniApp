class RouletteGame {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.user = this.tg?.initDataUnsafe?.user;
        this.userId = this.user?.id || this.generateUserId();
        
        this.initApp();
        this.initRoulette();
        this.setupEventListeners();
        this.updateUserId();
        this.loadHistory();
        this.startTimer();
    }

    generateUserId() {
        // Генерируем ID для тестового режима
        let userId = localStorage.getItem('trust_market_user_id');
        if (!userId) {
            userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            localStorage.setItem('trust_market_user_id', userId);
        }
        return userId;
    }

    updateUserId() {
        const userIdEl = document.getElementById('userId');
        if (userIdEl) {
            // Показываем короткий ID
            const shortId = this.userId.length > 10 ? 
                this.userId.substr(0, 8) + '...' : this.userId;
            userIdEl.textContent = shortId;
        }
    }

    initApp() {
        if (this.tg) {
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            this.tg.setHeaderColor('#0a0a0a');
            this.tg.setBackgroundColor('#0a0a0a');
            console.log('Trust Market: Telegram WebApp инициализирован');
        } else {
            console.log('Trust Market: Тестовый режим (без Telegram)');
            this.testMode = true;
        }
    }

    initRoulette() {
        const prizes = [
            {
                id: 1,
                name: "CS2 Чит",
                description: "30 дней подписки",
                icon: "fas fa-shield-alt",
                type: "cheat",
                rarity: "legendary",
                probability: 2,
                color: "#ff3366"
            },
            {
                id: 2,
                name: "5 NLE",
                description: "Внутренняя валюта",
                icon: "fas fa-coins",
                type: "nle",
                rarity: "epic",
                probability: 5,
                color: "#ffaa00"
            },
            {
                id: 3,
                name: "Премиум Конфиг",
                description: "Профессиональный",
                icon: "fas fa-sliders-h",
                type: "config",
                rarity: "rare",
                probability: 8,
                color: "#3366ff"
            },
            {
                id: 4,
                name: "Lua Скрипт",
                description: "Эксклюзивные функции",
                icon: "fas fa-code",
                type: "lua",
                rarity: "rare",
                probability: 10,
                color: "#00cc88"
            },
            {
                id: 5,
                name: "2.5 NLE",
                description: "Внутренняя валюта",
                icon: "fas fa-coins",
                type: "nle",
                rarity: "common",
                probability: 15,
                color: "#ffaa00"
            },
            {
                id: 6,
                name: "1 NLE",
                description: "Внутренняя валюта",
                icon: "fas fa-coins",
                type: "nle",
                rarity: "common",
                probability: 20,
                color: "#ffaa00"
            },
            {
                id: 7,
                name: "Повторите",
                description: "Попробуйте завтра",
                icon: "fas fa-redo",
                type: "retry",
                rarity: "common",
                probability: 40,
                color: "#666666"
            }
        ];

        const container = document.getElementById('rouletteItems');
        if (!container) return;

        container.innerHTML = '';
        
        prizes.forEach(prize => {
            const item = document.createElement('div');
            item.className = 'roulette-item';
            item.dataset.id = prize.id;
            item.dataset.type = prize.type;
            item.dataset.probability = prize.probability;
            
            const rarityClass = `rarity-${prize.rarity}`;
            const iconClass = `icon-${prize.type}`;
            
            item.innerHTML = `
                <div class="item-rarity ${rarityClass}">${prize.rarity.toUpperCase()}</div>
                <div class="item-icon ${iconClass}">
                    <i class="${prize.icon}"></i>
                </div>
                <div class="item-name">${prize.name}</div>
                <div class="item-chance">${prize.probability}%</div>
            `;
            
            container.appendChild(item);
        });

        this.prizes = prizes;
    }

    setupEventListeners() {
        const spinBtn = document.getElementById('spinButton');
        const modalClose = document.getElementById('modalClose');
        const clearHistory = document.getElementById('clearHistory');
        
        if (spinBtn) {
            spinBtn.addEventListener('click', () => this.spinRoulette());
        }
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }
        
        if (clearHistory) {
            clearHistory.addEventListener('click', () => this.clearHistory());
        }
    }

    startTimer() {
        // Проверяем время последнего спина
        const lastSpin = localStorage.getItem(`trust_market_last_spin_${this.userId}`);
        if (lastSpin) {
            const lastSpinTime = new Date(lastSpin);
            const now = new Date();
            const hoursDiff = (now - lastSpinTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                this.nextSpinTime = new Date(lastSpinTime.getTime() + 24 * 60 * 60 * 1000);
                this.updateTimerDisplay();
                this.disableSpinButton();
                this.timerInterval = setInterval(() => {
                    this.updateTimerDisplay();
                }, 1000);
                return;
            }
        }
        
        this.enableSpinButton();
    }

    updateTimerDisplay() {
        if (!this.nextSpinTime) {
            const timerEl = document.getElementById('timer');
            const timerText = document.getElementById('timerText');
            if (timerEl && timerText) {
                timerText.textContent = 'Доступно сейчас';
                timerEl.className = 'timer active';
            }
            return;
        }
        
        const timerEl = document.getElementById('timer');
        const timerText = document.getElementById('timerText');
        
        if (!timerEl || !timerText) return;
        
        const now = new Date();
        const diff = this.nextSpinTime - now;
        
        if (diff <= 0) {
            timerText.textContent = 'Доступно сейчас';
            timerEl.className = 'timer active';
            this.enableSpinButton();
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        timerText.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (hours < 1) {
            timerEl.className = 'timer expired';
        }
    }

    enableSpinButton() {
        const button = document.getElementById('spinButton');
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-play"></i><span>Крутить рулетку</span>';
        }
    }

    disableSpinButton() {
        const button = document.getElementById('spinButton');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-clock"></i><span>Доступно через 24ч</span>';
        }
    }

    async spinRoulette() {
        const button = document.getElementById('spinButton');
        if (!button || button.disabled) return;
        
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Крутится...</span>';
        
        try {
            // Проверяем время последнего спина
            const lastSpin = localStorage.getItem(`trust_market_last_spin_${this.userId}`);
            if (lastSpin) {
                const lastSpinTime = new Date(lastSpin);
                const now = new Date();
                const hoursDiff = (now - lastSpinTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    this.nextSpinTime = new Date(lastSpinTime.getTime() + 24 * 60 * 60 * 1000);
                    this.disableSpinButton();
                    this.startTimer();
                    throw new Error(`Рулетка доступна раз в 24 часа. Осталось: ${Math.ceil(24 - hoursDiff)} часов`);
                }
            }
            
            // Выбираем случайный приз
            const selectedPrize = this.selectRandomPrize();
            
            // Сохраняем время спина
            localStorage.setItem(`trust_market_last_spin_${this.userId}`, new Date().toISOString());
            
            // Сохраняем в историю
            this.saveToHistory(selectedPrize);
            
            // Анимация выбора
            this.showSelectionAnimation(selectedPrize);
            
            // Обновляем таймер
            this.nextSpinTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
            this.disableSpinButton();
            this.startTimer();
            
            // Показываем результат
            setTimeout(() => {
                this.showResult(selectedPrize);
                this.loadHistory();
            }, 2000);
            
        } catch (error) {
            console.error('Ошибка спина:', error);
            
            // Показываем ошибку
            const errorResult = {
                success: false,
                prize_name: "Ошибка",
                prize_type: "error",
                message: error.message || "Произошла ошибка. Попробуйте позже."
            };
            
            this.showResult(errorResult);
            this.enableSpinButton();
        }
    }

    selectRandomPrize() {
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
            spin_time: new Date().toISOString(),
            message: ""
        };

        // Формируем сообщение
        switch(selected.type) {
            case "cheat":
                result.key = `TM-CHT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                result.message = "🎮 Поздравляем! Вы выиграли Neverlose Cs2 30d";
                break;
            case "config":
                result.download_url = "https://trustmarket.store/downloads/config_pro.zip";
                result.message = "Вы выиграли gamesense beta cfg";
                break;
            case "lua":
                result.download_url = "https://trustmarket.store/downloads/script_premium.lua";
                result.message = "Вы выиграли evalate beta";
                break;
            case "nle":
                result.amount = selected.amount;
                result.message = `Вы выиграли ${selected.amount} NLE!`;
                break;
            default:
                result.message = "Попробуйте снова завтра!";
        }

        return result;
    }

    saveToHistory(result) {
        let history = JSON.parse(localStorage.getItem(`trust_market_history_${this.userId}`) || '[]');
        
        history.push({
            date: new Date().toISOString(),
            prize: result.prize_name,
            type: result.prize_type,
            description: result.message,
            success: result.success
        });
        
        // Ограничиваем историю 50 записями
        if (history.length > 50) {
            history = history.slice(-50);
        }
        
        localStorage.setItem(`trust_market_history_${this.userId}`, JSON.stringify(history));
    }

    showSelectionAnimation(result) {
        const items = document.querySelectorAll('.roulette-item');
        const selectedIndex = this.prizes.findIndex(p => p.name === result.prize_name);
        
        // Снимаем предыдущее выделение
        items.forEach(item => item.classList.remove('selected'));
        
        // Выделяем выбранный элемент
        if (selectedIndex >= 0 && items[selectedIndex]) {
            items[selectedIndex].classList.add('selected');
            
            // Прокручиваем к выбранному элементу
            items[selectedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    showResult(result) {
        const modal = document.getElementById('resultModal');
        const modalIcon = document.getElementById('modalIcon');
        const modalTitle = document.getElementById('modalTitle');
        const modalDesc = document.getElementById('modalDescription');
        const modalKey = document.getElementById('modalKey');
        const modalDownload = document.getElementById('modalDownload');
        const downloadLink = document.getElementById('downloadLink');
        
        if (!modal) return;
        
        // Сбрасываем предыдущее состояние
        modalKey.style.display = 'none';
        modalDownload.style.display = 'none';
        
        if (result.success) {
            modalIcon.className = 'modal-icon modal-win';
            modalIcon.innerHTML = '<i class="fas fa-trophy"></i>';
            modalTitle.textContent = 'Поздравляем!';
            modalDesc.textContent = result.message;
            
            if (result.key) {
                modalKey.textContent = `Ключ: ${result.key}`;
                modalKey.style.display = 'block';
            }
            
            if (result.download_url) {
                downloadLink.href = result.download_url;
                downloadLink.textContent = result.prize_type === 'config' ? 'Скачать конфиг' : 'Скачать Lua';
                modalDownload.style.display = 'block';
            }
        } else {
            modalIcon.className = 'modal-icon modal-lose';
            modalIcon.innerHTML = '<i class="fas fa-redo"></i>';
            modalTitle.textContent = result.prize_name === 'Ошибка' ? 'Ошибка' : 'Попробуйте снова';
            modalDesc.textContent = result.message;
        }
        
        modal.style.display = 'flex';
    }

    closeModal() {
        const modal = document.getElementById('resultModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem(`trust_market_history_${this.userId}`) || '[]');
            this.displayHistory(history);
        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
            this.displayHistory([]);
        }
    }

    displayHistory(history) {
        const container = document.getElementById('historyList');
        if (!container) return;
        
        if (!history || history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <div class="empty-text">История пуста</div>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Показываем последние 10 записей (новые сверху)
        history.slice().reverse().slice(0, 10).forEach(item => {
            const date = new Date(item.date).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            let iconClass = 'history-retry';
            let icon = 'fas fa-gift';
            
            switch(item.type) {
                case 'cheat':
                    iconClass = 'history-cheat';
                    icon = 'fas fa-shield-alt';
                    break;
                case 'config':
                    iconClass = 'history-config';
                    icon = 'fas fa-sliders-h';
                    break;
                case 'lua':
                    iconClass = 'history-lua';
                    icon = 'fas fa-code';
                    break;
                case 'nle':
                    iconClass = 'history-nle';
                    icon = 'fas fa-coins';
                    break;
                default:
                    iconClass = 'history-retry';
                    icon = 'fas fa-redo';
            }
            
            html += `
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-icon ${iconClass}">
                            <i class="${icon}"></i>
                        </div>
                        <div class="history-details">
                            <h4>${item.prize}</h4>
                            <p>${item.description || ''}</p>
                        </div>
                    </div>
                    <div class="history-date">${date}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    clearHistory() {
        if (!confirm('Очистить всю историю выигрышей?')) return;
        
        localStorage.removeItem(`trust_market_history_${this.userId}`);
        this.displayHistory([]);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new RouletteGame();
});