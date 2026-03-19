import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import plotly.express as px

# --- CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(page_title="Gestão de Treinamentos - Raízen", layout="wide")

# --- ESTILO CUSTOMIZADO ---
st.markdown("""
    <style>
    .main {
        background-color: #f5f5f0;
    }
    div[data-testid="stMetric"] {
        background-color: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.05);
        border: 1px solid #e0e0e0;
    }
    </style>
    """, unsafe_allow_html=True) # CORREÇÃO: unsafe_allow_html=True

# --- MOCK DATA (Persistência básica na sessão) ---
if 'employees' not in st.session_state:
    st.session_state.employees = [
        {"id": "1", "name": "João Silva", "role": "Operador", "dept": "Operações", "status": "active"},
        {"id": "2", "name": "Maria Santos", "role": "Técnica", "dept": "Manutenção", "status": "active"}
    ]

if 'modules' not in st.session_state:
    st.session_state.modules = [
        {"id": "m1", "title": "Segurança NR10", "freq": 12},
        {"id": "m2", "title": "Trabalho em Altura", "freq": 24}
    ]

if 'records' not in st.session_state:
    # Adicionando um record de exemplo para teste do Dashboard
    st.session_state.records = [
        {"empId": "1", "modId": "m1", "completionDate": "2023-10-01", "expiryDate": "2024-10-01"}
    ]

# --- FUNÇÕES AUXILIARES ---
def calculate_status(expiry_date_str):
    if not expiry_date_str: return "Pendente"
    try:
        today = datetime.now().date()
        expiry = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
        if expiry < today: return "Expirado"
        if expiry < today + timedelta(days=30): return "A Vencer"
        return "Conforme"
    except:
        return "Erro na Data"

# --- SIDEBAR ---
# Usei um placeholder de imagem mais estável
st.sidebar.title("🛠️ Manutenção")
st.sidebar.subheader("Matrix Pro System")
page = st.sidebar.radio("Navegação:", ["Dashboard", "Funcionários", "Matriz de Treinamento", "Agenda"])

# --- PÁGINA: DASHBOARD ---
if page == "Dashboard":
    st.title("📊 Painel de Controle")
    
    col1, col2, col3, col4 = st.columns(4)
    
    total_emp = len(st.session_state.employees)
    # Correção na lógica de contagem para evitar erros com campos vazios
    expired = sum(1 for r in st.session_state.records if calculate_status(r.get('expiryDate')) == "Expirado")
    warning = sum(1 for r in st.session_state.records if calculate_status(r.get('expiryDate')) == "A Vencer")
    
    col1.metric("Total Colaboradores", total_emp)
    col2.metric("Treinamentos Realizados", len(st.session_state.records))
    col3.metric("A Vencer (30 dias)", warning)
    col4.metric("Expirados", expired, delta_color="inverse")

    st.divider()
    
    c1, c2 = st.columns([1, 1])
    with c1:
        st.subheader("Distribuição por Departamento")
        df_emp = pd.DataFrame(st.session_state.employees)
        fig = px.pie(df_emp, names='dept', hole=0.4, color_discrete_sequence=px.colors.qualitative.Safe)
        st.plotly_chart(fig, use_container_width=True)
    with c2:
        st.subheader("Avisos Rápidos")
        if expired > 0:
            st.error(f"Atenção: Existem {expired} treinamentos vencidos!")
        else:
            st.success("Tudo em dia com a equipe!")

# --- PÁGINA: FUNCIONÁRIOS ---
elif page == "Funcionários":
    st.title("👥 Gestão de Funcionários")
    
    with st.expander("➕ Cadastrar Novo Funcionário"):
        with st.form("new_employee"):
            c1, c2 = st.columns(2)
            name = c1.text_input("Nome Completo")
            role = c2.text_input("Cargo")
            dept = st.selectbox("Departamento", ["Operações", "Manutenção", "Segurança", "RH", "Laboratório"])
            if st.form_submit_button("Confirmar Cadastro"):
                if name and role:
                    new_id = str(len(st.session_state.employees) + 1)
                    st.session_state.employees.append({"id": new_id, "name": name, "role": role, "dept": dept, "status": "active"})
                    st.success(f"{name} adicionado com sucesso!")
                    st.rerun()
                else:
                    st.warning("Preencha o nome e o cargo.")

    st.subheader("Lista de Colaboradores")
    df_display = pd.DataFrame(st.session_state.employees).drop(columns=['id'])
    st.dataframe(df_display, use_container_width=True)

# --- PÁGINA: MATRIZ ---
elif page == "Matriz de Treinamento":
    st.title("📋 Matriz de Qualificação (Status)")
    
    matrix_list = []
    for emp in st.session_state.employees:
        row = {"Funcionário": emp['name'], "Depto": emp['dept']}
        for mod in st.session_state.modules:
            # Busca o registro mais recente desse funcionário para esse módulo
            rec = next((r for r in st.session_state.records if r['empId'] == emp['id'] and r['modId'] == mod['id']), None)
            row[mod['title']] = calculate_status(rec['expiryDate']) if rec else "Não Realizado"
        matrix_list.append(row)
    
    df_matrix = pd.DataFrame(matrix_list)
    st.dataframe(df_matrix.set_index("Funcionário"), use_container_width=True)
    
    st.caption("Legenda: Conforme (Válido) | A Vencer (Próximo 30 dias) | Expirado (Vencido)")

# --- PÁGINA: AGENDA ---
elif page == "Agenda":
    st.title("📅 Cronograma")
    st.info("Aqui você poderá agendar as próximas turmas de treinamento.")
    d = st.date_input("Consultar Data", datetime.now())
    st.write(f"Verificando disponibilidade para: {d.strftime('%d/%m/%Y')}")
