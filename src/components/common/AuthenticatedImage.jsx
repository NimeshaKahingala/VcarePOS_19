import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingSkeleton } from './LoadingSkeleton';
import { fetchReceiptBlob, clearReceiptBlob } from '../../features/ecommerceOrders/ecommerceOrdersSlice';

/**
 * AuthenticatedImage - Component for displaying images that require authentication
 * Automatically fetches images via authenticated API and displays them using blob URLs
 * 
 * @param {string} receiptId - Unique identifier for the receipt
 * @param {string} filename - Filename of the image to fetch
 * @param {React.ReactNode} fallback - Component to display on error
 * @param {React.ReactNode} loadingComponent - Custom loading component
 * @param {Object} ...imgProps - Additional props passed to the img element
 */
export const AuthenticatedImage = ({ 
  receiptId, 
  filename, 
  fallback = null,
  loadingComponent = null,
  ...imgProps 
}) => {
  const dispatch = useDispatch();
  const receipt = useSelector(state => 
    state.ecommerceOrders?.receipts?.[receiptId]
  );

  useEffect(() => {
    // Only fetch if we don't have a blob URL, we're not already loading, and haven't failed
    if (!receipt?.blobUrl && !receipt?.loading && !receipt?.error && receiptId && filename) {
      dispatch(fetchReceiptBlob({ receiptId, filename }));
    }
  }, [receiptId, filename, dispatch, receipt?.blobUrl, receipt?.loading, receipt?.error]);

  // Separate cleanup effect to handle component unmount
  useEffect(() => {
    return () => {
      if (receipt?.blobUrl) {
        URL.revokeObjectURL(receipt.blobUrl);
        dispatch(clearReceiptBlob({ receiptId }));
      }
    };
  }, [receiptId, receipt?.blobUrl, dispatch]);

  // Show loading state
  if (receipt?.loading) {
    return loadingComponent || <LoadingSkeleton type="image" />;
  }

  // Show error state with retry option
  if (receipt?.error) {
    return fallback || (
      <div className="p-8 text-gray-500 text-center">
        <div className="text-4xl mb-2">🖼️</div>
        <p>Unable to load receipt image</p>
        <p className="text-sm text-gray-400 mt-1">{receipt.error}</p>
        <button 
          onClick={() => dispatch(fetchReceiptBlob({ receiptId, filename }))}
          className="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show image if blob URL is available
  if (receipt?.blobUrl) {
    return (
      <img 
        src={receipt.blobUrl} 
        onError={() => {
          // If image fails to load, show fallback
          console.error('Failed to load blob URL image');
        }}
        {...imgProps} 
      />
    );
  }

  // Initial loading state before fetch starts
  return loadingComponent || <LoadingSkeleton type="image" />;
};

export default AuthenticatedImage;