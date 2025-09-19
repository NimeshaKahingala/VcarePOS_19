import { useState, useEffect, useCallback } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  Typography,
  Row,
  Col,
  Switch,
  Card,
  Divider,
  message,
  Tabs
} from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { ActionButton } from '../common/ActionButton';
import { Icon } from '../common/Icon';
import { useDispatch, useSelector } from 'react-redux';
import { addUser, updateUser, clearMessages } from '../../features/users/usersSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const moduleLabels = {
  'pos': 'Point of Sale',
  'products': 'Product Management',
  'raw-materials': 'Raw Materials',
  'transactions': 'Orders & Transactions',
  'reports': 'Reports & Analytics',
  'coupons': 'Coupon Management',
  'tax': 'Tax Management',
  'settings': 'System Settings',
  'user-management': 'User Management',
  'purchase-orders': 'Purchase Orders',
  'audit-trail': 'Audit Trail',
  'ecommerce-orders': 'E-commerce Orders'
};

const rolePermissions = {
  admin: {
    'pos': { view: true, edit: true, delete: true },
    'products': { view: true, edit: true, delete: true },
    'raw-materials': { view: true, edit: true, delete: true },
    'transactions': { view: true, edit: true, delete: true },
    'reports': { view: true, edit: true, delete: true },
    'coupons': { view: true, edit: true, delete: true },
    'tax': { view: true, edit: true, delete: true },
    'settings': { view: true, edit: true, delete: true },
    'user-management': { view: true, edit: true, delete: true },
    'audit-trail': { view: true, edit: true, delete: true },
    'purchase-orders': { view: true, edit: true, delete: true },
    'ecommerce-orders': { view: true, edit: true, delete: true }
  },
  manager: {
    'pos': { view: true, edit: true, delete: true },
    'products': { view: true, edit: true, delete: true },
    'raw-materials': { view: true, edit: true, delete: false },
    'transactions': { view: true, edit: true, delete: false },
    'reports': { view: true, edit: false, delete: false },
    'coupons': { view: true, edit: true, delete: true },
    'tax': { view: true, edit: true, delete: false },
    'settings': { view: true, edit: false, delete: false },
    'user-management': { view: true, edit: false, delete: false },
    'audit-trail': { view: true, edit: false, delete: false },
    'purchase-orders': { view: true, edit: true, delete: true },
    'ecommerce-orders': { view: true, edit: false, delete: false }
  },
  cashier: {
    'pos': { view: true, edit: true, delete: false },
    'products': { view: true, edit: false, delete: false },
    'raw-materials': { view: false, edit: false, delete: false },
    'transactions': { view: true, edit: false, delete: false },
    'reports': { view: false, edit: false, delete: false },
    'coupons': { view: true, edit: false, delete: false },
    'tax': { view: false, edit: false, delete: false },
    'settings': { view: false, edit: false, delete: false },
    'user-management': { view: false, edit: false, delete: false },
    'audit-trail': { view: false, edit: false, delete: false },
    'purchase-orders': { view: true, edit: true, delete: true },
    'ecommerce-orders': { view: true, edit: false, delete: false }
  }
};

export function UserModal({ open, onClose, editingUser }) {
  const dispatch = useDispatch();
  const users = useSelector(state => state.users.usersList);
  const loading = useSelector(state => state.users.loading);
  const error = useSelector(state => state.users.error);
  const successMessage = useSelector(state => state.users.successMessage);
  const { hasPermission } = useAuth();
  const [form] = Form.useForm();
  const [permissions, setPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('cashier');

  // Proper cleanup function to reset state
  const handleClose = useCallback(() => {
    form.resetFields();
    setPermissions(rolePermissions.cashier);
    setSelectedRole('cashier');
    onClose();
  }, [form, onClose]);

  useEffect(() => {
    if (editingUser && open) {
      form.setFieldsValue({
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        isActive: editingUser.isActive
      });
      setPermissions(editingUser.permissions);
      setSelectedRole(editingUser.role);
    } else if (open && !editingUser) {
      form.resetFields();
      setSelectedRole('cashier');
      setPermissions(rolePermissions.cashier);
    }
  }, [editingUser, open, form]);

  // Handle success and error messages from Redux state
  useEffect(() => {
    if (!open) return; // Only handle messages when modal is open
    
    if (successMessage) {
      message.success(successMessage);
      dispatch(clearMessages());
      handleClose(); // Close modal on success
      return; // Don't process error if success occurred
    }
    
    if (error) {
      message.error(error);
      dispatch(clearMessages());
    }
  }, [successMessage, error, dispatch, handleClose, open]);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setPermissions(rolePermissions[role]);
    form.setFieldsValue({ role });
  };

  const handlePermissionChange = (module, action, value) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: value
      }
    }));
  };

  const handleSubmit = async (values) => {
    try {
      // TODO: Move duplicate validation to backend to prevent race conditions
      // This client-side check is insufficient for production use
      
      // Temporary client-side check for duplicate username
      const existingUser = users.find(u => 
        u.username === values.username && 
        u.id !== editingUser?.id
      );
      if (existingUser) {
        message.error('Username already exists');
        return;
      }
      
      // Temporary client-side check for duplicate email
      const existingEmail = users.find(u => 
        u.email === values.email && 
        u.id !== editingUser?.id
      );
      if (existingEmail) {
        message.error('Email already exists');
        return;
      }
      const userData = {
        ...values,
        permissions,
        isActive: values.isActive !== false
      };
      if (editingUser) {
        dispatch(updateUser({ id: editingUser.id, userData: { ...editingUser, ...userData } }));
        // Success message will be handled by Redux state in useEffect
      } else {
        dispatch(addUser({ userData }));
        // Success message will be handled by Redux state in useEffect
      }
      // Note: Modal will close automatically on success via useEffect
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('Please fill in all required fields');
    }
  };

  const renderPermissionCard = (module, modulePerms) => (
    <Card key={module} size="small" className="mb-3">
      <div className="flex items-center justify-between mb-3">
        <Text strong>{moduleLabels[module]}</Text>
        <Switch
          checked={modulePerms.view}
          onChange={(checked) => {
            if (!checked) {
              // If disabling view, disable all permissions
              handlePermissionChange(module, 'view', false);
              handlePermissionChange(module, 'edit', false);
              handlePermissionChange(module, 'delete', false);
            } else {
              // If enabling view, restore the current role's default permissions for this module
              const roleDefaults = rolePermissions[selectedRole]?.[module] || { view: true, edit: false, delete: false };
              handlePermissionChange(module, 'view', true);
              handlePermissionChange(module, 'edit', roleDefaults.edit);
              handlePermissionChange(module, 'delete', roleDefaults.delete);
            }
          }}
          size="small"
        />
      </div>
      
      {modulePerms.view && (
        <Row gutter={16}>
          <Col span={8}>
            <div className="flex items-center justify-between">
              <Text className="text-sm">View</Text>
              <Switch
                checked={modulePerms.view}
                disabled
                size="small"
              />
            </div>
          </Col>
          <Col span={8}>
            <div className="flex items-center justify-between">
              <Text className="text-sm">Edit</Text>
              <Switch
                checked={modulePerms.edit}
                onChange={(checked) => handlePermissionChange(module, 'edit', checked)}
                size="small"
              />
            </div>
          </Col>
          <Col span={8}>
            <div className="flex items-center justify-between">
              <Text className="text-sm">Delete</Text>
              <Switch
                checked={modulePerms.delete}
                onChange={(checked) => handlePermissionChange(module, 'delete', checked)}
                size="small"
              />
            </div>
          </Col>
        </Row>
      )}
    </Card>
  );

  const tabItems = [
    {
      key: 'basic',
      label: (
        <span className="flex items-center space-x-2">
          <Icon name="person" />
          <span>Basic Information</span>
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Username"
                rules={[
                  { required: true, message: 'Please enter username' },
                  { min: 3, message: 'Username must be at least 3 characters' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: 'Username can only contain letters, numbers, and underscores' }
                ]}
              >
                <Input placeholder="Enter username" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role" onChange={handleRoleChange}>
                  <Option value="admin">Administrator</Option>
                  <Option value="manager">Manager</Option>
                  <Option value="cashier">Cashier</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Active User" valuePropName="checked" initialValue={true}>
                {/* <div className="flex items-center space-x-2 mt-8"> */}
                  <Switch />
                  {/* <Text>Active User</Text> */}
                {/* </div> */}
              </Form.Item>
            </Col>
          </Row>

          <div className="bg-blue-50 p-4 rounded-lg">
            <Title level={5} className="mb-2">Role Descriptions</Title>
            <div className="space-y-2">
              <div>
                <Text strong>Administrator:</Text>
                <Text type="secondary" className="ml-2">Full system access including user management</Text>
              </div>
              <div>
                <Text strong>Manager:</Text>
                <Text type="secondary" className="ml-2">Business operations access with limited admin functions</Text>
              </div>
              <div>
                <Text strong>Cashier:</Text>
                <Text type="secondary" className="ml-2">POS and basic product viewing access only</Text>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'permissions',
      label: (
        <span className="flex items-center space-x-2">
          <Icon name="security" />
          <span>Permissions</span>
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Title level={5} className="mb-1">Module Permissions</Title>
              <Text type="secondary">Configure access levels for each system module</Text>
            </div>
            <div className="space-x-2">
              <ActionButton 
                size="small"
                onClick={() => setPermissions(rolePermissions.admin)}
              >
                Grant All
              </ActionButton>
              <ActionButton 
                size="small"
                onClick={() => setPermissions(rolePermissions.cashier)}
              >
                Minimal Access
              </ActionButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(permissions).map(([module, modulePerms]) => 
              renderPermissionCard(module, modulePerms)
            )}
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <Text className="text-sm">
              <Icon name="info" className="mr-2 text-yellow-600" />
              <strong>Permission Levels:</strong> View allows reading data, Edit allows modifications, Delete allows removal of records.
              Disabling View will automatically disable Edit and Delete permissions.
            </Text>
          </div>
        </div>
      )
    }
  ];

  if (!hasPermission('user-management', 'edit')) {
    return null;
  }

  return (
    <Modal
      title={editingUser ? 'Edit User' : 'Add New User'}
      open={open}
      onCancel={handleClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        <Tabs items={tabItems} />

        <Divider />

        <div className="flex justify-end space-x-2">
          <ActionButton onClick={handleClose}>
            Cancel
          </ActionButton>
          <ActionButton.Primary 
            htmlType="submit"
            loading={loading}
            icon={editingUser ? "save" : "person_add"}
          >
            {editingUser ? 'Update User' : 'Create User'}
          </ActionButton.Primary>
        </div>
      </Form>
    </Modal>
  );
}