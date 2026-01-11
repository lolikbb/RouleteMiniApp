class RouletteGame {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.user = this.tg?.initDataUnsafe?.user;
        this.userId = this.user?.id || this.generateUserId();
        
        this.initApp();
        this.initRoulette();
        this.setupEventListeners();
        this.loadUserData();
        this.loadHistory();
        this.startTimer();
    }

    generateUserId() {
        // Генерируем ID для тестового режима
        let userId = localStorage.getItem('test_user_id');
        if (!userId) {
            userId = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('test_user_id', userId);
        }
        return userId;
    }

    initApp() {
        if (this.tg) {
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            this.tg.setHeaderColor('#0a0a0a');
            this.tg.setBackgroundColor('#0a0a0a');
            console.log('Telegram WebApp инициализирован');
        } else {
            console.log('Telegram WebApp не обнаружен, используем тестовый режим');
            this.testMode = true;
        }
    }

    async loadUserData() {
        try {
            if (!window.RouletteAPI) {
                console.error('RouletteAPI не загружен');
                return;
            }
            
            const data = await window.RouletteAPI.getUserData(this.userId);
            this.updateUI(data);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            // Показываем тестовые данные
            this.updateUI({
                balance: 10.0,
                daily_available: true,
                next_spin_time: null
            });
        }
    }

    updateUI(data) {
        // Обновляем баланс
        const balanceEl = document.getElementById('balanceAmount');
        if (balanceEl && data.balance !== undefined) {
            balanceEl.textContent = `$${data.balance.toFixed(2)}`;
        }
        
        // Обновляем таймер
        if (data.next_spin_time) {
            this.nextSpinTime = new Date(data.next_spin_time);
            this.updateTimerDisplay();
            this.disableSpinButton();
        } else {
            this.enableSpinButton();
        }
    }

    initRoulette() {
        const prizes = [
            {
                id: 1,
                name: "NEVERLOSE Чит",
                description: "30 дней подписки",
                icon: "fas fa-shield-alt",
                type: "cheat",
                rarity: "legendary",
                probability: 2,
                color: "#00ff88"
            },
            {
                id: 2,
                name: "500 NLE",
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
                color: "#00ccff"
            },
            {
                id: 4,
                name: "Lua Скрипт",
                description: "Эксклюзивные функции",
                icon: "fas fa-code",
                type: "lua",
                rarity: "rare",
                probability: 10,
                color: "#ff3366"
            },
            {
                id: 5,
                name: "250 NLE",
                description: "Внутренняя валюта",
                icon: "fas fa-coins",
                type: "nle",
                rarity: "common",
                probability: 15,
                color: "#ffaa00"
            },
            {
                id: 6,
                name: "100 NLE",
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
                <div class="item-icon ${iconClass}" style="background: ${prize.color}">
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
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);
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
            clearInterval(this.timerInterval);
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
            if (!window.RouletteAPI) {
                throw new Error('API не загружен');
            }
            
            const result = await window.RouletteAPI.spinRoulette(this.userId);
            
            if (result.error) {
                alert(result.error);
                if (result.next_spin_time) {
                    this.nextSpinTime = new Date(result.next_spin_time);
                    this.disableSpinButton();
                    this.startTimer();
                } else {
                    this.enableSpinButton();
                }
                return;
            }
            
            // Анимация выбора
            this.showSelectionAnimation(result);
            
            // Обновляем UI
            if (result.new_balance !== undefined) {
                const balanceEl = document.getElementById('balanceAmount');
                if (balanceEl) {
                    balanceEl.textContent = `$${result.new_balance.toFixed(2)}`;
                }
            }
            
            // Обновляем таймер
            if (result.next_spin_time) {
                this.nextSpinTime = new Date(result.next_spin_time);
                this.disableSpinButton();
                this.startTimer();
            }
            
            // Показываем результат
            setTimeout(() => {
                this.showResult(result);
                this.loadHistory();
            }, 2000);
            
        } catch (error) {
            console.error('Ошибка спина:', error);
            
            // Показываем тестовый результат при ошибке
            const testResult = {
                success: true,
                prize_name: "100 NLE",
                prize_type: "nle",
                amount: 100,
                message: "Вы выиграли 100 NLE!",
                next_spin_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };
            
            this.showSelectionAnimation(testResult);
            setTimeout(() => {
                this.showResult(testResult);
                this.loadHistory();
                this.disableSpinButton();
                this.nextSpinTime = new Date(testResult.next_spin_time);
                this.startTimer();
            }, 2000);
        }
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
            
            switch(result.prize_type) {
                case 'cheat':
                    modalDesc.textContent = `Вы выиграли ${result.prize_name}!`;
                    if (result.key) {
                        modalKey.textContent = `Ключ: ${result.key}`;
                        modalKey.style.display = 'block';
                    }
                    break;
                    
                case 'config':
                case 'lua':
                    modalDesc.textContent = `Вы выиграли ${result.prize_name}!`;
                    if (result.download_url) {
                        downloadLink.href = result.download_url;
                        downloadLink.textContent = result.prize_type === 'config' ? 'Скачать конфиг' : 'Скачать Lua';
                        modalDownload.style.display = 'block';
                    }
                    break;
                    
                case 'nle':
                    modalDesc.textContent = result.message || `Вы получили ${result.amount || 0} NLE!`;
                    break;
                    
                default:
                    modalDesc.textContent = result.message || 'Вы выиграли приз!';
            }
        } else {
            modalIcon.className = 'modal-icon modal-lose';
            modalIcon.innerHTML = '<i class="fas fa-redo"></i>';
            modalTitle.textContent = 'Попробуйте снова';
            modalDesc.textContent = result.message || 'Повторите попытку завтра!';
        }
        
        modal.style.display = 'flex';
    }

    closeModal() {
        const modal = document.getElementById('resultModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.enableSpinButton();
    }

    async loadHistory() {
        try {
            if (!window.RouletteAPI) return;
            
            const history = await window.RouletteAPI.getHistory(this.userId);
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
        
        history.slice().reverse().forEach(item => {
            const date = new Date(item.date).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            let iconClass = 'history-cheat';
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
                    iconClass = 'history-nle';
                    icon = 'fas fa-gift';
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

    async clearHistory() {
        if (!confirm('Очистить всю историю выигрышей?')) return;
        
        try {
            if (!window.RouletteAPI) return;
            
            await window.RouletteAPI.clearHistory(this.userId);
            this.displayHistory([]);
        } catch (error) {
            console.error('Ошибка очистки истории:', error);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем API скрипт
    const script = document.createElement('script');
    script.src = 'roulette_data.js';
    script.onload = () => {
        new RouletteGame();
    };
    script.onerror = () => {
        console.error('Не удалось загрузить RouletteAPI, используем тестовый режим');
        new RouletteGame();
    };
    document.head.appendChild(script);
});