import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Select,
  Input,
  message,
  Space,
  Tabs,
  Descriptions,
  Timeline,
  Badge,
} from 'antd';
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  CarOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  AlertOutlined,
  PauseCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useExceptionStore } from '../../store/exceptionStore';
import { useAgvStore } from '../../store/agvStore';
import type { Exception, ExceptionType, ExceptionLevel, ExceptionStatus } from '../../types/exception';

const { Option } = Select;
const { confirm } = Modal;
const { TabPane } = Tabs;
const { TextArea } = Input;

const Exception: React.FC = () => {
  const {
    exceptionList,
    updateExceptionStatus,
    getExceptionStats,
    addException,
  } = useExceptionStore();
  const { agvList, updateAgvStatus, getAgvById } = useAgvStore();

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [handleModalVisible, setHandleModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [handleForm] = Form.useForm();
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const stats = getExceptionStats();

  const typeMap: Record<ExceptionType, { text: string; icon: React.ReactNode; color: string }> = {
    estop: { text: '急停', icon: <PauseCircleOutlined />, color: 'red' },
    stuck: { text: '卡死', icon: <AlertOutlined />, color: 'orange' },
    low_battery: { text: '低电量', icon: <WarningOutlined />, color: 'yellow' },
    fault: { text: '故障', icon: <ToolOutlined />, color: 'red' },
    collision: { text: '碰撞', icon: <ThunderboltOutlined />, color: 'red' },
  };

  const levelMap: Record<ExceptionLevel, { text: string; color: string }> = {
    critical: { text: '严重', color: 'red' },
    warning: { text: '警告', color: 'orange' },
    info: { text: '提示', color: 'blue' },
  };

  const statusMap: Record<ExceptionStatus, { text: string; color: string }> = {
    pending: { text: '待处理', color: 'red' },
    processing: { text: '处理中', color: 'orange' },
    resolved: { text: '已解决', color: 'green' },
  };

  const filteredList = exceptionList.filter((exc) => {
    const matchesLevel = filterLevel === 'all' || exc.level === filterLevel;
    const matchesStatus = filterStatus === 'all' || exc.status === filterStatus;
    return matchesLevel && matchesStatus;
  });

  const handleDetail = (exc: Exception) => {
    setSelectedException(exc);
    setDetailVisible(true);
  };

  const handleAdd = () => {
    form.resetFields();
    setAddModalVisible(true);
  };

  const handleConfirmAdd = () => {
    form.validateFields().then((values) => {
      addException({
        ...values,
      });
      message.success('异常已上报');
      setAddModalVisible(false);
      form.resetFields();
    });
  };

  const handleProcess = (exc: Exception) => {
    setSelectedException(exc);
    handleForm.resetFields();
    setHandleModalVisible(true);
  };

  const handleConfirmProcess = () => {
    handleForm.validateFields().then((values) => {
      if (!selectedException) return;

      updateExceptionStatus(
        selectedException.id,
        'processing',
        values.handler,
        undefined
      );

      if (selectedException.type === 'estop') {
        updateAgvStatus(selectedException.agvId, 'fault');
      }

      message.success('已开始处理');
      setHandleModalVisible(false);
    });
  };

  const handleResolve = (exc: Exception) => {
    confirm({
      title: '确认解决',
      icon: <CheckCircleOutlined />,
      content: '确定该异常已解决？',
      okText: '确认解决',
      cancelText: '取消',
      onOk: () => {
        updateExceptionStatus(exc.id, 'resolved', undefined, '异常已解决');
        if (exc.type !== 'fault') {
          updateAgvStatus(exc.agvId, 'idle');
        }
        message.success('异常已解决');
      },
    });
  };

  const handleEmergencyStop = (agvId: string) => {
    confirm({
      title: '紧急停车',
      icon: <ExclamationCircleOutlined />,
      content: `确定要对 ${agvId} 执行紧急停车吗？`,
      okText: '确认急停',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        updateAgvStatus(agvId, 'fault');
        addException({
          agvId,
          type: 'estop',
          level: 'critical',
          description: '人工触发紧急停车',
        });
        message.success('紧急停车已执行');
      },
    });
  };

  const columns = [
    {
      title: '异常ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text: string) => <span className="font-mono">{text}</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: ExceptionType) => (
        <Tag icon={typeMap[type]?.icon} color={typeMap[type]?.color}>
          {typeMap[type]?.text}
        </Tag>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: ExceptionLevel) => (
        <Tag color={levelMap[level]?.color}>{levelMap[level]?.text}</Tag>
      ),
    },
    {
      title: 'AGV',
      dataIndex: 'agvId',
      key: 'agvId',
      width: 100,
      render: (agvId: string) => (
        <span className="flex items-center gap-1">
          <CarOutlined className="text-blue-500" />
          {agvId}
        </span>
      ),
    },
    {
      title: '关联任务',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 100,
      render: (taskId?: string) => taskId || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '发生时间',
      dataIndex: 'happenTime',
      key: 'happenTime',
      width: 160,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: ExceptionStatus) => (
        <Badge
          status={status === 'pending' ? 'error' : status === 'processing' ? 'warning' : 'success'}
          text={statusMap[status]?.text}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, record: Exception) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleDetail(record)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleProcess(record)}
            >
              处理
            </Button>
          )}
          {record.status === 'processing' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleResolve(record)}
            >
              解决
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderTimeline = (exc: Exception) => {
    const items = [
      {
        color: 'red',
        children: (
          <div>
            <p className="font-medium">异常发生</p>
            <p className="text-sm text-gray-500">{exc.happenTime}</p>
            <p className="text-sm text-gray-600 mt-1">{exc.description}</p>
          </div>
        ),
      },
    ];

    if (exc.status === 'processing' || exc.status === 'resolved') {
      items.push({
        color: 'blue',
        children: (
          <div>
            <p className="font-medium">开始处理</p>
            <p className="text-sm text-gray-500">{exc.handleTime}</p>
            <p className="text-sm text-gray-600 mt-1">处理人: {exc.handler}</p>
          </div>
        ),
      });
    }

    if (exc.status === 'resolved') {
      items.push({
        color: 'green',
        children: (
          <div>
            <p className="font-medium">已解决</p>
            <p className="text-sm text-gray-500">{exc.handleTime}</p>
            <p className="text-sm text-gray-600 mt-1">{exc.handleResult}</p>
          </div>
        ),
      });
    }

    return <Timeline items={items} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">异常处理</h2>
        <Space>
          <Button
            danger
            icon={<PauseCircleOutlined />}
            onClick={() => {
              const runningAgvs = agvList.filter((a) => a.status === 'running');
              if (runningAgvs.length > 0) {
                handleEmergencyStop(runningAgvs[0].id);
              }
            }}
          >
            紧急停车
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            上报异常
          </Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={5}>
          <Card>
            <Statistic
              title="待处理"
              value={stats.pending}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="处理中"
              value={stats.processing}
              valueStyle={{ color: '#faad14' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="已解决"
              value={stats.resolved}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="严重异常"
              value={stats.critical}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="异常总数"
              value={stats.total}
              valueStyle={{ color: '#1E3A5F' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <Space>
            <Select
              value={filterLevel}
              onChange={setFilterLevel}
              style={{ width: 140 }}
            >
              <Option value="all">全部级别</Option>
              <Option value="critical">严重</Option>
              <Option value="warning">警告</Option>
              <Option value="info">提示</Option>
            </Select>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 140 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已解决</Option>
            </Select>
          </Space>
          <span className="text-sm text-gray-500">
            共 {filteredList.length} 条异常
          </span>
        </div>

        <Table
          columns={columns}
          dataSource={filteredList}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Card title="常见异常处理流程">
        <Row gutter={16}>
          <Col span={8}>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">
                  <PauseCircleOutlined />
                </div>
                <h4 className="font-medium text-red-700">急停处理</h4>
              </div>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>立即按下急停按钮或触发远程急停</li>
                <li>检查AGV周围环境是否安全</li>
                <li>排查急停原因（障碍物/故障/人为）</li>
                <li>排除故障后复位，恢复运行</li>
              </ol>
            </div>
          </Col>
          <Col span={8}>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
                  <AlertOutlined />
                </div>
                <h4 className="font-medium text-orange-700">卡死处理</h4>
              </div>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>确认卡死位置和原因</li>
                <li>远程操作尝试脱困（倒车/转向）</li>
                <li>必要时人工前往现场处理</li>
                <li>脱困后重新规划路径继续任务</li>
              </ol>
            </div>
          </Col>
          <Col span={8}>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  <WarningOutlined />
                </div>
                <h4 className="font-medium text-blue-700">低电量处理</h4>
              </div>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>系统自动检测低电量AGV</li>
                <li>自动分配空闲充电站</li>
                <li>调度AGV前往充电</li>
                <li>充电完成后自动恢复待命</li>
              </ol>
            </div>
          </Col>
        </Row>
      </Card>

      <Modal
        title="异常详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedException && (
          <div className="mt-4">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="异常ID">
                {selectedException.id}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge
                  status={
                    selectedException.status === 'pending'
                      ? 'error'
                      : selectedException.status === 'processing'
                      ? 'warning'
                      : 'success'
                  }
                  text={statusMap[selectedException.status]?.text}
                />
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color={typeMap[selectedException.type]?.color}>
                  {typeMap[selectedException.type]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="级别">
                <Tag color={levelMap[selectedException.level]?.color}>
                  {levelMap[selectedException.level]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="AGV">
                {selectedException.agvId}
              </Descriptions.Item>
              <Descriptions.Item label="关联任务">
                {selectedException.taskId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="发生时间" span={2}>
                {selectedException.happenTime}
              </Descriptions.Item>
              <Descriptions.Item label="异常描述" span={2}>
                {selectedException.description}
              </Descriptions.Item>
              {selectedException.handler && (
                <Descriptions.Item label="处理人">
                  {selectedException.handler}
                </Descriptions.Item>
              )}
              {selectedException.handleTime && (
                <Descriptions.Item label="处理时间">
                  {selectedException.handleTime}
                </Descriptions.Item>
              )}
              {selectedException.handleResult && (
                <Descriptions.Item label="处理结果" span={2}>
                  {selectedException.handleResult}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div className="mt-6">
              <h4 className="text-base font-medium mb-3">处理进度</h4>
              {renderTimeline(selectedException)}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="上报异常"
        open={addModalVisible}
        onOk={handleConfirmAdd}
        onCancel={() => setAddModalVisible(false)}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="agvId"
            label="AGV车辆"
            rules={[{ required: true, message: '请选择AGV' }]}
          >
            <Select placeholder="请选择AGV">
              {agvList.map((agv) => (
                <Option key={agv.id} value={agv.id}>
                  {agv.name} ({agv.id})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="type"
            label="异常类型"
            rules={[{ required: true, message: '请选择异常类型' }]}
          >
            <Select placeholder="请选择异常类型">
              <Option value="estop">急停</Option>
              <Option value="stuck">卡死</Option>
              <Option value="low_battery">低电量</Option>
              <Option value="fault">故障</Option>
              <Option value="collision">碰撞</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="level"
            label="异常级别"
            rules={[{ required: true, message: '请选择异常级别' }]}
            initialValue="warning"
          >
            <Select placeholder="请选择异常级别">
              <Option value="critical">严重</Option>
              <Option value="warning">警告</Option>
              <Option value="info">提示</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="异常描述"
            rules={[{ required: true, message: '请输入异常描述' }]}
          >
            <TextArea rows={3} placeholder="请描述异常情况" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理异常"
        open={handleModalVisible}
        onOk={handleConfirmProcess}
        onCancel={() => setHandleModalVisible(false)}
        okText="开始处理"
        cancelText="取消"
      >
        <Form form={handleForm} layout="vertical" className="mt-4">
          <Form.Item
            name="handler"
            label="处理人"
            rules={[{ required: true, message: '请输入处理人姓名' }]}
          >
            <Input placeholder="请输入处理人姓名" />
          </Form.Item>
          <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
            <p className="font-medium">提示：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>确认异常类型和位置</li>
              <li>评估影响范围和紧急程度</li>
              <li>制定处理方案并执行</li>
              <li>处理完成后标记为已解决</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Exception;
