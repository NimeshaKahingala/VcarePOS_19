import { useState } from 'react';
import { Modal, Input, Button, Space, Card, Typography, Row, Col, App } from 'antd';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { BARCODE_SCANNER_CONFIG } from '../../config/barcodeConfig';

const { Text, Title } = Typography;

/**
 * Barcode Simulator Component
 * Provides testing interface for barcode scanning functionality
 * since physical scanner hardware may not be available
 */
export function BarcodeSimulator({ visible, onClose, onScan }) {
  const [testBarcode, setTestBarcode] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const { message } = App.useApp();

  const { simulateScan, getStats } = useBarcodeScanner({
    enabled: BARCODE_SCANNER_CONFIG.ENABLED, // Use global configuration
    onScan: (barcode) => {
      // Add to recent scans
      setRecentScans(prev => [
        { barcode, timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4) // Keep only last 5 scans
      ]);
      
      // Call parent handler
      if (onScan) {
        onScan(barcode);
      }
    }
  });

  const handleSimulateScan = () => {
    if (!testBarcode.trim()) {
      message.warning('Please enter a barcode to simulate');
      return;
    }

    try {
      simulateScan(testBarcode.trim());
      message.success(`Simulated scan: ${testBarcode}`);
      setTestBarcode('');
    } catch (error) {
      message.error(`Simulation failed: ${error.message}`);
    }
  };

  const handlePresetScan = (barcode) => {
    try {
      simulateScan(barcode);
      message.success(`Simulated scan: ${barcode}`);
      
      // Add to recent scans
      setRecentScans(prev => [
        { barcode, timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4)
      ]);
    } catch (error) {
      message.error(`Simulation failed: ${error.message}`);
    }
  };

  const presetBarcodes = [
    { label: 'UPC-A Example', value: 'CE01Q2' },
    { label: 'EAN-13 Example', value: '1234567890123' },
    { label: 'Code 128 Example', value: 'ABC123456789' },
    { label: 'ISBN Example', value: '9781234567890' },
    { label: 'Test Product SKU', value: 'SKU001' },
    { label: 'Invalid (Too Short)', value: '123' },
  ];

  const stats = getStats();

  return (
    <Modal
      title="Barcode Scanner Simulator"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <div className="space-y-6">
        {/* Scanner Status */}
        <Card size="small">
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>Scanner Status:</Text>
              <div className={`text-lg font-medium ${
                BARCODE_SCANNER_CONFIG.ENABLED ? 'text-green-600' : 'text-red-600'
              }`}>
                {BARCODE_SCANNER_CONFIG.ENABLED ? 'Enabled' : 'Disabled'}
              </div>
            </Col>
            <Col span={8}>
              <Text strong>Total Scans:</Text>
              <div className="text-lg font-medium text-blue-600">
                {stats.scanCount || 0}
              </div>
            </Col>
            <Col span={8}>
              <Text strong>Last Scanned:</Text>
              <div className="text-sm text-gray-600">
                {stats.lastScannedCode || 'None'}
              </div>
            </Col>
          </Row>
        </Card>

        {/* Manual Input */}
        <div>
          <Title level={5}>Manual Barcode Input</Title>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Enter barcode manually (e.g., 1234567890123)"
              value={testBarcode}
              onChange={(e) => setTestBarcode(e.target.value)}
              onPressEnter={handleSimulateScan}
              size="large"
            />
            <Button 
              type="primary" 
              onClick={handleSimulateScan}
              size="large"
              disabled={!testBarcode.trim()}
            >
              Simulate Scan
            </Button>
          </Space.Compact>
          <Text type="secondary" className="text-xs">
            Enter any barcode string and click to simulate a scanner input
          </Text>
        </div>

        {/* Preset Barcodes */}
        <div>
          <Title level={5}>Preset Barcodes</Title>
          <Row gutter={[8, 8]}>
            {presetBarcodes.map((preset, index) => (
              <Col span={8} key={index}>
                <Button
                  block
                  onClick={() => handlePresetScan(preset.value)}
                  className="h-auto py-2"
                >
                  <div className="text-center">
                    <div className="font-medium text-xs">{preset.label}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {preset.value}
                    </div>
                  </div>
                </Button>
              </Col>
            ))}
          </Row>
          <Text type="secondary" className="text-xs">
            Click any preset to simulate scanning that barcode type
          </Text>
        </div>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div>
            <Title level={5}>Recent Simulated Scans</Title>
            <Card size="small">
              {recentScans.map((scan, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <Text className="font-mono">{scan.barcode}</Text>
                  <Text type="secondary" className="text-xs">{scan.timestamp}</Text>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Configuration Info */}
        <Card size="small" className="bg-gray-50">
          <Title level={5}>Scanner Configuration</Title>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text strong>Min Length:</Text> {BARCODE_SCANNER_CONFIG.MIN_LENGTH}
            </Col>
            <Col span={12}>
              <Text strong>Scan Timeout:</Text> {BARCODE_SCANNER_CONFIG.TIMEOUT_MS}ms
            </Col>
            <Col span={12}>
              <Text strong>End Keys:</Text> {BARCODE_SCANNER_CONFIG.END_KEYS?.join(', ') || 'N/A'}
            </Col>
            <Col span={12}>
              <Text strong>Allow in Inputs:</Text> {BARCODE_SCANNER_CONFIG.ALLOW_IN_INPUTS ? 'Yes' : 'No'}
            </Col>
          </Row>
        </Card>

        {/* Instructions */}
        <Card size="small" className="bg-blue-50">
          <Title level={5}>How to Use</Title>
          <ul className="text-sm space-y-1 m-0">
            <li>Use manual input to test specific barcode values</li>
            <li>Try preset barcodes to test different formats</li>
            <li>The scanner listens for rapid keyboard input (like from a physical scanner)</li>
            <li>Barcodes must be at least {BARCODE_SCANNER_CONFIG.MIN_LENGTH} characters long</li>
            <li>Successful scans will trigger the product search automatically</li>
          </ul>
        </Card>
      </div>
    </Modal>
  );
}

export default BarcodeSimulator;