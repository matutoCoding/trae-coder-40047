import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Statistic,
  Row,
  Col,
  Progress,
  List,
  Tooltip,
  Modal,
  Select,
  message,
  Space,
} from 'antd';
import {
  ThunderboltOutlined,
  CarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useChargingStore } from '../../store/chargingStore';
import { useAgvStore } from '../../store/agvStore';
import type { ChargingStation, StationStatus } from '../../types/charging';
import AgvMap from '../../components/Map/AgvMap';

const { Option } = Select;
const { confirm } = Modal;

const Charging: React.FC = () => {
  const { stations, records, startCharging, stopCharging, getChargingStats } = useChargingStore();
  const { agvList, getAgvById, updateAgvStatus } = useAgvStore();
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);

  const stats = getChargingStats();

  const stationStatusMap: Record<StationStatus, { text: string; color: string }> = {
    idle: { text: '空闲', color: 'green' },
    occupied: { text: '占用', color: 'orange' },
    maintenance: { text: '维护中', color: 'red' },
  };

  const lowBatteryAgvs = agvList.filter(
    (agv) => agv.battery <= 30 && agv.status !== 'charging' && agv.status !== 'maintenance'
  );

  const chargingRecords = records.filter((r) => r.status === 'charging');
  const completedRecords = records.filter((r) => r.status === 'completed').slice(0, 10);

  const handleDispatch = (station: ChargingStation) => {
    setSelectedStation(station);
    setDispatchModalVisible(true);
  };

  const handleStartCharging = (agvId: string) => {
    if (!selectedStation) return;
    const agv = getAgvById(agvId);
    if (!agv) return;

    startCharging(agvId, selectedStation.id, agv.battery);
    updateAgvStatus(agvId, 'charging');
    message.success(`${agv.name} 已开始充电`);
    setDispatchModalVisible(false);
  };

  const handleStopCharging = (recordId: string, agvId: string) => {
    confirm({
      title: '结束充电',
      icon: <ThunderboltOutlined />,
      content: '确定要结束充电吗？',
      okText: '确认结束',
      cancelText: '取消',
      onOk: () => {
        stopCharging(recordId, 100);
        updateAgvStatus(agvId, 'idle');
        message.success('充电已结束');
      },
    });
  };

  const stationColumns = [
    {
      title: '充电站',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: StationStatus) => (
        <Tag color={stationStatusMap[status].color}>
          {stationStatusMap[status].text}
        </Tag>
      ),
    },
    {
      title: '充电功率',
      dataIndex: 'power',
      key: 'power',
      width: 100,
      render: (power: number) => (
        <span className="font-mono">{power} kW</span>
      ),
    },
    {
      title: '当前AGV',
      dataIndex: 'currentAgvId',
      key: 'currentAgvId',
      width: 120,
      render: (agvId?: string) => {
        if (!agvId) return '-';
        const agv = getAgvById(agvId);
        return (
          <span className="flex items-center gap-1">
            <CarOutlined className="text-blue-500" />
            {agv?.name || agvId}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ChargingStation) => (
        <Space size="small">
          {record.status === 'idle' && lowBatteryAgvs.length > 0 && (
            <Button
              type="link"
              size="small"
              onClick={() => handleDispatch(record)}
            >
              调度充电
            </Button>
          )}
          {record.status === 'occupied' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                const chargingRecord = records.find(
                  (r) => r.stationId === record.id && r.status === 'charging'
                );
                if (chargingRecord && record.currentAgvId) {
                  handleStopCharging(chargingRecord.id, record.currentAgvId);
                }
              }}
            >
              结束充电
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const recordColumns = [
    {
      title: '记录ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text: string) => <span className="font-mono text-xs">{text}</span>,
    },
    {
      title: 'AGV',
      dataIndex: 'agvId',
      key: 'agvId',
      width: 100,
    },
    {
      title: '充电站',
      dataIndex: 'stationId',
      key: 'stationId',
      width: 100,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 160,
      render: (text?: string) => text || '进行中',
    },
    {
      title: '起始电量',
      dataIndex: 'startBattery',
      key: 'startBattery',
      width: 90,
      render: (val: number) => (
        <span className="font-mono">{val}%</span>
      ),
    },
    {
      title: '结束电量',
      dataIndex: 'endBattery',
      key: 'endBattery',
      width: 90,
      render: (val?: number) => (
        <span className="font-mono">{val !== undefined ? val + '%' : '-'}</span>
      ),
    },
    {
      title: '充电量',
      dataIndex: 'chargedAmount',
      key: 'chargedAmount',
      width: 90,
      render: (val?: number) => (
        <span className="font-mono text-green-600">
          {val !== undefined ? '+' + val + '%' : '-'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'charging' ? 'processing' : 'success'}>
          {status === 'charging' ? '充电中' : '已完成'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">充电调度</h2>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="充电站总数"
              value={stats.totalStations}
              prefix={<ThunderboltOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="空闲充电站"
              value={stats.availableStations}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正在充电"
              value={stats.chargingCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日充电量"
              value={stats.todayChargedAmount}
              suffix="%"
              valueStyle={{ color: '#722ED1' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="充电站地图">
            <AgvMap height={350} />
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <WarningOutlined className="text-orange-500" />
                低电量AGV预警
                {lowBatteryAgvs.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {lowBatteryAgvs.length}
                  </span>
                )}
              </span>
            }
            className="mb-4"
          >
            {lowBatteryAgvs.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <ThunderboltOutlined className="text-3xl mb-2" />
                <p>所有AGV电量充足</p>
              </div>
            ) : (
              <List
                size="small"
                dataSource={lowBatteryAgvs}
                renderItem={(agv) => (
                  <List.Item className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <WarningOutlined className="text-red-500 text-lg" />
                      </div>
                      <div>
                        <p className="font-medium">{agv.name}</p>
                        <p className="text-xs text-gray-500">{agv.id}</p>
                      </div>
                    </div>
                    <div className="w-24">
                      <Progress
                        percent={agv.battery}
                        size="small"
                        strokeColor="#ff4d4f"
                        showInfo={true}
                      />
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card
            title={
              <span className="flex items-center gap-2">
                <PlayCircleOutlined className="text-blue-500" />
                正在充电
              </span>
            }
          >
            {chargingRecords.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <ClockCircleOutlined className="text-3xl mb-2" />
                <p>暂无正在充电的AGV</p>
              </div>
            ) : (
              <List
                size="small"
                dataSource={chargingRecords}
                renderItem={(record) => {
                  const agv = getAgvById(record.agvId);
                  const currentBattery = record.endBattery || record.startBattery + 10;
                  return (
                    <List.Item>
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{agv?.name || record.agvId}</span>
                          <span className="text-sm text-blue-500 animate-pulse">
                            <ThunderboltOutlined /> 充电中
                          </span>
                        </div>
                        <Progress
                          percent={currentBattery}
                          strokeColor={{
                            '0%': '#10B981',
                            '100%': '#3B82F6',
                          }}
                          size="small"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>起始: {record.startBattery}%</span>
                          <span>当前: {currentBattery}%</span>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="充电站列表">
        <Table
          columns={stationColumns}
          dataSource={stations}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Card title="充电记录">
        <Table
          columns={recordColumns}
          dataSource={completedRecords}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Modal
        title="调度充电"
        open={dispatchModalVisible}
        onCancel={() => setDispatchModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="mt-4">
          <p className="text-gray-600 mb-4">
            选择需要充电的AGV调度至
            <Tag color="blue" className="mx-1">
              {selectedStation?.name}
            </Tag>
          </p>
          {lowBatteryAgvs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无需要充电的AGV
            </div>
          ) : (
            <div className="space-y-2">
              {lowBatteryAgvs.map((agv) => (
                <div
                  key={agv.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleStartCharging(agv.id)}
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
                  <div className="text-right w-24">
                    <Progress
                      percent={agv.battery}
                      size="small"
                      strokeColor="#ff4d4f"
                      showInfo={true}
                    />
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

export default Charging;
