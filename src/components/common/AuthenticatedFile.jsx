import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Document, Page, pdfjs } from 'react-pdf';
import { LoadingSkeleton } from './LoadingSkeleton';
import { fetchReceiptBlob, clearReceiptBlob } from '../../features/ecommerceOrders/ecommerceOrdersSlice';

// Alternative approach - copy worker to public folder and reference it
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

/**
 * AuthenticatedFile - Component for displaying authenticated files (images and PDFs)
 * Automatically fetches files via authenticated API and displays them using blob URLs
 * 
 * @param {string} receiptId - Unique identifier for the receipt
 * @param {string} filename - Filename of the file to fetch
 * @param {React.ReactNode} fallback - Component to display on error
 * @param {React.ReactNode} loadingComponent - Custom loading component
 * @param {Object} ...props - Additional props passed to the container or img element
 */
export const AuthenticatedFile = ({ 
  receiptId, 
  filename, 
  fallback = null,
  loadingComponent = null,
  className = "",
  ...props 
}) => {
  const dispatch = useDispatch();
  const receipt = useSelector(state => 
    state.ecommerceOrders?.receipts?.[receiptId]
  );

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  // Determine file type
  const getFileType = (filename) => {
    if (!filename) return 'unknown';
    const extension = filename.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    }
    return 'unknown';
  };

  const fileType = getFileType(filename);

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

  // PDF-specific handlers
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
  };

  // Show loading state
  if (receipt?.loading) {
    return loadingComponent || <LoadingSkeleton type={fileType === 'pdf' ? 'document' : 'image'} />;
  }

  // Show error state with retry option
  if (receipt?.error) {
    return fallback || (
      <div className="p-8 text-gray-500 text-center border border-gray-200 rounded">
        <div className="text-4xl mb-2">
          {fileType === 'pdf' ? '📄' : '🖼️'}
        </div>
        <p>Unable to load {fileType === 'pdf' ? 'PDF document' : 'image'}</p>
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

  // Show file if blob URL is available
  if (receipt?.blobUrl) {
    if (fileType === 'pdf') {
      return (
        <div className={`pdf-container ${className}`} {...props}>
          <Document 
            file={receipt.blobUrl} 
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingSkeleton type="document" />}
            error={
              <div className="p-4 text-center text-red-500">
                <p>Failed to load PDF</p>
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber} 
              width={Math.min(600, window.innerWidth - 40)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          
          {numPages && numPages > 1 && (
            <div className="pdf-controls mt-4 flex justify-center items-center gap-4">
              <button
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="text-sm">
                Page {pageNumber} of {numPages}
              </span>
              
              <button
                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                disabled={pageNumber >= numPages}
                className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      );
    } else if (fileType === 'image') {
      return (
        <img 
          src={receipt.blobUrl} 
          className={className}
          onError={() => {
            console.error('Failed to load blob URL image');
          }}
          {...props} 
        />
      );
    } else {
      // Unsupported file type
      return (
        <div className="p-8 text-gray-500 text-center border border-gray-200 rounded">
          <div className="text-4xl mb-2">📎</div>
          <p>Unsupported file type</p>
          <a 
            href={receipt.blobUrl} 
            download={filename}
            className="mt-2 inline-block px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Download File
          </a>
        </div>
      );
    }
  }

  // Initial loading state before fetch starts
  return loadingComponent || <LoadingSkeleton type={fileType === 'pdf' ? 'document' : 'image'} />;
};

export default AuthenticatedFile;