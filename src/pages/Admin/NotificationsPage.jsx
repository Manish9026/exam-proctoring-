import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, AlertTriangle, Info, Trash2, CheckCheck } from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';

const notifications = [
  { id: 1, type: 'danger', title: 'High Risk Alert', message: 'Rahul Sharma exceeded risk threshold (92) during Advanced Mathematics exam.', time: '2 min ago', read: false },
  { id: 2, type: 'warning', title: 'Violation Detected', message: 'Priya Mehta flagged for multiple faces detected in camera frame.', time: '5 min ago', read: false },
  { id: 3, type: 'success', title: 'Exam Completed', message: 'Physics Final exam completed successfully. 189 submissions received.', time: '30 min ago', read: false },
  { id: 4, type: 'info', title: 'System Update', message: 'AI model updated to v2.4 — improved face detection accuracy by 3%.', time: '1 hour ago', read: true },
  { id: 5, type: 'warning', title: 'Session Anomaly', message: 'Dev Patel attempted to access exam from a different device.', time: '2 hours ago', read: true },
  { id: 6, type: 'success', title: 'Report Generated', message: 'Weekly analytics report has been generated and is ready for download.', time: '3 hours ago', read: true },
];

const typeIcons = { danger: AlertTriangle, warning: AlertTriangle, success: Check, info: Info };
const typeColors = {
  danger: { bg: 'rgba(239,68,68,0.1)', color: 'var(--danger-400)' },
  warning: { bg: 'rgba(245,158,11,0.1)', color: 'var(--warning-400)' },
  success: { bg: 'rgba(34,197,94,0.1)', color: 'var(--accent-400)' },
  info: { bg: 'rgba(59,130,246,0.1)', color: 'var(--primary-400)' },
};

const NotificationsPage = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 800 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>Notifications</h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
          {notifications.filter(n => !n.read).length} unread notifications
        </p>
      </div>
      <Button variant="secondary" size="sm" icon={CheckCheck}>Mark All Read</Button>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {notifications.map((n, i) => {
        const Icon = typeIcons[n.type];
        const colors = typeColors[n.type];
        return (
          <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <Card compact style={{ opacity: n.read ? 0.6 : 1 }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-lg)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: colors.bg, color: colors.color,
                }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{n.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-500)' }} />}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{n.time}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>{n.message}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  </div>
);

export default NotificationsPage;
