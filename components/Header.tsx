import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="bg-white shadow-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center">
                        <i className="fa-solid fa-file-invoice text-3xl text-indigo-600"></i>
                        <h1 className="text-2xl font-bold text-slate-800 ml-3">AI Resume Editor</h1>
                    </div>
                    <p className="hidden md:block text-slate-500">Tailor your resume for any job, instantly.</p>
                </div>
            </div>
        </header>
    );
};
