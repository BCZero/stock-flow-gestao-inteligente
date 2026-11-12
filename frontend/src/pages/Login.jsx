import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Lock, LogIn, Mail } from 'lucide-react';
import api from '../services/api';
import TelaAcesso from '../components/TelaAcesso';
import { Botao, Mensagem, campo, rotulo } from '../components/ui';

function CampoIcone({ label, icone: Icone, className = '', ...props }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={rotulo}>{label}</label>
      <div className="relative">
        <Icone className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input id={id} className={`${campo} py-2.5 pl-10 ${className}`} {...props} />
      </div>
    </div>
  );
}

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigo2fa, setCodigo2fa] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      if (needs2FA) {
        params.append('codigo_2fa', codigo2fa);
      }

      const response = await api.post('/auth/login', params);

      localStorage.setItem('token', response.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.detail === "Código 2FA obrigatório") {
        setNeeds2FA(true);
      } else {
        setError(err.response?.data?.detail || 'Não foi possível conectar ao StockFlow. Verifique se a API está ativa.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <TelaAcesso>
      <h2 className="text-2xl font-bold tracking-tight">{needs2FA ? 'Verificação em duas etapas' : 'Bem-vindo de volta'}</h2>
      <p className="mt-1.5 text-sm text-slate-500">
        {needs2FA ? 'Abra o app autenticador no celular e digite o código de 6 dígitos.' : 'Entre com seu e-mail ou nome de usuário.'}
      </p>

      {error && <div className="mt-6"><Mensagem>{error}</Mensagem></div>}

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        {!needs2FA ? (
          <>
            <CampoIcone label="E-mail ou usuário" icone={Mail} type="text" required autoComplete="username" autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />
            <CampoIcone label="Senha" icone={Lock} type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </>
        ) : (
          <CampoIcone label="Código do autenticador" icone={KeyRound} type="text" required autoFocus inputMode="numeric"
            autoComplete="one-time-code" maxLength="6" value={codigo2fa} onChange={(e) => setCodigo2fa(e.target.value)}
            placeholder="000000" className="text-center font-mono text-lg tracking-[0.5em]" />
        )}

        <Botao type="submit" icone={LogIn} carregando={enviando} className="w-full py-2.5">
          {needs2FA ? 'Validar acesso' : 'Entrar'}
        </Botao>
        {needs2FA && (
          <Botao variante="discreto" icone={ArrowLeft} className="w-full" onClick={() => { setNeeds2FA(false); setCodigo2fa(''); }}>
            Voltar
          </Botao>
        )}
      </form>
    </TelaAcesso>
  );
};

export default Login;
