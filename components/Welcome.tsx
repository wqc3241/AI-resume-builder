import React from 'react';
import { FileUpload } from './FileUpload';

interface WelcomeProps {
    onFileUpload: (content: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onFileUpload }) => {
    return (
        <div className="text-center max-w-3xl mx-auto">
            <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg border border-slate-200">
                <i className="fa-solid fa-wand-magic-sparkles text-6xl text-indigo-500 mb-6"></i>
                <h2 className="text-4xl font-extrabold text-slate-800 mb-4">Transform Your Resume with AI</h2>
                <p className="text-lg text-slate-600 mb-8">
                    Stop manually editing your resume for every job application. Upload your current resume (as a .txt file), paste a job description, and let our AI create a perfectly tailored version for you in seconds.
                </p>
                <div className="max-w-md mx-auto">
                    <FileUpload onFileUpload={onFileUpload} isPrimaryAction={true} />
                </div>
            </div>
        </div>
    );
};
