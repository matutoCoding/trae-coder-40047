import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  CarOutlined,
  UnorderedListOutlined,
  LineChartOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '运行看板',
  },
  {
    key: '/agv-ledger',
    icon: <CarOutlined />,
    label: 'AGV台账',
  },
  {
    key: '/task-dispatch',
    icon: <UnorderedListOutlined />,
    label: '任务派发',
  },
  {
    key: '/path-planning',
    icon: <LineChartOutlined />,
    label: '路径规划',
  },
  {
    key: '/traffic-control',
    icon: <SafetyOutlined />,
    label: '交通管制',
  },
  {
    key: '/charging',
    icon: <ThunderboltOutlined />,
    label: '充电调度',
  },
  {
    key: '/exception',
    icon: <WarningOutlined />,
    label: '异常处理',
  },
];

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout className="h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
        style={{
          background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
        }}
      >
        <div className="flex items-center justify-center h-16 border-b border-slate-700">
          <ShopOutlined className="text-2xl text-blue-400" />
          {!collapsed && (
            <span className="ml-2 text-lg font-bold text-white">AGV调度中心</span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderRight: 'none',
            marginTop: '16px',
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
          }}
        >
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-xl cursor-pointer transition-colors hover:text-blue-500"
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <span className="ml-4 text-base font-medium text-gray-700">
              钢厂AGV物料搬运调度系统
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700">系统运行中</span>
            </div>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </span>
          </div>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: '24px',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
          className="bg-slate-50"
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
