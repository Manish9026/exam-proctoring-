import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Palette, Bell, Shield, Save, RotateCcw, Loader, AlertTriangle, Activity } from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';
import useThemeStore from '../../store/themeStore';
import { proctorService } from '../../services';

const SettingsPage = () => {
  const { theme, setTheme, animationsEnabled, toggleAnimations, fontSize, setFontSize } = useThemeStore();
  const [notifications, setNotifications] = useState({ email: true, push: true, violations: true, reports: false });
  
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await proctorService.getConfig();
        setConfig(data);
      } catch (err) {
        console.error('Failed to load proctor config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await proctorService.updateConfig(config);
      alert('Configuration saved to file successfully!');
    } catch (err) {
      alert('Failed to save configuration: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateWeight = (key, val) => {
    setConfig(prev => ({
      ...prev,
      RISK_WEIGHTS: { ...prev.RISK_WEIGHTS, [key]: parseInt(val) || 0 }
    }));
  };

  if (loading || !config) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}><Loader className="spin" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 4 }}>System Settings</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Manage system behavior and appearance</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" icon={RotateCcw}>Reset</Button>
          <Button variant="primary" icon={saving ? Loader : Save} loading={saving} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Appearance */}
          <Card>
            <Card.Header>
              <Card.Title subtitle="Visual preferences">
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Palette size={18} style={{ color: 'var(--primary-400)' }} /> Appearance
                </span>
              </Card.Title>
            </Card.Header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 8 }}>Theme</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['dark', 'light'].map(t => (
                    <button key={t} onClick={() => setTheme(t)} style={{
                      flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${theme === t ? 'var(--primary-500)' : 'var(--border-secondary)'}`,
                      background: theme === t ? 'rgba(59,130,246,0.1)' : 'transparent', color: theme === t ? 'var(--primary-400)' : 'var(--text-tertiary)',
                      cursor: 'pointer', textTransform: 'capitalize'
                    }}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Thresholds */}
          <Card>
            <Card.Header>
              <Card.Title subtitle="Security trigger levels">
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <AlertTriangle size={18} style={{ color: 'var(--warning-400)' }} /> Thresholds
                </span>
              </Card.Title>
            </Card.Header>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Warning Risk %</label>
                <Input type="number" value={config.AUTO_WARNING_THRESHOLD} onChange={e => setConfig({ ...config, AUTO_WARNING_THRESHOLD: parseInt(e.target.value) })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Termination Risk %</label>
                <Input type="number" value={config.AUTO_TERMINATE_THRESHOLD} onChange={e => setConfig({ ...config, AUTO_TERMINATE_THRESHOLD: parseInt(e.target.value) })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Max Tab Switches</label>
                <Input type="number" value={config.MAX_TAB_SWITCHES} onChange={e => setConfig({ ...config, MAX_TAB_SWITCHES: parseInt(e.target.value) })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Decay Rate (pts/frame)</label>
                <Input type="number" value={config.DECAY_RATE} onChange={e => setConfig({ ...config, DECAY_RATE: parseInt(e.target.value) })} />
              </div>
            </div>
          </Card>
        </div>

        {/* Risk Weights */}
        <Card>
          <Card.Header>
            <Card.Title subtitle="Penalty weight for each incident type">
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Activity size={18} style={{ color: 'var(--accent-400)' }} /> Risk Weights (0-100)
              </span>
            </Card.Title>
          </Card.Header>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {Object.entries(config.RISK_WEIGHTS).map(([key, value]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}
                </label>
                <Input 
                  type="number" 
                  value={value} 
                  onChange={(e) => updateWeight(key, e.target.value)} 
                  style={{ height: '36px', fontSize: 'var(--text-sm)' }}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
