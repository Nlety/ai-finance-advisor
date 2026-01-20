// AI 服务 - 理财建议生成
const CONFIG_KEY = 'ai_finance_config';
const REMOTE_CONFIG_URL = 'https://ai-pages.dc616fa1.er.aliyun-esa.net/api/storage?key=config';
const DECRYPT_KEY = 'shfn73fnein348un';

/**
 * 使用 CryptoJS RC4 解密配置
 */
function decryptConfig(encryptedValue) {
    try {
        const decrypted = CryptoJS.RC4.decrypt(encryptedValue, DECRYPT_KEY).toString(CryptoJS.enc.Utf8);
        if (!decrypted) return null;
        const config = JSON.parse(decrypted);
        config.modelName = 'GLM-4-Flash';
        return config;
    } catch (e) {
        console.error('Decrypt error:', e);
        return null;
    }
}

/**
 * 从远程获取配置
 */
async function fetchRemoteConfig() {
    try {
        const response = await fetch(REMOTE_CONFIG_URL);
        if (!response.ok) return null;
        const data = await response.json();
        if (data && data.value) {
            const config = decryptConfig(data.value);
            if (config && config.apiUrl && config.apiKey) {
                localStorage.setItem(CONFIG_KEY + '_remote', JSON.stringify(config));
                return config;
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

function getModelConfig() {
    try {
        const userConfig = localStorage.getItem(CONFIG_KEY);
        if (userConfig) {
            const parsed = JSON.parse(userConfig);
            if (parsed && parsed.apiUrl && parsed.apiKey && parsed.modelName) return parsed;
        }
        const remoteConfig = localStorage.getItem(CONFIG_KEY + '_remote');
        if (remoteConfig) return JSON.parse(remoteConfig);
        return null;
    } catch (e) {
        return null;
    }
}

function saveModelConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

async function initConfig() {
    const existingConfig = getModelConfig();
    if (existingConfig) return existingConfig;
    return await fetchRemoteConfig();
}

async function hasAvailableConfig() {
    const config = getModelConfig();
    if (config && config.apiUrl && config.apiKey) return true;
    const remoteConfig = await fetchRemoteConfig();
    return !!(remoteConfig && remoteConfig.apiUrl && remoteConfig.apiKey);
}

window.AIService = {
    getModelConfig,
    saveModelConfig,
    initConfig,
    hasAvailableConfig,

    // 生成理财建议
    async generateFinanceAdvice(prompt, onMessage, onComplete, onError) {
        let config = getModelConfig();
        if (!config || !config.apiUrl || !config.apiKey) {
            config = await fetchRemoteConfig();
        }
        if (!config || !config.apiUrl || !config.apiKey || !config.modelName) {
            onError(new Error('请先配置 AI 模型'));
            return;
        }

        try {
            const response = await fetch(`${config.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.modelName || 'glm-4-flash',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一位专业的个人理财师，擅长财务规划、预算管理和消费决策分析。你的建议应该：1)基于实际数据和计算 2)通俗易懂 3)可操作性强 4)考虑风险因素。请用清晰的格式输出建议，包含具体数字和步骤。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    stream: true,
                    temperature: 0.4, // 理财建议需要精确性
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
                    if (!line.startsWith('data: ')) continue;

                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content;
                        if (content) {
                            onMessage(content);
                        }
                    } catch (e) {
                        console.warn('解析响应失败:', e);
                    }
                }
            }

            onComplete();
        } catch (error) {
            onError(error);
        }
    }
};
