// 模拟浏览器环境
const mockDocument = {
    createElement: () => ({
        style: {},
        addEventListener: () => {},
        remove: () => {},
        removeEventListener: () => {},
        closest: () => null,
        appendChild: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null
    }),
    getElementById: () => ({
        addEventListener: () => {},
        removeEventListener: () => {},
        style: {},
        appendChild: () => {},
        remove: () => {}
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    body: {
        appendChild: () => {}
    }
};

const mockWindow = {
    innerWidth: 1024,
    innerHeight: 768
};

// 模拟 MapLibre GL JS
const maplibregl = {
    Map: class {
        constructor() {
            this.layers = new Map();
            this.sources = new Map();
            this.markers = [];
            this.popups = [];
            this.eventListeners = new Map();
            this.dragPan = { enable: () => {}, disable: () => {}, isEnabled: () => true };
            this.scrollZoom = { enable: () => {}, disable: () => {}, isEnabled: () => true };
            this.touchZoomRotate = { enable: () => {}, disable: () => {}, isEnabled: () => true };
            this.doubleClickZoom = { enable: () => {}, disable: () => {}, isEnabled: () => true };
        }
        
        on(event, handler) {
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(handler);
        }
        
        off(event, handler) {
            if (this.eventListeners.has(event)) {
                const handlers = this.eventListeners.get(event);
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }
        
        addLayer(layer) {
            this.layers.set(layer.id, layer);
        }
        
        removeLayer(id) {
            this.layers.delete(id);
        }
        
        getLayer(id) {
            return this.layers.get(id);
        }
        
        addSource(id, source) {
            this.sources.set(id, source);
        }
        
        removeSource(id) {
            this.sources.delete(id);
        }
        
        getSource(id) {
            return this.sources.get(id);
        }
        
        getBounds() {
            return {
                _sw: { lng: 103.6, lat: 1.2 },
                _ne: { lng: 104.0, lat: 1.4 }
            };
        }
        
        flyTo(options) {}
        
        loadImage(url, callback) {
            callback(null, { width: 32, height: 32 });
        }
        
        hasImage() { return false; }
        addImage() {}
    },
    
    Marker: class {
        constructor(options) {
            this.element = options.element;
            this.lngLat = null;
        }
        
        setLngLat(lngLat) {
            this.lngLat = lngLat;
            return this;
        }
        
        addTo(map) {
            map.markers.push(this);
        }
        
        remove() {
            const index = this.map.markers.indexOf(this);
            if (index > -1) {
                this.map.markers.splice(index, 1);
            }
        }
    },
    
    Popup: class {
        constructor(options) {
            this.options = options;
            this.lngLat = null;
            this.content = null;
        }
        
        setLngLat(lngLat) {
            this.lngLat = lngLat;
            return this;
        }
        
        setHTML(html) {
            this.content = html;
            return this;
        }
        
        addTo(map) {
            map.popups.push(this);
        }
        
        remove() {
            const index = this.map.popups.indexOf(this);
            if (index > -1) {
                this.map.popups.splice(index, 1);
            }
        }
        
        getElement() {
            return mockDocument.createElement();
        }
    }
};

// 创建全局 map 实例
const map = new maplibregl.Map();

// 测试数据
const mockEvents = [
    {
        title: "新加坡美食节",
        type: "美食",
        image: "images/event1.png",
        time: "5月1日 12:00",
        location: [103.8, 1.3],
        isOngoing: true
    },
    {
        title: "滨海湾音乐节",
        type: "音乐",
        image: "images/event2.png",
        time: "5月2日 19:00",
        location: [103.7, 1.35],
        isOngoing: false
    }
];

// 测试用例
function runTests() {
    console.log('开始运行测试...');
    
    // 1. 测试圈选探索功能
    testCircleExplore();
    
    // 2. 测试长按交互功能
    testLongPress();
    
    // 3. 测试滑动筛选功能
    testSwipeFilter();
    
    // 4. 测试路线绘制功能
    testRouteDrawing();
    
    // 5. 测试热门功能
    testTrendingFeature();
    
    // 6. 测试刷新功能
    testRefreshFeature();
    
    console.log('所有测试完成！');
}

// 1. 测试圈选探索功能
function testCircleExplore() {
    console.log('测试圈选探索功能...');
    
    // 模拟点击事件
    const clickEvent = {
        lngLat: { lng: 103.8, lat: 1.3 },
        point: { x: 100, y: 100 }
    };
    
    // 触发点击事件
    map.eventListeners.get('click').forEach(handler => handler(clickEvent));
    
    // 验证多边形是否创建
    const hasPolygon = map.getLayer('polygon') !== undefined;
    console.assert(hasPolygon, '圈选探索：多边形创建失败');
    
    // 验证顶点标记是否创建
    const hasVertexMarkers = map.markers.length > 0;
    console.assert(hasVertexMarkers, '圈选探索：顶点标记创建失败');
}

// 2. 测试长按交互功能
function testLongPress() {
    console.log('测试长按交互功能...');
    
    // 模拟长按事件
    const touchEvent = {
        originalEvent: {
            touches: [{ clientX: 100, clientY: 100 }]
        },
        lngLat: { lng: 103.8, lat: 1.3 },
        point: { x: 100, y: 100 }
    };
    
    // 触发长按事件
    map.eventListeners.get('touchstart').forEach(handler => handler(touchEvent));
    
    // 等待长按触发
    setTimeout(() => {
        // 验证操作菜单是否显示
        const hasActionMenu = document.querySelector('.action-menu-popup') !== null;
        console.assert(hasActionMenu, '长按交互：操作菜单显示失败');
    }, 600);
}

// 3. 测试滑动筛选功能
function testSwipeFilter() {
    console.log('测试滑动筛选功能...');
    
    // 模拟滑动筛选按钮点击
    const swipeFilterButton = document.getElementById('swipe-filter');
    swipeFilterButton.click();
    
    // 验证类型选择器是否显示
    const hasTypeSelector = document.querySelector('.type-selector') !== null;
    console.assert(hasTypeSelector, '滑动筛选：类型选择器显示失败');
    
    // 验证POI是否生成
    const hasPoiMarkers = map.markers.length > 0;
    console.assert(hasPoiMarkers, '滑动筛选：POI标记生成失败');
}

// 4. 测试路线绘制功能
function testRouteDrawing() {
    console.log('测试路线绘制功能...');
    
    // 模拟路线绘制按钮点击
    const sketchRouteButton = document.getElementById('sketch-route');
    sketchRouteButton.click();
    
    // 模拟起点点击
    const startClickEvent = {
        lngLat: { lng: 103.8, lat: 1.3 },
        point: { x: 100, y: 100 }
    };
    
    // 模拟终点点击
    const endClickEvent = {
        lngLat: { lng: 103.9, lat: 1.35 },
        point: { x: 200, y: 200 }
    };
    
    // 触发起点点击
    map.eventListeners.get('click').forEach(handler => handler(startClickEvent));
    
    // 触发终点点击
    map.eventListeners.get('click').forEach(handler => handler(endClickEvent));
    
    // 验证路线是否创建
    const hasRoute = map.getLayer('route') !== undefined;
    console.assert(hasRoute, '路线绘制：路线创建失败');
    
    // 验证起点和终点标记是否创建
    const hasStartEndMarkers = map.markers.length >= 2;
    console.assert(hasStartEndMarkers, '路线绘制：起终点标记创建失败');
}

// 5. 测试热门功能
function testTrendingFeature() {
    console.log('测试热门功能...');
    
    // 模拟热门按钮点击
    const trendingButton = document.getElementById('trending');
    trendingButton.click();
    
    // 验证热力图是否创建
    const hasHeatmap = map.getLayer('heatmap') !== undefined;
    console.assert(hasHeatmap, '热门功能：热力图创建失败');
    
    // 验证活动信息气泡是否创建
    const hasEventPopups = map.popups.length > 0;
    console.assert(hasEventPopups, '热门功能：活动信息气泡创建失败');
    
    // 测试重复点击
    trendingButton.click();
    
    // 验证热力图和活动信息气泡是否保持不变
    const hasHeatmapAfterSecondClick = map.getLayer('heatmap') !== undefined;
    const hasEventPopupsAfterSecondClick = map.popups.length > 0;
    console.assert(hasHeatmapAfterSecondClick && hasEventPopupsAfterSecondClick, 
        '热门功能：重复点击后热力图和活动信息气泡状态异常');
}

// 6. 测试刷新功能
function testRefreshFeature() {
    console.log('测试刷新功能...');
    
    // 模拟刷新按钮点击
    const refreshButton = document.querySelector('.refresh-button');
    refreshButton.click();
    
    // 验证热力图是否清除
    const hasHeatmap = map.getLayer('heatmap') !== undefined;
    console.assert(!hasHeatmap, '刷新功能：热力图清除失败');
    
    // 验证活动信息气泡是否清除
    const hasEventPopups = map.popups.length > 0;
    console.assert(!hasEventPopups, '刷新功能：活动信息气泡清除失败');
    
    // 验证其他图层是否清除
    const hasOtherLayers = map.layers.size > 0;
    console.assert(!hasOtherLayers, '刷新功能：其他图层清除失败');
}

// 运行测试
runTests(); 