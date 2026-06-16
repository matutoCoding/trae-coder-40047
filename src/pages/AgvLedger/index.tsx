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
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CarOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import { useAgvStore } from '../../store/agvStore';
import type { AGV, AgvStatus } from '../../types/agv';

const { Option } = Select;
const { confirm } = Modal;

const AgvLedger: React.FC = () => {
  const { agvList, addAgv, deleteAgv, updateAgv, getAgvStats, getAgvById } = useAgvStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgv, setEditingAgv] = useState<AGV | null>(null);
  const [form] = Form.useForm();

  const stats = getAgvStats();

  const statusMap: Record<AgvStatus, { text: string; color: string }> = {
    running: { text: '运行中', color: 'green' },
    idle: { text: '待机', color: 'blue' },
    charging: { text: '充电中', color: 'orange' },
    fault: { text: '故障', color: 'red' },
    maintenance: { text: '维护中', color: 'default' },
  };

  const filteredAgvList = agvList.filter((agv) => {
    const matchesSearch =
      agv.id.toLowerCase().includes(searchText.toLowerCase()) ||
      agv.name.toLowerCase().includes(searchText.toLowerCase()) ||
      agv.model.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingAgv(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (agv: AGV) => {
    setEditingAgv(agv);
    form.setFieldsValue(agv);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除AGV ${id} 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        deleteAgv(id);
        message.success('删除成功');
      },
    });
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingAgv) {
        updateAgv(editingAgv.id, values);
        message.success('更新成功');
      } else {
        addAgv({
          ...values,
          x: 100,
          y: 100,
          speed: 0,
          load: 0,
        });
        message.success('添加成功');
      }
      setModalVisible(false);
    });
  };

  const columns = [
    {
      title: '车辆ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text: string) => <span className="font-mono font-medium">{text}</span>,
    },
    {
      title: '车辆名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AgvStatus) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '电量',
      dataIndex: 'battery',
      key: 'battery',
      width: 150,
      render: (battery: number, record: AGV) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                battery > 50
                  ? 'bg-green-500'
                  : battery > 20
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${battery}%` }}
            />
          </div>
          <span className="text-sm font-mono">{battery}%</span>
        </div>
      ),
    },
    {
      title: '载重/最大载重',
      dataIndex: 'load',
      key: 'load',
      width: 140,
      render: (_: number, record: AGV) => (
        <span className="font-mono">
          {record.load} / {record.maxLoad} kg
        </span>
      ),
    },
    {
      title: '当前速度',
      dataIndex: 'speed',
      key: 'speed',
      width: 100,
      render: (speed: number) => (
        <span className="font-mono">{speed} m/s</span>
      ),
    },
    {
      title: '当前任务',
      dataIndex: 'currentTaskId',
      key: 'currentTaskId',
      width: 120,
      render: (taskId?: string) => taskId || '-',
    },
    {
      title: '上次维护',
      dataIndex: 'lastMaintenance',
      key: 'lastMaintenance',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: AGV) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">AGV台账管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增AGV
        </Button>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="AGV总数"
              value={stats.total}
              prefix={<CarOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1E3A5F' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中"
              value={stats.running}
              prefix={<ThunderboltOutlined className="text-green-500" />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="充电中"
              value={stats.charging}
              prefix={<BorderOutlined className="text-yellow-500" />}
              valueStyle={{ color: '#F59E0B' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="故障/维护"
              value={stats.fault + stats.maintenance}
              prefix={<ToolOutlined className="text-red-500" />}
              valueStyle={{ color: '#EF4444' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <Space>
            <Input
              placeholder="搜索车辆ID、名称、型号"
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
              <Option value="running">运行中</Option>
              <Option value="idle">待机</Option>
              <Option value="charging">充电中</Option>
              <Option value="fault">故障</Option>
              <Option value="maintenance">维护中</Option>
            </Select>
          </Space>
          <span className="text-sm text-gray-500">
            共 {filteredAgvList.length} 辆AGV
          </span>
        </div>

        <Table
          columns={columns}
          dataSource={filteredAgvList}
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

      <Modal
        title={editingAgv ? '编辑AGV' : '新增AGV'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确认"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="车辆名称"
                rules={[{ required: true, message: '请输入车辆名称' }]}
              >
                <Input placeholder="请输入车辆名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="model"
                label="型号"
                rules={[{ required: true, message: '请输入型号' }]}
              >
                <Input placeholder="请输入型号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="maxBattery"
                label="最大电量(%)"
                rules={[{ required: true, message: '请输入最大电量' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="battery"
                label="当前电量(%)"
                rules={[{ required: true, message: '请输入当前电量' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="maxLoad"
                label="最大载重(kg)"
                rules={[{ required: true, message: '请输入最大载重' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select>
                  <Option value="idle">待机</Option>
                  <Option value="running">运行中</Option>
                  <Option value="charging">充电中</Option>
                  <Option value="fault">故障</Option>
                  <Option value="maintenance">维护中</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AgvLedger;
