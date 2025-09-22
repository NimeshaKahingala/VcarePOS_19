import { Skeleton, Card } from 'antd';

export function LoadingSkeleton({ 
  type = 'default',
  rows = 4,
  loading = true,
  children,
  className = ''
}) {
  if (!loading) return children;

  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <Card className={className}>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
          </Card>
        );
      
      case 'list':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: rows }, (_, index) => (
              <Card key={index} size="small">
                <Skeleton active avatar paragraph={{ rows: 1 }} />
              </Card>
            ))}
          </div>
        );
      
      case 'table':
        return (
          <Card className={className}>
            <Skeleton active title paragraph={{ rows: 8 }} />
          </Card>
        );
      
      case 'form':
        return (
          <div className={`space-y-4 ${className}`}>
            <Skeleton.Input active size="large" block />
            <Skeleton.Input active size="large" block />
            <Skeleton.Input active size="large" block />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        );
      
      case 'product-grid':
        return (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
            {Array.from({ length: 8 }, (_, index) => (
              <Card key={index}>
                <Skeleton.Image active className="w-full h-48" />
                <div className="mt-4">
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              </Card>
            ))}
          </div>
        );
      
      case 'stats':
        return (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
            {Array.from({ length: 4 }, (_, index) => (
              <Card key={index} className="text-center">
                <Skeleton.Avatar active size={64} shape="circle" />
                <div className="mt-4">
                  <Skeleton active paragraph={{ rows: 1 }} />
                </div>
              </Card>
            ))}
          </div>
        );
      
      case 'image':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="bg-gray-200 rounded-lg h-64 w-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        );
      
      case 'document':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="bg-gray-200 rounded-lg h-96 w-full flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <div className="text-gray-400 text-sm">Loading document...</div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className={className}>
            <Skeleton active paragraph={{ rows }} />
          </div>
        );
    }
  };

  return renderSkeleton();
}