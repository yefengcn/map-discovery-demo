// 测试 Mapbox token
async function testMapboxToken() {
    console.log('开始测试 Mapbox token...');
    
    const token = 'pk.eyJ1IjoiMjc1NDc3OTAwN3FxY29tIiwiYSI6ImNqajViOTRibjF3b3oza3Axdm83ajBqYzcifQ.E-WgBuOW5mlelsmBeUN47Q';
    const start = [103.8280, 1.2762];
    const end = [103.8380, 1.2862];
    
    try {
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${token}`);
        console.log('状态码:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Token 有效 ✅');
            console.log('响应数据:', data);
        } else {
            console.log('Token 无效 ❌');
            console.log('错误信息:', await response.text());
        }
    } catch (error) {
        console.error('测试出错:', error);
    }
}

// 执行测试
testMapboxToken(); 