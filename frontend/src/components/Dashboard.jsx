import React, { useEffect } from 'react';
import TopNavigation from './dashboard/TopNavigation';
import Sidebar from './dashboard/Sidebar';
import MainContent from './dashboard/MainContent';
import useChatStore from '../stores/chatStore';

const Dashboard = () => {
  const { initialize } = useChatStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Fixed Top Navigation */}
      <TopNavigation />
      
      {/* Main Dashboard Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <MainContent />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;