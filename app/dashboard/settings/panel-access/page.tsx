'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Save, Eye, EyeOff, ExternalLink, Copy, Check } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/toast'

interface PanelCredential {
  id: string
  name: string
  url: string
  icon: string
  username: string
  password: string
  hasAuth: boolean
  description: string
}

export default function PanelAccessPage() {
  const [panels, setPanels] = useState<PanelCredential[]>([
    {
      id: 'main',
      name: 'Ana Panel',
      url: 'http://207.180.204.60:3001',
      icon: '🏠',
      username: 'serkandogan@aiteldtek.com',
      password: 'Esvella2025136326.',
      hasAuth: true,
      description: 'Traffic Control System Ana Yönetim Paneli'
    },
    {
      id: 'files',
      name: 'Dosya Yöneticisi',
      url: 'https://dosya.dtektracking.com',
      icon: '📁',
      username: 'admin',
      password: 'DtekAdmin2024!',
      hasAuth: true,
      description: 'Sunucu dosya yönetimi ve düzenleme'
    },
    {
      id: 'monitor',
      name: 'Sistem Monitörü',
      url: 'https://monitor.dtektracking.com',
      icon: '📊',
      username: '',
      password: '',
      hasAuth: false,
      description: 'Gerçek zamanlı sistem performans takibi'
    },
    {
      id: 'postgres',
      name: 'Veritabanı Yönetimi',
      url: 'https://postgres.dtektracking.com',
      icon: '🗄️',
      username: 'admin@dtektracking.com',
      password: 'DtekAdmin2024!',
      hasAuth: true,
      description: 'PostgreSQL veritabanı yönetimi (pgAdmin)'
    },
    {
      id: 'redis',
      name: 'Redis Cache',
      url: 'https://redis.dtektracking.com',
      icon: '📦',
      username: 'admin',
      password: 'DtekRedis2024!',
      hasAuth: true,
      description: 'Redis önbellek yönetimi ve izleme'
    }
  ])

  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({})
  const [tempCredentials, setTempCredentials] = useState<{ [key: string]: PanelCredential }>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleEditMode = (id: string) => {
    if (editMode[id]) {
      // Save changes
      if (tempCredentials[id]) {
        setPanels(prev => prev.map(p => p.id === id ? tempCredentials[id] : p))
        toast.success(`${tempCredentials[id].name} bilgileri güncellendi`)
      }
      setEditMode(prev => ({ ...prev, [id]: false }))
      setTempCredentials(prev => {
        const newTemp = { ...prev }
        delete newTemp[id]
        return newTemp
      })
    } else {
      // Enter edit mode
      const panel = panels.find(p => p.id === id)
      if (panel) {
        setTempCredentials(prev => ({ ...prev, [id]: { ...panel } }))
        setEditMode(prev => ({ ...prev, [id]: true }))
      }
    }
  }

  const handleInputChange = (id: string, field: keyof PanelCredential, value: string | boolean) => {
    setTempCredentials(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const copyToClipboard = async (text: string, panelId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(panelId)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('Panoya kopyalandı')
    } catch (err) {
      toast.error('Kopyalama başarısız')
    }
  }

  const saveAllChanges = async () => {
    try {
      // API call to save credentials
      const response = await fetch('/api/admin/panel-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ panels })
      })

      if (response.ok) {
        toast.success('Tüm değişiklikler kaydedildi')
      } else {
        throw new Error('Kayıt başarısız')
      }
    } catch (error) {
      toast.error('Kayıt sırasında hata oluştu')
    }
  }

  return (
    <div className="container max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel Erişim Yönetimi</h1>
        <p className="text-gray-600">
          Tüm yönetim panellerinin erişim bilgilerini ve şifrelerini yönetin
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Bu sayfada yapılan değişiklikler sadece görüntüleme içindir. Gerçek şifre değişiklikleri için ilgili panellere giriş yapmanız gerekir.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 mb-6">
        {panels.map((panel) => {
          const isEditing = editMode[panel.id]
          const currentPanel = isEditing ? tempCredentials[panel.id] : panel

          return (
            <Card key={panel.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{panel.icon}</span>
                    <div>
                      <CardTitle>{panel.name}</CardTitle>
                      <CardDescription>{panel.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(panel.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Aç
                    </Button>
                    <Button
                      variant={isEditing ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleEditMode(panel.id)}
                    >
                      {isEditing ? (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Kaydet
                        </>
                      ) : (
                        'Düzenle'
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={currentPanel.url}
                        readOnly={!isEditing}
                        onChange={(e) => handleInputChange(panel.id, 'url', e.target.value)}
                        className={isEditing ? '' : 'bg-gray-50'}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(currentPanel.url, panel.id + '-url')}
                      >
                        {copiedId === panel.id + '-url' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {currentPanel.hasAuth && (
                    <>
                      <div>
                        <Label>Kullanıcı Adı / Email</Label>
                        <div className="flex gap-2">
                          <Input
                            value={currentPanel.username}
                            readOnly={!isEditing}
                            onChange={(e) => handleInputChange(panel.id, 'username', e.target.value)}
                            className={isEditing ? '' : 'bg-gray-50'}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(currentPanel.username, panel.id + '-user')}
                          >
                            {copiedId === panel.id + '-user' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Şifre</Label>
                        <div className="flex gap-2">
                          <Input
                            type={showPasswords[panel.id] ? 'text' : 'password'}
                            value={currentPanel.password}
                            readOnly={!isEditing}
                            onChange={(e) => handleInputChange(panel.id, 'password', e.target.value)}
                            className={isEditing ? '' : 'bg-gray-50'}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => togglePasswordVisibility(panel.id)}
                          >
                            {showPasswords[panel.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(currentPanel.password, panel.id + '-pass')}
                          >
                            {copiedId === panel.id + '-pass' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {!currentPanel.hasAuth && (
                    <Alert>
                      <AlertDescription>
                        Bu panel şifre koruması kullanmıyor. Güvenlik için şifre eklemeyi düşünün.
                      </AlertDescription>
                    </Alert>
                  )}

                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`hasAuth-${panel.id}`}
                        checked={currentPanel.hasAuth}
                        onChange={(e) => handleInputChange(panel.id, 'hasAuth', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={`hasAuth-${panel.id}`}>Şifre koruması aktif</Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={saveAllChanges}>
          <Save className="h-4 w-4 mr-2" />
          Tüm Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  )
}