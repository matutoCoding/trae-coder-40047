## 1. 架构设计

本系统为前端单页应用（SPA）架构，采用React框架构建，数据采用Mock数据模拟后端服务。系统整体采用组件化设计，状态管理使用React Context和Hooks，UI组件库使用Ant Design，图表使用ECharts，地图使用SVG自定义绘制。

```mermaid
graph TD
    A["应用入口 App"] --> B["路由管理 React Router"]
    B --> C["布局组件 Layout"]
    C --> D["侧边栏导航"]
    C --> E["内容区域"]
    E --> F["运行看板模块"]
    E --> G["AGV台账模块"]
    E --> H["任务派发模块"]
    E --> I["路径规划模块"]
    E --> J["交通管制模块"]
    E --> K["充电调度模块"]
    E --> L["异常处理模块"]
    M["全局状态管理 Context"] --> F
    M --> G
    M --> H
    M --> I
    M --> J
    M --> K
    M --> L
    N["Mock数据服务"] --> M
    O["工具函数库"] --> F
    O --> G
    O --> H
    O --> I
    O --> J
    O --> K
    O --> L
```

## 2. 技术描述

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5
- **UI组件库**：Ant Design@5
- **图标库**：@ant-design/icons
- **状态管理**：React Context + useReducer
- **图表库**：ECharts@5 + echarts-for-react
- **样式方案**：Tailwind CSS@3 + CSS Modules
- **路由管理**：React Router@6
- **日期处理**：dayjs
- **数据模拟**：Mock.js + 本地JSON数据
- **代码规范**：ESLint + Prettier

## 3. 路由定义

| 路由路径 | 页面名称 | 功能描述 |
|----------|----------|----------|
| /dashboard | 运行看板 | 系统首页，展示实时运行状态、AGV分布、任务统计、告警信息、搬运量统计 |
| /agv-ledger | AGV台账 | AGV车辆列表、车辆详情、新增/编辑/删除车辆 |
| /task-dispatch | 任务派发 | 搬运任务列表、新建任务、任务派发、任务进度跟踪、货物到位确认 |
| /path-planning | 路径规划 | 地图展示、最优路径规划、路径可视化、路径保存 |
| /traffic-control | 交通管制 | 路口状态监控、管制规则配置、多车避让调度 |
| /charging | 充电调度 | 电量监控、自动充电调度、充电站管理、充电记录 |
| /exception | 异常处理 | 异常列表、急停告警、卡死处理、故障记录与统计 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    AGV ||--o{ TASK : "执行"
    AGV ||--o{ CHARGE_RECORD : "产生"
    AGV ||--o{ EXCEPTION : "产生"
    TASK ||--o{ PATH : "使用"
    TASK ||--o{ EXCEPTION : "关联"
    CHARGING_STATION ||--o{ CHARGE_RECORD : "产生"
    INTERSECTION ||--o{ TRAFFIC_RULE : "配置"

    AGV {
        string id PK "车辆ID"
        string name "车辆名称"
        string model "型号"
        number battery "当前电量"
        number maxBattery "最大电量"
        string status "状态：运行/待机/充电/故障"
        number x "X坐标"
        number y "Y坐标"
        number speed "速度"
        number load "载重"
        number maxLoad "最大载重"
        string currentTaskId "当前任务ID"
        date lastMaintenance "上次维护时间"
        date createTime "创建时间"
    }

    TASK {
        string id PK "任务ID"
        string name "任务名称"
        string type "任务类型：搬运/补货/盘点"
        string startPoint "起点"
        string endPoint "终点"
        string cargo "货物名称"
        number weight "货物重量"
        string status "状态：待派发/执行中/已完成/异常"
        string agvId FK "执行AGV ID"
        string pathId FK "路径ID"
        date createTime "创建时间"
        date startTime "开始时间"
        date endTime "结束时间"
        string priority "优先级：高/中/低"
    }

    PATH {
        string id PK "路径ID"
        string name "路径名称"
        string startPoint "起点"
        string endPoint "终点"
        number distance "距离"
        number estimatedTime "预计时间"
        array waypoints "路径点数组"
        string type "类型：最短/最快/备用"
    }

    CHARGING_STATION {
        string id PK "充电站ID"
        string name "充电站名称"
        number x "X坐标"
        number y "Y坐标"
        string status "状态：空闲/占用/维护"
        number power "充电功率"
    }

    CHARGE_RECORD {
        string id PK "记录ID"
        string agvId FK "AGV ID"
        string stationId FK "充电站ID"
        date startTime "开始时间"
        date endTime "结束时间"
        number startBattery "起始电量"
        number endBattery "结束电量"
        number chargedAmount "充电量"
    }

    EXCEPTION {
        string id PK "异常ID"
        string agvId FK "AGV ID"
        string taskId FK "任务ID"
        string type "类型：急停/卡死/低电量/故障"
        string level "级别：严重/警告/提示"
        string description "异常描述"
        date happenTime "发生时间"
        date handleTime "处理时间"
        string handler "处理人"
        string handleResult "处理结果"
        string status "状态：待处理/处理中/已解决"
    }

    INTERSECTION {
        string id PK "路口ID"
        string name "路口名称"
        number x "X坐标"
        number y "Y坐标"
        string status "状态：通行/管制/维护"
        number passCount "今日通行次数"
    }

    TRAFFIC_RULE {
        string id PK "规则ID"
        string intersectionId FK "路口ID"
        string type "规则类型：让行/限速/禁行"
        string description "规则描述"
        boolean enabled "是否启用"
    }
```

### 4.2 状态枚举值

**AGV状态 (status):**
- `running` - 运行中
- `idle` - 待机
- `charging` - 充电中
- `fault` - 故障
- `maintenance` - 维护中

**任务状态 (status):**
- `pending` - 待派发
- `assigned` - 已派发
- `executing` - 执行中
- `completed` - 已完成
- `exception` - 异常

**异常类型 (type):**
- `estop` - 急停
- `stuck` - 卡死
- `low_battery` - 低电量
- `fault` - 故障
- `collision` - 碰撞

**异常级别 (level):**
- `critical` - 严重
- `warning` - 警告
- `info` - 提示

## 5. 模块划分

### 5.1 目录结构

```
src/
├── assets/           # 静态资源
├── components/       # 通用组件
│   ├── Layout/       # 布局组件
│   ├── Charts/       # 图表组件
│   ├── Map/          # 地图组件
│   └── common/       # 通用UI组件
├── pages/            # 页面组件
│   ├── Dashboard/    # 运行看板
│   ├── AgvLedger/    # AGV台账
│   ├── TaskDispatch/ # 任务派发
│   ├── PathPlanning/ # 路径规划
│   ├── TrafficControl/ # 交通管制
│   ├── Charging/     # 充电调度
│   └── Exception/    # 异常处理
├── store/            # 状态管理
│   ├── AgvContext.tsx
│   ├── TaskContext.tsx
│   ├── SystemContext.tsx
│   └── index.tsx
├── mock/             # Mock数据
│   ├── agv.ts
│   ├── task.ts
│   ├── path.ts
│   ├── charging.ts
│   ├── exception.ts
│   └── traffic.ts
├── utils/            # 工具函数
│   ├── pathfinding.ts # 路径规划算法
│   ├── traffic.ts    # 交通管制算法
│   ├── charging.ts   # 充电调度算法
│   └── common.ts
├── types/            # TypeScript类型定义
│   ├── agv.ts
│   ├── task.ts
│   ├── path.ts
│   ├── charging.ts
│   ├── exception.ts
│   └── traffic.ts
├── hooks/            # 自定义Hooks
├── App.tsx
├── main.tsx
└── index.css
```

### 5.2 核心算法模块

**路径规划算法 (pathfinding.ts):**
- A*算法实现最优路径搜索
- 支持多目标点路径优化
- 考虑避障和交通管制的动态路径调整

**交通管制算法 (traffic.ts):**
- 路口通行权调度
- 多车避让策略
- 死锁检测与解除

**充电调度算法 (charging.ts):**
- 低电量预警
- 充电站自动分配
- 充电优先级排序

## 6. 性能与优化

- 使用 React.memo 优化组件渲染性能
- 大数据量列表使用虚拟滚动
- 地图渲染使用Canvas/SVG按需更新
- 实时数据采用定时轮询+增量更新
- 使用React Router懒加载减少首屏加载时间
- ECharts图表使用按需引入减小包体积
