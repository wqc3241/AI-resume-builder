import React, { useRef } from 'react';

interface FileUploadProps {
    onFileUpload: (content: string) => void;
    fileName?: string;
    isPrimaryAction?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, fileName, isPrimaryAction = false }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                onFileUpload(text);
            };
            reader.readAsText(file);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    if (isPrimaryAction) {
        return (
            <div>
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".txt"
                />
                <button
                    onClick={handleButtonClick}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition-transform transform hover:scale-105 duration-300"
                >
                    <i className="fa-solid fa-upload"></i> Upload Resume (.txt)
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Your Resume</h3>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt"
            />
            <button
                onClick={handleButtonClick}
                className="w-full flex items-center justify-center gap-2 bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-md hover:bg-slate-300 transition-colors"
            >
                 <i className="fa-solid fa-file-arrow-up"></i> {fileName ? "Upload New" : "Upload Resume (.txt)"}
            </button>
            {fileName && (
                <div className="mt-4 text-center text-sm text-slate-600 bg-slate-100 p-2 rounded">
                    <i className="fa-solid fa-file-lines mr-2 text-indigo-500"></i>
                    <span>{fileName} loaded</span>
                </div>
            )}
        </div>
    );
};
