document.addEventListener('DOMContentLoaded', () => {
    const textContainer = document.getElementById('text-container');
    const visitorCount = document.getElementById('count');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const body = document.body;

    // 1. إدارة وضع الإضاءة (Light/Dark Mode)
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    body.className = savedTheme;
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('light-mode')) {
            body.classList.replace('light-mode', 'dark-mode');
            localStorage.setItem('theme', 'dark-mode');
            updateThemeIcon('dark-mode');
        } else {
            body.classList.replace('dark-mode', 'light-mode');
            localStorage.setItem('theme', 'light-mode');
            updateThemeIcon('light-mode');
        }
    });

    function updateThemeIcon(theme) {
        themeIcon.textContent = theme === 'light-mode' ? '🌙' : '☀️';
    }

    // 2. جلب عدد الزوار
    async function fetchVisitorCount() {
        try {
            const response = await fetch('/api/visit');
            const data = await response.json();
            visitorCount.textContent = data.count;
        } catch (error) {
            console.error('Error fetching visitor count:', error);
        }
    }

    // 3. جلب النصوص وعرض نص عشوائي
    async function fetchRandomText() {
        try {
            const response = await fetch('/api/texts');
            const texts = await response.json();
            
            if (texts && texts.length > 0) {
                const randomIndex = Math.floor(Math.random() * texts.length);
                textContainer.textContent = texts[randomIndex];
            } else {
                textContainer.textContent = "لا توجد نصوص متاحة حالياً، يرجى المحاولة لاحقاً.";
            }
        } catch (error) {
            console.error('Error fetching texts:', error);
            textContainer.textContent = "حدث خطأ أثناء تحميل النصوص.";
        }
    }

    // التنفيذ عند التحميل
    fetchVisitorCount();
    fetchRandomText();
});
