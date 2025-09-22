import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Space, 
  Typography, 
  Tag, 
  Image,
  Modal,
  Row,
  Col,
  Select,
  Tooltip,
  Button,
  message
} from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { Icon } from '../common/Icon';
import { ActionButton } from '../common/ActionButton';
import { EnhancedTable } from '../common/EnhancedTable';
import { DetailModal } from '../common/DetailModal';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { AuthenticatedFile } from '../common/AuthenticatedFile';
import { 
  fetchEcommerceOrders,
  updateEcommerceOrderStatus,
  fetchEcommerceOrderById
} from '../../features/ecommerceOrders/ecommerceOrdersSlice';

const { Title, Text } = Typography;
const { Option } = Select;

export function EcommerceOrderManagement() {
  const dispatch = useDispatch();
  const ecommerceOrders = useSelector(state => state.ecommerceOrders?.ordersList || []);
  const loading = useSelector(state => state.ecommerceOrders?.loading || false);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    dispatch(fetchEcommerceOrders());
  }, [dispatch]);

  const handleRowClick = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleStatusUpdate = (orderId, newStatus) => {
    dispatch(updateEcommerceOrderStatus({ orderId, status: newStatus }));
    message.success(`Order status updated to ${newStatus}`);
  };

  const handleViewReceipt = (order) => {
    if (order.bankReceipt) {
      setSelectedOrder(order);
      setShowReceiptModal(true);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_payment': return 'orange';
      case 'processing': return 'blue';
      case 'shipped': return 'purple';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_payment': return 'Pending Payment';
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getPaymentMethodIcon = (method) => {
    return method === 'cash_on_delivery' ? 'payments' : 'account_balance';
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      width: 150,
      render: (id) => <Text code>{id}</Text>,
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      sorter: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      defaultSortOrder: 'ascend',
      render: (createdAt) => (
        <Text>{new Date(createdAt).toLocaleDateString()}</Text>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 200,
      render: (record) => (
        <div>
          <Text strong>{record.customerName}</Text>
          <br />
          <Text type="secondary" className="text-xs">{record.customerEmail}</Text>
          {record.customerPhone && (
            <>
              <br />
              <Text type="secondary" className="text-xs">{record.customerPhone}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      width: 80,
      render: (items) => <Tag color="blue">{items.length}</Tag>,
      sorter: (a, b) => a.items.length - b.items.length,
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      render: (total) => (
        <Text strong className="text-blue-600">
          LKR {total.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Payment',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 140,
      render: (method, record) => (
        <div>
          <Tag icon={<Icon name={getPaymentMethodIcon(method)} />} color="green">
            {method === 'cash_on_delivery' ? 'COD' : 'Bank Transfer'}
          </Tag>
          {method === 'bank_transfer' && record.bankReceipt && (
            <div className="mt-1">
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewReceipt(record);
                }}
                className="p-0 h-auto text-xs"
              >
                View Receipt
              </Button>
            </div>
          )}
        </div>
      ),
      filters: [
        { text: 'Cash on Delivery', value: 'cash_on_delivery' },
        { text: 'Bank Transfer', value: 'bank_transfer' },
      ],
      onFilter: (value, record) => record.paymentMethod === value,
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (record) => (
        <div>
          <Tag color={getStatusColor(record.orderStatus)}>
            {getStatusText(record.orderStatus)}
          </Tag>
          <div className="mt-1">
            <Select
              size="small"
              value={record.orderStatus}
              onChange={(value) => handleStatusUpdate(record.id, value)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%' }}
            >
              <Option value="pending_payment">Pending Payment</Option>
              <Option value="processing">Processing</Option>
              <Option value="shipped">Shipped</Option>
              <Option value="completed">Completed</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </div>
        </div>
      ),
      filters: [
        { text: 'Pending Payment', value: 'pending_payment' },
        { text: 'Processing', value: 'processing' },
        { text: 'Shipped', value: 'shipped' },
        { text: 'Completed', value: 'completed' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.orderStatus === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (record) => (
        <Space>
          <Tooltip title="View Details">
            <ActionButton.Text
              icon="visibility"
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(record);
              }}
              className="text-blue-600"
            />
          </Tooltip>
          {record.bankReceipt && (
            <Tooltip title="View Receipt">
              <ActionButton.Text
                icon="receipt"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewReceipt(record);
                }}
                className="text-green-600"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <>
      <Card>
        {/* Statistics */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-blue-600">{ecommerceOrders.length}</div>
              <div className="text-sm text-gray-500">Total Orders</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {ecommerceOrders.filter(o => o.orderStatus === 'pending_payment').length}
              </div>
              <div className="text-sm text-gray-500">Pending Payment</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {ecommerceOrders.filter(o => o.orderStatus === 'processing').length}
              </div>
              <div className="text-sm text-gray-500">Processing</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {ecommerceOrders.filter(o => o.orderStatus === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </Card>
          </Col>
        </Row>

        <EnhancedTable
          title="E-commerce Orders"
          icon="shopping_cart"
          subtitle="Manage orders from the e-commerce website"
          columns={columns}
          dataSource={ecommerceOrders}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            className: 'cursor-pointer hover:bg-blue-50'
          })}
          searchFields={['id', 'customerName', 'customerEmail']}
          searchPlaceholder="Search e-commerce orders..."
          emptyDescription="No e-commerce orders found"
          emptyImage={<Icon name="shopping_cart" className="text-6xl text-gray-300" />}
        />
      </Card>

      {/* Order Detail Modal */}
      <DetailModal
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrder(null);
        }}
        title={`E-commerce Order Details - ${selectedOrder?.id}`}
        icon="shopping_cart"
        data={selectedOrder}
        type="ecommerceOrder"
        actions={[
          selectedOrder?.bankReceipt && (
            <ActionButton 
              key="receipt" 
              icon="receipt"
              onClick={() => {
                setShowDetailModal(false);
                handleViewReceipt(selectedOrder);
              }}
            >
              View Receipt
            </ActionButton>
          )
        ].filter(Boolean)}
      />

      {/* Bank Receipt Modal */}
      <Modal
        title={
          <Space>
            <Icon name="receipt" className="text-green-600" />
            <span>Bank Transfer Receipt - {selectedOrder?.id}</span>
          </Space>
        }
        open={showReceiptModal}
        onCancel={() => {
          setShowReceiptModal(false);
          setSelectedOrder(null);
        }}
        width={800}
        footer={[
          <ActionButton key="close" onClick={() => setShowReceiptModal(false)}>
            Close
          </ActionButton>
        ]}
      >
        {selectedOrder?.bankReceipt && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Original Filename:</Text>
                  <br />
                  <Text>{selectedOrder.bankReceipt.originalFilename}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Upload Date:</Text>
                  <br />
                  <Text>{new Date(selectedOrder.bankReceipt.uploadedAt).toLocaleString()}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>File Size:</Text>
                  <br />
                  <Text>{(selectedOrder.bankReceipt.fileSize / 1024).toFixed(2)} KB</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Status:</Text>
                  <br />
                  <Tag color={selectedOrder.bankReceipt.status === 'verified' ? 'green' : 'orange'}>
                    {selectedOrder.bankReceipt.status.replace('_', ' ').toUpperCase()}
                  </Tag>
                </Col>
              </Row>
            </div>
            
            <div className="text-center">
              <AuthenticatedFile
                receiptId={selectedOrder.bankReceipt.id}
                filename={selectedOrder.bankReceipt.filePath.split('/').pop()}
                alt="Bank Receipt"
                className="max-w-full h-auto rounded-lg shadow-md"
                style={{ maxHeight: '500px' }}
                fallback={
                  <div className="p-8 text-gray-500 text-center">
                    <Icon name="file" className="text-4xl mb-2" />
                    <p>Unable to load receipt file</p>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}