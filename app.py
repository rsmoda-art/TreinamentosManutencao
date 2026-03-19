import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import plotly.express as px

# --- CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(page_title="Gestão de Treinamentos - Raízen", layout="wide")

# --- ESTILO CUSTOMIZADO ---
st.markdown("""
    <style>
    .main { background-color: #f5f5f0; }
    div[data-testid="stMetric"] {
        background-color: white; padding: 15px; border-radius: 10px;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.05); border: 1px solid #e0e0e0;
    }
    </style>
    """, unsafe_allow_html=True)

# --- INICIALIZAÇÃO DE DADOS ---
if 'employees' not in st.session_state:
    st.session_state.employees = [
        {"id": "1", "name": "João Silva", "role": "Operador", "dept": "Operações"},
        {"id": "2", "name": "Maria Santos", "role": "Técnica", "dept": "Manutenção"},
        {"id": "3", "name": "Renan Silva Moda", "role": "Supervisor", "dept": "Manutenção"}
    ]

if 'modules' not in st.session_state:
    st.session_state.modules = [
        {"id": "m1", "title": "Segurança NR10", "freq": 12},
        {"id": "m2", "title": "Trabalho em Altura", "freq": 24},
        {"id": "m3", "title": "Espaço Confinado", "freq": 12}
    ]

if 'requirements' not in st.session_state:
    st.session_state.requirements = {
        "Operador": ["m1", "m2"],
        "Técnica": ["m1", "m2", "m3"],
        "Supervisor": ["m1", "m3"]
    }

if 'records' not in st.session_state:
    st.session_state.records = [
        {"empId": "1", "modId": "m1", "completionDate": "2023-01-01", "expiryDate": "2024-01-01"}
    ]

# --- FUNÇÕES AUXILIARES ---
def calculate_status(expiry_date_str, is_required):
    if not expiry_date_str:
        return "🔴 OBRIGATÓRIO" if is_required else "⚪ N/A"
    
    try:
        today = datetime.now().date()
        expiry = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
        
        # Prefixo diferente para indicar se é um opcional que o cara fez
        prefix = "✅" if is_required else "🔵"
        
        if expiry < today: return "❌ Vencido"
        if expiry < today + timedelta(days=30): return "⚠️ A Vencer"
        return f"{prefix} Conforme"
    except:
        return "Erro Data"

# --- SIDEBAR ---
st.sidebar.title("🛠️ Gestão Matrix")
page = st.sidebar.radio("Navegação:", 
    ["Dashboard", "Matriz de Treinamento", "Lançar Treinamento", "Configurar Requisitos", "Gerenciar Módulos", "Funcionários"])

# --- PÁGINA: DASHBOARD ---
if page == "Dashboard":
    st.title("📊 Painel de Controle")
    col1, col2, col3, col4 = st.columns(4)
    
    total_emp = len(st.session_state.employees)
    expired = sum(1 for r in st.session_state.records if calculate_status(r.get('expiryDate'), True) == "❌ Vencido")
    warning = sum(1 for r in st.session_state.records if calculate_status(r.get('expiryDate'), True) == "⚠️ A Vencer")
    
    col1.metric("Total Colaboradores", total_emp)
    col2.metric("Treinamentos Registrados", len(st.session_state.records))
    col3.metric("A Vencer", warning)
    col4.metric("Expirados", expired, delta_color="inverse")

    st.divider()
    c1, c2 = st.columns([1, 1])
    with c1:
        st.subheader("Distribuição por Departamento")
        df_emp = pd.DataFrame(st.session_state.employees)
        fig = px.pie(df_emp, names='dept', hole=0.4, color_discrete_sequence=px.colors.qualitative.Safe)
        st.plotly_chart(fig, use_container_width=True)
    with c2:
        st.subheader("⚠️ Alertas de Obrigatoriedade")
        alerts = []
        for emp in st.session_state.employees:
            reqs = st.session_state.requirements.get(emp['role'], [])
            for mod_id in reqs:
                rec = next((r for r in st.session_state.records if r['empId'] == emp['id'] and r['modId'] == mod_id), None)
                status = calculate_status(rec['expiryDate'] if rec else None, True)
                if status in ["🔴 OBRIGATÓRIO", "❌ Vencido", "⚠️ A Vencer"]:
                    mod_name = next((m['title'] for m in st.session_state.modules if m['id'] == mod_id), "N/A")
                    alerts.append({"Quem": emp['name'], "Treinamento": mod_name, "Status": status})
        if alerts:
            st.dataframe(pd.DataFrame(alerts), use_container_width=True, hide_index=True)
        else:
            st.success("Toda a equipe está em dia!")

# --- PÁGINA: MATRIZ DE TREINAMENTO ---
elif page == "Matriz de Treinamento":
    st.title("📋 Matriz de Qualificação")
    
    matrix_list = []
    for emp in st.session_state.employees:
        row = {"Colaborador": emp['name'], "Cargo": emp['role']}
        emp_reqs = st.session_state.requirements.get(emp['role'], [])
        for mod in st.session_state.modules:
            is_req = mod['id'] in emp_reqs
            rec = next((r for r in st.session_state.records if r['empId'] == emp['id'] and r['modId'] == mod['id']), None)
            row[mod['title']] = calculate_status(rec['expiryDate'] if rec else None, is_req)
        matrix_list.append(row)
    
    df_matrix = pd.DataFrame(matrix_list)
    st.dataframe(df_matrix.set_index("Colaborador"), use_container_width=True)
    
    # Botão de Download
    csv = df_matrix.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Baixar Matriz (Excel/CSV)", csv, "matriz_treinamento.csv", "text/csv")
    
    st.caption("Legenda: ✅/🔵 Conforme | ⚠️ A Vencer | ❌ Vencido | 🔴 OBRIGATÓRIO | ⚪ N/A")

# --- PÁGINA: LANÇAR TREINAMENTO ---
elif page == "Lançar Treinamento":
    st.title("📝 Registrar Conclusão")
    with st.form("log_training"):
        emp_name = st.selectbox("Selecione o Funcionário", [e['name'] for e in st.session_state.employees])
        mod_title = st.selectbox("Selecione o Treinamento", [m['title'] for m in st.session_state.modules])
        comp_date = st.date_input("Data de Realização", datetime.now())
        
        if st.form_submit_button("Salvar Registro"):
            emp_id = next(e['id'] for e in st.session_state.employees if e['name'] == emp_name)
            mod_obj = next(m for m in st.session_state.modules if m['title'] == mod_title)
            
            # Cálculo automático baseado na frequência do módulo
            expiry_date = comp_date + timedelta(days=30 * mod_obj['freq'])
            
            # Atualiza registro existente ou cria novo
            st.session_state.records = [r for r in st.session_state.records if not (r['empId'] == emp_id and r['modId'] == mod_obj['id'])]
            st.session_state.records.append({
                "empId": emp_id, "modId": mod_obj['id'],
                "completionDate": comp_date.strftime('%Y-%m-%d'),
                "expiryDate": expiry_date.strftime('%Y-%m-%d')
            })
            st.success(f"Treinamento de {mod_title} registrado!")
            st.balloons()

# --- PÁGINA: CONFIGURAR REQUISITOS ---
elif page == "Configurar Requisitos":
    st.title("⚙️ Requisitos por Cargo")
    roles = sorted(list(set(e['role'] for e in st.session_state.employees)))
    valid_ids = [m['id'] for m in st.session_state.modules]
    
    for role in roles:
        with st.expander(f"Treinamentos Obrigatórios: {role}"):
            current = st.session_state.requirements.get(role, [])
            # Limpeza de segurança: remove IDs que não existem mais
            safe_default = [r for r in current if r in valid_ids]
            
            new_reqs = st.multiselect(
                "Selecione os módulos obrigatórios:", 
                options=valid_ids,
                default=safe_default,
                format_func=lambda x: next((m['title'] for m in st.session_state.modules if m['id'] == x), "N/A"),
                key=f"req_{role}"
            )
            st.session_state.requirements[role] = new_reqs
            st.info(f"Configuração para {role} atualizada.")

# --- PÁGINA: GERENCIAR MÓDULOS ---
elif page == "Gerenciar Módulos":
    st.title("📚 Módulos e Periodicidade")
    with st.expander("➕ Adicionar Novo Treinamento"):
        with st.form("new_mod"):
            t = st.text_input("Nome do Treinamento")
            f = st.number_input("Validade (Meses)", min_value=1, value=12)
            if st.form_submit_button("Cadastrar"):
                new_id = f"m{len(st.session_state.modules) + 1}"
                st.session_state.modules.append({"id": new_id, "title": t, "freq": f})
                st.rerun()
    
    if st.session_state.modules:
        st.table(pd.DataFrame(st.session_state.modules)[['title', 'freq']])

# --- PÁGINA: FUNCIONÁRIOS ---
elif page == "Funcionários":
    st.title("👥 Gestão de Colaboradores")
    with st.expander("➕ Novo Colaborador"):
        with st.form("new_emp"):
            n = st.text_input("Nome Completo")
            r = st.text_input("Cargo")
            d = st.selectbox("Departamento", ["Operações", "Manutenção", "Segurança", "RH", "Laboratório"])
            if st.form_submit_button("Salvar"):
                new_id = str(len(st.session_state.employees) + 1)
                st.session_state.employees.append({"id": new_id, "name": n, "role": r, "dept": d})
                st.rerun()
    
    if st.session_state.employees:
        st.dataframe(pd.DataFrame(st.session_state.employees).drop(columns=['id']), use_container_width=True)
