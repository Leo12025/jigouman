import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntApp } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { TenantConfigProvider, ThemedConfigProvider } from './context/TenantConfig';
import 'antd/dist/reset.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantConfigProvider>
      <ThemedConfigProvider>
        <AntApp>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AntApp>
      </ThemedConfigProvider>
    </TenantConfigProvider>
  </React.StrictMode>,
);
