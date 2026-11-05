import sys
from sqlalchemy import func
from app.db.session import SessionLocal
from app.db.models import Usuario, Empresa, PerfilEnum
from app.core.security import get_password_hash

def listar_usuarios(db):
    usuarios = db.query(Usuario).all()
    if not usuarios:
        print("\n[!] Nenhum usuario encontrado no banco de dados.")
        return []
    
    print("\n" + "="*85)
    print(f"{'ID':<4} | {'Nome':<22} | {'E-mail Completo':<35} | {'2FA Ativo':<9} | {'Empresa ID':<10}")
    print("-" * 85)
    for u in usuarios:
        print(f"{u.id:<4} | {u.nome:<22} | {u.email:<35} | {str(u.is_2fa_enabled):<9} | {u.id_empresa:<10}")
    print("="*85 + "\n")
    return usuarios

def buscar_usuario(db, termo):
    termo = termo.strip()
    if not termo:
        return None
    # 1. Busca por ID numérico
    if termo.isdigit():
        u = db.query(Usuario).filter(Usuario.id == int(termo)).first()
        if u:
            return u
    # 2. Busca por e-mail exato (sem diferenciar maiúsculas/minúsculas)
    u = db.query(Usuario).filter(func.lower(Usuario.email) == termo.lower()).first()
    if u:
        return u
    # 3. Busca parcial por e-mail ou nome
    return db.query(Usuario).filter(
        Usuario.email.ilike(f"%{termo}%") | Usuario.nome.ilike(f"%{termo}%")
    ).first()

def redefinir_senha(db):
    print("\n--- REDEFINIR SENHA / RECUPERAR USUÁRIO ---")
    usuarios = listar_usuarios(db)
    if not usuarios:
        return

    if len(usuarios) == 1:
        entrada = input(f"Digite o ID ou e-mail (ou aperte Enter para selecionar '{usuarios[0].nome}'): ").strip()
        if not entrada:
            usuario = usuarios[0]
        else:
            usuario = buscar_usuario(db, entrada)
    else:
        entrada = input("Digite o ID (ex: 1) ou o e-mail do usuario: ").strip()
        usuario = buscar_usuario(db, entrada)

    if not usuario:
        print(f"\n[X] Usuario com '{entrada}' nao foi encontrado.")
        return

    print(f"\n-> Usuario selecionado: {usuario.nome} (ID: {usuario.id})")
    print(f"-> E-mail real no banco: {usuario.email}")
    
    nova_senha = input(f"\nDigite a NOVA senha para '{usuario.nome}': ").strip()
    if not nova_senha:
        print("\n[X] Senha nao pode ser vazia.")
        return

    usuario.senha_hash = get_password_hash(nova_senha)

    if usuario.is_2fa_enabled:
        print("\n[!] AVISO: O 2FA (Google Authenticator) esta ATIVADO para este usuario.")
        reset_2fa = input("Deseja DESATIVAR o 2FA para você conseguir logar direto só com a senha? (s/n) [Padrao: s]: ").strip().lower()
        if reset_2fa in ['s', 'sim', 'y', 'yes', '']:
            usuario.is_2fa_enabled = False
            usuario.totp_secret = None
            print("[+] 2FA desativado com sucesso!")

    db.commit()
    print(f"\n[OK] Senha de '{usuario.nome}' atualizada com sucesso!")
    print(f"-> Agora você pode acessar o sistema usando:")
    print(f"   E-mail: {usuario.email}")
    print(f"   Senha:  {nova_senha}\n")

def criar_usuario(db):
    print("\n--- CRIAR NOVO USUÁRIO ---")
    empresas = db.query(Empresa).all()
    
    if not empresas:
        print("[!] Nenhuma empresa encontrada. Vamos cadastrar a primeira empresa:")
        nome_empresa = input("Nome da empresa: ").strip()
        cnpj = input("CNPJ da empresa (somente numeros ou formatado): ").strip()
        nova_empresa = Empresa(nome=nome_empresa, cnpj=cnpj)
        db.add(nova_empresa)
        db.flush()
        empresa_id = nova_empresa.id
    else:
        print("\nEmpresas disponiveis:")
        for emp in empresas:
            print(f"ID {emp.id}: {emp.nome} (CNPJ: {emp.cnpj})")
        
        escolha = input("\nDigite o ID da empresa desejada (ou 'nova' para criar outra): ").strip()
        if escolha.lower() == 'nova':
            nome_empresa = input("Nome da nova empresa: ").strip()
            cnpj = input("CNPJ: ").strip()
            nova_empresa = Empresa(nome=nome_empresa, cnpj=cnpj)
            db.add(nova_empresa)
            db.flush()
            empresa_id = nova_empresa.id
        else:
            try:
                empresa_id = int(escolha)
            except ValueError:
                print("[X] ID invalido.")
                return

    nome = input("Nome completo do usuario: ").strip()
    email = input("E-mail do usuario: ").strip()

    usr_existente = db.query(Usuario).filter(Usuario.email == email).first()
    if usr_existente:
        print(f"\n[X] Ja existe um usuario cadastrado com o e-mail '{email}'.")
        return

    senha = input("Senha de acesso: ").strip()
    if not senha:
        print("[X] A senha nao pode ser vazia.")
        return

    novo_usuario = Usuario(
        id_empresa=empresa_id,
        nome=nome,
        email=email,
        senha_hash=get_password_hash(senha),
        perfil=PerfilEnum.ADMIN,
        is_2fa_enabled=False
    )
    db.add(novo_usuario)
    db.commit()
    print(f"\n[OK] Usuario '{nome}' ({email}) criado com sucesso com perfil ADMIN!\n")

def main():
    try:
        db = SessionLocal()
    except Exception as e:
        print(f"[X] Nao foi possivel conectar ao Banco de Dados: {e}")
        print("Certifique-se de que o Docker com PostgreSQL esta rodando ('docker-compose up -d').")
        sys.exit(1)

    while True:
        print("\n=== GERENCIADOR DE USUARIOS - STOCKFLOW ===")
        print("1. Listar todos os usuarios cadastrados")
        print("2. Redefinir senha de um usuario existente (e resetar 2FA se necessario)")
        print("3. Criar um novo usuario")
        print("4. Sair")
        opcao = input("Escolha uma opcao (1-4): ").strip()

        if opcao == "1":
            listar_usuarios(db)
        elif opcao == "2":
            redefinir_senha(db)
        elif opcao == "3":
            criar_usuario(db)
        elif opcao == "4":
            print("Encerrando.")
            break
        else:
            print("Opcao invalida. Tente novamente.")

    db.close()

if __name__ == "__main__":
    main()
