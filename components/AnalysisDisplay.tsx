import React from 'react';
import type { AnalysisResult } from '../types';

interface AnalysisDisplayProps {
    result: AnalysisResult;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 h-full overflow-y-auto max-h-[75vh]">
            <div>
                <h4 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-key text-indigo-500"></i> Key Skills & Qualifications
                </h4>
                <div className="flex flex-wrap gap-2 mb-6">
                    {result.keywords.map((keyword, index) => (
                        <span key={index} className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                            {keyword}
                        </span>
                    ))}
                </div>
            </div>
            <div>
                 <h4 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-lightbulb text-yellow-500"></i> AI Recommendations
                </h4>
                <p className="text-slate-600 leading-relaxed">
                    {result.explanation}
                </p>
            </div>
        </div>
    );
};
