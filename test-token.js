import fetch from 'node-fetch';

async function testToken() {
    const token = 'pk.eyJ1IjoiMjc1NDc3OTAwN3FxY29tIiwiYSI6ImNqajViOTRibjF3b3oza3Axdm83ajBqYzcifQ.E-WgBuOW5mlelsmBeUN47Q';
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/103.8280,1.2762;103.8380,1.2862?geometries=geojson&access_token=${token}`;
    
    try {
        console.log('正在测试 Mapbox token...');
        const response = await fetch(url);
        console.log('状态码:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Token 有效 ✅');
            console.log('响应数据:', JSON.stringify(data, null, 2));
        } else {
            const error = await response.text();
            console.log('Token 无效 ❌');
            console.log('错误信息:', error);
        }
    } catch (error) {
        console.error('测试出错:', error);
    }
}

testToken(); 