import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';
import AppRouter from './router/AppRouter';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '18px',
            background: '#fffdf8',
            color: '#2d1418',
            border: '1px solid rgba(122,19,36,0.12)',
            boxShadow: '0 16px 40px rgba(122,19,36,0.12)',
          },
        }}
      />
    </Provider>
  </React.StrictMode>
);
