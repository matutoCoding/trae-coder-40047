import React, { useState, useMemo } from 'react';
import {
  Card,
  Select,
  Button,
  Space,
  List,
  Tag,
  Input,
  Form,
  Modal,
  message,
  Statistic,
  Row,
  Col,
  Tooltip,
  Progress,
  Alert,
  Badge,
} from 'antd';
import {
  EnvironmentOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  SwapOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  CarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import AgvMap from '../../components/Map/AgvMap';
import { mockPathList, mapPoints } from '../../mock/path';
import type { Path, PathType, Waypoint, MapPoint } from '../../types/path';
import type { Task } from '../../types/task';
import type { AGV } from '../../types/agv';
import { useAgvStore } from '../../store/agvStore';
import { useTaskStore } from '../../store/taskStore';
import { useTrafficStore } from '../../store/trafficStore';

const { Option } = Select;

const locationOptions = mapPoints
  .filter((p) => p.type !== 'intersection')
  .map((p) => ({
    label: p.name,
    value: p.name,
    x: p.x,
    y: p.y,
    type: p.type,
  }));

const PathPlanning: React.FC = () => {
  const { agvList, getAgvById } = useAgvStore();
  const { taskList, assignPath, getPathHistory } = useTaskStore();
  const { intersections } = useTrafficStore();
  const [startPoint, setStartPoint] = useState<string>('原料仓库A');
  const [endPoint, setEndPoint] = useState<string>('炼钢车间1号');
  const [pathType, setPathType] = useState<PathType>('shortest');
  const [savedPaths, setSavedPaths] = useState<Path[]>(mockPathList);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [assignPathModalVisible, setAssignPathModalVisible] = useState(false);
  const [selectedPathForAssign, setSelectedPathForAssign] = useState<Path | null>(null);
  const [form] = Form.useForm();
  const [avoidCongestion, setAvoidCongestion] = useState(false);
  const [pathStatsModalVisible, setPathStatsModalVisible] = useState(false);
  const [selectedPathForStats, setSelectedPathForStats] = useState<Path | null>(null);
  const [selectedPathStability, setSelectedPathStability] = useState<{
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    gradeColor: string;
    suggestion: string;
  } | null>(null);

  const congestedIntersections = intersections.filter((i) => i.status === 'controlled');
  const hasCongestion = congestedIntersections.length > 0;

  const findPointByName = (name: string) => {
    return mapPoints.find((p) => p.name === name);
  };

  const calculateDistance = (p1: Waypoint, p2: Waypoint) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const estimateRemainingTime = (agv: AGV, path?: Path): number => {
    if (!path || agv.status !== 'running') return 0;
    const avgSpeed = 1.5;
    const remainingDist = Math.max(50, path.distance * 0.4);
    return Math.round(remainingDist / avgSpeed / 60);
  };

  const getAgvsOnPath = (path: Path) => {
    return agvList.filter(
      (agv) =>
        agv.status === 'running' &&
        taskList.some(
          (t) => t.agvId === agv.id && (t.pathId === path.id ||
            (t.startPoint === path.startPoint && t.endPoint === path.endPoint))
        )
    );
  };

  const generatePath = useMemo(() => {
    const start = findPointByName(startPoint);
    const end = findPointByName(endPoint);

    if (!start || !end) return null;

    const waypoints: Waypoint[] = [];

    waypoints.push({ x: start.x, y: start.y, name: start.name });

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const hasAvoidableCongestion = avoidCongestion && hasCongestion;

    if (pathType === 'shortest' && !hasAvoidableCongestion) {
      waypoints.push({ x: start.x, y: midY });
      waypoints.push({ x: end.x, y: midY });
    } else if (pathType === 'fastest' && !hasAvoidableCongestion) {
      waypoints.push({ x: midX, y: start.y });
      waypoints.push({ x: midX, y: end.y });
    } else if (hasAvoidableCongestion) {
      waypoints.push({ x: start.x, y: start.y - 60 });
      waypoints.push({ x: end.x + 60, y: start.y - 60 });
      waypoints.push({ x: end.x + 60, y: end.y });
    } else {
      waypoints.push({ x: start.x, y: start.y - 50 });
      waypoints.push({ x: end.x + 50, y: start.y - 50 });
      waypoints.push({ x: end.x + 50, y: end.y });
    }

    waypoints.push({ x: end.x, y: end.y, name: end.name });

    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
    }

    const estimatedTime = Math.round(totalDistance / 1.5 / 60);

    return {
      waypoints,
      distance: Math.round(totalDistance),
      estimatedTime: hasAvoidableCongestion ? estimatedTime + 2 : estimatedTime,
    };
  }, [startPoint, endPoint, pathType, avoidCongestion, hasCongestion]);

  const handleSwap = () => {
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
  };

  const handleSave = () => {
    if (!generatePath) return;
    setSaveModalVisible(true);
  };

  const handleConfirmSave = () => {
    form.validateFields().then((values) => {
      if (!generatePath) return;

      const newPath: Path = {
        id: `PATH-${String(savedPaths.length + 1).padStart(3, '0')}`,
        name: values.name,
        startPoint,
        endPoint,
        distance: generatePath.distance,
        estimatedTime: generatePath.estimatedTime,
        waypoints: generatePath.waypoints,
        type: pathType,
        createTime: new Date().toISOString().split('T')[0],
      };

      setSavedPaths([...savedPaths, newPath]);
      message.success('路径保存成功');
      setSaveModalVisible(false);
      form.resetFields();
    });
  };

  const handleSelectPath = (path: Path) => {
    setSelectedPath(path);
    setStartPoint(path.startPoint);
    setEndPoint(path.endPoint);
    setPathType(path.type);
    const stats = getPathHistory(path);
    const stability = calculateStabilityScore(stats);
    setSelectedPathStability(stability);
    message.success(
      `已选择路径: ${path.name} · 稳定性评分: ${stability.score}分 ${stability.grade}级`
    );
  };

  const handleUsePath = (path: Path) => {
    setSelectedPath(path);
    message.success(`已选择路径: ${path.name}`);
  };

  const handleOpenAssignPath = (path: Path) => {
    setSelectedPathForAssign(path);
    setAssignPathModalVisible(true);
  };

  const handleConfirmAssignPath = (taskId: string) => {
    if (selectedPathForAssign) {
      assignPath(taskId, selectedPathForAssign.id);
      message.success(`已将路径 ${selectedPathForAssign.name} 分配给任务 ${taskId}`);
      setAssignPathModalVisible(false);
    }
  };

  const pathTypeOptions = [
    { value: 'shortest', label: '最短路径', icon: <LineChartOutlined /> },
    { value: 'fastest', label: '最快路径', icon: <ThunderboltOutlined /> },
    { value: 'alternative', label: '备用路径', icon: <SwapOutlined /> },
  ];

  const pendingOrExecutingTasks = taskList.filter(
    (t) => t.status === 'pending' || t.status === 'assigned' || t.status === 'executing'
  );

  const calculateStabilityScore = (stats: {
    passCount: number;
    avgTime: number;
    congestionEvents: number;
  }) => {
    const passScore = Math.min(100, (stats.passCount / 50) * 100);
    const maxExpectedTime = 30;
    const timeScore = Math.max(0, 100 - ((stats.avgTime - 5) / maxExpectedTime) * 100);
    const congestionScore = Math.max(0, 100 - stats.congestionEvents * 25);
    const totalScore = Math.round(passScore * 0.4 + timeScore * 0.35 + congestionScore * 0.25);
    const clampedScore = Math.max(0, Math.min(100, totalScore));

    let grade: 'A' | 'B' | 'C' | 'D';
    let gradeColor: string;
    let suggestion: string;

    if (clampedScore >= 85) {
      grade = 'A';
      gradeColor = '#10B981';
      suggestion = '该路径稳定性极佳，通行频繁且准点率高，强烈推荐作为首选路线。';
    } else if (clampedScore >= 70) {
      grade = 'B';
      gradeColor = '#3B82F6';
      suggestion = '该路径稳定性良好，整体通行顺畅，适合常规作业使用。';
    } else if (clampedScore >= 50) {
      grade = 'C';
      gradeColor = '#F97316';
      suggestion = '该路径稳定性一般，高峰期可能出现拥堵，建议错峰通行或启用备用路线。';
    } else {
      grade = 'D';
      gradeColor = '#EF4444';
      suggestion = '该路径稳定性较差，拥堵绕行频繁，建议优先选择其他路径或优化调度策略。';
    }

    return { score: clampedScore, grade, gradeColor, suggestion };
  };

  const handleOpenPathStats = (path: Path) => {
    setSelectedPathForStats(path);
    setPathStatsModalVisible(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">路径规划</h2>
        {hasCongestion && (
          <Alert
            message={`当前有 ${congestedIntersections.length} 个路口拥堵`}
            type="warning"
            showIcon
            banner
            className="max-w-md"
          />
        )}
      </div>

      <Row gutter={16}>
        <Col span={5}>
          <Card>
            <Statistic
              title="已保存路径"
              value={savedPaths.length}
              prefix={<LineChartOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1E3A5F' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="占用中路径"
              value={savedPaths.filter((p) => getAgvsOnPath(p).length > 0).length}
              prefix={<CarOutlined className="text-orange-500" />}
              valueStyle={{ color: '#F97316' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="运行中AGV"
              value={agvList.filter((a) => a.status === 'running').length}
              prefix={<PlayCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="拥堵路口"
              value={congestedIntersections.length}
              prefix={<WarningOutlined className="text-red-500" />}
              valueStyle={{ color: congestedIntersections.length > 0 ? '#EF4444' : '#10B981' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="平均通过时长"
              value={Math.round(savedPaths.reduce((s, p) => s + p.estimatedTime, 0) / Math.max(1, savedPaths.length))}
              suffix="分钟"
              prefix={<ClockCircleOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ED1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card
            title="地图视图"
            className="h-full"
            extra={
              <Space>
                <Tag color="green">
                  <EnvironmentOutlined /> 起点: {startPoint}
                </Tag>
                <Tag color="red">
                  <EnvironmentOutlined /> 终点: {endPoint}
                </Tag>
                {avoidCongestion && (
                  <Tag color="orange">
                    <ReloadOutlined /> 绕行模式
                  </Tag>
                )}
              </Space>
            }
          >
            <AgvMap
              showPaths={true}
              selectedPath={generatePath?.waypoints || selectedPath?.waypoints}
              height={450}
              highlightPoint={
                startPoint
                  ? { name: startPoint, type: 'start' }
                  : endPoint
                    ? { name: endPoint, type: 'end' }
                    : null
              }
            />

            {selectedPathStability && selectedPath && (
              <div
                className="mt-4 rounded-lg p-4 flex items-center gap-4"
                style={{
                  backgroundColor: `${selectedPathStability.gradeColor}10`,
                  border: `1px solid ${selectedPathStability.gradeColor}30`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: selectedPathStability.gradeColor }}
                >
                  <div className="text-center">
                    <p className="text-xl font-bold text-white leading-none">
                      {selectedPathStability.score}
                    </p>
                    <p className="text-xs text-white opacity-90 mt-0.5">分</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold" style={{ color: selectedPathStability.gradeColor }}>
                      {selectedPath.name} · 稳定性{selectedPathStability.grade}级
                    </span>
                    <Tag
                      style={{
                        backgroundColor: selectedPathStability.gradeColor,
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      {selectedPathStability.score}分
                    </Tag>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {selectedPathStability.suggestion}
                  </p>
                </div>
                <Button
                  size="small"
                  icon={<LineChartOutlined />}
                  onClick={() => handleOpenPathStats(selectedPath)}
                >
                  查看详情
                </Button>
              </div>
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="路径规划" className="mb-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">起点</label>
                <Select
                  value={startPoint}
                  onChange={setStartPoint}
                  style={{ width: '100%' }}
                  showSearch
                  placeholder="选择起点"
                >
                  {locationOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-green-500" />
                        {opt.label}
                      </span>
                    </Option>
                  ))}
                </Select>
              </div>

              <div className="flex justify-center">
                <Button
                  shape="circle"
                  icon={<SwapOutlined rotate={90} />}
                  onClick={handleSwap}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">终点</label>
                <Select
                  value={endPoint}
                  onChange={setEndPoint}
                  style={{ width: '100%' }}
                  showSearch
                  placeholder="选择终点"
                >
                  {locationOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-red-500" />
                        {opt.label}
                      </span>
                    </Option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">路径类型</label>
                <div className="grid grid-cols-3 gap-2">
                  {pathTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPathType(opt.value as PathType)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        pathType === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{opt.icon}</div>
                      <div className="text-xs">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <WarningOutlined className={hasCongestion ? 'text-orange-500' : 'text-gray-400'} />
                  <span className="text-sm text-gray-600">
                    {hasCongestion ? '检测到路口拥堵，建议开启绕行' : '当前路口通畅'}
                  </span>
                </div>
                <Button
                  type={avoidCongestion ? 'primary' : 'default'}
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => setAvoidCongestion(!avoidCongestion)}
                >
                  {avoidCongestion ? '已开启' : '自动绕行'}
                </Button>
              </div>

              {generatePath && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">总距离</p>
                      <p className="text-xl font-bold text-blue-600">
                        {generatePath.distance} <span className="text-sm font-normal">米</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">预计时间</p>
                      <p className="text-xl font-bold text-green-600">
                        {generatePath.estimatedTime} <span className="text-sm font-normal">分钟</span>
                      </p>
                    </div>
                  </div>
                  {avoidCongestion && hasCongestion && (
                    <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                      <WarningOutlined /> 已启用绕行，增加约2分钟
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">路径节点</p>
                    <div className="flex flex-wrap gap-2">
                      {generatePath.waypoints.map((wp, idx) => (
                        <span key={idx} className="text-xs bg-white px-2 py-1 rounded border">
                          {wp.name || `途经点${idx + 1}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Space className="w-full">
                <Button type="primary" block icon={<SaveOutlined />} onClick={handleSave}>
                  保存路径
                </Button>
                <Button block icon={<PlayCircleOutlined />}>
                  模拟运行
                </Button>
              </Space>
            </div>
          </Card>

          <Card
            title="已保存路径"
            extra={<span className="text-sm text-gray-500">共 {savedPaths.length} 条</span>}
          >
            <List
              dataSource={savedPaths}
              size="small"
              renderItem={(item) => {
                const agvsOnPath = getAgvsOnPath(item);
                const isOccupied = agvsOnPath.length > 0;
                const itemStats = getPathHistory(item);
                const { score: itemScore, grade: itemGrade, gradeColor: itemGradeColor } = calculateStabilityScore(itemStats);
                return (
                  <List.Item
                    className={`cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded ${
                      isOccupied ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => handleSelectPath(item)}
                  >
                    <List.Item.Meta
                      avatar={<LineChartOutlined className="text-blue-500 text-xl" />}
                      title={
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {item.name}
                          </span>
                          <Tag color={item.type === 'shortest' ? 'blue' : item.type === 'fastest' ? 'green' : 'orange'}>
                            {item.type === 'shortest' ? '最短' : item.type === 'fastest' ? '最快' : '备用'}
                          </Tag>
                          <Tag
                            style={{
                              backgroundColor: itemGradeColor,
                              color: '#fff',
                              border: 'none',
                              fontWeight: 600,
                            }}
                          >
                            {itemScore}分 · {itemGrade}
                          </Tag>
                          {isOccupied && (
                            <Badge
                              count={`${agvsOnPath.length}辆`}
                              className="mr-1"
                              style={{ backgroundColor: '#F97316' }}
                            />
                          )}
                        </div>
                      }
                      description={
                        <div>
                          <div className="text-xs text-gray-500">
                            {item.startPoint} → {item.endPoint} · {item.distance}米 · {item.estimatedTime}分钟
                          </div>
                          {isOccupied && (
                            <div className="mt-1 space-y-1">
                              {agvsOnPath.map((agv) => (
                                <div key={agv.id} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1 text-gray-600">
                                    <CarOutlined className="text-green-500" />
                                    {agv.name} ({agv.id})
                                  </span>
                                  <span className="text-orange-600">
                                    预计{estimateRemainingTime(agv, item)}分钟后空闲
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      }
                    />
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPathStats(item);
                        }}
                      >
                        统计
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUsePath(item);
                        }}
                      >
                        使用
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAssignPath(item);
                        }}
                      >
                        分配任务
                      </Button>
                    </Space>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="保存路径"
        open={saveModalVisible}
        onOk={handleConfirmSave}
        onCancel={() => setSaveModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="路径名称"
            rules={[{ required: true, message: '请输入路径名称' }]}
          >
            <Input placeholder="请输入路径名称" />
          </Form.Item>
          <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
            <p>起点: {startPoint}</p>
            <p>终点: {endPoint}</p>
            <p>类型: {pathType === 'shortest' ? '最短路径' : pathType === 'fastest' ? '最快路径' : '备用路径'}</p>
            <p>距离: {generatePath?.distance} 米</p>
            <p>预计时间: {generatePath?.estimatedTime} 分钟</p>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`分配任务到路径 - ${selectedPathForAssign?.name || ''}`}
        open={assignPathModalVisible}
        onCancel={() => setAssignPathModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-4">
            选择要分配到此路径的任务（仅显示未完成的任务）
          </p>
          {pendingOrExecutingTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无可分配的任务
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {pendingOrExecutingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 border rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors ${
                    task.pathId === selectedPathForAssign?.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleConfirmAssignPath(task.id)}
                >
                  <div>
                    <p className="font-medium">{task.id} · {task.name}</p>
                    <p className="text-xs text-gray-500">
                      {task.startPoint} → {task.endPoint} · {task.cargo} {task.weight}kg
                    </p>
                  </div>
                  <div className="text-right">
                    {task.pathId === selectedPathForAssign?.id ? (
                      <Tag color="blue">已分配此路径</Tag>
                    ) : task.pathId ? (
                      <Tag color="default">已有路径</Tag>
                    ) : (
                      <span className="text-sm text-gray-400">点击分配</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={selectedPathForStats ? `路径统计 · ${selectedPathForStats.name}` : '路径统计'}
        open={pathStatsModalVisible}
        onCancel={() => setPathStatsModalVisible(false)}
        footer={null}
        width={640}
      >
        {selectedPathForStats && (() => {
          const stats = getPathHistory(selectedPathForStats);
          const { score, grade, gradeColor, suggestion } = calculateStabilityScore(stats);
          return (
            <div className="space-y-4">
              <div
                className="rounded-lg p-5 flex items-center gap-6"
                style={{ backgroundColor: `${gradeColor}10`, border: `1px solid ${gradeColor}30` }}
              >
                <div className="flex-shrink-0 text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: gradeColor }}
                  >
                    <div>
                      <p className="text-2xl font-bold text-white leading-none">{score}</p>
                      <p className="text-xs text-white opacity-90 mt-0.5">分</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-lg font-bold" style={{ color: gradeColor }}>
                      稳定性等级：{grade}级
                    </p>
                    <Tag
                      style={{
                        backgroundColor: gradeColor,
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {score}分
                    </Tag>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {suggestion}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    评分依据：近7日通行次数(40%) · 平均耗时(35%) · 拥堵绕行次数(25%)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.passCount}</p>
                  <p className="text-xs text-gray-500 mt-1">近7日通行次数</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.avgTime}<span className="text-sm font-normal">分钟</span></p>
                  <p className="text-xs text-gray-500 mt-1">平均通过耗时</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{stats.congestionEvents}</p>
                  <p className="text-xs text-gray-500 mt-1">拥堵绕行次数</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">近7日每日通行统计</p>
                <div className="space-y-2">
                  {stats.weeklyData.map((d) => (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-8">{d.day}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all"
                          style={{ width: `${Math.min(d.count * 15, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-6 text-right">{d.count}次</span>
                      <span className="text-xs text-gray-400 w-16 text-right">均{d.avgTime}分钟</span>
                    </div>
                  ))}
                </div>
              </div>

              {stats.completedOnPath.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">已完成的任务记录</p>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {stats.completedOnPath.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>{t.id} · {t.cargo}{t.weight}kg</span>
                        <span className="text-xs text-gray-500">{t.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default PathPlanning;
