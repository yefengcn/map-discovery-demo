// 初始化地图
const map = new maplibregl.Map({
    container: 'map',
    style: `https://api.maptiler.com/maps/streets-dark/style.json?key=tSrycxD3kDmTDWxY9Tm7`,
    center: [103.8280, 1.2762], // Silat Road
    zoom: 16,
    pitch: 30,
    bearing: 0
});

// 等待地图加载完成
map.on('load', () => {
    // 确保清除任何可能存在的图层和标记
    clearMapLayers();

    // 添加刷新按钮
    addRefreshButton();
});

// 全局变量用于存储当前绘制的多边形和POI标记
let currentPolygon = null;
let currentPOIMarkers = [];
let currentMarkers = []; // 添加这行
let isDrawingPolygon = false;
let polygonPoints = [];
let drawingClickHandler = null;
let heatmapLayers = []; // 存储热力图图层
let previewLine = null; // 存储预览线状态
let currentBounds = null; // 存储当前圈选区域的边界
let currentPoiType = 'Food'; // 存储当前选中的POI类型

// POI类型定义
const POI_TYPES = ['restaurant', 'cafe', 'bar', 'shop', 'attraction'];

const POI_NAMES = {
    restaurant: [
        'Maxwell Food Centre', 'Lau Pa Sat', 'Tiong Bahru Market', 'Old Airport Road Food Centre',
        'Newton Food Centre', 'East Coast Lagoon Food Village', 'Chomp Chomp Food Centre',
        'ABC Brickworks Food Centre', 'Amoy Street Food Centre', 'Tekka Centre'
    ],
    cafe: [
        'PS.Cafe', 'Forty Hands', 'Common Man Coffee Roasters', 'Tiong Bahru Bakery',
        'Killiney Kopitiam', 'Ya Kun Kaya Toast', 'The Coffee Bean & Tea Leaf',
        'Starbucks Reserve', 'Dutch Colony Coffee', 'Cafe Melba'
    ],
    bar: [
        'Atlas Bar', 'Manhattan Bar', 'Native Bar', '28 HongKong Street',
        'Operation Dagger', 'Jigger & Pony', 'Employees Only', 
        'Gibson Bar', 'Nutmeg & Clove', 'The Other Room'
    ],
    shop: [
        'ION Orchard', 'Mustafa Centre', 'VivoCity', 'Suntec City',
        'Ngee Ann City', 'The Shoppes at Marina Bay Sands', 'Raffles City',
        'Clarke Quay Central', 'Tampines Mall', 'Bugis Junction'
    ],
    attraction: [
        'Gardens by the Bay', 'Singapore Zoo', 'Universal Studios', 'S.E.A. Aquarium',
        'ArtScience Museum', 'Singapore Flyer', 'Night Safari', 
        'Jurong Bird Park', 'National Gallery', 'Singapore Botanic Gardens'
    ]
};

// 热门活动数据（模拟数据，实际项目中应从API获取）
const EVENTS_DATA = [
    {
        title: "Singapore Food Festival",
        time: "2024-04-20 14:00",
        image: "images/event1.png",
        location: [103.8440, 1.2834]
    },
    {
        title: "Marina Bay Music Festival",
        time: "2024-04-21 19:30",
        image: "images/event2.png",
        location: [103.8587, 1.2830]
    },
    {
        title: "Heritage Exhibition",
        time: "2024-04-22 10:00",
        image: "images/event3.png",
        location: [103.8495, 1.2867]
    }
];

// 清除地图上的所有自定义图层
function clearMapLayers() {
    // 清除所有多边形
    if (map.getLayer('polygon')) {
        map.removeLayer('polygon');
    }
    if (map.getLayer('polygon-outline')) {
        map.removeLayer('polygon-outline');
    }
    if (map.getSource('polygon')) {
        map.removeSource('polygon');
    }

    // 清除所有顶点标记
    const vertexMarkers = document.getElementsByClassName('vertex-marker');
    while (vertexMarkers.length > 0) {
        vertexMarkers[0].remove();
    }

    // 清除预览线
    if (map.getLayer('preview-line')) {
        map.removeLayer('preview-line');
    }
    if (map.getSource('preview-line')) {
        map.removeSource('preview-line');
    }

    // 重置多边形绘制状态
    isDrawingPolygon = false;
    polygonPoints = [];
    currentPolygon = null;

    // 清除所有标记点
    if (map.getLayer('points')) {
        map.removeLayer('points');
    }
    if (map.getSource('points')) {
        map.removeSource('points');
    }

    // 清除热力图
    if (map.getLayer('heatmap')) {
        map.removeLayer('heatmap');
    }
    if (map.getSource('heatmap')) {
        map.removeSource('heatmap');
    }

    // 清除所有路线图层
    ['preview-line', 'route-0', 'route-1', 'route-2'].forEach(id => {
        if (map.getLayer(id)) {
            map.removeLayer(id);
        }
        if (map.getSource(id)) {
            map.removeSource(id);
        }
    });

    // 清除所有popup
    const popups = document.getElementsByClassName('maplibregl-popup');
    while (popups[0]) {
        popups[0].remove();
    }

    // 清除所有POI标记
    currentPOIMarkers.forEach(marker => marker.remove());
    currentPOIMarkers = [];

    // 清除所有marker
    currentMarkers.forEach(marker => marker.remove());
    currentMarkers = [];

    // 清除type-selector
    const typeSelector = document.querySelector('.type-selector');
    if (typeSelector) {
        typeSelector.remove();
    }

    // 清除小人和投影
    if (avatar) {
        avatar.remove();
        avatar = null;
    }

    // 清除居中按钮
    if (centerButton) {
        centerButton.remove();
        centerButton = null;
    }

    // 重置地图视角到默认位置
    map.flyTo({
        center: [103.8280, 1.2762], // Silat Road
        zoom: 16,
        pitch: 30,
        bearing: 0,
        duration: 1000
    });
}

// 添加刷新按钮
function addRefreshButton() {
    // 检查是否已存在刷新按钮
    const existingButton = document.querySelector('.refresh-button');
    if (existingButton) {
        return;
    }
    
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.innerHTML = '↻';
    
    // 设置按钮样式
    Object.assign(refreshButton.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '40px',
        height: '40px',
        background: 'rgba(0, 0, 0, 0.75)',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        fontSize: '24px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.2s ease',
        zIndex: '1000'
    });
    
    // 添加悬停效果
    refreshButton.addEventListener('mouseenter', () => {
        refreshButton.style.background = 'rgba(59, 130, 246, 0.75)';
        refreshButton.style.transform = 'scale(1.05)';
    });
    
    refreshButton.addEventListener('mouseleave', () => {
        refreshButton.style.background = 'rgba(0, 0, 0, 0.75)';
        refreshButton.style.transform = 'scale(1)';
    });
    
    // 添加点击事件
    refreshButton.addEventListener('click', () => {
        refreshButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            refreshButton.style.transform = 'scale(1)';
        }, 100);
        
        // 清除地图上的所有内容
        clearMapLayers();
        
        // 重置热门功能状态
        resetTrendingState();
    });
    
    // 将按钮添加到body
    document.body.appendChild(refreshButton);
    
    // 确保按钮显示
    refreshButton.style.display = 'flex';
    
    console.log('刷新按钮已添加');
}

// 重置热门功能状态
function resetTrendingState() {
    // 移除热力图图层
    if (map.getLayer('heatmap')) {
        map.removeLayer('heatmap');
    }
    if (map.getSource('heatmap')) {
        map.removeSource('heatmap');
    }
    
    // 移除所有活动信息气泡
    const popups = document.getElementsByClassName('event-popup');
    while (popups[0]) {
        popups[0].remove();
    }
}

// 生成随机POI点
function generateRandomPOIs(poiType = 'restaurant') {
    // 清除现有的POI标记
    currentPOIMarkers.forEach(marker => marker.remove());
    currentPOIMarkers = [];

    // 获取当前地图视野范围
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // 在视野范围内生成6个随机点
    for (let i = 0; i < 6; i++) {
        // 生成随机坐标
        const lng = sw.lng + Math.random() * (ne.lng - sw.lng);
        const lat = sw.lat + Math.random() * (ne.lat - sw.lat);

        // 创建POI对象
        const poi = {
            type: poiType,
            name: generatePOIName(poiType),
            coordinates: [lng, lat],
            rating: (Math.random() * 2 + 3).toFixed(1), // 3.0-5.0
            reviews: Math.floor(Math.random() * 200) + 50, // 50-250
            description: generatePOIDescription(poiType),
            image: `images/poi/${Math.floor(Math.random() * 18) + 1}.png`
        };

        // 创建标记
        const marker = createPOIMarker(poi);
        currentPOIMarkers.push(marker);
    }
}

// 检查点是否与其他所有点之间的距离都足够远
function isPointFarEnough(point, existingPois) {
    const minDistance = 0.0005; // 减小最小距离阈值，使点可以更靠近
    return existingPois.every(poi => {
        const distance = Math.sqrt(
            Math.pow(point[0] - poi.coordinates[0], 2) + 
            Math.pow(point[1] - poi.coordinates[1], 2)
        );
        return distance > minDistance;
    });
}

// 添加Fisher-Yates洗牌算法函数
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 判断点是否在多边形内
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > point[1]) != (yj > point[1])) &&
            (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 圈选探索功能
document.getElementById('circle-explore').addEventListener('click', () => {
    clearMapLayers();
    isDrawingPolygon = true;
    
    // 添加提示信息
    const popup = new maplibregl.Popup({
        closeButton: false,
        className: 'drawing-hint'
    })
    .setHTML('点击地图开始绘制区域，至少需要3个点。按ESC取消，按回退键删除上一个点。')
    .addTo(map);
    
    // 添加预览线功能
    const handleMouseMove = (e) => {
        if (!isDrawingPolygon || polygonPoints.length === 0) return;
        
        const coordinates = [...polygonPoints, [e.lngLat.lng, e.lngLat.lat]];
        
        if (previewLine) {
            map.removeLayer('preview-line');
            map.removeSource('preview-line');
        }
        
        map.addSource('preview-line', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': coordinates
                }
            }
        });
        
        map.addLayer({
            'id': 'preview-line',
            'type': 'line',
            'source': 'preview-line',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-dasharray': [2, 2]
            }
        });
        
        previewLine = true;
        
        // 更新提示信息
        popup.setLngLat(e.lngLat)
            .setHTML(`已绘制 ${polygonPoints.length} 个点${polygonPoints.length >= 3 ? '，点击起点完成绘制' : '，继续点击添加更多点'}`);
    };
    
    map.on('mousemove', handleMouseMove);
    
    // 添加键盘事件处理
    const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
            // 取消绘制
            clearMapLayers();
            popup.remove();
            map.off('mousemove');
            document.removeEventListener('keydown', handleKeyPress);
        } else if (e.key === 'Backspace' && polygonPoints.length > 0) {
            // 删除上一个点
            polygonPoints.pop();
            // 移除最后一个顶点标记
            const markers = document.getElementsByClassName('vertex-marker');
            if (markers.length > 0) {
                markers[markers.length - 1].remove();
            }
            
            if (currentPolygon) {
                map.removeLayer('polygon');
                map.removeSource('polygon');
                
                if (polygonPoints.length >= 3) {
                    const polygonData = {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Polygon',
                            'coordinates': [polygonPoints]
                        }
                    };
                    
                    map.addSource('polygon', {
                        'type': 'geojson',
                        'data': polygonData
                    });
                    
                    map.addLayer({
                        'id': 'polygon',
                        'type': 'fill',
                        'source': 'polygon',
                        'layout': {},
                        'paint': {
                            'fill-color': '#3b82f6',
                            'fill-opacity': 0.2,
                            'fill-outline-color': '#2563eb'
                        }
                    });
                    
                    // 添加边框图层
                    map.addLayer({
                        'id': 'polygon-outline',
                        'type': 'line',
                        'source': 'polygon',
                        'layout': {},
                        'paint': {
                            'line-color': '#2563eb',
                            'line-width': 2
                        }
                    });
                    
                    currentPolygon = polygonData;
                }
            }
        }
    };
    document.addEventListener('keydown', handleKeyPress);
    
    drawingClickHandler = (e) => {
        if (!isDrawingPolygon) return;
        
        const point = [e.lngLat.lng, e.lngLat.lat];
        
        // 检查是否点击了起点以完成绘制
        if (polygonPoints.length >= 3) {
            const firstPoint = polygonPoints[0];
            const distance = Math.sqrt(
                Math.pow(firstPoint[0] - point[0], 2) + 
                Math.pow(firstPoint[1] - point[1], 2)
            );
            
            if (distance < 0.0005) { // 减小闭合阈值
                // 使用第一个点来闭合多边形，而不是当前点
                polygonPoints.push([...firstPoint]);
                finishDrawing();
                return;
            }
        }
        
        polygonPoints.push([...point]); // 复制点坐标而不是直接使用引用
        
        // 添加顶点标记
        const el = document.createElement('div');
        el.className = 'vertex-marker';
        el.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid #3b82f6;
            background-color: #ffffff;
            cursor: pointer;
        `;
        
        new maplibregl.Marker({
            element: el,
            anchor: 'center'
        })
        .setLngLat(point)
        .addTo(map);
        
        if (polygonPoints.length >= 3) {
            if (currentPolygon) {
                map.removeLayer('polygon');
                map.removeSource('polygon');
            }
            
            const polygonData = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [polygonPoints]
                }
            };
            
            // 移除现有图层
            if (map.getLayer('polygon')) {
                map.removeLayer('polygon');
            }
            if (map.getLayer('polygon-outline')) {
                map.removeLayer('polygon-outline');
            }
            if (map.getSource('polygon')) {
                map.removeSource('polygon');
            }
            
            // 添加新的数据源
            map.addSource('polygon', {
                'type': 'geojson',
                'data': polygonData
            });
            
            // 添加填充图层
            map.addLayer({
                'id': 'polygon',
                'type': 'fill',
                'source': 'polygon',
                'layout': {},
                'paint': {
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0.2
                }
            });
            
            // 添加边框图层
            map.addLayer({
                'id': 'polygon-outline',
                'type': 'line',
                'source': 'polygon',
                'layout': {},
                'paint': {
                    'line-color': '#2563eb',
                    'line-width': 2
                }
            });
            
            currentPolygon = polygonData;
        }
    };
    
    function finishDrawing() {
        if (currentPolygon) {
            // 移除所有顶点标记
            const markers = document.getElementsByClassName('vertex-marker');
            while (markers.length > 0) {
                markers[0].remove();
            }

            // 移除预览线
            if (previewLine) {
                map.removeLayer('preview-line');
                map.removeSource('preview-line');
                previewLine = null;
            }

            // 确保多边形已闭合
            if (polygonPoints.length > 0 && 
                (polygonPoints[0][0] !== polygonPoints[polygonPoints.length - 1][0] || 
                 polygonPoints[0][1] !== polygonPoints[polygonPoints.length - 1][1])) {
                polygonPoints.push([...polygonPoints[0]]);
            }

            // 更新多边形数据
            const updatedPolygonData = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [polygonPoints]
                }
            };

            // 更新数据源
            map.getSource('polygon').setData(updatedPolygonData);

            // 生成多边形内的POI
            const pois = generatePOIsInPolygon(updatedPolygonData);
            console.log('Generated POIs:', pois); // 添加调试日志
            pois.forEach(poi => {
                const marker = createPOIMarker(poi);
                currentPOIMarkers.push(marker);
            });

            // 重置状态
        isDrawingPolygon = false;
            polygonPoints = [];
            currentPolygon = null;

            // 恢复地图交互
            map.getCanvas().style.cursor = 'grab';
            map.dragPan.enable();
            map.scrollZoom.enable();
            map.doubleClickZoom.enable();
            map.touchZoom.enable();
            map.touchPitch.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            map.dragRotate.enable();
            map.touchRotate.enable();

            // 移除事件监听器
            if (drawingClickHandler) {
                map.off('click', drawingClickHandler);
                drawingClickHandler = null;
            }
            map.off('mousemove');
        }
    }
    
    map.on('click', drawingClickHandler);
});

// 更新其他功能按钮
document.getElementById('tap-hold').addEventListener('click', () => {
    clearMapLayers();
    
    // 添加长按交互状态
    let pressTimer;
    let isLongPress = false;
    let touchFeedback = null;
    let activePopup = null;
    let isMouseDown = false;
    
    // 创建视觉反馈元素
    function createTouchFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.2);
            border: 2px solid #3b82f6;
            transform: translate(-50%, -50%) scale(0.8);
            transition: all 0.3s ease;
            pointer-events: none;
            z-index: 1000;
            left: ${x}px;
            top: ${y}px;
        `;
        document.body.appendChild(feedback);
        return feedback;
    }

    // 移除视觉反馈
    function removeTouchFeedback() {
        if (touchFeedback) {
            touchFeedback.style.opacity = '0';
            setTimeout(() => {
                touchFeedback.remove();
                touchFeedback = null;
            }, 300);
        }
    }

    // 显示操作菜单
    function showActionMenu(lngLat, x, y) {
        if (activePopup) {
            activePopup.remove();
        }

        const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'action-menu-popup',
            offset: [0, 0]
        })
        .setLngLat(lngLat)
        .setHTML(`
            <style>
                .maplibregl-popup-content {
                    background: none !important;
                    border: none !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                }
                .maplibregl-popup-tip {
                    display: none !important;
                }
            </style>
            <div class="action-menu" style="
                background: linear-gradient(180deg, 
                    rgba(23, 23, 28, 0.95) 0%,
                    rgba(17, 17, 23, 0.98) 100%);
                border-radius: 12px;
                overflow: visible;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4),
                            0 2px 8px rgba(59, 130, 246, 0.15);
                min-width: 160px;
                backdrop-filter: blur(12px);
                padding: 4px;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    bottom: -5px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 5px solid transparent;
                    border-right: 5px solid transparent;
                    border-top: 5px solid rgba(17, 17, 23, 0.98);
                "></div>
                <button class="action-button" data-action="navigate" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    width: 100%;
                    border: none;
                    background: transparent;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.95);
                    cursor: pointer;
                    transition: all 0.2s ease;
                        border-radius: 8px;
                    margin: 1px 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    outline: none;
                    height: 36px;
                    flex-direction: row;
                    justify-content: flex-start;
                " tabindex="-1">
                    <img src="images/icons/navigate.svg" style="
                        width: 24px;
                        height: 24px;
                        flex-shrink: 0;
                    ">
                    <div style="flex: 1;">Take me here</div>
                </button>
                <button class="action-button" data-action="trending" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    width: 100%;
                    border: none;
                    background: transparent;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.95);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-radius: 8px;
                    margin: 1px 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    outline: none;
                    height: 36px;
                    flex-direction: row;
                    justify-content: flex-start;
                " tabindex="-1">
                    <img src="images/icons/trending.svg" style="
                        width: 24px;
                        height: 24px;
                        flex-shrink: 0;
                    ">
                    <div style="flex: 1;">Cool things around</div>
                </button>
                <button class="action-button" data-action="save" style="
                        display: flex;
                        align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    width: 100%;
                    border: none;
                    background: transparent;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.95);
                    cursor: pointer;
                    transition: all 0.2s ease;
                        border-radius: 8px;
                    margin: 1px 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    outline: none;
                    height: 36px;
                    flex-direction: row;
                    justify-content: flex-start;
                " tabindex="-1">
                    <img src="images/icons/save.svg" style="
                        width: 24px;
                        height: 24px;
                        flex-shrink: 0;
                    ">
                    <div style="flex: 1;">Save for later</div>
                </button>
                <button class="action-button" data-action="add" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    width: 100%;
                    border: none;
                    background: transparent;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.95);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-radius: 8px;
                    margin: 1px 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    outline: none;
                    height: 36px;
                    flex-direction: row;
                    justify-content: flex-start;
                " tabindex="-1">
                    <img src="images/icons/add.svg" style="
                        width: 24px;
                        height: 24px;
                        flex-shrink: 0;
                    ">
                    <div style="flex: 1;">Add a new place</div>
                </button>
                <button class="action-button" data-action="share" style="
                        display: flex;
                        align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    width: 100%;
                    border: none;
                    background: transparent;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.95);
                    cursor: pointer;
                    transition: all 0.2s ease;
                        border-radius: 8px;
                    margin: 1px 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    outline: none;
                    height: 36px;
                    flex-direction: row;
                    justify-content: flex-start;
                " tabindex="-1">
                    <img src="images/icons/share.svg" style="
                        width: 24px;
                        height: 24px;
                        flex-shrink: 0;
                    ">
                    <div style="flex: 1;">Share</div>
                </button>
            </div>
        `)
        .addTo(map);

        activePopup = popup;

        // 为按钮添加悬停效果
        const buttons = document.querySelectorAll('.action-menu button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.background = 'rgba(59, 130, 246, 0.08)';
                button.style.transform = 'translateX(2px)';
                const iconSpan = button.querySelector('span');
                if (iconSpan) {
                    iconSpan.style.background = 'rgba(59, 130, 246, 0.2)';
                }
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = 'transparent';
                button.style.transform = 'translateX(0)';
                const iconSpan = button.querySelector('span');
                if (iconSpan) {
                    iconSpan.style.background = 'rgba(59, 130, 246, 0.15)';
                }
            });
            // 防止按钮点击关闭菜单
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                // 执行操作后关闭菜单
                if (activePopup) {
                    activePopup.remove();
                    activePopup = null;
                }
            });
        });

        // 防止菜单区域的点击事件传播
        const menuElement = popup.getElement();
        menuElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 添加触摸事件监听器
    map.on('touchstart', (e) => {
        const touch = e.originalEvent.touches[0];
        isLongPress = false;
        
        pressTimer = setTimeout(() => {
            isLongPress = true;
            if (touchFeedback) {
                touchFeedback.style.transform = 'translate(-50%, -50%) scale(1.2)';
                touchFeedback.style.background = 'rgba(59, 130, 246, 0.3)';
            }
            showActionMenu(e.lngLat, touch.clientX, touch.clientY);
        }, 500);

        touchFeedback = createTouchFeedback(touch.clientX, touch.clientY);
        setTimeout(() => {
            if (touchFeedback) {
                touchFeedback.style.transform = 'translate(-50%, -50%) scale(1)';
            }
        }, 50);
    });

    map.on('touchmove', (e) => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        removeTouchFeedback();
    });

    map.on('touchend', () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        if (!isLongPress) {
            removeTouchFeedback();
        }
    });

    // 添加鼠标事件支持
    let mouseTimer;
    let mouseLngLat;
    
    map.on('mousedown', (e) => {
        // 检查点击是否在菜单内
        const clickedElement = e.originalEvent.target;
        const isClickInMenu = clickedElement.closest('.action-menu-popup');
        
        // 如果点击在菜单外的地图区域，关闭菜单
        if (!isClickInMenu && activePopup) {
            activePopup.remove();
            activePopup = null;
            return;
        }
        
        // 如果已经有菜单显示，不触发新的长按
        if (activePopup) {
            return;
        }
        
        isMouseDown = true;
        isLongPress = false;
        mouseLngLat = e.lngLat;
        
        mouseTimer = setTimeout(() => {
            if (isMouseDown) {  // 确保鼠标仍然按下
                isLongPress = true;
                showActionMenu(mouseLngLat, e.point.x, e.point.y);
            }
        }, 500);
    });

    map.on('mousemove', (e) => {
        if (!isLongPress && mouseTimer) {
            clearTimeout(mouseTimer);
            mouseTimer = null;
            mouseLngLat = null;
        }
    });

    map.on('mouseup', (e) => {
        isMouseDown = false;
        if (!isLongPress && mouseTimer) {
            clearTimeout(mouseTimer);
            mouseTimer = null;
            mouseLngLat = null;
        }
    });
});

document.getElementById('swipe-filter').addEventListener('click', () => {
    clearMapLayers();
    const existingSelector = document.querySelector('.type-selector');
    if (existingSelector) {
        existingSelector.remove();
    } else {
        // 默认显示"restaurant"类型的POI
        currentPoiType = 'restaurant';
        generateRandomPOIs(currentPoiType);
        showTypeSelector();
    }
});

document.getElementById('sketch-route').addEventListener('click', () => {
    clearMapLayers();
    let isDrawing = false;
    let startPoint = null;
    let endPoint = null;
    let startMarker = null;
    let endMarker = null;
    let routeSource = null;
    let mapInteractionState = null;
    
    // OSRM 路径规划
    async function getRoute(start, end, preference = null) {
        try {
            // 使用 Mapbox Directions API
            const accessToken = 'pk.eyJ1IjoiMjc1NDc3OTAwN3FxY29tIiwiYSI6ImNqajViOTRibjF3b3oza3Axdm83ajBqYzcifQ.E-WgBuOW5mlelsmBeUN47Q';
            const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;
            // 增加 alternatives 参数以获取更多替代路线
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?alternatives=true&geometries=geojson&overview=full&access_token=${accessToken}`;
            
            console.log('Mapbox Request URL:', url); // 调试日志
            
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Mapbox API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            const data = await response.json();
            
            console.log('Mapbox Response:', data); // 调试日志
            
            if (!data.routes || !data.routes.length) {
                console.error('No routes found in response:', data);
                throw new Error('无法获取路径数据');
            }
            
            // 处理返回的路线
            let routes = data.routes.map(route => ({
                geometry: route.geometry,
                distance: route.distance,
                duration: route.duration
            }));
            
            console.log('Processed routes:', routes); // 调试日志
            
            // 如果路线数量不足3条，生成替代路线
            if (routes.length < 3) {
                console.log(`警告：Mapbox 只返回了${routes.length}条路线，将生成替代路线`);
                
                // 计算需要生成的路线数量
                const routesToGenerate = 3 - routes.length;
                
                // 生成替代路线
                for (let i = 0; i < routesToGenerate; i++) {
                    // 随机选择一条现有路线作为基础
                    const baseRoute = routes[Math.floor(Math.random() * routes.length)];
                    const modifiedRoute = {
                geometry: {
                            type: baseRoute.geometry.type,
                            coordinates: baseRoute.geometry.coordinates.map(coord => [
                                coord[0] + (Math.random() - 0.5) * 0.002, // 增加偏移量到0.002度
                                coord[1] + (Math.random() - 0.5) * 0.002
                            ])
                        },
                        distance: baseRoute.distance * (1 + (Math.random() - 0.5) * 0.3), // 增加变化范围到±30%
                        duration: baseRoute.duration * (1 + (Math.random() - 0.5) * 0.3)
                    };
                    routes.push(modifiedRoute);
                }
            }
            
            return routes;
            
        } catch (error) {
            console.error('路径规划失败:', error);
            throw error;
        }
    }
    
    // 计算直线距离（米）
    function calculateDirectDistance(start, end) {
        const R = 6371e3; // 地球半径（米）
        const φ1 = start[1] * Math.PI/180;
        const φ2 = end[1] * Math.PI/180;
        const Δφ = (end[1]-start[1]) * Math.PI/180;
        const Δλ = (end[0]-start[0]) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    // 估算直线行驶时间（秒）
    function calculateDirectDuration(start, end) {
        const distance = calculateDirectDistance(start, end);
        const averageSpeed = 30; // 假设平均速度30km/h
        return (distance / 1000) / averageSpeed * 3600; // 转换为秒
    }
    
    // 格式化距离
    function formatDistance(meters) {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${Math.round(meters)} m`;
    }
    
    // 格式化时间
    function formatDuration(seconds) {
        if (seconds >= 3600) {
            return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
        }
        if (seconds >= 60) {
            return `${Math.floor(seconds / 60)} min`;
        }
        return `${Math.round(seconds)} sec`;
    }
    
    // 显示预览直线
    function showPreviewLine(start, end) {
        // 移除现有的预览线
        if (map.getLayer('preview-line')) {
            map.removeLayer('preview-line');
        }
        if (map.getSource('preview-line')) {
            map.removeSource('preview-line');
        }
        
        // 添加新的预览线
        map.addSource('preview-line', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [start, end]
                }
            }
        });
        
        map.addLayer({
            'id': 'preview-line',
            'type': 'line',
            'source': 'preview-line',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-dasharray': [2, 2]
            }
        });
    }
    
    // 在路线上生成POI点
    function generateRoutePoints(coordinates, preference = null) {
        // 清除现有的POI标记
        currentPOIMarkers.forEach(marker => marker.remove());
        currentPOIMarkers = [];

        // 随机生成4-8个POI
        const numPoints = Math.floor(Math.random() * 5) + 4;
        const totalPoints = coordinates.length;
        
        // 确保点的间距至少为路线总长度的15%
        const minGap = Math.floor(totalPoints * 0.15);
        let lastIndex = 0;
        
        // 获取所有可用的POI图片
        const poiImages = Array.from({length: 18}, (_, i) => `images/poi/${i + 1}.png`);
        const shuffledImages = shuffleArray([...poiImages]);
        
        for (let i = 0; i < numPoints; i++) {
            // 在上一个点之后的位置中随机选择，确保间距
            const minPos = lastIndex + minGap;
            const maxPos = i === numPoints - 1 ? 
                totalPoints - 1 : // 最后一个点可以在终点
                totalPoints - (numPoints - i) * minGap; // 为剩余点预留空间
            
            if (minPos >= maxPos) continue;
            
            const index = Math.floor(Math.random() * (maxPos - minPos)) + minPos;
            lastIndex = index;
            
            const point = coordinates[index];
            
            // 创建POI标记
            const el = document.createElement('div');
            el.className = 'poi-marker';
            el.style.cssText = `
                width: 64px;
                height: 64px;
                background-image: url(${shuffledImages[i % shuffledImages.length]});
                background-size: cover;
                background-position: center;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                cursor: pointer;
            `;
            
            // 添加一些随机偏移
            const offsetDistance = 0.0005;
            const angle = Math.random() * Math.PI * 2;
            const offsetPoint = [
                point[0] + Math.cos(angle) * offsetDistance,
                point[1] + Math.sin(angle) * offsetDistance
            ];
            
            const marker = new maplibregl.Marker({
                element: el,
                anchor: 'bottom'
            })
                .setLngLat(offsetPoint)
                .addTo(map);
                
            currentPOIMarkers.push(marker);
        }
    }

    // 添加全局函数用于处理菜单交互
    window.togglePreferenceMenu = (event) => {
        event.stopPropagation();
        const menu = document.getElementById('preferenceMenu');
        menu.classList.toggle('show');
        
        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !event.target.contains(e.target)) {
                menu.classList.remove('show');
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    };

    window.updateRoutePreference = async (event, preference) => {
        event.stopPropagation();
        const menu = document.getElementById('preferenceMenu');
        menu.classList.remove('show');
        
        // 移除所有现有的popup
        const popups = document.getElementsByClassName('maplibregl-popup');
        while (popups[0]) {
            popups[0].remove();
        }
        
        // 重新生成路线
        await showRoute(startPoint, endPoint, false, preference);
    };

    // 显示路线
    async function showRoute(start, end, isPreview = false, preference = null) {
        try {
            // 如果是预览模式，显示预览线
            if (isPreview) {
                showPreviewLine(start, end);
                return;
            }

            // 移除所有现有的popup
            const popups = document.getElementsByClassName('maplibregl-popup');
            while (popups[0]) {
                popups[0].remove();
            }

            // 移除预览线和现有路线
            ['preview-line', 'route-0', 'route-1', 'route-2'].forEach(id => {
                if (map.getLayer(id)) {
                    map.removeLayer(id);
                }
                if (map.getSource(id)) {
                    map.removeSource(id);
                }
            });

            const routes = await getRoute(start, end, preference);

            // 计算所有路线的边界
            const bounds = new maplibregl.LngLatBounds();
            routes.forEach(route => {
                route.geometry.coordinates.forEach(coord => bounds.extend(coord));
            });

            // 添加所有路线图层,但只显示当前选中的路线
            const colors = ['#3b82f6', '#10b981', '#8b5cf6']; // 蓝色、绿色、紫色
            routes.forEach((route, index) => {
                map.addSource(`route-${index}`, {
                type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: route.geometry
                    }
            });

            map.addLayer({
                    id: `route-${index}`,
                type: 'line',
                    source: `route-${index}`,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                        'line-color': colors[index],
                    'line-width': 6,
                        'line-opacity': index === 0 ? 0.8 : 0
                }
                });
            });

            // 调整地图视角以显示所有路线
            map.fitBounds(bounds, { padding: 100 });

            // 在主路线上生成随机POI
            generateRoutePoints(routes[0].geometry.coordinates);

            // 显示路线信息
            const mainRoute = routes[0];
            const distance = (mainRoute.distance / 1000).toFixed(1);
            const duration = Math.round(mainRoute.duration / 60);

            // 计算路线中点位置
            const routeCoordinates = mainRoute.geometry.coordinates;
            const midPointIndex = Math.floor(routeCoordinates.length / 2);
            const midPoint = routeCoordinates[midPointIndex];
            
            const popup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                anchor: 'bottom',
                offset: [0, -5]
            })
            .setLngLat(midPoint)
            .setHTML(`
                <style>
                    .maplibregl-popup-content {
                        background: none !important;
                        border: none !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                    .maplibregl-popup-tip {
                        display: none !important;
                    }
                    .route-preference {
                        margin-top: 8px;
                        text-align: center;
                        position: relative;
                    }
                    .route-preference-btn {
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        color: white;
                        padding: 4px 12px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: background 0.3s;
                    }
                    .route-preference-btn:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }
                    .preference-menu {
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(23, 23, 28, 0.95);
                        border-radius: 12px;
                        margin-top: 8px;
                        padding: 4px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        z-index: 1000;
                    }
                    .preference-menu.show {
                        display: block;
                    }
                    .preference-option {
                        display: block;
                        width: 100%;
                        padding: 8px 16px;
                        text-align: left;
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                        white-space: nowrap;
                        border-radius: 8px;
                    }
                    .preference-option:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                </style>
                <div style="
                    position: relative;
                    color: white;
                    padding: 8px 16px;
                    background: linear-gradient(180deg, 
                        rgba(23, 23, 28, 0.95) 0%,
                        rgba(17, 17, 23, 0.98) 100%);
                    border-radius: 16px;
                    font-size: 14px;
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                ">
                    <div style="text-align: center;">
                        <div>Distance: ${distance}km</div>
                        <div>Duration: ${duration}min</div>
                        <div class="route-preference">
                            <button class="route-preference-btn" onclick="window.togglePreferenceMenu(event)">Route Options</button>
                            <div class="preference-menu" id="preferenceMenu">
                                <button class="preference-option" onclick="window.switchRoute(event, 0)">Recommended (${(routes[0].distance / 1000).toFixed(1)}km)</button>
                                <button class="preference-option" onclick="window.switchRoute(event, 1)">Route via Cafe (${(routes[1].distance / 1000).toFixed(1)}km)</button>
                                <button class="preference-option" onclick="window.switchRoute(event, 2)">Route via Toilet (${(routes[2].distance / 1000).toFixed(1)}km)</button>
                            </div>
                        </div>
                    </div>
                    <div style="
                        position: absolute;
                        bottom: -6px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 6px solid transparent;
                        border-right: 6px solid transparent;
                        border-top: 6px solid rgba(17, 17, 23, 0.98);
                    "></div>
                </div>
            `)
            .addTo(map);

            // 添加全局函数用于切换路线
            window.switchRoute = (event, routeIndex) => {
                event.stopPropagation();
                const menu = document.getElementById('preferenceMenu');
                menu.classList.remove('show');
                
                // 隐藏所有路线
                for (let i = 0; i < 3; i++) {
                    map.setPaintProperty(`route-${i}`, 'line-opacity', 0);
                }
                
                // 显示选中的路线
                map.setPaintProperty(`route-${routeIndex}`, 'line-opacity', 0.8);
                
                // 更新POI
                generateRoutePoints(routes[routeIndex].geometry.coordinates);
                
                // 更新路线信息
                const route = routes[routeIndex];
                const distance = (route.distance / 1000).toFixed(1);
                const duration = Math.round(route.duration / 60);
                
                // 移除旧的popup
                const popups = document.getElementsByClassName('maplibregl-popup');
                while (popups[0]) {
                    popups[0].remove();
                }
                
                // 计算路线中点位置
                const routeCoordinates = routes[routeIndex].geometry.coordinates;
                const midPointIndex = Math.floor(routeCoordinates.length / 2);
                const midPoint = routeCoordinates[midPointIndex];
                
                // 创建新的popup
                new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    anchor: 'bottom',
                    offset: [0, -5]
                })
                .setLngLat(midPoint)
                .setHTML(`
                    <style>
                        .maplibregl-popup-content {
                            background: none !important;
                            border: none !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                        }
                        .maplibregl-popup-tip {
                            display: none !important;
                        }
                        .route-preference {
                            margin-top: 8px;
                            text-align: center;
                            position: relative;
                        }
                        .route-preference-btn {
                            background: rgba(255, 255, 255, 0.1);
                            border: none;
                            color: white;
                            padding: 4px 12px;
                            border-radius: 12px;
                            cursor: pointer;
                            font-size: 12px;
                            transition: background 0.3s;
                        }
                        .route-preference-btn:hover {
                            background: rgba(255, 255, 255, 0.2);
                        }
                        .preference-menu {
                            display: none;
                            position: absolute;
                            top: 100%;
                            left: 50%;
                            transform: translateX(-50%);
                            background: rgba(23, 23, 28, 0.95);
                            border-radius: 12px;
                            margin-top: 8px;
                            padding: 4px;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            z-index: 1000;
                        }
                        .preference-menu.show {
                            display: block;
                        }
                        .preference-option {
                            display: block;
                            width: 100%;
                            padding: 8px 16px;
                            text-align: left;
                            background: none;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 12px;
                            white-space: nowrap;
                            border-radius: 8px;
                        }
                        .preference-option:hover {
                            background: rgba(255, 255, 255, 0.1);
                        }
                    </style>
                    <div style="
                        position: relative;
                        color: white;
                        padding: 8px 16px;
                        background: linear-gradient(180deg, 
                            rgba(23, 23, 28, 0.95) 0%,
                            rgba(17, 17, 23, 0.98) 100%);
                        border-radius: 16px;
                        font-size: 14px;
                        backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        margin-bottom: 6px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    ">
                        <div style="text-align: center;">
                            <div>Distance: ${distance}km</div>
                            <div>Duration: ${duration}min</div>
                            <div class="route-preference">
                                <button class="route-preference-btn" onclick="window.togglePreferenceMenu(event)">Route Options</button>
                                <div class="preference-menu" id="preferenceMenu">
                                    <button class="preference-option" onclick="window.switchRoute(event, 0)">Recommended (${(routes[0].distance / 1000).toFixed(1)}km)</button>
                                    <button class="preference-option" onclick="window.switchRoute(event, 1)">Route via Cafe (${(routes[1].distance / 1000).toFixed(1)}km)</button>
                                    <button class="preference-option" onclick="window.switchRoute(event, 2)">Route via Toilet (${(routes[2].distance / 1000).toFixed(1)}km)</button>
                                </div>
                            </div>
                        </div>
                        <div style="
                            position: absolute;
                            bottom: -6px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 0;
                            height: 0;
                            border-left: 6px solid transparent;
                            border-right: 6px solid transparent;
                            border-top: 6px solid rgba(17, 17, 23, 0.98);
                        "></div>
                    </div>
                `)
                .addTo(map);
            };

            // 添加全局函数用于切换偏好菜单
            window.togglePreferenceMenu = (event) => {
                event.stopPropagation();
                const menu = document.getElementById('preferenceMenu');
                menu.classList.toggle('show');
            };

        } catch (error) {
            console.error('路线展示错误:', error);
            
            // 清除起点和终点标记
            if (startMarker) startMarker.remove();
            if (endMarker) endMarker.remove();
            startPoint = null;
            endPoint = null;
            isDrawing = false;
            
            // 恢复地图交互
            restoreMapInteraction();
            
            // 移除事件监听器
            map.off('click', clickHandler);
            map.off('mousemove', mouseMoveHandler);
        }
    }
    
    // 锁定地图交互
    function lockMapInteraction() {
        if (mapInteractionState) return;
        
        mapInteractionState = {
            dragPan: map.dragPan.isEnabled(),
            scrollZoom: map.scrollZoom.isEnabled(),
            touchZoomRotate: map.touchZoomRotate.isEnabled(),
            doubleClickZoom: map.doubleClickZoom.isEnabled()
        };
        
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.touchZoomRotate.disable();
        map.doubleClickZoom.disable();
    }
    
    // 恢复地图交互
    function restoreMapInteraction() {
        if (!mapInteractionState) return;
        
        if (mapInteractionState.dragPan) map.dragPan.enable();
        if (mapInteractionState.scrollZoom) map.scrollZoom.enable();
        if (mapInteractionState.touchZoomRotate) map.touchZoomRotate.enable();
        if (mapInteractionState.doubleClickZoom) map.doubleClickZoom.enable();
        
        mapInteractionState = null;
    }
    
    // 创建标记点
    function createMarker(type, lngLat) {
        const el = document.createElement('div');
        el.style.cssText = `
            width: 24px;
            height: 24px;
            background: ${type === 'start' ? '#3b82f6' : '#ef4444'};
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        `;
        
        const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center'
        }).setLngLat(lngLat);
        
        currentMarkers.push(marker); // 添加这行
        return marker;
    }
    
    // 立即锁定地图交互
    lockMapInteraction();
    
    // 添加点击事件处理
    const clickHandler = async (e) => {
        const point = [e.lngLat.lng, e.lngLat.lat];
        
        if (!isDrawing) {
            // 设置起点
            isDrawing = true;
            startPoint = point;
            startMarker = createMarker('start', point);
            startMarker.addTo(map);
            
        } else if (!endPoint) {
            // 设置终点
            endPoint = point;
            endMarker = createMarker('end', point);
            endMarker.addTo(map);
            
            // 移除预览线
            if (map.getLayer('preview-line')) {
                map.removeLayer('preview-line');
            }
            if (map.getSource('preview-line')) {
                map.removeSource('preview-line');
            }
            
            // 显示最终路线并获取路径数据
            await showRoute(startPoint, endPoint, false);
            
            // 完成后恢复地图交互
            restoreMapInteraction();
            
            // 移除事件监听器
            map.off('click', clickHandler);
            map.off('mousemove', mouseMoveHandler);
        }
    };
    
    // 添加鼠标移动效果
    const mouseMoveHandler = (e) => {
        if (!isDrawing || endPoint) return;
        const point = [e.lngLat.lng, e.lngLat.lat];
        showRoute(startPoint, point, true);
    };
    
    // 添加ESC键取消绘制
    const keyHandler = (e) => {
        if (e.key === 'Escape') {
            clearMapLayers();
            isDrawing = false;
            startPoint = null;
            endPoint = null;
            if (startMarker) startMarker.remove();
            if (endMarker) endMarker.remove();
            
            // 恢复地图交互
            restoreMapInteraction();
            
            // 移除事件监听器
            map.off('click', clickHandler);
            map.off('mousemove', mouseMoveHandler);
            document.removeEventListener('keydown', keyHandler);
        }
    };
    
    // 添加事件监听器
    map.on('click', clickHandler);
    map.on('mousemove', mouseMoveHandler);
    document.addEventListener('keydown', keyHandler);
});

// 辅助函数
function updateMapDisplay(filter) {
    console.log(`更新显示: ${filter}`);
}

function showPointsAlongRoute(points) {
    const midPoint = points[Math.floor(points.length / 2)];
    new maplibregl.Popup()
        .setLngLat(midPoint)
        .setHTML('沿途发现的景点')
        .addTo(map);
}

function takeMeHere() {
    console.log('导航到这里');
}

function showTrending() {
    console.log('显示热门地点');
}

function saveForLater() {
    console.log('保存到稍后查看');
}

function updatePOIs(poiType) {
    // 清除现有的POI标记
    currentPOIMarkers.forEach(marker => marker.remove());
    currentPOIMarkers = [];
    
    // 使用当前边界生成新的POI
    if (currentBounds && polygonPoints.length > 0) {
        const pois = generatePOIsInPolygon(currentPolygon, 5);
        pois.forEach(poi => {
            const el = document.createElement('div');
            el.className = 'custom-marker';
            
            el.style.cssText = `
                width: 56px;
                height: 56px;
                background-color: ${poi.color};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                border: 2px solid #FFFFFF;
                overflow: hidden;
            `;
            
            el.innerHTML = `
                <img 
                    src="${poi.image}" 
                    style="
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 50%;
                    "
                />
            `;

            const marker = new maplibregl.Marker({
                element: el,
                anchor: 'center'
            })
            .setLngLat(poi.coordinates)
            .addTo(map);
            
            currentPOIMarkers.push(marker);
        });
    }
}

// 添加类型选择器
function showTypeSelector() {
    const container = document.createElement('div');
    container.className = 'type-selector';

    // 获取地图中心点的屏幕坐标
    const center = map.getCenter();
    const point = map.project(center);

    container.style.cssText = `
        position: fixed;
        transform: translate(-50%, 0);
        background: linear-gradient(to bottom, 
            rgba(0, 0, 0, 0.35) 0%,
            rgba(0, 0, 0, 0.25) 50%,
            rgba(0, 0, 0, 0.15) 100%);
        padding: 15px 25px;
        border-radius: 30px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 30px;
        z-index: 1000;
        backdrop-filter: blur(8px);
        left: ${point.x}px;
        top: ${point.y}px;
    `;

    // 添加左箭头
    const leftArrow = document.createElement('div');
    leftArrow.innerHTML = '&#171;';
    leftArrow.style.cssText = `
        color: white;
        font-size: 24px;
        cursor: pointer;
        user-select: none;
        padding: 0 10px;
    `;

    // 添加右箭头
    const rightArrow = document.createElement('div');
    rightArrow.innerHTML = '&#187;';
    rightArrow.style.cssText = `
        color: white;
        font-size: 24px;
        cursor: pointer;
        user-select: none;
        padding: 0 10px;
    `;

    // 添加类型文本
    const typeText = document.createElement('div');
    typeText.textContent = currentPoiType;
    typeText.style.cssText = `
        color: white;
        font-size: 18px;
        font-weight: 500;
        min-width: 60px;
        text-align: center;
        text-transform: capitalize;
    `;

    // 组装UI
    container.appendChild(leftArrow);
    container.appendChild(typeText);
    container.appendChild(rightArrow);

    // 使用新的POI类型
    const types = POI_TYPES;
    let currentIndex = types.indexOf(currentPoiType);

    // 添加箭头点击事件
    leftArrow.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + types.length) % types.length;
        updateTypeDisplay();
    });

    rightArrow.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % types.length;
        updateTypeDisplay();
    });

    function updateTypeDisplay() {
        const newType = types[currentIndex];
        typeText.textContent = newType;
        currentPoiType = newType;
        generateRandomPOIs(newType);
    }

    // 更新位置计算函数
    const updatePosition = () => {
        const center = map.getCenter();
        const newPoint = map.project(center);
        container.style.left = `${newPoint.x}px`;
        container.style.top = `${newPoint.y}px`;
    };

    map.on('move', updatePosition);
    map.on('zoom', updatePosition);

    // 当筛选器被移除时，清除事件监听器
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && !document.contains(container)) {
                map.off('move', updatePosition);
                map.off('zoom', updatePosition);
                observer.disconnect();
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.body.appendChild(container);
}

// 个性化功能相关变量
let avatar = null;
let centerButton = null;

// 添加个性化功能
document.getElementById('personalize').addEventListener('click', () => {
    clearMapLayers();
    
    // 先移动地图到目标位置和缩放级别
    map.flyTo({
        center: [103.8280, 1.2762], // Silat Road
        zoom: 17,
        duration: 1000,
        essential: true
    });
    
    // 等待地图移动和缩放完成后再添加小人
    map.once('moveend', () => {
        // 获取地图中心点
        const center = map.getCenter();
        
        // 创建自定义标记
        const el = document.createElement('div');
        el.style.cssText = `
            position: relative;
            width: 48px;
            height: 48px;
        `;
        
        // 添加射线元素
        const ray = document.createElement('div');
        ray.className = 'avatar-ray';
        el.appendChild(ray);
        
        // 添加小人图片
        const img = document.createElement('img');
        img.src = 'images/avatar.png';
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            position: relative;
            z-index: 1;
        `;
        el.appendChild(img);
        
        // 创建标记
        avatar = new maplibregl.Marker({
            element: el,
            anchor: 'center'
        })
        .setLngLat([center.lng, center.lat])
        .addTo(map);
        
        // 创建居中按钮
        if (!centerButton) {
            centerButton = document.createElement('button');
            centerButton.className = 'center-button';
            centerButton.innerHTML = '⌖';
            centerButton.style.cssText = `
                position: fixed;
                bottom: 120px;
                right: 20px;
                width: 40px;
                height: 40px;
                background: rgba(0, 0, 0, 0.75);
                border: none;
                border-radius: 8px;
                color: white;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(8px);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                transition: all 0.2s ease;
                z-index: 1;
            `;
            
            // 添加悬停效果
            centerButton.addEventListener('mouseenter', () => {
                centerButton.style.background = 'rgba(59, 130, 246, 0.75)';
                centerButton.style.transform = 'scale(1.05)';
            });
            
            centerButton.addEventListener('mouseleave', () => {
                centerButton.style.background = 'rgba(0, 0, 0, 0.75)';
                centerButton.style.transform = 'scale(1)';
            });
            
            // 添加点击效果
            centerButton.addEventListener('click', () => {
                map.flyTo({
                    center: [center.lng, center.lat],
                    zoom: 17,
                    duration: 1000
                });
            });
            
            document.body.appendChild(centerButton);
        }
        
        // 显示居中按钮
        centerButton.style.display = 'flex';
    });
});

// 添加热门功能
document.getElementById('trending').addEventListener('click', () => {
    // 检查是否已经存在热力图和活动信息气泡
    const hasHeatmap = map.getLayer('heatmap') !== undefined;
    const hasEventPopups = document.querySelectorAll('.event-popup').length > 0;
    
    // 如果已经存在,不做任何处理
    if (hasHeatmap && hasEventPopups) {
        return;
    }
    
    // 如果只有热力图但没有活动信息气泡，或者只有活动信息气泡但没有热力图
    // 则清除所有内容并重新创建
    if ((hasHeatmap && !hasEventPopups) || (!hasHeatmap && hasEventPopups)) {
        resetTrendingState();
    }
    
    // 获取当前地图范围
    const bounds = map.getBounds();
    
    // 生成单个热力图
    const heatmap = generateHeatmap(bounds);
    
    // 创建热力图图层
    const heatmapId = 'heatmap';
        map.addSource(heatmapId, {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
            'features': heatmap.allPoints.map(point => ({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': point
                    }
                }))
            }
        });
        
        map.addLayer({
            'id': heatmapId,
            'type': 'heatmap',
            'source': heatmapId,
            'paint': {
                'heatmap-weight': 1,
                'heatmap-intensity': 1,
                'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(33,102,172,0)',
                    0.2, 'rgb(103,169,207)',
                    0.4, 'rgb(209,229,240)',
                    0.6, 'rgb(253,219,199)',
                    0.8, 'rgb(239,138,98)',
                    1, 'rgb(178,24,43)'
                ],
                'heatmap-radius': 30,
                'heatmap-opacity': 0.6
            }
        });
        
    // 生成活动信息
    const events = generateEventPopups(heatmap);
    
    // 添加活动信息气泡
    events.forEach(event => {
        const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor: 'bottom',
            offset: [0, -5],
            className: 'event-popup'
        })
        .setLngLat(event.location)
        .setHTML(`
            <div style="
                position: relative;
                color: white;
                padding: 12px;
                background: rgba(0, 0, 0, 0.75);
                border-radius: 16px;
                font-size: 14px;
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                margin-bottom: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                min-width: 200px;
            ">
                <div style="
                    display: flex;
                    align-items: stretch;
                    gap: 12px;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        border-radius: 12px;
                        overflow: hidden;
                        flex-shrink: 0;
            ">
                <img src="${event.image}" style="
                    width: 100%;
                            height: 100%;
                    object-fit: cover;
                        "/>
                    </div>
                    <div style="
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        flex: 1;
                    ">
                        <div>
                            <div style="
                                font-weight: 600;
                                margin-bottom: 4px;
                                font-size: 16px;
                            ">${event.title}</div>
                            <div style="
                                display: flex;
                                gap: 8px;
                                margin-bottom: 4px;
                            ">
                                <span style="
                                    padding: 2px 8px;
                                    background: rgba(59, 130, 246, 0.2);
                                    border-radius: 12px;
                                    font-size: 12px;
                                    color: #60A5FA;
                                ">${event.type}</span>
                                <span style="
                                    padding: 2px 8px;
                                    background: ${event.isOngoing ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'};
                                    border-radius: 12px;
                                    font-size: 12px;
                                    color: ${event.isOngoing ? '#4ADE80' : '#FDE047'};
                                ">${event.isOngoing ? 'Ongoing' : 'Coming Soon'}</span>
                            </div>
                            <div style="
                                font-size: 12px;
                                opacity: 0.8;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <span>${event.time}</span>
                                <a href="#" onclick="alert('Jump to Eventbrite'); return false;" style="
                                    color: #60A5FA;
                                    text-decoration: underline;
                                    font-size: 12px;
                                    opacity: 0.8;
                                ">Get Tickets</a>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid rgba(0, 0, 0, 0.75);
                "></div>
            </div>
        `)
        .addTo(map);
    });
});

// 生成单个热力图
function generateHeatmap(bounds) {
    // 在边界范围内随机生成3-4个热点区域
    const numClusters = Math.floor(Math.random() * 2) + 3; // 3或4
    const clusters = [];
    
    for (let i = 0; i < numClusters; i++) {
        const center = [
            bounds._sw.lng + Math.random() * (bounds._ne.lng - bounds._sw.lng),
            bounds._sw.lat + Math.random() * (bounds._ne.lat - bounds._sw.lat)
        ];
        
        // 为每个热点区域生成15-25个点
        const numPoints = Math.floor(Math.random() * 11) + 15;
    const points = [];
        const radius = 0.002; // 约200米半径
    
        for (let j = 0; j < numPoints; j++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
            points.push([
                center[0] + r * Math.cos(angle),
                center[1] + r * Math.sin(angle)
            ]);
        }
        
        clusters.push({
            center: center,
            points: points
        });
    }
    
    return {
        clusters: clusters,
        allPoints: clusters.reduce((acc, cluster) => [...acc, ...cluster.points], [])
    };
}

// 生成活动信息
function generateEventPopups(heatmap) {
    const events = [];
    const eventData = [
        {
            title: "Singapore Food Festival",
            type: "Food",
            image: "images/event1.png"
        },
        {
            title: "Marina Bay Music Festival",
            type: "Music",
            image: "images/event2.png"
        },
        {
            title: "Heritage Exhibition",
            type: "Culture",
            image: "images/event3.png"
        },
        {
            title: "Art Exhibition",
            type: "Art",
            image: "images/event1.png"
        },
        {
            title: "Night Festival",
            type: "Entertainment",
            image: "images/event2.png"
        }
    ];
    
    // 在热点区域和可视范围内分布活动
    const bounds = map.getBounds();
    
    // 确保活动均匀分布在可视区域内
    const gridSize = Math.ceil(Math.sqrt(eventData.length));
    const cellWidth = (bounds._ne.lng - bounds._sw.lng) / gridSize;
    const cellHeight = (bounds._ne.lat - bounds._sw.lat) / gridSize;
    
    eventData.forEach((event, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        const location = [
            bounds._sw.lng + (col + 0.3 + Math.random() * 0.4) * cellWidth,
            bounds._sw.lat + (row + 0.3 + Math.random() * 0.4) * cellHeight
        ];
        
        events.push({
            ...event,
            time: generateRandomEventTime(),
            location: location,
            isOngoing: Math.random() < 0.3 // 30%概率正在进行
        });
    });
    
    return events;
}

// 生成随机事件时间
function generateRandomEventTime() {
    const now = new Date();
    const futureDate = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
    return futureDate.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });
}

// Generate random POI description
function generatePOIDescription(type) {
    const descriptions = {
        'restaurant': [
            'Iconic hawker centre featuring Singapore\'s best local delicacies',
            'Popular food court known for authentic Singaporean cuisine',
            'Heritage food centre with award-winning hawker stalls',
            'Bustling food paradise with diverse Asian flavors',
            'Local favorite spot for traditional Singaporean dishes'
        ],
        'cafe': [
            'Trendy cafe serving artisanal coffee and brunch',
            'Charming spot known for traditional kopi and toast',
            'Modern coffee house with specialty brews',
            'Cozy cafe featuring local-inspired pastries',
            'Popular brunch spot with outdoor seating'
        ],
        'bar': [
            'Award-winning cocktail bar with stunning city views',
            'Speakeasy-style bar crafting innovative drinks',
            'Sophisticated lounge with extensive wine selection',
            'Trendy bar known for Asian-inspired cocktails',
            'Rooftop bar offering craft beers and signature drinks'
        ],
        'shop': [
            'Premium shopping mall with luxury brands',
            'Iconic shopping destination in the heart of Singapore',
            'Modern retail complex with diverse shopping options',
            'Popular mall featuring local and international brands',
            'One-stop shopping paradise with entertainment facilities'
        ],
        'attraction': [
            'Must-visit Singapore landmark with stunning architecture',
            'World-class attraction showcasing Singapore\'s heritage',
            'Popular tourist destination with unique experiences',
            'Award-winning attraction perfect for families',
            'Iconic Singapore destination with breathtaking views'
        ]
    };
    
    const typeDescriptions = descriptions[type] || descriptions['restaurant'];
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
}

// 修改 createPOIMarker 函数中的 POI 信息生成部分
function createPOIMarker(poi) {
    console.log('Creating POI marker:', poi);
    
    // 创建自定义marker元素
    const marker = document.createElement('div');
    marker.className = 'poi-marker';
    
    marker.style.cssText = `
        width: 64px;
        height: 64px;
        background-image: url(${poi.image || `images/poi/${Math.floor(Math.random() * 18) + 1}.png`});
        background-size: cover;
        background-position: center;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
    `;
    
    const mapMarker = new maplibregl.Marker({
        element: marker,
        anchor: 'bottom',
        offset: [0, -20]
    })
    .setLngLat(poi.coordinates || [poi.lng, poi.lat])
    .addTo(map);

    marker.addEventListener('click', (e) => {
        console.log('POI marker clicked');
        e.stopPropagation();
        
        const existingPopups = document.getElementsByClassName('maplibregl-popup');
        while (existingPopups[0]) {
            existingPopups[0].remove();
        }
        
        const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            offset: [0, -30],
            className: 'poi-popup',
            maxWidth: '300px'
        });
        
        const popupContent = document.createElement('div');
        popupContent.className = 'poi-popup-content';
        popupContent.innerHTML = `
            <div class="poi-header">
                <h3>${poi.name}</h3>
                <div class="poi-rating">
                    <span class="stars">${'★'.repeat(Math.floor(poi.rating))}${'☆'.repeat(5 - Math.floor(poi.rating))}</span>
                    <span class="rating-value">${poi.rating}</span>
                    <span class="reviews">(${poi.reviews} reviews)</span>
                </div>
            </div>
            <div class="poi-description">
                ${poi.description}
            </div>
            <div class="poi-actions" style="
                display: flex;
                gap: 8px;
                margin-top: 12px;
            ">
                <button onclick="handleIAmHere()" style="
                    flex: 1;
                    padding: 8px;
                    background: rgba(59, 130, 246, 0.1);
                    border: none;
                    border-radius: 8px;
                    color: #3b82f6;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                ">
                    <i class="fas fa-map-marker-alt" style="font-size: 14px;"></i>
                    I'm here
                </button>
                <button onclick="handlePost()" style="
                    flex: 1;
                    padding: 8px;
                    background: rgba(59, 130, 246, 0.1);
                    border: none;
                    border-radius: 8px;
                    color: #3b82f6;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                ">
                    <i class="fas fa-camera" style="font-size: 14px;"></i>
                    Post
                </button>
            </div>
        `;
        
        popup.setLngLat(poi.coordinates || [poi.lng, poi.lat])
            .setDOMContent(popupContent)
            .addTo(map);
    });

    return mapMarker;
}

// 处理"I'm here"按钮点击
function handleIAmHere() {
    alert('Location shared!');
}

// 处理"Post"按钮点击
function handlePost() {
    const cameraOverlay = document.createElement('div');
    cameraOverlay.className = 'camera-overlay';
    cameraOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    `;
    
    cameraOverlay.innerHTML = `
        <div style="
            width: 300px;
            height: 400px;
            background: #333;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
        ">
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                opacity: 0.3;
            "></div>
            <div style="
                position: absolute;
                top: 16px;
                left: 16px;
                right: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <button onclick="closeCamera()" style="
                    background: rgba(0, 0, 0, 0.5);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                ">×</button>
                <button onclick="takePhoto()" style="
                    background: rgba(0, 0, 0, 0.5);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                ">📸</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(cameraOverlay);
}

// 关闭相机界面
function closeCamera() {
    const cameraOverlay = document.querySelector('.camera-overlay');
    if (cameraOverlay) {
        cameraOverlay.remove();
    }
}

// 拍照
function takePhoto() {
    alert('Photo taken!');
    closeCamera();
}

// 生成随机 POI 名称
function generatePOIName(type) {
    const names = POI_NAMES[type];
    return names[Math.floor(Math.random() * names.length)];
}

function generatePOIsInPolygon(polygon, count = 6) {
    const pois = [];
    let attempts = 0;
    const maxAttempts = count * 100; // 增加最大尝试次数

    // 从GeoJSON中提取多边形坐标
    const coordinates = polygon.geometry.coordinates[0];
    
    // 计算边界
    const bounds = {
        minLng: Math.min(...coordinates.map(coord => coord[0])),
        maxLng: Math.max(...coordinates.map(coord => coord[0])),
        minLat: Math.min(...coordinates.map(coord => coord[1])),
        maxLat: Math.max(...coordinates.map(coord => coord[1]))
    };

    // 计算多边形中心点
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;

    while (pois.length < count && attempts < maxAttempts) {
        attempts++;
        
        // 使用极坐标方式生成点，这样可以更均匀地分布
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random();
        const dx = (bounds.maxLng - bounds.minLng) * r * Math.cos(angle) / 2;
        const dy = (bounds.maxLat - bounds.minLat) * r * Math.sin(angle) / 2;
        
        const randomLng = centerLng + dx;
        const randomLat = centerLat + dy;
        
        if (isPointInPolygon([randomLng, randomLat], coordinates)) {
            // 检查与其他点的最小距离
            const minDistance = 0.0002; // 约20米
            const isFarEnough = pois.every(poi => {
                const dx = poi.coordinates[0] - randomLng;
                const dy = poi.coordinates[1] - randomLat;
                return Math.sqrt(dx * dx + dy * dy) > minDistance;
            });
            
            if (isFarEnough) {
                const randomType = POI_TYPES[Math.floor(Math.random() * POI_TYPES.length)];
                pois.push({
                    type: randomType,
                    name: generatePOIName(randomType),
                    coordinates: [randomLng, randomLat],
                    rating: (Math.random() * 2 + 3).toFixed(1), // 3.0-5.0
                    reviews: Math.floor(Math.random() * 200) + 50, // 50-250
                    description: generatePOIDescription(randomType),
                    image: `images/poi/${Math.floor(Math.random() * 18) + 1}.png`
                });
            }
        }
    }

    console.log(`Generated ${pois.length} POIs after ${attempts} attempts`);
    return pois;
}

function createCustomMarker(type) {
    const marker = document.createElement('div');
    marker.className = 'poi-marker';
    
    // 根据 POI 类型设置不同的图标
    const icon = document.createElement('i');
    icon.className = 'fas';
    
    switch(type) {
        case 'restaurant':
            icon.classList.add('fa-utensils');
            break;
        case 'cafe':
            icon.classList.add('fa-coffee');
            break;
        case 'bar':
            icon.classList.add('fa-glass-martini-alt');
            break;
        case 'shop':
            icon.classList.add('fa-shopping-bag');
            break;
        case 'attraction':
            icon.classList.add('fa-camera');
            break;
        default:
            icon.classList.add('fa-map-marker-alt');
    }
    
    marker.appendChild(icon);
    return marker;
}

function createActionButtons() {
    const container = document.createElement('div');
    container.className = 'button-container';
    
    // Circle Explore button
    const exploreButton = document.createElement('button');
    exploreButton.className = 'map-button';
    exploreButton.id = 'circle-explore';
    exploreButton.innerHTML = `
        <img src="images/icons/explore.png" alt="Explore">
        <span class="text">Circle Explore</span>
    `;
    
    // Swipe Filter button
    const filterButton = document.createElement('button');
    filterButton.className = 'map-button';
    filterButton.id = 'swipe-filter';
    filterButton.innerHTML = `
        <img src="images/icons/filter.png" alt="Filter">
        <span class="text">Swipe Filter</span>
    `;
    
    // Personalize button
    const personalizeButton = document.createElement('button');
    personalizeButton.className = 'map-button';
    personalizeButton.id = 'personalize';
    personalizeButton.innerHTML = `
        <div class="avatar-container">
            <img src="images/icons/personalize.png" alt="Personalize">
            <div class="avatar-ray"></div>
        </div>
        <span class="text">Customization</span>
    `;
    
    // Tap & Hold button
    const tapHoldButton = document.createElement('button');
    tapHoldButton.className = 'map-button';
    tapHoldButton.id = 'tap-hold';
    tapHoldButton.innerHTML = `
        <img src="images/icons/tap.png" alt="Tap">
        <span class="text">Tap & Hold</span>
    `;
    
    container.appendChild(exploreButton);
    container.appendChild(filterButton);
    container.appendChild(personalizeButton);
    container.appendChild(tapHoldButton);
    
    document.body.appendChild(container);
    
    return {
        exploreButton,
        filterButton,
        personalizeButton,
        tapHoldButton
    };
} 