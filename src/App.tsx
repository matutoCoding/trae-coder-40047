import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import AgvLedger from "@/pages/AgvLedger";
import TaskDispatch from "@/pages/TaskDispatch";
import PathPlanning from "@/pages/PathPlanning";
import TrafficControl from "@/pages/TrafficControl";
import Charging from "@/pages/Charging";
import Exception from "@/pages/Exception";
import { ConfigProvider, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTaskStore } from '@/store/taskStore';

const TaskScheduler: React.FC = () => {
  useEffect(() => {
    const timer = setInterval(() => {
      const { processScheduledTasks } = useTaskStore.getState();
      const { success, failed } = processScheduledTasks(new Date());

      success.forEach((item) => {
        message.success(`定时任务 ${item.taskId} 已自动派发给 ${item.agvName}`);
      });

      failed.forEach((item) => {
        message.warning(`定时任务 ${item.taskId} 到达生效时间，但${item.reason}，已转为待派发`);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return null;
};

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1E3A5F',
          borderRadius: 6,
        },
      }}
    >
      <TaskScheduler />
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agv-ledger" element={<AgvLedger />} />
            <Route path="/task-dispatch" element={<TaskDispatch />} />
            <Route path="/path-planning" element={<PathPlanning />} />
            <Route path="/traffic-control" element={<TrafficControl />} />
            <Route path="/charging" element={<Charging />} />
            <Route path="/exception" element={<Exception />} />
          </Routes>
        </MainLayout>
      </Router>
    </ConfigProvider>
  );
}
