# MCP Server 使用示例

## 问题场景

**用户提问：** "查一下获取热力图列表的接口参数和返回值"

## 优化前的行为

LLM 可能会：
1. 调用 `search_api` 搜索 "热力图"
2. 调用 `get_api_details` 获取详情
3. 甚至调用 `web_search` 尝试从互联网搜索（但内网接口根本搜不到）

**总调用次数：** 2-3 次

## 优化后的行为

LLM 现在会：
1. **直接调用 `search_api_with_details`** 一次性获取所有信息

**总调用次数：** 1 次 ✅

## 实际示例

### 输入
```json
{
  "name": "search_api_with_details",
  "arguments": {
    "keyword": "热力图",
    "limit": 5
  }
}
```

### 输出
```json
[
  {
    "path": "/bi/getHotDisplayList",
    "method": "GET",
    "summary": "获取热力图列表",
    "description": "",
    "operationId": "getHotDisplayList",
    "tags": ["hotBiData"],
    "parameters": [
      {
        "name": "qp-floorLevel-eq",
        "in": "query",
        "required": false,
        "description": "店铺名称",
        "type": "string",
        "schema": null
      },
      {
        "name": "qp-statDate-eq",
        "in": "query",
        "required": false,
        "description": "统计时间：日(2025-01-01)、周(2025W13)、月(2025-01)、年(2025)",
        "type": "string",
        "schema": null
      },
      {
        "name": "qp-storeCode-eq",
        "in": "query",
        "required": false,
        "description": "店铺名称",
        "type": "string",
        "schema": null
      },
      {
        "name": "qp-timeGranularity-eq",
        "in": "query",
        "required": false,
        "description": "时间粒度：DAY(日)、WEEK(周)、MONTH(月)、YEAR(年)",
        "type": "string",
        "schema": null
      },
      {
        "name": "sso-sessionid",
        "in": "header",
        "required": true,
        "description": "sessionid",
        "type": "string",
        "schema": null
      },
      {
        "name": "x-app-id",
        "in": "header",
        "required": true,
        "description": "app",
        "type": "string",
        "schema": null
      },
      {
        "name": "x-isv-id",
        "in": "header",
        "required": true,
        "description": "isv",
        "type": "string",
        "schema": null
      },
      {
        "name": "x-tenant-id",
        "in": "header",
        "required": true,
        "description": "tenant",
        "type": "string",
        "schema": null
      }
    ],
    "requestBody": null,
    "responses": {
      "200": {
        "description": "操作是否成功,000000:成功，否则失败",
        "schema": {
          "$ref": "#/definitions/ResultDTO«List«HotBIListDataDto»»",
          "originalRef": "ResultDTO«List«HotBIListDataDto»»"
        }
      },
      "401": {
        "description": "Unauthorized"
      },
      "403": {
        "description": "Forbidden"
      },
      "404": {
        "description": "Not Found"
      }
    }
  }
]
```

## 工具选择指南

### 🌟 `search_api_with_details` (推荐)
**使用场景：** 
- 用户问"查看XX接口的参数和返回值"
- 用户问"有哪些XX相关的接口"
- 任何需要搜索并查看详情的场景

**优点：**
- ✅ 一次调用完成搜索和详情获取
- ✅ 减少上下文消耗
- ✅ 更快的响应速度

### 📋 `search_api`
**使用场景：**
- 只需要快速浏览有哪些接口
- 不需要详细参数和返回值

### 🔍 `get_api_details`
**使用场景：**
- 已经知道确切的 path 和 method
- 需要查看特定接口的详情

