import React, { useState, useEffect } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  List,
  Tag,
  Button,
  Progress,
  Space,
  Badge,
  Tooltip,
  Avatar,
} from 'antd';
import {
  CarOutlined,
  UnorderedListOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  RiseOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import AgvMap from '../../components/Map/AgvMap';
import { useAgvStore } from '../../store/agvStore';
import { useTaskStore } from '../../store/taskStore';
import { useExceptionStore } from '../../store/exceptionStore';
import { useChargingStore } from '../../store/chargingStore';
import { useTrafficStore } from '../../store/trafficStore';
import { useNavigate } from 'react-router-dom';
import type { ExceptionLevel } from '../../types/exception';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { agvList, getAgvStats, getAgvById } = useAgvStore();
  const { taskList, getTaskStats, getTodayTrendStats, getTaskTypeStats, getTodayTotalWeight } = useTaskStore();
  const { exceptionList, getExceptionStats } = useExceptionStore();
  const { getChargingStats } = useChargingStore();
  const { getTrafficStats } = useTrafficStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const agvStats = getAgvStats();
  const taskStats = getTaskStats();
  const exceptionStats = getExceptionStats();
  const chargingStats = getChargingStats();
  const trafficStats = getTrafficStats();

  const runningAgvs = agvList.filter((a) => a.status === 'running');
  const pendingExceptions = exceptionList.filter((e) => e.status !== 'resolved');
  const recentTasks = [...taskList]
    .sort((a, b) => {
      const timeA = new Date(a.endTime || a.startTime || a.createTime).getTime();
      const timeB = new Date(b.endTime || b.startTime || b.createTime).getTime();
      return timeB - timeA;
    })
    .slice(0, 5);

  const todayTotalWeight = Number(getTodayTotalWeight().toFixed(1));
  const trendStats = getTodayTrendStats();
  const typeStats = getTaskTypeStats();

  const levelMap: Record<ExceptionLevel, { text: string; color: string }> = {
    critical: { text: '严重', color: 'red' },
    warning: { text: '警告', color: 'orange' },
    info: { text: '提示', color: 'blue' },
  };

  const taskTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendStats.timeLabels,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: '完成任务数',
        type: 'line',
        smooth: true,
        data: trendStats.completedCounts,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: '搬运量(吨)',
        type: 'line',
        smooth: true,
        data: trendStats.weightTotals.map((v) => Number(v.toFixed(1))),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.5)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
            ],
          },
        },
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' },
      },
    ],
    legend: {
      data: ['完成任务数', '搬运量(吨)'],
      textStyle: { color: '#94a3b8' },
      top: 0,
    },
  };

  const taskTypeOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: typeStats.typeLabels,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: '任务数',
        type: 'bar',
        barWidth: '40%',
        data: typeStats.typeCounts.map((value, idx) => ({
          value,
          itemStyle: { color: ['#3b82f6', '#10b981', '#f59e0b'][idx] },
        })),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  const agvStatusOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#94a3b8' },
    },
    series: [
      {
        name: 'AGV状态',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 18,
            fontWeight: 'bold',
            color: '#e2e8f0',
          },
        },
        labelLine: { show: false },
        data: [
          { value: agvStats.running, name: '运行中', itemStyle: { color: '#10b981' } },
          { value: agvStats.idle, name: '待机', itemStyle: { color: '#3b82f6' } },
          { value: agvStats.charging, name: '充电中', itemStyle: { color: '#f59e0b' } },
          { value: agvStats.fault, name: '故障', itemStyle: { color: '#ef4444' } },
          { value: agvStats.maintenance, name: '维护中', itemStyle: { color: '#6b7280' } },
        ],
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">运行监控看板</h2>
          <p className="text-sm text-gray-500 mt-1">
            实时监控全厂AGV运行状态
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-gray-800">
            {currentTime.toLocaleTimeString('zh-CN', { hour12: false })}
          </div>
          <div className="text-sm text-gray-500">
            {currentTime.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </div>
        </div>
      </div>

      <Row gutter={16}>
        <Col span={4}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/agv-ledger')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">AGV总数</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {agvStats.total}
                  <span className="text-sm font-normal text-gray-500 ml-1">辆</span>
                </p>
                <p className="text-xs text-green-500 mt-2 flex items-center">
                  <PlayCircleOutlined />
                  <span className="ml-1">{agvStats.running} 辆运行中</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CarOutlined className="text-2xl text-blue-500" />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/task-dispatch')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日任务</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {taskStats.total}
                  <span className="text-sm font-normal text-gray-500 ml-1">单</span>
                </p>
                <p className="text-xs text-green-500 mt-2 flex items-center">
                  <CheckCircleOutlined />
                  <span className="ml-1">已完成 {taskStats.completed} 单</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UnorderedListOutlined className="text-2xl text-green-500" />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/charging')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">充电站</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {chargingStats.totalStations}
                  <span className="text-sm font-normal text-gray-500 ml-1">个</span>
                </p>
                <p className="text-xs text-yellow-500 mt-2 flex items-center">
                  <ThunderboltOutlined />
                  <span className="ml-1">{chargingStats.chargingCount} 个充电中</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ThunderboltOutlined className="text-2xl text-yellow-500" />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/traffic-control')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">路口通行</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {trafficStats.totalPassCount}
                  <span className="text-sm font-normal text-gray-500 ml-1">次</span>
                </p>
                <p className="text-xs text-blue-500 mt-2 flex items-center">
                  <SafetyOutlined />
                  <span className="ml-1">{trafficStats.passable} 个正常</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <SafetyOutlined className="text-2xl text-purple-500" />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/exception')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待处理异常</p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {exceptionStats.pending + exceptionStats.processing}
                  <span className="text-sm font-normal text-gray-500 ml-1">条</span>
                </p>
                <p className="text-xs text-red-500 mt-2 flex items-center">
                  <ExclamationCircleOutlined />
                  <span className="ml-1">{exceptionStats.critical} 条严重</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <WarningOutlined className="text-2xl text-red-500" />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日搬运量</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {todayTotalWeight}
                  <span className="text-sm font-normal text-gray-500 ml-1">吨</span>
                </p>
                <p className="text-xs text-green-500 mt-2 flex items-center">
                  <ArrowUpOutlined />
                  <span className="ml-1">今日实时数据</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <RiseOutlined className="text-2xl text-indigo-500" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <BarChartOutlined className="text-blue-500" />
                实时地图监控
              </span>
            }
            extra={
              <Space>
                <Tag color="green">
                  <PlayCircleOutlined /> 运行: {agvStats.running}
                </Tag>
                <Tag color="blue">
                  <ClockCircleOutlined /> 待机: {agvStats.idle}
                </Tag>
                <Tag color="orange">
                  <ThunderboltOutlined /> 充电: {agvStats.charging}
                </Tag>
                <Tag color="red">
                  <WarningOutlined /> 故障: {agvStats.fault}
                </Tag>
              </Space>
            }
          >
            <AgvMap height={400} />
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <WarningOutlined className="text-red-500" />
                实时告警
                {pendingExceptions.length > 0 && (
                  <Badge count={pendingExceptions.length} size="small" />
                )}
              </span>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/exception')}>
                查看全部
              </Button>
            }
            className="h-full"
          >
            {pendingExceptions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircleOutlined className="text-4xl mb-3" />
                <p>暂无待处理告警</p>
              </div>
            ) : (
              <List
                dataSource={pendingExceptions.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer -mx-3 px-3"
                    onClick={() => navigate('/exception')}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.level === 'critical' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          <WarningOutlined className={item.level === 'critical' ? 'text-red-500' : 'text-yellow-500'} />
                        </div>
                      }
                      title={
                        <span className="flex items-center gap-2">
                          <Tag color={levelMap[item.level].color}>
                            {levelMap[item.level].text}
                          </Tag>
                          <span className="text-sm font-medium">{item.agvId}</span>
                        </span>
                      }
                      description={
                        <div>
                          <p className="text-sm text-gray-600 truncate">{item.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{item.happenTime}</p>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={10}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <BarChartOutlined className="text-green-500" />
                任务与搬运量趋势
              </span>
            }
          >
            <ReactECharts
              option={taskTrendOption}
              style={{ height: 280 }}
              theme="dark"
            />
          </Card>
        </Col>

        <Col span={7}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <CarOutlined className="text-blue-500" />
                AGV状态分布
              </span>
            }
          >
            <ReactECharts
              option={agvStatusOption}
              style={{ height: 280 }}
              theme="dark"
            />
          </Card>
        </Col>

        <Col span={7}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <UnorderedListOutlined className="text-purple-500" />
                任务类型统计
              </span>
            }
          >
            <ReactECharts
              option={taskTypeOption}
              style={{ height: 280 }}
              theme="dark"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <UnorderedListOutlined className="text-blue-500" />
                最新任务
              </span>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/task-dispatch')}>
                查看全部
              </Button>
            }
          >
            <List
              dataSource={recentTasks}
              renderItem={(item) => (
                <List.Item className="border-b border-gray-100 hover:bg-gray-50 -mx-3 px-3">
                  <List.Item.Meta
                    title={
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        <Tag color={item.status === 'completed' ? 'green' : item.status === 'executing' ? 'blue' : item.status === 'exception' ? 'red' : 'default'}>
                          {item.status === 'pending' ? '待派发' :
                           item.status === 'assigned' ? '已派发' :
                           item.status === 'executing' ? '执行中' :
                           item.status === 'completed' ? '已完成' : '异常'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>
                          {item.startPoint} → {item.endPoint}
                        </span>
                        <span>{item.cargo} · {item.weight}kg</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <CarOutlined className="text-green-500" />
                运行中的AGV
              </span>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/agv-ledger')}>
                查看全部
              </Button>
            }
          >
            {runningAgvs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CarOutlined className="text-3xl mb-2" />
                <p>暂无运行中的AGV</p>
              </div>
            ) : (
              <List
                dataSource={runningAgvs}
                renderItem={(agv) => (
                  <List.Item className="border-b border-gray-100 hover:bg-gray-50 -mx-3 px-3">
                    <List.Item.Meta
                      avatar={
                        <div className="relative">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CarOutlined className="text-green-500 text-lg" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
                        </div>
                      }
                      title={
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{agv.name}</span>
                          <span className="text-xs text-gray-500 font-mono">
                            {agv.id}
                          </span>
                        </div>
                      }
                      description={
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">电量</span>
                            <Progress percent={agv.battery} size="small" style={{ width: 100 }} />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">载重</span>
                            <span className="font-mono">{agv.load}/{agv.maxLoad} kg</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">速度</span>
                            <span className="font-mono">{agv.speed} m/s</span>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
