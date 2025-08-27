import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Upload from './pages/Upload';
import ThreadChat from './pages/ThreadChat';
import Analytics from './pages/Analytics';
import Integrations from './pages/Integrations';
import Layout from './components/Layout';



function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/documents" element={<Documents />} />
                        <Route path="/upload" element={<Upload />} />
                        <Route path="/thread/:threadId" element={<ThreadChat />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/integrations" element={<Integrations />} />
                        {/* Add more routes as needed */}
                    </Routes>
                </Layout>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                        },
                    }}
                />
            </Router>
        </QueryClientProvider>
    );
}

export default App;
