import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import TelaAcesso from '../components/TelaAcesso';
import { Botao, Carregando, Mensagem, campo, rotulo } from '../components/ui';

const Setup2FA = () => {
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const response = await api.post('/auth/2fa/setup');
        setQrUrl(response.data.qr_code_url);
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
    <TelaAcesso>
      {success ? (
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight">Tudo certo</h2>
          <p className="mt-2 text-sm text-slate-500">Sua conta agora tem verificação em duas etapas. Abrindo o painel…</p>
        </div>
      ) : (
        <>
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-marca-50 text-marca-600">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight">Ativar verificação em duas etapas</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Escaneie o QR Code com o Google Authenticator ou o Authy e confirme com o código gerado.
          </p>

          {error && <div className="mt-6"><Mensagem>{error}</Mensagem></div>}

          <div className="mt-6 flex justify-center rounded-2xl border border-dashed border-marca-200 bg-marca-50/40 p-5">
            {qrUrl ? <QRCodeSVG value={qrUrl} size={184} level="M" fgColor="#0B2A33" /> : <Carregando texto="Gerando QR Code…" />}
          </div>

          <form onSubmit={handleVerify} className="mt-6 space-y-5">
            <div>
              <label htmlFor="codigo-2fa" className={rotulo}>Código de 6 dígitos</label>
              <input id="codigo-2fa" type="text" required inputMode="numeric" autoComplete="one-time-code" maxLength="6"
                value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="000000"
                className={`${campo} py-3 text-center font-mono text-2xl tracking-[0.5em]`} />
            </div>
            <Botao type="submit" icone={ShieldCheck} className="w-full py-2.5">Ativar 2FA</Botao>
          </form>
        </>
      )}
    </TelaAcesso>
  );
};

export default Setup2FA;
