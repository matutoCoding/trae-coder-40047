import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  message,
  Card,
  Statistic,
  Row,
  Col,
  Tabs,
  Timeline,
  Descriptions,
  Tooltip,
  Checkbox,
  Alert,
  Progress,
  List,
  DatePicker,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SendOutlined,
  CarOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  EyeOutlined,
  DownOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useTaskStore } from '../../store/taskStore';
import { useAgvStore } from '../../store/agvStore';
import type { Task, TaskStatus, TaskPriority, TaskType } from '../../types/task';
import type { MapPoint, Waypoint } from '../../types/path';
import { mapPoints } from '../../mock/path';
import AgvMap from '../../components/Map/AgvMap';

const { Option } = Select;
const { confirm } = Modal;
const { TabPane } = Tabs;

interface BatchDispatchResult {
  taskId: string;
  taskName: string;
  success: boolean;
  agvId?: string;
  agvName?: string;
  reason?: string;
  allocationReason?: string;
}

type DispatchStrategy = 'battery' | 'load' | 'distance';

const TaskDispatch: React.FC = () => {
  const { taskList, addTask, updateTaskStatus, assignTask, completeTask, getTaskStats, getTaskById, updateTaskScheduledTime } = useTaskStore();
  const { agvList, getAgvById, updateAgvStatus, updateAgv } = useAgvStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchDispatchResult[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [mapSelectMode, setMapSelectMode] = useState<'start' | 'end' | null>(null);
  const [form] = Form.useForm();
  const [formStartPoint, setFormStartPoint] = useState<string>('');
  const [formEndPoint, setFormEndPoint] = useState<string>('');
  const [now, setNow] = useState(new Date());

  const [activeTab, setActiveTab] = useState<string>('list');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [batchPreviewMode, setBatchPreviewMode] = useState<boolean>(false);
  const [batchPreviewResults, setBatchPreviewResults] = useState<BatchDispatchResult[]>([]);
  const [dispatchStrategy, setDispatchStrategy] = useState<DispatchStrategy>('battery');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = getTaskStats();

  const statusMap: Record<TaskStatus, { text: string; color: string; icon: React.ReactNode }> = {
    pending: { text: '待派发', color: 'default', icon: <ClockCircleOutlined /> },
    scheduled: { text: '定时派发', color: 'purple', icon: <FieldTimeOutlined /> },
    assigned: { text: '已派发', color: 'blue', icon: <SendOutlined /> },
    executing: { text: '执行中', color: 'processing', icon: <PlayCircleOutlined /> },
    completed: { text: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
    exception: { text: '异常', color: 'error', icon: <ExclamationCircleOutlined /> },
    cancelled: { text: '已取消', color: 'default', icon: <ExclamationCircleOutlined /> },
  };

  const priorityMap: Record<TaskPriority, { text: string; color: string }> = {
    high: { text: '高', color: 'red' },
    medium: { text: '中', color: 'orange' },
    low: { text: '低', color: 'green' },
  };

  const typeMap: Record<TaskType, string> = {
    transport: '搬运任务',
    replenish: '补货任务',
    inventory: '盘点任务',
  };

  const filteredTaskList = [...taskList]
    .sort((a, b) => {
      const timeA = new Date(a.endTime || a.startTime || a.createTime).getTime();
      const timeB = new Date(b.endTime || b.startTime || b.createTime).getTime();
      return timeB - timeA;
    })
    .filter((task) => {
      const matchesSearch =
        task.id.toLowerCase().includes(searchText.toLowerCase()) ||
        task.name.toLowerCase().includes(searchText.toLowerCase()) ||
        task.cargo.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });

  const pendingTasks = filteredTaskList.filter((t) => t.status === 'pending');

  const availableAgvs = agvList.filter(
    (agv) => agv.status === 'idle' && agv.battery > 30
  );

  const getCountdown = (scheduledTime: string): string => {
    const target = new Date(scheduledTime);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return '即将派发';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}时${minutes}分${seconds}秒`;
    if (minutes > 0) return `${minutes}分${seconds}秒`;
    return `${seconds}秒`;
  };

  const locationOptions = mapPoints
    .filter((p) => p.type !== 'intersection')
    .map((p) => ({ label: p.name, value: p.name }));

  const previewPath: Waypoint[] | undefined = useMemo(() => {
    if (!formStartPoint || !formEndPoint) return undefined;
    const start = mapPoints.find((p) => p.name === formStartPoint);
    const end = mapPoints.find((p) => p.name === formEndPoint);
    if (!start || !end) return undefined;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    return [
      { x: start.x, y: start.y, name: start.name },
      { x: start.x, y: midY },
      { x: end.x, y: midY },
      { x: end.x, y: end.y, name: end.name },
    ];
  }, [formStartPoint, formEndPoint]);

  const findPointByName = (name: string) => mapPoints.find((p) => p.name === name);

  const handleAdd = () => {
    form.resetFields();
    setFormStartPoint('');
    setFormEndPoint('');
    setModalVisible(true);
  };

  const handleDetail = (task: Task) => {
    setSelectedTask(task);
    setDetailVisible(true);
  };

  const handleAssign = (task: Task) => {
    setSelectedTask(task);
    setAssignModalVisible(true);
  };

  const handleConfirmAssign = (agvId: string) => {
    if (selectedTask) {
      assignTask(selectedTask.id, agvId);
      updateAgvStatus(agvId, 'running');
      updateAgv(agvId, { currentTaskId: selectedTask.id });
      message.success(`任务已派发给 ${agvId}`);
      setAssignModalVisible(false);
    }
  };

  const handleComplete = (task: Task) => {
    confirm({
      title: '确认完成',
      icon: <CheckCircleOutlined />,
      content: `确定任务 ${task.id} 已完成？货物已到位？`,
      okText: '确认到位',
      cancelText: '取消',
      onOk: () => {
        completeTask(task.id);
        if (task.agvId) {
          updateAgvStatus(task.agvId, 'idle');
          updateAgv(task.agvId, { currentTaskId: undefined });
        }
        message.success('任务已完成，货物到位确认成功');
      },
    });
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (!values.startPoint || !values.endPoint) {
        message.error('请先选择起点和终点');
        return;
      }
      const scheduledTime = values.scheduledTime
        ? values.scheduledTime.format('YYYY-MM-DD HH:mm:ss')
        : undefined;
      addTask({
        ...values,
        scheduledTime,
        status: scheduledTime ? 'scheduled' : 'pending',
      });
      message.success(scheduledTime ? '定时派发任务创建成功' : '任务创建成功');
      setModalVisible(false);
      setFormStartPoint('');
      setFormEndPoint('');
    });
  };

  const handleMapPointClick = (point: MapPoint) => {
    if (mapSelectMode === 'start') {
      setFormStartPoint(point.name);
      form.setFieldValue('startPoint', point.name);
      setMapSelectMode(null);
      message.success(`已选择起点: ${point.name}`);
    } else if (mapSelectMode === 'end') {
      setFormEndPoint(point.name);
      form.setFieldValue('endPoint', point.name);
      setMapSelectMode(null);
      message.success(`已选择终点: ${point.name}`);
    }
  };

  const calculateDistance = (agvX: number, agvY: number, startPointName: string): number => {
    const point = mapPoints.find((p) => p.name === startPointName);
    if (!point) return Infinity;
    return Math.sqrt(Math.pow(agvX - point.x, 2) + Math.pow(agvY - point.y, 2));
  };

  const getAllocationReason = (strategy: DispatchStrategy, agv: { battery: number; maxLoad: number }, distance: number): string => {
    switch (strategy) {
      case 'battery':
        return `电量最高(${agv.battery}%)`;
      case 'load':
        return `载重最大(${agv.maxLoad}kg)`;
      case 'distance':
        return `空驶距离最近(${Math.round(distance)}m)`;
      default:
        return '';
    }
  };

  const performBatchDispatch = (isPreview: boolean): BatchDispatchResult[] => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先勾选要派发的任务');
      return [];
    }
    const pendingSelected = taskList.filter(
      (t) => selectedRowKeys.includes(t.id) && (t.status === 'pending' || t.status === 'scheduled')
    );
    if (pendingSelected.length === 0) {
      message.warning('选中的任务中没有待派发状态的任务');
      return [];
    }

    const sortedTasks = [...pendingSelected].sort((a, b) => {
      const priorityScore: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };
      return priorityScore[b.priority] - priorityScore[a.priority];
    });

    const usedAgvIds = new Set<string>();
    const results: BatchDispatchResult[] = [];

    sortedTasks.forEach((task) => {
      const remainingAgvs = [...availableAgvs].filter((agv) => !usedAgvIds.has(agv.id));
      const capableAgvs = remainingAgvs.filter((agv) => agv.maxLoad >= task.weight);

      let matchedAgv = null;
      if (capableAgvs.length > 0) {
        switch (dispatchStrategy) {
          case 'battery':
            matchedAgv = capableAgvs.sort((a, b) => b.battery - a.battery)[0];
            break;
          case 'load':
            matchedAgv = capableAgvs.sort((a, b) => b.maxLoad - a.maxLoad)[0];
            break;
          case 'distance':
            matchedAgv = capableAgvs.sort((a, b) => {
              const distA = calculateDistance(a.x, a.y, task.startPoint);
              const distB = calculateDistance(b.x, b.y, task.startPoint);
              return distA - distB;
            })[0];
            break;
        }
      }

      if (matchedAgv) {
        if (!isPreview) {
          assignTask(task.id, matchedAgv.id);
          updateAgvStatus(matchedAgv.id, 'running');
          updateAgv(matchedAgv.id, { currentTaskId: task.id });
        }
        usedAgvIds.add(matchedAgv.id);
        const distance = calculateDistance(matchedAgv.x, matchedAgv.y, task.startPoint);
        results.push({
          taskId: task.id,
          taskName: task.name,
          success: true,
          agvId: matchedAgv.id,
          agvName: matchedAgv.name,
          allocationReason: getAllocationReason(dispatchStrategy, matchedAgv, distance),
        });
      } else {
        let reason = '无可用车辆';
        const allIdleAgvs = agvList.filter((a) => a.status === 'idle');
        const idleButLowBattery = allIdleAgvs.filter((a) => a.battery <= 30);
        const idleButUsedUp = availableAgvs.filter((a) => usedAgvIds.has(a.id));

        if (allIdleAgvs.length === 0) {
          reason = '没有待命车辆（全部运行中/充电中/故障/维护中）';
        } else if (remainingAgvs.length === 0 && idleButUsedUp.length > 0) {
          reason = `所有${availableAgvs.length}辆待命车辆已被前面的任务分配完`;
        } else if (remainingAgvs.length > 0 && remainingAgvs.every((a) => a.maxLoad < task.weight)) {
          const maxCap = Math.max(...remainingAgvs.map((a) => a.maxLoad));
          reason = `剩余车辆载重不足（需要≥${task.weight}kg，最大仅${maxCap}kg）`;
        } else if (allIdleAgvs.length > 0 && availableAgvs.length === 0) {
          reason = `${allIdleAgvs.length}辆待命车辆电量均≤30%，需先充电`;
        } else if (idleButLowBattery.length > 0 && remainingAgvs.length === 0) {
          reason = `可用车辆已全部分配，${idleButLowBattery.length}辆低电量车辆等待充电`;
        } else {
          reason = '无匹配车辆（载重或电量条件不满足）';
        }
        results.push({
          taskId: task.id,
          taskName: task.name,
          success: false,
          reason,
        });
      }
    });

    return results;
  };

  const handleBatchDispatch = () => {
    const results = performBatchDispatch(false);
    if (results.length === 0) return;
    setBatchResults(results);
    setBatchModalVisible(true);
    setSelectedRowKeys([]);
  };

  const handlePreviewDispatch = () => {
    const results = performBatchDispatch(true);
    if (results.length === 0) return;
    setBatchPreviewResults(results);
    setBatchPreviewMode(true);
    setPreviewModalVisible(true);
  };

  const handleConfirmPreviewDispatch = () => {
    const results = performBatchDispatch(false);
    if (results.length === 0) return;
    setBatchResults(results);
    setPreviewModalVisible(false);
    setBatchPreviewMode(false);
    setBatchPreviewResults([]);
    setBatchModalVisible(true);
    setSelectedRowKeys([]);
  };

  const getHourFromTime = (timeStr?: string): number => {
    if (!timeStr) return -1;
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return -1;
    return d.getHours();
  };

  const HOUR_WIDTH = 60;
  const TASK_BAR_HOURS = 2;

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTaskId || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const PENDING_AREA_WIDTH = 140;
    const timelineX = x - PENDING_AREA_WIDTH;

    if (timelineX < 0) {
      setDraggedTaskId(null);
      return;
    }

    let hour = Math.floor(timelineX / HOUR_WIDTH);
    hour = Math.max(0, Math.min(23, hour));

    const task = getTaskById(draggedTaskId);
    if (task && task.scheduledTime) {
      const currentDate = new Date(task.scheduledTime);
      currentDate.setHours(hour, 0, 0, 0);
      const newTimeStr = currentDate.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
      updateTaskScheduledTime(draggedTaskId, newTimeStr);
      message.success(`任务 ${draggedTaskId} 定时时间已调整为 ${hour}:00`);
    } else if (task) {
      const today = new Date();
      today.setHours(hour, 0, 0, 0);
      const newTimeStr = today.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
      updateTaskScheduledTime(draggedTaskId, newTimeStr);
      updateTaskStatus(draggedTaskId, 'scheduled');
      message.success(`任务 ${draggedTaskId} 已设置定时时间为 ${hour}:00`);
    }

    setDraggedTaskId(null);
  };

  const rowLabels = [
    { key: 'pending', label: '待派发/定时', statuses: ['pending', 'scheduled'] as TaskStatus[] },
    { key: 'executing', label: '执行中', statuses: ['assigned', 'executing'] as TaskStatus[] },
    { key: 'completed', label: '已完成', statuses: ['completed'] as TaskStatus[] },
  ];

  const getTaskColor = (task: Task): string => {
    switch (task.status) {
      case 'pending':
        return '#9CA3AF';
      case 'scheduled':
        return '#8B5CF6';
      case 'assigned':
      case 'executing':
        return '#3B82F6';
      case 'completed':
        return '#22C55E';
      default:
        return '#6B7280';
    }
  };

  const getTaskBarPosition = (task: Task): { left: number; visible: boolean } => {
    if (task.status === 'pending') {
      return { left: -9999, visible: false };
    }
    let hour = -1;
    if (task.status === 'scheduled') hour = getHourFromTime(task.scheduledTime);
    else if (task.status === 'assigned' || task.status === 'executing') hour = getHourFromTime(task.startTime);
    else if (task.status === 'completed') hour = getHourFromTime(task.endTime);

    if (hour < 0 || hour > 23) return { left: -9999, visible: false };
    return { left: hour * HOUR_WIDTH, visible: true };
  };

  const taskTooltip = (task: Task) => (
    <div className="text-xs space-y-1">
      <p><b>{task.id} · {task.name}</b></p>
      <p>类型：{typeMap[task.type]}</p>
      <p>货物：{task.cargo} ({task.weight}kg)</p>
      <p>起点：{task.startPoint}</p>
      <p>终点：{task.endPoint}</p>
      <p>状态：{statusMap[task.status]?.text}</p>
      {task.agvId && <p>执行AGV：{task.agvId}</p>}
      {task.scheduledTime && <p>定时时间：{task.scheduledTime}</p>}
      {task.startTime && <p>开始时间：{task.startTime}</p>}
      {task.endTime && <p>完成时间：{task.endTime}</p>}
      {task.description && <p>备注：{task.description}</p>}
    </div>
  );

  const batchDropdownItems: MenuProps['items'] = [
    {
      key: 'dispatch',
      label: '立即派发',
      icon: <SendOutlined />,
      onClick: handleBatchDispatch,
    },
  ];

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text: string) => <span className="font-mono font-medium">{text}</span>,
    },
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: TaskType) => typeMap[type],
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: TaskPriority) => (
        <Tag color={priorityMap[priority]?.color}>{priorityMap[priority]?.text}</Tag>
      ),
    },
    {
      title: '货物',
      dataIndex: 'cargo',
      key: 'cargo',
      width: 120,
    },
    {
      title: '重量(kg)',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (weight: number) => <span className="font-mono">{weight}</span>,
    },
    {
      title: '起点',
      dataIndex: 'startPoint',
      key: 'startPoint',
      width: 120,
      render: (text: string) => (
        <div className="flex items-center gap-1">
          <EnvironmentOutlined className="text-green-500" />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '终点',
      dataIndex: 'endPoint',
      key: 'endPoint',
      width: 120,
      render: (text: string) => (
        <div className="flex items-center gap-1">
          <EnvironmentOutlined className="text-red-500" />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '执行AGV',
      dataIndex: 'agvId',
      key: 'agvId',
      width: 100,
      render: (agvId?: string) => {
        if (!agvId) return '-';
        const agv = getAgvById(agvId);
        return (
          <span className="flex items-center gap-1">
            <CarOutlined className="text-blue-500" />
            {agvId}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status: TaskStatus, record: Task) => (
        <div>
          <Tag icon={statusMap[status]?.icon} color={statusMap[status]?.color}>
            {statusMap[status]?.text}
          </Tag>
          {status === 'scheduled' && record.scheduledTime && (
            <div className="text-xs text-purple-600 mt-1 font-mono">
              <FieldTimeOutlined /> {getCountdown(record.scheduledTime)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, record: Task) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleDetail(record)}>
            详情
          </Button>
          {(record.status === 'pending' || record.status === 'scheduled') && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleAssign(record)}
            >
              派发
            </Button>
          )}
          {record.status === 'executing' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleComplete(record)}
            >
              确认到位
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderTimeline = (task: Task) => {
    const items = [
      {
        color: 'green',
        children: (
          <div>
            <p className="font-medium">任务创建</p>
            <p className="text-sm text-gray-500">{task.createTime}</p>
          </div>
        ),
      },
    ];

    if (task.startTime) {
      items.push({
        color: 'blue',
        children: (
          <div>
            <p className="font-medium">开始执行</p>
            <p className="text-sm text-gray-500">{task.startTime}</p>
          </div>
        ),
      });
    }

    if (task.status === 'completed' && task.endTime) {
      items.push({
        color: 'green',
        children: (
          <div>
            <p className="font-medium">任务完成</p>
            <p className="text-sm text-gray-500">{task.endTime}</p>
          </div>
        ),
      });
    }

    if (task.status === 'exception') {
      items.push({
        color: 'red',
        children: (
          <div>
            <p className="font-medium">任务异常</p>
            <p className="text-sm text-gray-500">请查看异常处理模块</p>
          </div>
        ),
      });
    }

    return <Timeline items={items} />;
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record: Task) => ({
      disabled: record.status !== 'pending' && record.status !== 'scheduled',
    }),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">任务派发管理</h2>
        <Space>
          <Select
            value={dispatchStrategy}
            onChange={(val: DispatchStrategy) => setDispatchStrategy(val)}
            style={{ width: 150 }}
            suffixIcon={<BulbOutlined />}
          >
            <Option value="battery">优先高电量</Option>
            <Option value="load">优先大载重</Option>
            <Option value="distance">优先短空驶</Option>
          </Select>
          <Dropdown.Button
            type="primary"
            icon={<DownOutlined />}
            menu={{ items: batchDropdownItems }}
            onClick={handlePreviewDispatch}
            disabled={selectedRowKeys.length === 0}
          >
            <EyeOutlined /> 预览派发{selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
          </Dropdown.Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建任务
          </Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={5}>
          <Card>
            <Statistic
              title="待派发"
              value={stats.pending}
              valueStyle={{ color: '#6B7280' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="执行中"
              value={stats.executing}
              valueStyle={{ color: '#1890ff' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="异常"
              value={stats.exception}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="今日完成"
              value={stats.todayCompleted}
              valueStyle={{ color: '#722ED1' }}
              suffix="单"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="列表视图" key="list">
            <div className="flex items-center justify-between mb-4">
              <Space>
                <Input
                  placeholder="搜索任务ID、名称、货物"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 280 }}
                  allowClear
                />
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 140 }}
                >
                  <Option value="all">全部状态</Option>
                  <Option value="pending">待派发</Option>
                  <Option value="scheduled">定时派发</Option>
                  <Option value="assigned">已派发</Option>
                  <Option value="executing">执行中</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="exception">异常</Option>
                </Select>
                <Select
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  style={{ width: 120 }}
                >
                  <Option value="all">全部优先级</Option>
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </Space>
              <span className="text-sm text-gray-500">
                共 {filteredTaskList.length} 条任务
                {pendingTasks.length > 0 && (
                  <Tag color="default" className="ml-2">{pendingTasks.length} 条待派发</Tag>
                )}
              </span>
            </div>

            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredTaskList}
              rowKey="id"
              scroll={{ x: 1400 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>

          <TabPane tab="排班视图" key="timeline">
            <div
              ref={timelineRef}
              className="select-none"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex" style={{ paddingLeft: 140 }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <div
                    key={i}
                    className="text-center text-xs text-gray-500 border-l border-gray-200"
                    style={{ width: HOUR_WIDTH }}
                  >
                    {i.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {rowLabels.map((row) => {
                const rowTasks = filteredTaskList.filter((t) => row.statuses.includes(t.status));
                const pendingTasksInRow = rowTasks.filter((t) => t.status === 'pending');

                return (
                  <div key={row.key} className="flex border-t border-gray-200 min-h-24">
                    <div
                      className="flex-shrink-0 flex items-center justify-start px-3 font-medium text-sm text-gray-700 bg-gray-50 border-r border-gray-200"
                      style={{ width: 140 }}
                    >
                      {row.label}
                    </div>
                    <div className="relative flex-1">
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: 24 }, (_, i) => (
                          <div
                            key={i}
                            className="border-l border-gray-100"
                            style={{ width: HOUR_WIDTH }}
                          />
                        ))}
                      </div>

                      {row.key === 'pending' && (
                        <div className="flex flex-wrap gap-1 p-1">
                          {pendingTasksInRow.map((task) => (
                            <Tooltip key={task.id} title={taskTooltip(task)}>
                              <div
                                draggable
                                onDragStart={() => handleDragStart(task.id)}
                                className="text-white text-xs rounded px-2 py-1 cursor-move shadow hover:shadow-md transition-shadow"
                                style={{ backgroundColor: getTaskColor(task) }}
                              >
                                <div className="font-medium">{task.id}</div>
                                <div className="opacity-90">{task.name}</div>
                                <div className="opacity-80 text-[10px]">{task.startPoint}→{task.endPoint}</div>
                              </div>
                            </Tooltip>
                          ))}
                        </div>
                      )}

                      {rowTasks
                        .filter((t) => t.status !== 'pending')
                        .map((task) => {
                          const pos = getTaskBarPosition(task);
                          if (!pos.visible) return null;
                          const isDraggable = row.key === 'pending';
                          return (
                            <Tooltip key={task.id} title={taskTooltip(task)}>
                              <div
                                draggable={isDraggable || task.status === 'scheduled'}
                                onDragStart={() => handleDragStart(task.id)}
                                className="absolute text-white text-xs rounded px-2 py-1 shadow hover:shadow-md transition-shadow"
                                style={{
                                  left: pos.left,
                                  top: 4,
                                  width: HOUR_WIDTH * TASK_BAR_HOURS - 4,
                                  backgroundColor: getTaskColor(task),
                                  cursor: task.status === 'scheduled' ? 'move' : 'default',
                                }}
                              >
                                <div className="font-medium truncate">{task.id} · {task.name}</div>
                                <div className="opacity-90 truncate text-[10px]">{task.startPoint}→{task.endPoint}</div>
                              </div>
                            </Tooltip>
                          );
                        })}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#9CA3AF' }}></span>
                  待派发
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#8B5CF6' }}></span>
                  定时派发(可拖动)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#3B82F6' }}></span>
                  执行中
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: '#22C55E' }}></span>
                  已完成
                </span>
                <span className="text-gray-400 ml-4">提示：将待派发/定时任务拖动到时间轴上可设置/调整定时时间</span>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="新建任务"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setMapSelectMode(null);
        }}
        okText="创建任务"
        cancelText="取消"
        width={900}
        maskClosable={false}
      >
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="任务名称"
                    rules={[{ required: true, message: '请输入任务名称' }]}
                  >
                    <Input placeholder="请输入任务名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="type"
                    label="任务类型"
                    rules={[{ required: true, message: '请选择任务类型' }]}
                    initialValue="transport"
                  >
                    <Select>
                      <Option value="transport">搬运任务</Option>
                      <Option value="replenish">补货任务</Option>
                      <Option value="inventory">盘点任务</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="startPoint"
                    label="起点"
                    rules={[{ required: true, message: '请选择起点' }]}
                  >
                    <Input
                      placeholder="点击右侧地图选择起点"
                      value={formStartPoint}
                      readOnly
                      addonAfter={
                        <Button
                          type={mapSelectMode === 'start' ? 'primary' : 'default'}
                          size="small"
                          icon={<EnvironmentOutlined className="text-green-500" />}
                          onClick={() => setMapSelectMode(mapSelectMode === 'start' ? null : 'start')}
                        >
                          {mapSelectMode === 'start' ? '选择中...' : '点选'}
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="endPoint"
                    label="终点"
                    rules={[{ required: true, message: '请选择终点' }]}
                  >
                    <Input
                      placeholder="点击右侧地图选择终点"
                      value={formEndPoint}
                      readOnly
                      addonAfter={
                        <Button
                          type={mapSelectMode === 'end' ? 'primary' : 'default'}
                          size="small"
                          icon={<EnvironmentOutlined className="text-red-500" />}
                          onClick={() => setMapSelectMode(mapSelectMode === 'end' ? null : 'end')}
                        >
                          {mapSelectMode === 'end' ? '选择中...' : '点选'}
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="cargo"
                    label="货物名称"
                    rules={[{ required: true, message: '请输入货物名称' }]}
                  >
                    <Input placeholder="请输入货物名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="weight"
                    label="货物重量(kg)"
                    rules={[{ required: true, message: '请输入货物重量' }]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
                initialValue="medium"
              >
                <Select>
                  <Option value="high">高优先级</Option>
                  <Option value="medium">中优先级</Option>
                  <Option value="low">低优先级</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="scheduledTime"
                label="定时派发（可选）"
                tooltip="指定时间后，系统到点自动按批量派发规则匹配车辆"
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="不指定则为立即待派发"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item name="description" label="任务描述">
                <Input.TextArea rows={2} placeholder="请输入任务描述信息" />
              </Form.Item>
            </Form>

            {previewPath && (
              <Alert
                message="路线预览"
                description={`${formStartPoint} → ${formEndPoint}，请确认路线是否符合预期`}
                type="info"
                showIcon
              />
            )}
            {mapSelectMode && (
              <Alert
                message={`请在右侧地图上点击选择${mapSelectMode === 'start' ? '起点' : '终点'}`}
                type="warning"
                showIcon
                className="mt-3"
              />
            )}
          </div>
          <div className="bg-slate-100 rounded-lg p-2">
            <div className="text-sm text-gray-600 mb-2 flex items-center justify-between">
              <span>地图预览（点击地点选择起终点）</span>
              {formStartPoint && formEndPoint && (
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => {
                    const temp = formStartPoint;
                    setFormStartPoint(formEndPoint);
                    setFormEndPoint(temp);
                    form.setFieldValue('startPoint', formEndPoint);
                    form.setFieldValue('endPoint', temp);
                  }}
                >
                  交换
                </Button>
              )}
            </div>
            <AgvMap
              height={360}
              onPointClick={handleMapPointClick}
              selectedPath={previewPath}
              showPaths={true}
              highlightPoint={
                formStartPoint
                  ? { name: formStartPoint, type: 'start' }
                  : formEndPoint
                    ? { name: formEndPoint, type: 'end' }
                    : null
              }
            />
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                起点
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                终点
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-1 bg-orange-500"></span>
                规划路线
              </span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title="任务详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedTask && (
          <div className="mt-4">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="任务ID">{selectedTask.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[selectedTask.status]?.color}>
                  {statusMap[selectedTask.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="任务名称" span={2}>
                {selectedTask.name}
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">{typeMap[selectedTask.type]}</Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={priorityMap[selectedTask.priority]?.color}>
                  {priorityMap[selectedTask.priority]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="货物">{selectedTask.cargo}</Descriptions.Item>
              <Descriptions.Item label="重量">{selectedTask.weight} kg</Descriptions.Item>
              <Descriptions.Item label="起点">{selectedTask.startPoint}</Descriptions.Item>
              <Descriptions.Item label="终点">{selectedTask.endPoint}</Descriptions.Item>
              <Descriptions.Item label="执行AGV">
                {selectedTask.agvId || '未分配'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {selectedTask.createTime}
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-6">
              <h4 className="text-base font-medium mb-3">任务进度</h4>
              {renderTimeline(selectedTask)}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="派发任务"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="mt-4">
          <p className="text-gray-600 mb-4">
            请选择执行任务的AGV（仅显示可用且电量充足的车辆）
          </p>
          {availableAgvs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无可用的AGV
            </div>
          ) : (
            <div className="space-y-2">
              {availableAgvs.map((agv) => (
                <div
                  key={agv.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleConfirmAssign(agv.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <CarOutlined className="text-blue-500 text-lg" />
                    </div>
                    <div>
                      <p className="font-medium">{agv.name}</p>
                      <p className="text-sm text-gray-500">
                        {agv.id} · {agv.model} · 载重 {agv.maxLoad}kg
                      </p>
                    </div>
                  </div>
                  <div className="text-right w-28">
                    <p className="text-sm text-gray-500">电量</p>
                    <Progress percent={agv.battery} size="small" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title="批量派发结果"
        open={batchModalVisible}
        onCancel={() => setBatchModalVisible(false)}
        footer={[
          <Button type="primary" onClick={() => setBatchModalVisible(false)}>
            确定
          </Button>,
        ]}
        width={600}
      >
        <div className="mt-4 space-y-3">
          <Alert
            message={`派发完成：成功 ${batchResults.filter((r) => r.success).length} 条，失败 ${batchResults.filter((r) => !r.success).length} 条`}
            type={batchResults.every((r) => r.success) ? 'success' : 'warning'}
            showIcon
          />
          <List
            dataSource={batchResults}
            renderItem={(item) => (
              <List.Item className="border rounded-lg px-3 py-2">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.success ? (
                      <CheckCircleOutlined className="text-green-500 text-lg" />
                    ) : (
                      <ExclamationCircleOutlined className="text-red-500 text-lg" />
                    )}
                    <div>
                      <p className="font-medium">
                        {item.taskId} · {item.taskName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.success
                          ? `已分配：${item.agvName} (${item.agvId})`
                          : `分配失败：${item.reason}`}
                      </p>
                      {item.success && item.allocationReason && (
                        <p className="text-xs text-purple-600 mt-1">
                          <BulbOutlined /> 分配理由：{item.allocationReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <Tag color={item.success ? 'green' : 'red'}>
                    {item.success ? '成功' : '失败'}
                  </Tag>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>

      <Modal
        title="派发预览"
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setBatchPreviewMode(false);
          setBatchPreviewResults([]);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setPreviewModalVisible(false);
              setBatchPreviewMode(false);
              setBatchPreviewResults([]);
            }}
          >
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={handleConfirmPreviewDispatch}
          >
            确认派发
          </Button>,
        ]}
        width={600}
      >
        <div className="mt-4 space-y-3">
          <Alert
            message={
              <span>
                派发预览：预计成功 <b>{batchPreviewResults.filter((r) => r.success).length}</b> 条，
                预计失败 <b>{batchPreviewResults.filter((r) => !r.success).length}</b> 条
                <Tag color="purple" className="ml-2">
                  {dispatchStrategy === 'battery' && '策略：优先高电量'}
                  {dispatchStrategy === 'load' && '策略：优先大载重'}
                  {dispatchStrategy === 'distance' && '策略：优先短空驶'}
                </Tag>
              </span>
            }
            type={batchPreviewResults.every((r) => r.success) ? 'info' : 'warning'}
            showIcon
          />
          <List
            dataSource={batchPreviewResults}
            renderItem={(item) => (
              <List.Item className="border rounded-lg px-3 py-2">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.success ? (
                      <EyeOutlined className="text-blue-500 text-lg" />
                    ) : (
                      <ExclamationCircleOutlined className="text-red-500 text-lg" />
                    )}
                    <div>
                      <p className="font-medium">
                        {item.taskId} · {item.taskName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.success
                          ? `预计分配：${item.agvName} (${item.agvId})`
                          : `预计失败：${item.reason}`}
                      </p>
                      {item.success && item.allocationReason && (
                        <p className="text-xs text-purple-600 mt-1">
                          <BulbOutlined /> 分配理由：{item.allocationReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <Tag color={item.success ? 'blue' : 'red'}>
                    {item.success ? '预计成功' : '预计失败'}
                  </Tag>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </div>
  );
};

export default TaskDispatch;
