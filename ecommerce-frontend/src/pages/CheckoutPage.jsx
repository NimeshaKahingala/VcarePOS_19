import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  createOrder, 
  uploadTemporaryReceipt, 
  clearError, 
  clearUploadedReceipt 
} from '../store/slices/ordersSlice';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const CheckoutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, totalAmount } = useSelector(state => state.cart);
  const { customer } = useSelector(state => state.auth);
  const { 
    loading, 
    error, 
    currentOrder, 
    uploadingTempReceipt, 
    tempReceiptError,
    uploadedReceiptDetails 
  } = useSelector(state => state.orders);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [customerInfo, setCustomerInfo] = useState({
    name: customer ? `${customer.firstName} ${customer.lastName}` : '',
    email: customer?.email || '',
    phone: '',
    address: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [tempReceiptFile, setTempReceiptFile] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    // Redirect if cart is empty
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  useEffect(() => {
    // Clear errors when component mounts
    dispatch(clearError());
    dispatch(clearUploadedReceipt());
  }, [dispatch]);

  useEffect(() => {
    // Show success modal when order is created
    if (currentOrder && !loading) {
      setShowSuccessModal(true);
    }
  }, [currentOrder, loading]);

  const handleCustomerInfoChange = (e) => {
    setCustomerInfo({
      ...customerInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only JPEG, PNG, and PDF files are allowed');
        return;
      }
      
      setTempReceiptFile(file);
    }
  };

  const handleUploadReceipt = () => {
    if (tempReceiptFile) {
      dispatch(uploadTemporaryReceipt({ file: tempReceiptFile }));
    }
  };

  const validateStep1 = () => {
    return customerInfo.name.trim() && 
           customerInfo.email.trim() && 
           customerInfo.address.trim();
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handlePlaceOrder = () => {
    // Validate bank transfer receipt upload
    if (paymentMethod === 'bank_transfer' && !uploadedReceiptDetails) {
      alert('Please upload your bank transfer receipt before placing the order');
      return;
    }
    
    const orderData = {
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      customerAddress: customerInfo.address,
      paymentMethod,
      items: items.map(item => ({
        productId: item.product.id,
        selectedColorId: item.selectedColorId,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
      })),
    };
    
    // Include receipt details if bank transfer
    if (paymentMethod === 'bank_transfer' && uploadedReceiptDetails) {
      orderData.receiptDetails = uploadedReceiptDetails;
    }
    
    dispatch(createOrder(orderData));
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate(`/order-success/${currentOrder.id}`);
  };

  const steps = [
    { number: 1, title: 'Customer Information', completed: currentStep > 1 },
    { number: 2, title: 'Payment Method', completed: currentStep > 2 },
    { number: 3, title: 'Review & Place Order', completed: false },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.number
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-gray-300 text-gray-500'
              }`}>
                {step.completed ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step.number ? 'text-primary-600' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.number ? 'bg-primary-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Step 1: Customer Information */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Customer Information</h2>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={customerInfo.name}
                      onChange={handleCustomerInfoChange}
                      className="input-field"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={customerInfo.email}
                      onChange={handleCustomerInfoChange}
                      className="input-field"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={customerInfo.phone}
                      onChange={handleCustomerInfoChange}
                      className="input-field"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Address *
                    </label>
                    <textarea
                      name="address"
                      value={customerInfo.address}
                      onChange={handleCustomerInfoChange}
                      rows={3}
                      className="input-field"
                      placeholder="Enter your complete delivery address"
                      required
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleNextStep}
                    disabled={!validateStep1()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Payment Method</h2>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash_on_delivery"
                        checked={paymentMethod === 'cash_on_delivery'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-primary-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="font-medium">Cash on Delivery</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Pay when your order is delivered to your doorstep
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-primary-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span className="font-medium">Bank Transfer</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Transfer to our bank account and upload receipt
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={handlePrevStep}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="btn-primary"
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Place Order */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Review Your Order</h2>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
                
                {/* Customer Info Review */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Delivery Information</h3>
                  <p className="text-sm text-gray-600">
                    <strong>Name:</strong> {customerInfo.name}<br />
                    <strong>Email:</strong> {customerInfo.email}<br />
                    {customerInfo.phone && (
                      <>
                        <strong>Phone:</strong> {customerInfo.phone}<br />
                      </>
                    )}
                    <strong>Address:</strong> {customerInfo.address}
                  </p>
                </div>
                
                {/* Payment Method Review */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Payment Method</h3>
                  <p className="text-sm text-gray-600">
                    {paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Bank Transfer'}
                  </p>
                  
                  {paymentMethod === 'bank_transfer' && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Bank Transfer Details</h4>
                      <div className="text-sm text-blue-800">
                        <p><strong>Bank:</strong> Commercial Bank of Ceylon</p>
                        <p><strong>Account Name:</strong> VCare Furniture Store</p>
                        <p><strong>Account Number:</strong> 8001234567</p>
                        <p><strong>Branch:</strong> Colombo Main Branch</p>
                        <p className="mt-2 text-blue-700">
                          Please transfer LKR {totalAmount.toFixed(2)} and upload your receipt below.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Bank Transfer Receipt Upload */}
                {paymentMethod === 'bank_transfer' && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-4">Upload Bank Transfer Receipt</h3>
                    
                    {tempReceiptError && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                        <p className="text-sm text-red-800">{tempReceiptError}</p>
                      </div>
                    )}
                    
                    {uploadedReceiptDetails ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-800 font-medium">Receipt uploaded successfully!</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          File: {uploadedReceiptDetails.originalFilename} ({(uploadedReceiptDetails.fileSize / 1024).toFixed(2)} KB)
                        </p>
                        <button
                          onClick={() => {
                            dispatch(clearUploadedReceipt());
                            setTempReceiptFile(null);
                          }}
                          className="text-sm text-green-600 hover:text-green-800 mt-2"
                        >
                          Upload different receipt
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Receipt File *
                          </label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="input-field"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Supported formats: JPEG, PNG, PDF (Max 5MB)
                          </p>
                        </div>
                        
                        <button
                          onClick={handleUploadReceipt}
                          disabled={!tempReceiptFile || uploadingTempReceipt}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingTempReceipt ? (
                            <div className="flex items-center space-x-2">
                              <LoadingSpinner size="small" />
                              <span>Uploading...</span>
                            </div>
                          ) : (
                            'Upload Receipt'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Items Review */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                        <img
                          src={item.product.image || 'https://images.pexels.com/photos/586344/pexels-photo-586344.jpeg?auto=compress&cs=tinysrgb&w=100'}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product.name}</h4>
                          {item.selectedSize && (
                            <p className="text-sm text-gray-600">Size: {item.selectedSize}</p>
                          )}
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">LKR {(item.product.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <button
                    onClick={handlePrevStep}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading || (paymentMethod === 'bank_transfer' && !uploadedReceiptDetails)}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="small" />
                        <span>Placing Order...</span>
                      </div>
                    ) : (
                      paymentMethod === 'bank_transfer' && !uploadedReceiptDetails
                        ? 'Upload Receipt First'
                        : 'Place Order'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    LKR {(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">LKR {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">LKR {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Order Placed Successfully!
              </h3>
              
              <p className="text-gray-600 mb-4">
                Your order #{currentOrder.id} has been placed successfully.
              </p>
              
              {paymentMethod === 'bank_transfer' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    Your bank transfer receipt has been uploaded and your order is being processed. 
                    You will receive an email confirmation once your payment is verified and your order is ready for delivery.
                  </p>
                </div>
              )}
              
              <button
                onClick={handleCloseSuccessModal}
                className="w-full btn-primary"
              >
                View Order Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;