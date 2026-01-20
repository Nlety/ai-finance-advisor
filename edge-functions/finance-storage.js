addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  // CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 保存理财建议
    if (path === '/api/finance/save' && request.method === 'POST') {
      const data = await request.json()
      const id = data.id || `advice_${Date.now()}`
      
      // 保存到 EdgeKV
      await FINANCE_KV.put(id, JSON.stringify(data))
      
      // 更新索引
      await updateIndex(id, data)
      
      return new Response(JSON.stringify({ success: true, id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 获取历史记录列表
    if (path === '/api/finance/list' && request.method === 'GET') {
      const indexData = await FINANCE_KV.get('finance_index')
      const index = indexData ? JSON.parse(indexData) : []
      
      return new Response(JSON.stringify(index), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 获取单个建议
    if (path.startsWith('/api/finance/get/') && request.method === 'GET') {
      const id = path.split('/').pop()
      const data = await FINANCE_KV.get(id)
      
      if (data) {
        return new Response(data, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 删除建议
    if (path.startsWith('/api/finance/delete/') && request.method === 'DELETE') {
      const id = path.split('/').pop()
      await FINANCE_KV.delete(id)
      await removeFromIndex(id)
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response('Not Found', { status: 404 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// 更新索引
async function updateIndex(id, data) {
  const indexData = await FINANCE_KV.get('finance_index')
  let index = indexData ? JSON.parse(indexData) : []
  
  // 移除旧记录（如果存在）
  index = index.filter(item => item.id !== id)
  
  // 添加新记录
  index.unshift({
    id: id,
    type: data.type,
    timestamp: data.timestamp,
    summary: getSummary(data)
  })
  
  // 限制数量
  if (index.length > 100) {
    index = index.slice(0, 100)
  }
  
  await FINANCE_KV.put('finance_index', JSON.stringify(index))
}

// 从索引中移除
async function removeFromIndex(id) {
  const indexData = await FINANCE_KV.get('finance_index')
  if (indexData) {
    let index = JSON.parse(indexData)
    index = index.filter(item => item.id !== id)
    await FINANCE_KV.put('finance_index', JSON.stringify(index))
  }
}

// 生成摘要
function getSummary(data) {
  const formData = data.formData
  switch (data.type) {
    case 'budget':
      return `月收入${formData.monthlyIncome}元的预算规划`
    case 'saving':
      return `${formData.savingGoal}目标${formData.targetAmount}元`
    case 'purchase':
      return `${formData.productName} ${formData.productPrice}元`
    case 'diagnosis':
      return `月入${formData.diagnosisIncome}元的财务诊断`
    default:
      return '理财建议'
  }
}
