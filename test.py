#!/usr/bin/env python3
"""
MP3 API 测试脚本
GET 请求测试：http://localhost:3000/api/users?sort={"name": 1}&skip=60&limit=20
"""

import requests
import json
from urllib.parse import quote

# API 基础URL
BASE_URL = "http://localhost:3000/api"

def test_get_users():
    """
    测试 GET /api/users 端点
    使用 sort, skip, limit 参数
    """
    print("=" * 50)
    print("测试: GET /api/users")
    print("=" * 50)
    
    # 先获取总数
    count_response = requests.get(f"{BASE_URL}/users", params={'count': 'true'}, timeout=5)
    if count_response.status_code == 200:
        count_data = count_response.json()
        total = count_data.get('data', 0)
        print(f"\n📊 数据库中总共有 {total} 个用户")
    
    # 根据数据量调整参数
    skip = min(60, total)  # 跳过最多60个
    limit = 20
    
    print(f"\n查询参数:")
    print(f"  sort: name升序")
    print(f"  skip: {skip}")
    print(f"  limit: {limit}")
    
    # 构建查询参数
    params = {
        'sort': '{"name": 1}',  # 按姓名升序排序
        'skip': str(skip),      # 跳过前N个结果
        'limit': str(limit)    # 返回20个结果
    }
    
    # 构建完整URL
    url = f"{BASE_URL}/users"
    
    try:
        # 发送GET请求
        response = requests.get(url, params=params, timeout=5)
        
        # 打印状态码
        print(f"\n状态码: {response.status_code}")
        
        # 解析JSON响应
        data = response.json()
        
        # 打印格式化的JSON
        print("\n响应数据:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # 如果请求成功，显示统计信息
        if response.status_code == 200 and 'data' in data:
            users = data['data']
            print(f"\n✅ 成功获取 {len(users)} 个用户")
            
            # 显示前3个用户的姓名
            if users:
                print("\n返回的用户:")
                for i, user in enumerate(users[:5], 1):
                    print(f"{i}. {user.get('name', 'N/A')} - {user.get('email', 'N/A')}")
        
        return response.status_code == 200
        
    except requests.exceptions.ConnectionError:
        print("❌ 错误: 无法连接到服务器")
        print("   请确保服务器正在运行: node server.js")
        return False
    except requests.exceptions.Timeout:
        print("❌ 错误: 请求超时")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def test_simple_get():
    """
    测试简单的 GET /api/users 请求
    """
    print("\n" + "=" * 50)
    print("测试: 简单 GET /api/users (前5个用户)")
    print("=" * 50)
    
    url = f"{BASE_URL}/users"
    params = {'limit': '5'}
    
    try:
        response = requests.get(url, params=params, timeout=5)
        data = response.json()
        
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == "__main__":
    print("🚀 开始测试 MP3 API...\n")
    
    # 测试1: 简单查询
    test_simple_get()
    
    print("\n")
    
    # 测试2: 带参数的查询
    test_get_users()
    
    print("\n" + "=" * 50)
    print("测试完成!")
    print("=" * 50)

