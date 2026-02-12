import React from 'react';

interface ResumeEditorProps {
    value: string;
    onChange: (value: string) => void;
}

export const ResumeEditor: React.FC<ResumeEditorProps> = ({ value, onChange }) => {
    return (
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 h-[75vh]">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-full p-6 text-sm leading-relaxed bg-transparent border-none rounded-lg focus:ring-0 focus:outline-none resize-none font-mono"
                spellCheck="false"
            />
        </div>
    );
};
