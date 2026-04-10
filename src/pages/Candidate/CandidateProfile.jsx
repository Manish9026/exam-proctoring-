import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Camera, 
  ShieldCheck, Lock, Bell, Moon, Sun,
  Smartphone, Trash2, Save, Fingerprint
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import toast from 'react-hot-toast';

const CandidateProfile = () => {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  
  const [formData, setFormData] = useState({
    name: user?.full_name || user?.username || '',
    email: user?.email || '',
    phone: '',
    department: 'Engineering',
  });

  const handleSave = () => {
    toast.success('Profile updated successfully (Simulation)');
  };

  const sectionLabel = (text) => (
    <div style={{ 
      fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', 
      textTransform: 'uppercase', letterSpacing: '0.05em',
      color: 'var(--text-muted)', marginBottom: 'var(--space-4)',
      display: 'flex', alignItems: 'center', gap: 8
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
      {text}
      <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
    </div>
  );

  return (
    <div className="profile-grid">
      
      {/* Sidebar: Avatar & Quick Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Card style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 80,
            background: 'linear-gradient(to bottom right, var(--primary-800), var(--primary-900))',
            opacity: 0.5, zIndex: 0
          }} />
          
          <div style={{ position: 'relative', zIndex: 1, paddingTop: 'var(--space-4)' }}>
            <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 16px' }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%', border: '4px solid var(--bg-card)',
                background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--primary-400)',
                overflow: 'hidden'
              }}>
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (user?.first_name || user?.username || '?')[0].toUpperCase()
                )}
              </div>
              <button style={{
                position: 'absolute', bottom: 0, right: 0, width: 32, height: 32,
                borderRadius: '50%', background: 'var(--primary-600)', color: 'white',
                border: '3px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <Camera size={14} />
              </button>
            </div>

            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
              {user?.first_name || user?.username}
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              {user?.email}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}>
              <Badge variant="primary">Candidate</Badge>
              <Badge variant="success" dot>Verified</Badge>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-6)', display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--border-primary)' }}>
            <div style={{ padding: 'var(--space-4)', borderRight: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>{user?.total_exams_taken || 0}</div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>Exams</div>
            </div>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>{user?.avg_score || 0}%</div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>Avg Score</div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-400)' }} />
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' }}>Biometric Identity</div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>Face identification active</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Smartphone size={18} style={{ color: 'var(--primary-400)' }} />
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' }}>Two-Factor Auth</div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>Via system notifications</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Form: Settings & Profile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Card>
          <Card.Header>
            <Card.Title subtitle="Personal information and contact data">Account Profile</Card.Title>
            <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Save Changes</Button>
          </Card.Header>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div style={{ gridColumn: 'span 2' }}>
              {sectionLabel('Personal Details')}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={{
                    width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-lg)', padding: '10px 12px 10px 36px',
                    fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  disabled
                  value={formData.email}
                  style={{
                    width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-lg)', padding: '10px 12px 10px 36px',
                    fontSize: 'var(--text-sm)', color: 'var(--text-muted)', outline: 'none', cursor: 'not-allowed'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)' }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="+1 (555) 000-0000"
                  style={{
                    width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-lg)', padding: '10px 12px 10px 36px',
                    fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)' }}>Department / Subject</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={formData.department}
                  style={{
                    width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-lg)', padding: '10px 12px 10px 36px',
                    fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              {sectionLabel('Preferences')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {theme === 'dark' ? <Moon size={20} style={{ color: 'var(--primary-400)' }} /> : <Sun size={20} style={{ color: 'var(--accent-400)' }} />}
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>Appearance Mode</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Switch between light and dark UI themes</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleTheme}>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Bell size={20} style={{ color: 'var(--violet-400)' }} />
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>Notification Push</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Receive exam reminders and score alerts</div>
                </div>
              </div>
              <Badge variant="primary" dot>ENABLED</Badge>
            </div>
          </div>
        </Card>

        <Card style={{ borderLeft: '4px solid var(--danger-600)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Lock size={20} style={{ color: 'var(--danger-400)' }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' }}>Security & Privacy</div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Manage your credentials and session history.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="ghost" size="sm" icon={Trash2}>Reset Security</Button>
              <Button variant="outline" size="sm">Change Password</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CandidateProfile;
