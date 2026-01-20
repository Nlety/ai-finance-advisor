// 存储服务 - 理财方案管理
window.StorageService = {
    STORAGE_KEY: 'ai_finance_advices',
    MAX_ITEMS: 50,

    // 保存理财建议
    async saveAdvice(advice) {
        const advices = this.getLocalAdvices();
        
        const newAdvice = {
            id: this.generateId(),
            ...advice,
            timestamp: advice.timestamp || new Date().toISOString()
        };

        advices.unshift(newAdvice);

        // 限制数量
        if (advices.length > this.MAX_ITEMS) {
            advices.pop();
        }

        this.saveLocalAdvices(advices);

        // 尝试同步到云端
        try {
            await this.syncToCloud(newAdvice);
        } catch (error) {
            console.log('云端同步失败，仅保存到本地');
        }

        return newAdvice;
    },

    // 获取历史记录
    async getHistory() {
        return this.getLocalAdvices();
    },

    // 根据 ID 获取建议
    async getAdviceById(id) {
        const advices = this.getLocalAdvices();
        return advices.find(a => a.id === id);
    },

    // 删除建议
    async deleteAdvice(id) {
        let advices = this.getLocalAdvices();
        advices = advices.filter(a => a.id !== id);
        this.saveLocalAdvices(advices);

        // 尝试从云端删除
        try {
            await this.deleteFromCloud(id);
        } catch (error) {
            console.log('云端删除失败');
        }
    },

    // 本地存储操作
    getLocalAdvices() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    },

    saveLocalAdvices(advices) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(advices));
        } catch (error) {
            console.error('本地存储失败:', error);
        }
    },

    // 云端同步（EdgeKV）
    async syncToCloud(advice) {
        // TODO: 实现 EdgeKV 同步
        // 这里预留云端同步接口
        return Promise.resolve();
    },

    async deleteFromCloud(id) {
        // TODO: 实现 EdgeKV 删除
        return Promise.resolve();
    },

    // 生成唯一 ID
    generateId() {
        return `advice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
