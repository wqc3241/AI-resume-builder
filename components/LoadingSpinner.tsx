import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'sm' }) => {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div
            className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-solid border-t-transparent`}
            style={{ borderTopColor: 'currentColor', borderColor: 'rgba(255, 255, 255, 0.2)', borderLeftColor: 'rgba(255, 255, 255, 0.2)', borderRightColor: 'rgba(255, 255, 255, 0.2)' }}
            role="status"
        >
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
            </span>
        </div>
    );
};
