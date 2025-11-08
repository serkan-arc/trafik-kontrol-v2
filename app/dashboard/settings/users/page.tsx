'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: 'admin' | 'manager' | 'user'
  status: 'active' | 'inactive'
  last_login_at?: string
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const router = useRouter()

  const [newUser, setNewUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'user' as 'admin' | 'manager' | 'user'
  })

  const [newPassword, setNewPassword] = useState({
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Transform the data to match our interface
        const transformedUsers = data.data?.map((user: any) => ({
          id: user.id,
          email: user.email,
          first_name: user.first_name || user.name?.split(' ')[0],
          last_name: user.last_name || user.name?.split(' ')[1],
          role: user.role || 'user',
          status: user.status || (user.is_active ? 'active' : 'inactive'),
          last_login_at: user.last_login_at,
          created_at: user.created_at
        })) || []
        
        setUsers(transformedUsers)
      } else {
        // Eğer API başarısız olursa en azından mevcut kullanıcıyı göster
        const currentUser = localStorage.getItem('user')
        if (currentUser) {
          const user = JSON.parse(currentUser)
          setUsers([{
            id: user.id || '98914102-a9cf-44c8-a6e0-3a0c68ff3d55',
            email: user.email || 'serkandogan@aiteldtek.com',
            first_name: user.fullName?.split(' ')[0] || 'Serkan',
            last_name: user.fullName?.split(' ')[1] || 'Doğan',
            role: user.role || 'admin',
            status: 'active',
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString()
          }])
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      // Add some default data for display
      setUsers([
        {
          id: '98914102-a9cf-44c8-a6e0-3a0c68ff3d55',
          email: 'serkandogan@aiteldtek.com',
          first_name: 'Serkan',
          last_name: 'Doğan',
          role: 'admin',
          status: 'active',
          created_at: '2024-11-07',
          last_login_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: newUser.role,
          name: `${newUser.first_name} ${newUser.last_name}`.trim()
        })
      })

      if (response.ok) {
        fetchUsers()
        setShowAddModal(false)
        setNewUser({
          email: '',
          first_name: '',
          last_name: '',
          password: '',
          role: 'user'
        })
        alert('Kullanıcı başarıyla eklendi!')
      } else {
        const error = await response.json()
        alert(error.error || 'Kullanıcı eklenirken hata oluştu')
      }
    } catch (error) {
      alert('Kullanıcı eklenirken hata oluştu')
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: editingUser.email,
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          role: editingUser.role,
          status: editingUser.status
        })
      })

      if (response.ok) {
        fetchUsers()
        setShowEditModal(false)
        setEditingUser(null)
        alert('Kullanıcı bilgileri güncellendi!')
      } else {
        alert('Güncelleme sırasında hata oluştu')
      }
    } catch (error) {
      alert('Güncelleme sırasında hata oluştu')
    }
  }

  const handleChangePassword = async () => {
    if (!passwordUser) return

    if (newPassword.password !== newPassword.confirmPassword) {
      alert('Şifreler eşleşmiyor!')
      return
    }

    if (newPassword.password.length < 8) {
      alert('Şifre en az 8 karakter olmalıdır!')
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/admin/users/${passwordUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: newPassword.password
        })
      })

      if (response.ok) {
        setShowPasswordModal(false)
        setPasswordUser(null)
        setNewPassword({ password: '', confirmPassword: '' })
        alert('Şifre başarıyla güncellendi!')
      } else {
        alert('Şifre güncellenirken hata oluştu')
      }
    } catch (error) {
      alert('Şifre güncellenirken hata oluştu')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchUsers()
        alert('Kullanıcı silindi!')
      } else {
        alert('Kullanıcı silinirken hata oluştu')
      }
    } catch (error) {
      alert('Kullanıcı silinirken hata oluştu')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200'
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'user': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-700 border-green-200' 
      : 'bg-yellow-100 text-yellow-700 border-yellow-200'
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Yönetici'
      case 'manager': return 'Müdür'
      case 'user': return 'Kullanıcı'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Kullanıcı Yönetimi
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Sistem kullanıcıları ve yetkilendirme ayarları
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Yeni Kullanıcı Ekle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Toplam Kullanıcı</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Aktif</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Yönetici</p>
          <p className="text-2xl font-bold text-red-600">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Son Giriş</p>
          <p className="text-sm font-medium text-gray-900">
            {users[0]?.last_login_at ? new Date(users[0].last_login_at).toLocaleDateString('tr-TR') : 'Bugün'}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Son Giriş
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(user.status)}`}>
                      {user.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleString('tr-TR')
                      : 'Henüz giriş yapmadı'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => {
                        setEditingUser(user)
                        setShowEditModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Düzenle
                    </button>
                    <button 
                      onClick={() => {
                        setPasswordUser(user)
                        setShowPasswordModal(true)
                      }}
                      className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                    >
                      Şifre
                    </button>
                    {user.email !== 'serkandogan@aiteldtek.com' && (
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Sil
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rol Yetkileri</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div>
              <h3 className="font-medium text-red-900">Yönetici (Admin)</h3>
              <p className="text-sm text-red-700">
                Tüm sistem erişimi. Kullanıcı yönetimi, sistem ayarları ve tüm domainleri yönetebilir.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <h3 className="font-medium text-blue-900">Müdür (Manager)</h3>
              <p className="text-sm text-blue-700">
                Atanan domainleri yönetebilir. Analitikleri görüntüleyebilir, ayarları yapılandırabilir.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <h3 className="font-medium text-gray-900">Kullanıcı (User)</h3>
              <p className="text-sm text-gray-700">
                Sadece okuma erişimi. Atanan domainlerin analitiklerini ve raporlarını görüntüleyebilir.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Yeni Kullanıcı Ekle</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="En az 8 karakter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="user">Kullanıcı</option>
                  <option value="manager">Müdür</option>
                  <option value="admin">Yönetici</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Kullanıcı Düzenle</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={editingUser.first_name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={editingUser.last_name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="user">Kullanıcı</option>
                  <option value="manager">Müdür</option>
                  <option value="admin">Yönetici</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durum
                </label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && passwordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Şifre Değiştir: {passwordUser.email}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  value={newPassword.password}
                  onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="En az 8 karakter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre Tekrar
                </label>
                <input
                  type="password"
                  value={newPassword.confirmPassword}
                  onChange={(e) => setNewPassword({ ...newPassword, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Şifreyi tekrar girin"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordUser(null)
                  setNewPassword({ password: '', confirmPassword: '' })
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Değiştir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}