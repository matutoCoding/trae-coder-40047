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
} from '@ant-design/icons';
import AgvMap from '../../components/Map/AgvMap';
import { mockPathList, mapPoints } from '../../mock/path';
import type { Path, PathType, Waypoint } from '../../types/path';

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
  const [startPoint, setStartPoint] = useState<string>('原料仓库A');
  const [endPoint, setEndPoint] = useState<string>('炼钢车间1号');
  const [pathType, setPathType] = useState<PathType>('shortest');
  const [savedPaths, setSavedPaths] = useState<Path[]>(mockPathList);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [form] = Form.useForm();

  const findPointByName = (name: string) => {
    return mapPoints.find((p) => p.name === name);
  };

  const calculateDistance = (p1: Waypoint, p2: Waypoint) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const generatePath = useMemo(() => {
    const start = findPointByName(startPoint);
    const end = findPointByName(endPoint);

    if (!start || !end) return null;

    const waypoints: Waypoint[] = [];

    waypoints.push({ x: start.x, y: start.y, name: start.name });

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    if (pathType === 'shortest') {
      waypoints.push({ x: start.x, y: midY });
      waypoints.push({ x: end.x, y: midY });
    } else if (pathType === 'fastest') {
      waypoints.push({ x: midX, y: start.y });
      waypoints.push({ x: midX, y: end.y });
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
      estimatedTime,
    };
  }, [startPoint, endPoint, pathType]);

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
  };

  const handleUsePath = (path: Path) => {
    setSelectedPath(path);
    message.success(`已选择路径: ${path.name}`);
  };

  const pathTypeOptions = [
    { value: 'shortest', label: '最短路径', icon: <LineChartOutlined /> },
    { value: 'fastest', label: '最快路径', icon: <ThunderboltOutlined /> },
    { value: 'alternative', label: '备用路径', icon: <SwapOutlined /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">路径规划</h2>
      </div>

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
              </Space>
            }
          >
            <AgvMap
              showPaths={true}
              selectedPath={generatePath?.waypoints || selectedPath?.waypoints}
              height={450}
            />
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
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">路径节点</p>
                    <div className="flex flex-wrap gap-2">
                      {generatePath.waypoints.map((wp, idx) => (
                        <span key={idx} className="text-xs bg-white px-2 py-1 rounded border">
                          {wp.name || `途经点${idx}`}
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
              renderItem={(item) => (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded"
                  onClick={() => handleSelectPath(item)}
                >
                  <List.Item.Meta
                    avatar={<LineChartOutlined className="text-blue-500 text-xl" />}
                    title={
                      <span className="font-medium">
                        {item.name}
                        <Tag className="ml-2" color={item.type === 'shortest' ? 'blue' : item.type === 'fastest' ? 'green' : 'orange'}>
                          {item.type === 'shortest' ? '最短' : item.type === 'fastest' ? '最快' : '备用'}
                        </Tag>
                      </span>
                    }
                    description={
                      <span className="text-xs text-gray-500">
                        {item.startPoint} → {item.endPoint} · {item.distance}米 · {item.estimatedTime}分钟
                      </span>
                    }
                  />
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
                </List.Item>
              )}
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
    </div>
  );
};

export default PathPlanning;
