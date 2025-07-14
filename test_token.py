import requests
import os

def test_token():
    # 从环境变量获取token，如果没有则使用默认值（仅用于测试）
    token = os.getenv('MAPBOX_ACCESS_TOKEN', "pk.eyJ1IjoiMjc1NDc3OTAwN3FxY29tIiwiYSI6ImNqajViOTRibjF3b3oza3Axdm83ajBqYzcifQ.E-WgBuOW5mlelsmBeUN47Q")
    print("正在测试 Mapbox token...")
    
    # 使用 Mapbox Geocoding API 测试
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?access_token={token}"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("Token 有效!")
            print("响应数据:", response.json())
        else:
            print(f"Token 无效. 错误信息: {response.text}")
            
    except Exception as e:
        print(f"测试出错: {str(e)}")

if __name__ == "__main__":
    test_token() 