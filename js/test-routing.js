// 测试路线规划服务
async function testRoutingServices() {
    console.log('开始测试路线规划服务...\n');

    // 测试坐标
    const start = [103.8280, 1.2762];
    const end = [103.8380, 1.2862];

    // 1. 测试 Mapbox
    console.log('1. 测试 Mapbox Directions API:');
    try {
        const mapboxResponse = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&alternatives=true&access_token=pk.eyJ1IjoiMjc1NDc3OTAwN3FxY29tIiwiYSI6ImNqajViOTRibjF3b3oza3Axdm83ajBqYzcifQ.E-WgBuOW5mlelsmBeUN47Q`);
        console.log('状态码:', mapboxResponse.status);
        if (mapboxResponse.ok) {
            const data = await mapboxResponse.json();
            console.log('响应数据:', data);
            console.log('Mapbox 测试结果: ✅ 成功\n');
        } else {
            console.log('Mapbox 测试结果: ❌ 失败 - Token可能无效\n');
        }
    } catch (error) {
        console.error('Mapbox 测试错误:', error);
        console.log('Mapbox 测试结果: ❌ 失败\n');
    }

    // 2. 测试 Maptiler
    console.log('2. 测试 Maptiler API:');
    try {
        const maptilerResponse = await fetch('https://api.maptiler.com/maps/streets-dark/style.json?key=tSrycxD3kDmTDWxY9Tm7');
        console.log('状态码:', maptilerResponse.status);
        if (maptilerResponse.ok) {
            const data = await maptilerResponse.json();
            console.log('响应数据:', data);
            console.log('Maptiler 测试结果: ✅ 成功\n');
        } else {
            console.log('Maptiler 测试结果: ❌ 失败 - API key可能无效\n');
        }
    } catch (error) {
        console.error('Maptiler 测试错误:', error);
        console.log('Maptiler 测试结果: ❌ 失败\n');
    }

    // 3. 测试 OSRM
    console.log('3. 测试 OSRM API:');
    try {
        const osrmResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`);
        console.log('状态码:', osrmResponse.status);
        if (osrmResponse.ok) {
            const data = await osrmResponse.json();
            console.log('响应数据:', data);
            console.log('OSRM 测试结果: ✅ 成功\n');
        } else {
            console.log('OSRM 测试结果: ❌ 失败\n');
        }
    } catch (error) {
        console.error('OSRM 测试错误:', error);
        console.log('OSRM 测试结果: ❌ 失败\n');
    }

    console.log('测试完成！');
}

// 执行测试
testRoutingServices().then(() => {
    console.log('所有测试已完成，请查看上方结果。');
}); 