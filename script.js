class RouletteGame {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.initUser();
        this.initRoulette();
        this.setupEventListeners();
        this.loadHistory();
        this.startTimer();
    }

    initUser() {
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        const initData = this.tg.initDataUnsafe;
        this.user = initData.user || {};
        
        if (this.user.id) {
            document.getElementById('balance').textContent = 'Загрузка...';
            this.loadUserData();
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/user-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.user.id,
                    initData: this.tg.initData
                })
            });
            
            const data = await response.json();
            
            // Обновляем баланс
            document.getElementById('balance').textContent = `$${data.balance.toFixed(2)}`;
            
            // Проверяем доступность рулетки
            if (data.next_roll_time) {
                this.nextRollTime = new Date(data.next_roll_time);
                this.updateTimer();
            } else {
                this.enableSpinButton();
            }
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    initRoulette() {
        const rouletteItems = [
            {
                id: 1,
                name: "NEVERLOSE Чит",
                description: "30 дней подписки",
                type: "cheat",
                rarity: "legendary",
                probability: 2,
                icon: "fas fa-shield-alt"
            },
            {
                id: 2,
                name: "Премиум Конфиг",
                description: "Профессиональная настройка",
                type: "config",
                rarity: "epic",
                probability: 8,
                icon: "fas fa-sliders-h"
            },
            {
                id: 3,
                name: "Lua Скрипт",
                description: "Эксклюзивные функции",
                type: "lua",
                rarity: "rare",
                probability: 15,
                icon: "fas fa-code"
            },
            {
                id: 4,
                name: "500 NLE",
                description: "Внутренняя валюта",
                type: "nle",
                rarity: "epic",
                probability: 10,
                icon: "fas fa-coins"
            },
            {
                id: 5,
                name: "250 NLE",
                description: "Внутренняя валюта",
                type: "nle",
                rarity: "rare",
                probability: 15,
                icon: "fas fa-coins"
            },
            {
                id: 6,
                name: "100 NLE",
                description: "Внутренняя валюта",
                type: "nle",
                rarity: "common",
                probability: 20,
                icon: "fas fa-coins"
            },
            {
                id: 7,
                name: "Попробуйте снова",
                description: "Завтра новая попытка",
                type: "retry",
                rarity: "common",
                probability: 30,
                icon: "fas fa-redo"
            }
        ];

        const track = document.getElementById('rouletteTrack');
        
        rouletteItems.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'roulette-item';
            itemElement.dataset.id = item.id;
            itemElement.dataset.probability = item.probability;
            
            const rarityClass = `rarity-${item.rarity}`;
            const iconClass = `item-icon ${item.type}`;
            
            itemElement.innerHTML = `
                <div class="item-rarity ${rarityClass}">${item.rarity.toUpperCase()}</div>
                <div class="${iconClass}">
                    <i class="${item.icon}"></i>
                </div>
                <h3 class="item-name">${item.name}</h3>
                <p class="item-description">${item.description}</p>
            `;
            
            track.appendChild(itemElement);
        });

        this.rouletteItems = rouletteItems;
    }

    setupEventListeners() {
        document.getElementById('spinButton').addEventListener('click', () => {
            this.spinRoulette();
        });
        
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeResult();
        });
        
        document.getElementById('clearHistory').addEventListener('click', () => {
            this.clearHistory();
        });
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    updateTimer() {
        if (!this.nextRollTime) return;
        
        const now = new Date();
        const diff = this.nextRollTime - now;
        
        if (diff <= 0) {
            this.enableSpinButton();
            document.getElementById('timer').innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Доступно сейчас</span>
            `;
            document.getElementById('timer').classList.add('active');
            clearInterval(this.timerInterval);
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('timerText').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (hours < 1) {
            document.getElementById('timer').classList.add('expired');
        }
    }

    enableSpinButton() {
        const button = document.getElementById('spinButton');
        button.disabled = false;
        button.innerHTML = `
            <i class="fas fa-play"></i>
            <span>Крутить рулетку</span>
        `;
    }

    disableSpinButton() {
        const button = document.getElementById('spinButton');
        button.disabled = true;
        button.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>Доступно через 24ч</span>
        `;
    }

    async spinRoulette() {
        const button = document.getElementById('spinButton');
        button.disabled = true;
        button.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>Крутится...</span>
        `;

        try {
            const response = await fetch('/api/spin-roulette', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.user.id,
                    initData: this.tg.initData
                })
            });
            
            const result = await response.json();
            
            if (result.error) {
                alert(result.error);
                if (result.next_roll_time) {
                    this.nextRollTime = new Date(result.next_roll_time);
                    this.disableSpinButton();
                    this.startTimer();
                } else {
                    this.enableSpinButton();
                }
                return;
            }
            
            // Показываем анимацию выбора
            this.showSelectionAnimation(result);
            
            // Обновляем баланс
            if (result.new_balance !== undefined) {
                document.getElementById('balance').textContent = `$${result.new_balance.toFixed(2)}`;
            }
            
            // Обновляем таймер
            if (result.next_roll_time) {
                this.nextRollTime = new Date(result.next_roll_time);
                this.disableSpinButton();
                this.startTimer();
            }
            
            // Загружаем историю
            setTimeout(() => {
                this.showResult(result);
                this.loadHistory();
            }, 2000);
            
        } catch (error) {
            console.error('Error spinning roulette:', error);
            alert('Ошибка при выполнении спина');
            this.enableSpinButton();
        }
    }

    showSelectionAnimation(result) {
        const items = document.querySelectorAll('.roulette-item');
        const selectedIndex = this.rouletteItems.findIndex(item => item.name === result.prize_name);
        
        // Снимаем предыдущие выделения
        items.forEach(item => item.classList.remove('selected'));
        
        if (selectedIndex >= 0) {
            // Добавляем выделение выбранному элементу
            items[selectedIndex].classList.add('selected');
            
            // Прокручиваем к выбранному элементу
            items[selectedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    async showResult(result) {
        const modal = document.getElementById('resultModal');
        const modalIcon = document.getElementById('modalIcon');
        const modalTitle = document.getElementById('modalTitle');
        const modalDescription = document.getElementById('modalDescription');
        const modalKey = document.getElementById('modalKey');
        const modalDownload = document.getElementById('modalDownload');
        const downloadLink = document.getElementById('downloadLink');
        
        // Сбрасываем предыдущие состояния
        modalKey.style.display = 'none';
        modalDownload.style.display = 'none';
        
        if (result.success) {
            modalIcon.className = 'modal-icon win';
            modalIcon.innerHTML = '<i class="fas fa-trophy"></i>';
            modalTitle.textContent = 'Поздравляем!';
            
            switch(result.prize_type) {
                case 'cheat':
                    modalDescription.textContent = `Вы выиграли ${result.prize_name}!`;
                    modalKey.textContent = `Ключ: ${result.key}`;
                    modalKey.style.display = 'block';
                    break;
                    
                case 'config':
                    modalDescription.textContent = `Вы выиграли ${result.prize_name}!`;
                    downloadLink.href = result.download_url;
                    downloadLink.textContent = 'Скачать конфиг';
                    modalDownload.style.display = 'block';
                    break;
                    
                case 'lua':
                    modalDescription.textContent = `Вы выиграли ${result.prize_name}!`;
                    downloadLink.href = result.download_url;
                    downloadLink.textContent = 'Скачать Lua скрипт';
                    modalDownload.style.display = 'block';
                    break;
                    
                case 'nle':
                    modalDescription.textContent = `Вы получили ${result.amount} NLE!`;
                    break;
                    
                default:
                    modalDescription.textContent = result.message;
            }
        } else {
            modalIcon.className = 'modal-icon lose';
            modalIcon.innerHTML = '<i class="fas fa-redo"></i>';
            modalTitle.textContent = 'Попробуйте снова';
            modalDescription.textContent = result.message || 'Повторите попытку завтра!';
        }
        
        modal.classList.add('active');
    }

    closeResult() {
        const modal = document.getElementById('resultModal');
        modal.classList.remove('active');
        this.enableSpinButton();
    }

    async loadHistory() {
        try {
            const response = await fetch('/api/get-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.user.id,
                    initData: this.tg.initData
                })
            });
            
            const history = await response.json();
            this.displayHistory(history);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    displayHistory(history) {
        const historyList = document.getElementById('historyList');
        
        if (!history || history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <p class="empty-text">История пуста</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        history.forEach(item => {
            const date = new Date(item.date).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            let iconClass = '';
            let icon = '';
            
            switch(item.type) {
                case 'cheat':
                    iconClass = 'cheat';
                    icon = 'fas fa-shield-alt';
                    break;
                case 'config':
                    iconClass = 'config';
                    icon = 'fas fa-sliders-h';
                    break;
                case 'lua':
                    iconClass = 'lua';
                    icon = 'fas fa-code';
                    break;
                case 'nle':
                    iconClass = 'nle';
                    icon = 'fas fa-coins';
                    break;
                default:
                    iconClass = 'common';
                    icon = 'fas fa-gift';
            }
            
            html += `
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-item-icon ${iconClass}">
                            <i class="${icon}"></i>
                        </div>
                        <div class="history-item-details">
                            <h4>${item.prize}</h4>
                            <p>${item.description || ''}</p>
                        </div>
                    </div>
                    <div class="history-item-date">${date}</div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
    }

    async clearHistory() {
        if (!confirm('Очистить всю историю выигрышей?')) return;
        
        try {
            const response = await fetch('/api/clear-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.user.id,
                    initData: this.tg.initData
                })
            });
            
            if (response.ok) {
                this.displayHistory([]);
            }
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new RouletteGame();
});