import { useState } from 'react';
import { Icon } from './components/Icon';
import { BottomNav, Sidebar, type Tab } from './components/Nav';
import { Home } from './components/Home';
import { Assistant } from './components/Assistant';
import { Tasks } from './components/Tasks';
import { Agenda } from './components/Agenda';
import { Notes } from './components/Notes';
import { Settings } from './components/Settings';
import { useStore } from './lib/store';
import { useReminderAlerts } from './lib/useReminderAlerts';

const titles: Record<Tab, string> = {
  home: 'Home',
  jenesis: 'Jenesis',
  tasks: 'Tasks',
  agenda: 'Agenda',
  notes: 'Notes',
  settings: 'Settings',
};

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const state = useStore();
  useReminderAlerts(state.settings.reminders);

  return (
    <div className="app">
      <Sidebar tab={tab} onChange={setTab} />

      <main className="main">
        <header className="topbar">
          <div>
            <p className="brand-sm">Jenesis</p>
            <h2 className="topbar-title">{titles[tab]}</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Settings"
            onClick={() => setTab('settings')}
          >
            <Icon name="settings" size={20} />
          </button>
        </header>

        <div className="screen">
          {tab === 'home' && <Home go={setTab} />}
          {tab === 'jenesis' && <Assistant />}
          {tab === 'tasks' && <Tasks />}
          {tab === 'agenda' && <Agenda />}
          {tab === 'notes' && <Notes />}
          {tab === 'settings' && <Settings />}
        </div>
      </main>

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
