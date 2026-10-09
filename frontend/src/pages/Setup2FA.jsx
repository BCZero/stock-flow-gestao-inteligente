import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Setup2FA = () => {
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const response = await api.post('/auth/2fa/setup');
        setQrUrl(response.data.qr_code_url);
        setSecret(response.data.secret);
      } catch (err) {
        setError(err.response?.data?.detail || 'Erro ao inicializar 2FA');
      }
    };
    fetchSetup();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/2fa/verify', { codigo });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Código inválido');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Configurar 2FA</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Proteja sua conta escaneando o QR Code abaixo com o Google Authenticator ou Authy.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Tudo Certo!</h3>
            <p className="text-sm text-gray-500 mt-2">Sua conta agora tem verificação em duas etapas.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6 p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
              {qrUrl ? (
                <QRCodeSVG value={qrUrl} size={200} level="M" />
              ) : (
                <div className="h-[200px] flex items-center text-gray-400">Carregando...</div>
              )}
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-center mb-2">
                  Digite o código de 6 dígitos do app
                </label>
                <input
                  type="text"
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-2xl font-mono"
                  placeholder="000000"
                  maxLength="6"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Ativar 2FA
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Setup2FA;
