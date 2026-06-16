import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Switch,
  Modal,
  Form,
  Select,
  Input,
  message,
  Statistic,
  Row,
  Col,
  Space,
  Tooltip,
} from 'antd';
import {
  SafetyOutlined,
  CarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useTrafficStore } from '../../store/trafficStore';
import type { Intersection, IntersectionStatus, TrafficRule, RuleType } from '../../types/traffic';
import AgvMap from '../../components/Map/AgvMap';

const { Option } = Select;
const { confirm } = Modal;

const TrafficControl: React.FC = () => {
  const {
    intersections,
    rules,
    updateIntersectionStatus,
    toggleRule,
    addRule,
    deleteRule,
    getTrafficStats,
    getRulesByIntersection,
  } = useTrafficStore();

  const [selectedIntersection, setSelectedIntersection] = useState<Intersection | null>(null);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [form] = Form.useForm();
  const stats = getTrafficStats();

  const statusMap: Record<IntersectionStatus, { text: string; color: string }> = {
    passable: { text: '正常通行', color: 'green' },
    controlled: { text: '交通管制', color: 'orange' },
    maintenance: { text: '维护中', color: 'red' },
  };

  const ruleTypeMap: Record<RuleType, { text: string; color: string }> = {
    yield: { text: '让行规则', color: 'blue' },
    speed_limit: { text: '限速规则', color: 'orange' },
    no_entry: { text: '禁行规则', color: 'red' },
  };

  const handleStatusChange = (intersection: Intersection, status: IntersectionStatus) => {
    updateIntersectionStatus(intersection.id, status);
    message.success(`${intersection.name} 状态已更新为: ${statusMap[status].text}`);
  };

  const handleAddRule = () => {
    if (!selectedIntersection) {
      message.warning('请先选择一个路口');
      return;
    }
    form.resetFields();
    setRuleModalVisible(true);
  };

  const handleSaveRule = () => {
    form.validateFields().then((values) => {
      if (!selectedIntersection) return;
      addRule({
        intersectionId: selectedIntersection.id,
        ...values,
        enabled: true,
      });
      message.success('规则添加成功');
      setRuleModalVisible(false);
      form.resetFields();
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    confirm({
      title: '确认删除',
      icon: <WarningOutlined />,
      content: '确定要删除这条交通规则吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        deleteRule(ruleId);
        message.success('规则删除成功');
      },
    });
  };

  const columns = [
    {
      title: '路口名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: IntersectionStatus) => (
        <Tag color={statusMap[status].color}>{statusMap[status].text}</Tag>
      ),
    },
    {
      title: '今日通行次数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 120,
      render: (count: number) => (
        <span className="font-mono font-medium">{count}</span>
      ),
    },
    {
      title: '当前AGV数量',
      dataIndex: 'currentAgvs',
      key: 'currentAgvs',
      width: 120,
      render: (agvs: string[]) => (
        <span className="font-mono">{agvs.length} 辆</span>
      ),
    },
    {
      title: '规则数量',
      key: 'ruleCount',
      width: 100,
      render: (_: unknown, record: Intersection) => (
        <span>{getRulesByIntersection(record.id).length} 条</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: Intersection) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => setSelectedIntersection(record)}
          >
            查看规则
          </Button>
          <Tooltip title="设置管制">
            <Button
              type="link"
              size="small"
              disabled={record.status === 'maintenance'}
              onClick={() =>
                handleStatusChange(
                  record,
                  record.status === 'controlled' ? 'passable' : 'controlled'
                )
              }
            >
              {record.status === 'controlled' ? '解除管制' : '设置管制'}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const currentRules = selectedIntersection
    ? getRulesByIntersection(selectedIntersection.id)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">交通管制</h2>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="路口总数"
              value={stats.totalIntersections}
              prefix={<SafetyOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正常通行"
              value={stats.passable}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="交通管制"
              value={stats.controlled}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日总通行量"
              value={stats.totalPassCount}
              suffix="次"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="路口地图">
            <AgvMap height={400} />
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title="路口列表"
            extra={
              <span className="text-sm text-gray-500">
                共 {intersections.length} 个路口
              </span>
            }
          >
            <Table
              columns={columns}
              dataSource={intersections}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 350 }}
              onRow={(record) => ({
                onClick: () => setSelectedIntersection(record),
                style: {
                  cursor: 'pointer',
                  background:
                    selectedIntersection?.id === record.id
                      ? '#e6f7ff'
                      : '',
                },
              })}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span className="flex items-center gap-2">
            <SettingOutlined />
            交通规则管理
            {selectedIntersection && (
              <Tag color="blue">{selectedIntersection.name}</Tag>
            )}
          </span>
        }
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddRule}
            disabled={!selectedIntersection}
          >
            添加规则
          </Button>
        }
      >
        {!selectedIntersection ? (
          <div className="text-center py-12 text-gray-400">
            <SafetyOutlined className="text-4xl mb-3" />
            <p>请从上方列表中选择一个路口查看规则</p>
          </div>
        ) : currentRules.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <SettingOutlined className="text-4xl mb-3" />
            <p>该路口暂无交通规则</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {currentRules.map((rule) => (
              <Card
                key={rule.id}
                size="small"
                className={`border-l-4 ${
                  rule.enabled ? 'border-l-blue-500' : 'border-l-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Tag color={ruleTypeMap[rule.type].color}>
                      {ruleTypeMap[rule.type].text}
                    </Tag>
                    <p className="mt-2 text-sm text-gray-700">
                      {rule.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      创建于 {rule.createTime}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch
                      size="small"
                      checked={rule.enabled}
                      onChange={(checked) => toggleRule(rule.id, checked)}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card title="多车避让策略">
        <Row gutter={16}>
          <Col span={8}>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  1
                </div>
                <h4 className="font-medium">优先级让行</h4>
              </div>
              <p className="text-sm text-gray-600">
                高优先级任务的AGV优先通过路口，低优先级车辆在路口外等待
              </p>
            </div>
          </Col>
          <Col span={8}>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                  2
                </div>
                <h4 className="font-medium">先来先服务</h4>
              </div>
              <p className="text-sm text-gray-600">
                相同优先级情况下，按照到达路口的先后顺序依次通行
              </p>
            </div>
          </Col>
          <Col span={8}>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white">
                  3
                </div>
                <h4 className="font-medium">死锁检测</h4>
              </div>
              <p className="text-sm text-gray-600">
                实时检测路口死锁情况，自动调度解除，确保交通畅通
              </p>
            </div>
          </Col>
        </Row>
      </Card>

      <Modal
        title="添加交通规则"
        open={ruleModalVisible}
        onOk={handleSaveRule}
        onCancel={() => setRuleModalVisible(false)}
        okText="添加"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="type"
            label="规则类型"
            rules={[{ required: true, message: '请选择规则类型' }]}
          >
            <Select placeholder="请选择规则类型">
              <Option value="yield">让行规则</Option>
              <Option value="speed_limit">限速规则</Option>
              <Option value="no_entry">禁行规则</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="规则描述"
            rules={[{ required: true, message: '请输入规则描述' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入规则描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TrafficControl;
