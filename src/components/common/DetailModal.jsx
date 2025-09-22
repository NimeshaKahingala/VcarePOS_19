import React from 'react';
import { Modal, Descriptions, Typography, Space, Image, Tag, Button, Divider } from 'antd';
import { Icon } from './Icon';
import { ActionButton } from './ActionButton';

const { Title, Text } = Typography;

export function DetailModal({ 
  open, 
  onClose, 
  title, 
  icon, 
  data, 
  type = 'generic',
  actions = []
}) {
  if (!data) return null;
  const renderProductDetails = () => (
    <div className="space-y-6">
      {/* Product Image and Basic Info */}
      <div className="flex gap-6">
        <div className="flex-shrink-0">
          <Image
            src={data.image || 'https://images.pexels.com/photos/586344/pexels-photo-586344.jpeg?auto=compress&cs=tinysrgb&w=300'}
            alt={data.name}
            width={200}
            height={150}
            className="object-cover rounded-lg"
            preview={false}
            style={{ aspectRatio: '4/3', objectFit: 'cover' }}
          />
        </div>
        <div className="flex-1">
          <Title level={3} className="mb-2">{data.name}</Title>
          <Text type="secondary" className="text-base block mb-4">
            {data.description || 'No description available'}
          </Text>
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <Text strong className="text-2xl text-blue-600">
                LKR {(data.price || 0).toFixed(2)}
              </Text>
              <Tag color={data.stock > 10 ? 'green' : data.stock > 0 ? 'orange' : 'red'}>
                {data.stock} in stock
              </Tag>
            </div>
            {data.isVariation && (
              <div>
                <Tag color="purple">Variation: {data.variantName}</Tag>
                <Text type="secondary" className="ml-2">
                  Part of: {data.parentProductName}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="SKU">
          <Text code>{data.barcode || 'N/A'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Category">
          <Tag color="blue">{data.category}</Tag>
        </Descriptions.Item>
        {/* <Descriptions.Item label="Weight">
          {data.weight ? `${data.weight} kg` : 'N/A'}
        </Descriptions.Item> */}
        <Descriptions.Item label="Material">
          {data?.colors[0]?.sizes[0]?.rawMaterials.map((material)=> {
            return <Tag key={material.rawMaterialId} color="blue">{material.name}</Tag>;
          }) || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Color">
          {data.colors?.map((colorData) => {
            return <Tag key={colorData.id} color="blue">{colorData.name}</Tag>;
          }) || "N/A"}
        </Descriptions.Item>
        {data.rawMaterials && data.rawMaterials.length > 0 && (
          <Descriptions.Item label="Raw Materials" span={2}>
            <div className="space-y-1">
              {data.rawMaterials.map((material, index) => (
                <Tag key={index} className="mb-1">
                  {material.name || `Material ${index + 1}`}: {material.quantity} units
                </Tag>
              ))}
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>
    </div>
  );

  const renderTransactionDetails = () => (
    <div className="space-y-6">
      {/* Transaction Header */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <Title level={4} className="mb-1">Order #{data.id}</Title>
            <Text type="secondary">
              {new Date(data.timestamp).toLocaleString()}
            </Text>
          </div>
          <div className="text-right">
            <Title level={3} className="mb-0 text-blue-600">
              LKR {data.total.toFixed(2)}
            </Title>
            <Tag color="green">PAID</Tag>
          </div>
        </div>
      </div>

      {/* Customer and Sales Info */}
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="Customer">
          {data.customerName || 'Walk-in Customer'}
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          {data.customerPhone || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {data.customerEmail || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Cashier">
          {data.cashier}
        </Descriptions.Item>
        {data.salesperson && (
          <Descriptions.Item label="Sales Person">
            {data.salesperson}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Payment Method">
          <Tag color="blue">{data.paymentMethod.toUpperCase()}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color="green">{(data.status || 'completed').toUpperCase()}</Tag>
        </Descriptions.Item>
        {data.appliedCoupon && (
          <Descriptions.Item label="Applied Coupon">
            <Tag color="orange">{data.appliedCoupon}</Tag>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Items List */}
      <div className="mb-6">
        <Title level={5} className="mb-4">Items Purchased</Title>
        <div className="space-y-3">
          {data.items.map((item, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image
                    src={item.product.image || 'https://images.pexels.com/photos/586344/pexels-photo-586344.jpeg?auto=compress&cs=tinysrgb&w=100'}
                    alt={item.product.name}
                    width={50}
                    height={50}
                    className="object-cover rounded"
                    preview={false}
                    style={{ aspectRatio: '1/1', objectFit: 'cover' }}
                  />
                  <div className="flex-1">
                    <Text strong className="block">{item.product.name}</Text>
                    <Text type="secondary" className="text-sm">
                      SKU: {item.product.barcode} | Qty: {item.quantity}
                    </Text>
                  </div>
                </div>
                <div className="text-right">
                  <Text strong className="text-blue-600">
                    LKR {(item.product.price * item.quantity).toFixed(2)}
                  </Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    LKR {item.product.price.toFixed(2)} each
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <Title level={5} className="mb-3">Financial Summary</Title>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Text>Subtotal:</Text>
            <Text>LKR {data.subtotal.toFixed(2)}</Text>
          </div>
          <div className="flex justify-between">
            <Text>Tax:</Text>
            <Text>LKR {data.totalTax.toFixed(2)}</Text>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <Text>Discount:</Text>
              <Text>-LKR {data.discount.toFixed(2)}</Text>
            </div>
          )}
          <Divider className="my-2" />
          <div className="flex justify-between">
            <Text strong className="text-lg">Total:</Text>
            <Text strong className="text-lg text-blue-600">
              LKR {data.total.toFixed(2)}
            </Text>
          </div>
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div>
          <Title level={5}>Order Notes</Title>
          <div className="bg-blue-50 p-3 rounded border">
            <Text>{data.notes}</Text>
          </div>
        </div>
      )}
    </div>
  );

  const renderUserDetails = () => (
    <div className="space-y-6">
      {/* User Header */}
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          {data.firstName?.[0]}{data.lastName?.[0]}
        </div>
        <div>
          <Title level={3} className="mb-1">
            {data.firstName} {data.lastName}
          </Title>
          <Text type="secondary" className="text-lg">@{data.username}</Text>
        </div>
      </div>

      {/* User Information */}
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="Email">
          {data.email}
        </Descriptions.Item>
        <Descriptions.Item label="Role">
          <Tag color="blue" className="capitalize">{data.role}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={data.isActive ? 'green' : 'red'}>
            {data.isActive ? 'Active' : 'Inactive'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          {new Date(data.createdAt).toLocaleDateString()}
        </Descriptions.Item>
        <Descriptions.Item label="Last Login">
          {data.lastLogin ? new Date(data.lastLogin).toLocaleString() : 'Never'}
        </Descriptions.Item>
      </Descriptions>

      {/* Permissions */}
      <div>
        <Title level={5} className="mb-3">Permissions</Title>
        <div className="space-y-3">
          {Object.entries(data.permissions || {}).map(([module, perms]) => (
            <div key={module} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Text strong className="capitalize">
                  {module.replace('-', ' ')}
                </Text>
                <Tag color={perms.view ? 'green' : 'red'}>
                  {perms.view ? 'Access Granted' : 'No Access'}
                </Tag>
              </div>
              {perms.view && (
                <div className="flex space-x-2">
                  <Tag size="small" color={perms.view ? 'blue' : 'default'}>
                    View: {perms.view ? 'Yes' : 'No'}
                  </Tag>
                  <Tag size="small" color={perms.edit ? 'orange' : 'default'}>
                    Edit: {perms.edit ? 'Yes' : 'No'}
                  </Tag>
                  <Tag size="small" color={perms.delete ? 'red' : 'default'}>
                    Delete: {perms.delete ? 'Yes' : 'No'}
                  </Tag>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEcommerceOrderDetails = () => (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <Title level={4} className="mb-1">E-commerce Order #{data.id}</Title>
            <Text type="secondary">
              {new Date(data.createdAt).toLocaleString()}
            </Text>
          </div>
          <div className="text-right">
            <Title level={3} className="mb-0 text-blue-600">
              LKR {data.totalAmount.toFixed(2)}
            </Title>
            <Tag color={
              data.orderStatus === 'completed' ? 'green' :
              data.orderStatus === 'processing' ? 'blue' :
              data.orderStatus === 'pending_payment' ? 'orange' : 'default'
            }>
              {data.orderStatus.replace('_', ' ').toUpperCase()}
            </Tag>
          </div>
        </div>
      </div>

      {/* Customer and Order Info */}
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="Customer">
          {data.customerName}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {data.customerEmail}
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          {data.customerPhone || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Payment Method">
          <Tag color="blue">
            {data.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Bank Transfer'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Order Status">
          <Tag color={
            data.orderStatus === 'completed' ? 'green' :
            data.orderStatus === 'processing' ? 'blue' :
            data.orderStatus === 'pending_verification' ? 'yellow' :
            data.orderStatus === 'pending_payment' ? 'orange' : 'default'
          }>
            {data.orderStatus === 'pending_payment' ? 'Pending Payment' :
             data.orderStatus === 'pending_verification' ? 'Pending Verification' :
             data.orderStatus === 'processing' ? 'Processing' :
             data.orderStatus.replace('_', ' ').toUpperCase()}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Delivery Address" span={2}>
          {data.customerAddress}
        </Descriptions.Item>
        {data.bankReceipt && (
          <Descriptions.Item label="Bank Receipt" span={2}>
            <div className="flex items-center space-x-2">
              <Tag color={data.bankReceipt.status === 'verified' ? 'green' : 'orange'}>
                {data.bankReceipt.status === 'verified' ? 'Verified' : 'Pending Verification'}
              </Tag>
              <Text className="text-sm">{data.bankReceipt.originalFilename}</Text>
              <Text type="secondary" className="text-xs">
                ({(data.bankReceipt.fileSize / 1024).toFixed(2)} KB)
              </Text>
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Items List */}
      <div className="mb-6">
        <Title level={5} className="mb-4">Items Ordered</Title>
        <div className="space-y-3">
          {data.items.map((item, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <Icon name="inventory_2" className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <Text strong className="block">{item.productName}</Text>
                    <Text type="secondary" className="text-sm">
                      Qty: {item.quantity}
                      {item.selectedSize && ` | Size: ${item.selectedSize}`}
                    </Text>
                  </div>
                </div>
                <div className="text-right">
                  <Text strong className="text-blue-600">
                    LKR {item.totalPrice.toFixed(2)}
                  </Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    LKR {item.unitPrice.toFixed(2)} each
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Total */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <Text strong className="text-lg">Total Amount:</Text>
          <Text strong className="text-lg text-blue-600">
            LKR {data.totalAmount.toFixed(2)}
          </Text>
        </div>
      </div>
    </div>
  );

  const renderGenericDetails = () => (
    <div className="space-y-4">
      <Descriptions bordered column={2} size="small">
        {Object.entries(data).map(([key, value]) => {
          if (typeof value === 'object' || key === 'id') return null;
          return (
            <Descriptions.Item key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
              {String(value)}
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'product':
        return renderProductDetails();
      case 'transaction':
        return renderTransactionDetails();
      case 'user':
        return renderUserDetails();
      case 'ecommerceOrder':
        return renderEcommerceOrderDetails();
      default:
        return renderGenericDetails();
    }
  };

  return (
    <Modal
      title={
        <Space>
          {icon && <Icon name={icon} className="text-blue-600" />}
          <span>{title}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <ActionButton key="close" onClick={onClose}>
          Close
        </ActionButton>,
        ...actions
      ]}
      destroyOnClose
    >
      <div className="max-h-[70vh] overflow-y-auto">
        {renderContent()}
      </div>
    </Modal>
  );
}