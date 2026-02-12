import React from 'react';

interface JobDescriptionInputProps {
    value: string;
    onChange: (value: string) => void;
}

export const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({ value, onChange }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Job Description</h3>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full flex-grow p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                rows={10}
            ></textarea>
        </div>
    );
};
