/* 🔒 GIF ASSET — PROTECTED — DO NOT REMOVE */
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import BaraaAssistant from '../components/BaraaAssistant';

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-transparent text-[#2d3748]">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenAssistant={() => setAssistantOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <BaraaAssistant
        externalOpen={assistantOpen}
        onExternalClose={() => setAssistantOpen(false)}
      />
    </div>
  );
}
