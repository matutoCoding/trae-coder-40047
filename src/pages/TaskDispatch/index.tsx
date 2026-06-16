import React, { useState } from 'react';
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
} from '@ant-design/icons';
import { useTaskStore } from '../../store/taskStore';
import { useAgvStore } from '../../store/agvStore';
import type { Task, TaskStatus, TaskPriority, TaskType } from '../../types/task';

const { Option } = Select;
const { confirm } = Modal;
const { TabPane } = Tabs;

const TaskDispatch: React.FC = () => {
  const { taskList, addTask, updateTaskStatus, assignTask, completeTask, getTaskStats, getTaskById } = useTaskStore();
  const { agvList, getAgvById, updateAgvStatus, updateAgv } = useAgvStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [form] = Form.useForm();

  const stats = getTaskStats();

  const statusMap: Record<TaskStatus, { text: string; color: string; icon: React.ReactNode }> = {
    pending: { text: '待派发', color: 'default', icon: <ClockCircleOutlined /> },
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

  const availableAgvs = agvList.filter(
    (agv) => agv.status === 'idle' && agv.battery > 30
  );

  const handleAdd = () => {
    form.resetFields();
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
      addTask({
        ...values,
        status: 'pending',
      });
      message.success('任务创建成功');
      setModalVisible(false);
    });
  };

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
      width: 100,
      render: (status: TaskStatus) => (
        <Tag icon={statusMap[status]?.icon} color={statusMap[status]?.color}>
          {statusMap[status]?.text}
        </Tag>
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
          {record.status === 'pending' && (
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">任务派发管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建任务
        </Button>
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
          </span>
        </div>

        <Table
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
      </Card>

      <Modal
        title="新建任务"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="创建任务"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
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
                <Select placeholder="请选择起点">
                  <Option value="原料仓库A">原料仓库A</Option>
                  <Option value="成品仓库A">成品仓库A</Option>
                  <Option value="成品仓库B">成品仓库B</Option>
                  <Option value="备件库">备件库</Option>
                  <Option value="炼钢车间1号">炼钢车间1号</Option>
                  <Option value="轧钢车间">轧钢车间</Option>
                  <Option value="加工车间">加工车间</Option>
                  <Option value="维修车间">维修车间</Option>
                  <Option value="废钢堆场">废钢堆场</Option>
                  <Option value="发货区">发货区</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endPoint"
                label="终点"
                rules={[{ required: true, message: '请选择终点' }]}
              >
                <Select placeholder="请选择终点">
                  <Option value="原料仓库A">原料仓库A</Option>
                  <Option value="成品仓库A">成品仓库A</Option>
                  <Option value="成品仓库B">成品仓库B</Option>
                  <Option value="备件库">备件库</Option>
                  <Option value="炼钢车间1号">炼钢车间1号</Option>
                  <Option value="轧钢车间">轧钢车间</Option>
                  <Option value="加工车间">加工车间</Option>
                  <Option value="维修车间">维修车间</Option>
                  <Option value="废钢堆场">废钢堆场</Option>
                  <Option value="发货区">发货区</Option>
                </Select>
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
          <Form.Item name="description" label="任务描述">
            <Input.TextArea rows={3} placeholder="请输入任务描述信息" />
          </Form.Item>
        </Form>
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
                        {agv.id} · {agv.model}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">电量</p>
                    <p className="font-mono font-medium text-green-600">
                      {agv.battery}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TaskDispatch;
