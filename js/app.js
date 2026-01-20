// AI 个人理财师 - 主应用逻辑
class FinanceAdvisorApp {
    constructor() {
        this.currentType = 'budget';
        this.currentResult = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadConfig();
    }

    bindEvents() {
        // 规划类型切换
        document.querySelectorAll('.plan-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchPlanType(e));
        });

        // 快速示例
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.loadExample(e));
        });

        // 生成建议
        document.getElementById('generateBtn').addEventListener('click', () => this.generate());

        // 保存方案
        document.getElementById('saveBtn').addEventListener('click', () => this.save());

        // 历史记录
        document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
        document.getElementById('closeHistoryBtn').addEventListener('click', () => this.closeHistory());

        // 设置
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    switchPlanType(e) {
        const btn = e.currentTarget;
        const type = btn.dataset.type;
        
        // 更新按钮状态
        document.querySelectorAll('.plan-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 切换表单
        document.querySelectorAll('.form-section').forEach(form => form.classList.add('hidden'));
        document.getElementById(`${type}Form`).classList.remove('hidden');

        // 更新标题
        const titles = {
            budget: '月度预算规划',
            saving: '储蓄目标计划',
            purchase: '消费决策分析',
            diagnosis: '财务健康诊断'
        };
        document.getElementById('formTitle').textContent = titles[type];

        this.currentType = type;
    }

    loadExample(e) {
        const example = e.currentTarget.dataset.example;
        const examples = {
            budget1: {
                type: 'budget',
                data: { monthlyIncome: 8000, fixedExpense: 2500, budgetNotes: '希望每月能存一些钱' }
            },
            saving1: {
                type: 'saving',
                data: { savingGoal: '买车', targetAmount: 150000, timeLimit: 3, savingIncome: 8000 }
            },
            purchase1: {
                type: 'purchase',
                data: { productName: 'iPhone 15 Pro', productPrice: 10000, purchaseIncome: 8000, purchaseReason: '手机用了3年想换新' }
            },
            diagnosis1: {
                type: 'diagnosis',
                data: { diagnosisIncome: 10000, diagnosisExpense: 10000, expenseItems: '房租3000、餐饮2000、购物3000、娱乐1500、其他500', financialTrouble: '每月都月光，存不下钱' }
            }
        };

        const exampleData = examples[example];
        if (exampleData) {
            // 切换到对应类型
            const typeBtn = document.querySelector(`.plan-type-btn[data-type="${exampleData.type}"]`);
            typeBtn.click();

            // 填充数据
            setTimeout(() => {
                Object.keys(exampleData.data).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) input.value = exampleData.data[key];
                });
                // 自动生成
                this.generate();
            }, 300);
        }
    }

    async generate() {
        const formData = this.getFormData();
        if (!formData) {
            this.showToast('请填写必要信息');
            return;
        }

        // 构建提示词
        const prompt = this.buildPrompt(formData);

        // 显示加载状态
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('resultArea').classList.add('hidden');
        document.getElementById('loadingState').classList.remove('hidden');

        try {
            let fullResponse = '';
            await window.AIService.generateFinanceAdvice(
                prompt,
                (chunk) => {
                    fullResponse += chunk;
                    document.getElementById('aiResponse').innerHTML = marked.parse(fullResponse);
                    document.querySelectorAll('#aiResponse pre code').forEach(block => hljs.highlightElement(block));
                    document.getElementById('loadingState').classList.add('hidden');
                    document.getElementById('resultArea').classList.remove('hidden');
                },
                () => {
                    this.currentResult = {
                        type: this.currentType,
                        formData: formData,
                        response: fullResponse,
                        timestamp: new Date().toISOString()
                    };
                },
                (error) => {
                    console.error('生成失败:', error);
                    this.showToast('生成失败，请检查设置');
                    document.getElementById('loadingState').classList.add('hidden');
                    document.getElementById('emptyState').classList.remove('hidden');
                }
            );
        } catch (error) {
            console.error('生成失败:', error);
            this.showToast('生成失败');
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('emptyState').classList.remove('hidden');
        }
    }

    getFormData() {
        const data = { type: this.currentType };
        let isValid = false;

        switch (this.currentType) {
            case 'budget':
                data.monthlyIncome = document.getElementById('monthlyIncome').value;
                data.fixedExpense = document.getElementById('fixedExpense').value;
                data.budgetNotes = document.getElementById('budgetNotes').value;
                isValid = data.monthlyIncome;
                break;
            case 'saving':
                data.savingGoal = document.getElementById('savingGoal').value;
                data.targetAmount = document.getElementById('targetAmount').value;
                data.timeLimit = document.getElementById('timeLimit').value;
                data.savingIncome = document.getElementById('savingIncome').value;
                isValid = data.savingGoal && data.targetAmount && data.timeLimit;
                break;
            case 'purchase':
                data.productName = document.getElementById('productName').value;
                data.productPrice = document.getElementById('productPrice').value;
                data.purchaseIncome = document.getElementById('purchaseIncome').value;
                data.purchaseReason = document.getElementById('purchaseReason').value;
                isValid = data.productName && data.productPrice;
                break;
            case 'diagnosis':
                data.diagnosisIncome = document.getElementById('diagnosisIncome').value;
                data.diagnosisExpense = document.getElementById('diagnosisExpense').value;
                data.expenseItems = document.getElementById('expenseItems').value;
                data.financialTrouble = document.getElementById('financialTrouble').value;
                isValid = data.diagnosisIncome && data.diagnosisExpense;
                break;
        }

        return isValid ? data : null;
    }

    buildPrompt(data) {
        const prompts = {
            budget: `请作为专业理财师，为以下用户制定月度预算方案：
月收入：${data.monthlyIncome}元
固定支出：${data.fixedExpense || '未提供'}元
特殊需求：${data.budgetNotes || '无'}

请提供：
1. 合理的预算分配方案（生活必需、储蓄、娱乐等）
2. 具体的金额建议和百分比
3. 理财建议和注意事项
4. 可行的储蓄计划

请用清晰的格式输出，包含具体数字和实用建议。`,

            saving: `请作为专业理财师，为以下储蓄目标制定计划：
储蓄目标：${data.savingGoal}
目标金额：${data.targetAmount}元
时间期限：${data.timeLimit}年
月收入：${data.savingIncome}元

请提供：
1. 每月需要储蓄的金额
2. 是否现实可行的评估
3. 具体的储蓄策略和方法
4. 可能的理财产品建议
5. 注意事项和风险提示

请用清晰的格式输出，包含具体计算和建议。`,

            purchase: `请作为专业理财顾问，分析以下消费决策：
商品：${data.productName}
价格：${data.productPrice}元
月收入：${data.purchaseIncome}元
购买理由：${data.purchaseReason}

请从以下角度分析：
1. 性价比评估（是否值得购买）
2. 对个人财务的影响分析
3. 替代方案建议
4. 如果购买，给出最佳时机和方式
5. 决策建议（买/不买/延后购买）

请客观分析，给出明确建议。`,

            diagnosis: `请作为专业理财师，诊断以下财务状况：
月收入：${data.diagnosisIncome}元
月支出：${data.diagnosisExpense}元
支出明细：${data.expenseItems}
财务困扰：${data.financialTrouble}

请提供：
1. 财务健康度评分（0-100分）
2. 支出结构分析（哪些支出不合理）
3. 存在的主要问题
4. 具体改善建议（优先级排序）
5. 3个月改善计划

请用清晰的格式输出，重点突出问题和解决方案。`
        };

        return prompts[data.type];
    }

    async save() {
        if (!this.currentResult) {
            this.showToast('没有可保存的内容');
            return;
        }

        try {
            await window.StorageService.saveAdvice(this.currentResult);
            this.showToast('保存成功！');
        } catch (error) {
            console.error('保存失败:', error);
            this.showToast('保存失败');
        }
    }

    async showHistory() {
        const history = await window.StorageService.getHistory();
        const listEl = document.getElementById('historyList');
        
        if (history.length === 0) {
            listEl.innerHTML = '<p class="text-center text-gray-400 py-8">暂无历史记录</p>';
        } else {
            listEl.innerHTML = history.map(item => {
                const typeNames = { budget: '月度预算', saving: '储蓄目标', purchase: '消费决策', diagnosis: '财务诊断' };
                return `
                    <div class="history-card" onclick="app.loadHistoryItem('${item.id}')">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="font-medium text-gray-800 mb-1">${typeNames[item.type] || item.type}</div>
                                <div class="text-sm text-gray-600 line-clamp-2">${this.getHistorySummary(item)}</div>
                                <div class="text-xs text-gray-400 mt-2">${new Date(item.timestamp).toLocaleString('zh-CN')}</div>
                            </div>
                            <button onclick="event.stopPropagation(); app.deleteHistoryItem('${item.id}')" class="text-red-400 hover:text-red-600 ml-2">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        document.getElementById('historyModal').classList.add('active');
    }

    getHistorySummary(item) {
        const data = item.formData;
        switch (item.type) {
            case 'budget':
                return `月收入${data.monthlyIncome}元的预算规划`;
            case 'saving':
                return `${data.savingGoal}目标${data.targetAmount}元`;
            case 'purchase':
                return `${data.productName} ${data.productPrice}元`;
            case 'diagnosis':
                return `月入${data.diagnosisIncome}元的财务诊断`;
            default:
                return '';
        }
    }

    async loadHistoryItem(id) {
        const item = await window.StorageService.getAdviceById(id);
        if (item) {
            // 切换到对应类型
            const typeBtn = document.querySelector(`.plan-type-btn[data-type="${item.type}"]`);
            typeBtn.click();

            // 填充数据
            setTimeout(() => {
                Object.keys(item.formData).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) input.value = item.formData[key];
                });

                // 显示结果
                document.getElementById('emptyState').classList.add('hidden');
                document.getElementById('loadingState').classList.add('hidden');
                document.getElementById('resultArea').classList.remove('hidden');
                document.getElementById('aiResponse').innerHTML = marked.parse(item.response);
                document.querySelectorAll('#aiResponse pre code').forEach(block => hljs.highlightElement(block));
                
                this.currentResult = item;
                this.closeHistory();
            }, 300);
        }
    }

    async deleteHistoryItem(id) {
        if (confirm('确定要删除这条记录吗？')) {
            await window.StorageService.deleteAdvice(id);
            this.showHistory();
            this.showToast('删除成功');
        }
    }

    closeHistory() {
        document.getElementById('historyModal').classList.remove('active');
    }

    showSettings() {
        const config = window.AIService.getModelConfig();
        document.getElementById('apiUrl').value = config.apiUrl || '';
        document.getElementById('apiKey').value = config.apiKey || '';
        document.getElementById('modelName').value = config.modelName || '';
        document.getElementById('settingsModal').classList.add('active');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    saveSettings() {
        const config = {
            apiUrl: document.getElementById('apiUrl').value.trim(),
            apiKey: document.getElementById('apiKey').value.trim(),
            modelName: document.getElementById('modelName').value.trim()
        };

        if (!config.apiUrl || !config.apiKey || !config.modelName) {
            this.showToast('请填写完整配置');
            return;
        }

        window.AIService.saveModelConfig(config);
        this.showToast('设置已保存');
        this.closeSettings();
    }

    resetSettings() {
        if (confirm('确定要重置为默认设置吗？')) {
            localStorage.removeItem('ai_finance_config');
            this.showToast('已重置为默认设置');
            this.closeSettings();
            window.location.reload();
        }
    }

    async loadConfig() {
        await window.AIService.initConfig();
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FinanceAdvisorApp();
});
